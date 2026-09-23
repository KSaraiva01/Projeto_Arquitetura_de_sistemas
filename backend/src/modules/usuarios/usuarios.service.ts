import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { registrarAuditoria, type Db } from "../../shared/auditoria";
import { PERFIL_DA_API, PERFIL_PARA_API, semestreDaApi, semestreParaApi, type ApiRole } from "../../shared/dto";
import { ConflictError, NotFoundError } from "../../shared/errors";
import { enviarAtivacaoConta, enviarConfirmacaoEmail } from "../auth/auth.service";
import { processarFilaEmSegundoPlano } from "../notificacoes/notificacoes.service";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "./usuarios.schemas";

export interface Ator {
  id: string;
  ip?: string | null;
}

/** Linha de GET /users (ApiUserSummary) com alguns campos a mais. */
export interface UsuarioResumo {
  id: string;
  name: string;
  email: string;
  role: ApiRole;
  phone: string | null;
  course: string | null;
  semester: string | null;
  isActive: boolean;
  /** Falso = conta ainda não ativada (a pessoa não criou a senha pelo link). */
  hasPassword: boolean;
  /** Nulo = e-mail ainda não confirmado (a pessoa não consegue entrar). */
  emailConfirmedAt: Date | null;
  createdAt: Date;
  mentoredTeams: number;
}

const incluirResumo = {
  curso: { select: { nome: true } },
  _count: { select: { mentorias: true } },
} satisfies Prisma.UsuarioInclude;

type UsuarioResumoRow = Prisma.UsuarioGetPayload<{ include: typeof incluirResumo }>;

function paraResumo(u: UsuarioResumoRow): UsuarioResumo {
  return {
    id: u.id,
    name: u.nome,
    email: u.email,
    role: PERFIL_PARA_API[u.perfil],
    phone: u.telefone,
    course: u.curso?.nome ?? null,
    semester: semestreParaApi(u.semestre),
    isActive: u.ativo,
    hasPassword: u.senhaHash !== null,
    emailConfirmedAt: u.emailConfirmadoEm,
    createdAt: u.criadoEm,
    mentoredTeams: u._count.mentorias,
  };
}

export async function listarUsuarios(filtros: ListUsersQuery) {
  const where: Prisma.UsuarioWhereInput = {
    excluidoEm: null,
    ...(filtros.role ? { perfil: PERFIL_DA_API[filtros.role] } : {}),
    ...(filtros.isActive !== undefined ? { ativo: filtros.isActive } : {}),
    ...(filtros.search
      ? {
          OR: [
            { nome: { contains: filtros.search, mode: "insensitive" } },
            { email: { contains: filtros.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [linhas, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      include: incluirResumo,
      orderBy: [{ perfil: "asc" }, { nome: "asc" }],
      skip: (filtros.page - 1) * filtros.pageSize,
      take: filtros.pageSize,
    }),
    prisma.usuario.count({ where }),
  ]);

  return { data: linhas.map(paraResumo), total, page: filtros.page, pageSize: filtros.pageSize };
}

export async function obterUsuario(id: string): Promise<UsuarioResumo> {
  const usuario = await prisma.usuario.findFirst({ where: { id, excluidoEm: null }, include: incluirResumo });
  if (!usuario) throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");
  return paraResumo(usuario);
}

/**
 * RF-03 — nova conta de ADMIN/MENTOR; a pessoa define a senha pelo link de
 * ativação e, nessa hora, aceita a política de privacidade (RNF-02).
 */
export async function criarUsuario(input: CreateUserInput, ator: Ator) {
  const existente = await prisma.usuario.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existente) {
    throw new ConflictError("Já existe uma conta com este e-mail.", "EMAIL_IN_USE");
  }

  const usuario = await prisma.$transaction(async (tx) => {
    const criado = await tx.usuario.create({
      data: {
        nome: input.name,
        email: input.email,
        perfil: PERFIL_DA_API[input.role],
        telefone: input.phone ?? null,
      },
      include: incluirResumo,
    });
    await enviarAtivacaoConta(
      criado,
      `A coordenação do InfoHub criou para você uma conta de ${input.role === "ADMIN" ? "administrador(a)" : "mentor(a)"}.`,
      tx,
    );
    await registrarAuditoria(
      {
        usuarioId: ator.id,
        acao: "USUARIO_CRIADO",
        entidade: "usuario",
        entidadeId: criado.id,
        detalhes: { perfil: criado.perfil, email: criado.email },
        ip: ator.ip,
      },
      tx,
    );
    return criado;
  });

  processarFilaEmSegundoPlano();
  return paraResumo(usuario);
}

export async function atualizarUsuario(id: string, input: UpdateUserInput, ator: Ator) {
  const atual = await prisma.usuario.findFirst({ where: { id, excluidoEm: null } });
  if (!atual) throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");

  if (input.role && atual.perfil === "ALUNO") {
    throw new ConflictError("O perfil de um aluno não pode ser alterado.", "STUDENT_ROLE_LOCKED");
  }
  if (input.role && input.role !== "ADMIN" && atual.perfil === "ADMIN" && atual.ativo && (await contarOutrosAdminsAtivos(id)) === 0) {
    throw new ConflictError("Este é o último administrador ativo e não pode deixar de ser administrador.", "LAST_ACTIVE_ADMIN");
  }
  const trocouEmail = input.email !== undefined && input.email !== atual.email;
  if (trocouEmail) {
    const emUso = await prisma.usuario.findUnique({ where: { email: input.email }, select: { id: true } });
    if (emUso) throw new ConflictError("Já existe uma conta com este e-mail.", "EMAIL_IN_USE");
  }

  let cursoId: string | null | undefined;
  if (input.course !== undefined) {
    if (input.course === null || input.course === "") {
      cursoId = null;
    } else {
      const curso = await prisma.curso.findUnique({ where: { nome: input.course }, select: { id: true } });
      if (!curso) throw new NotFoundError("Curso não encontrado.", "COURSE_NOT_FOUND");
      cursoId = curso.id;
    }
  }

  const atualizado = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { nome: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.role !== undefined ? { perfil: PERFIL_DA_API[input.role] } : {}),
        ...(input.phone !== undefined ? { telefone: input.phone } : {}),
        ...(cursoId !== undefined ? { cursoId } : {}),
        ...(input.semester !== undefined ? { semestre: semestreDaApi(input.semester) } : {}),
      },
      include: incluirResumo,
    });
    if (trocouEmail) {
      // Links mandados ao endereço antigo deixam de valer, e o que estava pendente
      // (ativação ou confirmação) vai de novo para o endereço corrigido. Conta já
      // confirmada continua confirmada: quem trocou o e-mail foi a coordenação.
      await tx.tokenUsuario.deleteMany({ where: { usuarioId: id, usadoEm: null } });
      const contexto = "A coordenação atualizou o e-mail da sua conta no InfoHub.";
      if (usuario.senhaHash === null) {
        await enviarAtivacaoConta(usuario, contexto, tx);
      } else if (!usuario.emailConfirmadoEm) {
        await enviarConfirmacaoEmail(usuario, contexto, tx);
      }
    }
    await registrarAuditoria(
      { usuarioId: ator.id, acao: "USUARIO_ATUALIZADO", entidade: "usuario", entidadeId: id, detalhes: { campos: Object.keys(input) }, ip: ator.ip },
      tx,
    );
    return usuario;
  });

  if (trocouEmail) processarFilaEmSegundoPlano();
  return paraResumo(atualizado);
}

async function contarOutrosAdminsAtivos(excetoId: string, db: Db = prisma) {
  return db.usuario.count({ where: { perfil: "ADMIN", ativo: true, excluidoEm: null, id: { not: excetoId } } });
}

/** RF-03 — ativar/desativar. Desativar derruba as sessões abertas. */
export async function definirStatus(id: string, ativo: boolean, ator: Ator) {
  const atual = await prisma.usuario.findFirst({ where: { id, excluidoEm: null } });
  if (!atual) throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");

  if (!ativo && id === ator.id) {
    throw new ConflictError("Você não pode desativar a própria conta.", "CANNOT_DISABLE_SELF");
  }
  if (!ativo && atual.perfil === "ADMIN" && (await contarOutrosAdminsAtivos(id)) === 0) {
    throw new ConflictError("Este é o último administrador ativo e não pode ser desativado.", "LAST_ACTIVE_ADMIN");
  }

  const atualizado = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.update({ where: { id }, data: { ativo }, include: incluirResumo });
    if (!ativo) {
      await tx.sessao.updateMany({ where: { usuarioId: id, revogadaEm: null }, data: { revogadaEm: new Date() } });
    }
    await registrarAuditoria(
      { usuarioId: ator.id, acao: ativo ? "USUARIO_ATIVADO" : "USUARIO_DESATIVADO", entidade: "usuario", entidadeId: id, ip: ator.ip },
      tx,
    );
    return usuario;
  });

  return paraResumo(atualizado);
}

/**
 * Reenvia o link que falta para a pessoa entrar: o de ativação (conta ainda
 * sem senha) ou o de confirmação do e-mail (líder que ainda não confirmou).
 */
export async function reenviarAcesso(id: string, ator: Ator) {
  const usuario = await prisma.usuario.findFirst({ where: { id, excluidoEm: null } });
  if (!usuario) throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");
  if (!usuario.ativo) throw new ConflictError("Esta conta está desativada. Ative-a antes de reenviar o acesso.", "ACCOUNT_DISABLED");

  const contexto = "A coordenação do InfoHub reenviou o seu link de acesso.";
  let message: string;
  if (usuario.senhaHash === null) {
    await enviarAtivacaoConta(usuario, contexto);
    message = `Link de ativação reenviado para ${usuario.email}.`;
  } else if (!usuario.emailConfirmadoEm) {
    await enviarConfirmacaoEmail(usuario, contexto);
    message = `Link de confirmação reenviado para ${usuario.email}.`;
  } else {
    throw new ConflictError(
      "Esta conta já está ativa. Se a pessoa esqueceu a senha, ela mesma pode pedir um novo link na tela de login.",
      "ACCOUNT_ALREADY_ACTIVE",
    );
  }

  await registrarAuditoria({ usuarioId: ator.id, acao: "ACESSO_REENVIADO", entidade: "usuario", entidadeId: id, ip: ator.ip });
  processarFilaEmSegundoPlano();
  return { message };
}

/**
 * A coordenação confirma o e-mail de quem já tem senha (o líder que não
 * recebeu ou perdeu o link). Fica registrado na auditoria.
 */
export async function confirmarEmailManualmente(id: string, ator: Ator) {
  const usuario = await prisma.usuario.findFirst({ where: { id, excluidoEm: null } });
  if (!usuario) throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");
  if (usuario.senhaHash === null) {
    throw new ConflictError(
      "A pessoa ainda não criou a senha. Reenvie o link de ativação — criar a senha por ele já confirma o e-mail.",
      "PASSWORD_NOT_SET",
    );
  }

  if (!usuario.emailConfirmadoEm) {
    await prisma.$transaction(async (tx) => {
      await tx.usuario.update({ where: { id }, data: { emailConfirmadoEm: new Date() } });
      await registrarAuditoria(
        { usuarioId: ator.id, acao: "EMAIL_CONFIRMADO_PELA_COORDENACAO", entidade: "usuario", entidadeId: id, ip: ator.ip },
        tx,
      );
    });
  }

  return { user: await obterUsuario(id), message: "E-mail confirmado. A pessoa já pode entrar com a senha dela." };
}

export interface ResultadoAnonimizacao {
  promotedLeaders: Array<{ teamId: string; teamName: string; newLeaderId: string; newLeaderName: string }>;
  deletedTeams: Array<{ teamId: string; teamName: string }>;
}

const NOME_REMOVIDO = "Usuário removido";
const CORPO_REMOVIDO = "<p>(Conteúdo removido a pedido do titular dos dados — LGPD.)</p>";

/** Como o nome aparece dentro do HTML dos e-mails (mesmo escape dos templates). */
function nomeNoHtml(nome: string): string {
  return nome.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * RNF-02 (LGPD) — exclusão dos dados pessoais.
 *
 * A linha em `usuarios` é mantida (histórico, entregas e comentários apontam
 * para ela), mas nome, e-mail e telefone são anonimizados, a senha e as
 * sessões são descartadas e a conta fica inativa com `excluido_em`.
 *
 * Nas equipes: o aluno sai (`saiu_em`); se era LÍDER, o integrante ativo mais
 * antigo assume; se não houver outro, a equipe é excluída logicamente (Q4).
 * Mentorias são removidas. O último admin ativo não pode ser excluído.
 *
 * Os dados pessoais também saem de onde tinham sido copiados: e-mails que
 * ainda iam ser enviados à pessoa são descartados; os já enviados perdem
 * endereço e conteúdo; o nome some dos e-mails mandados a outras pessoas
 * ("Fulano enviou a versão 2"); o e-mail sai dos detalhes da auditoria e o IP
 * das ações dela; as sessões (IP e navegador) são apagadas.
 */
export async function anonimizarUsuario(id: string, ator: Ator): Promise<ResultadoAnonimizacao> {
  const atual = await prisma.usuario.findFirst({ where: { id, excluidoEm: null } });
  if (!atual) throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");

  if (atual.perfil === "ADMIN" && (await contarOutrosAdminsAtivos(id)) === 0) {
    throw new ConflictError("Este é o último administrador ativo do sistema e não pode ser excluído.", "LAST_ACTIVE_ADMIN");
  }

  // Quem pede a própria exclusão não deixa o IP gravado nas ações do pedido.
  const ipAtor = ator.id === id ? null : (ator.ip ?? null);

  return prisma.$transaction(async (tx) => {
    const resultado: ResultadoAnonimizacao = { promotedLeaders: [], deletedTeams: [] };
    const agora = new Date();

    const lideradas = await tx.equipe.findMany({
      where: { liderId: id, excluidaEm: null },
      select: {
        id: true,
        nome: true,
        integrantes: {
          where: { saiuEm: null, usuarioId: { not: id }, usuario: { excluidoEm: null } },
          orderBy: { entrouEm: "asc" },
          take: 1,
          select: { usuario: { select: { id: true, nome: true } } },
        },
      },
    });

    for (const equipe of lideradas) {
      const substituto = equipe.integrantes[0]?.usuario;
      if (substituto) {
        await tx.equipe.update({ where: { id: equipe.id }, data: { liderId: substituto.id } });
        resultado.promotedLeaders.push({
          teamId: equipe.id,
          teamName: equipe.nome,
          newLeaderId: substituto.id,
          newLeaderName: substituto.nome,
        });
        await registrarAuditoria(
          {
            usuarioId: ator.id,
            acao: "EQUIPE_LIDER_PROMOVIDO",
            entidade: "equipe",
            entidadeId: equipe.id,
            detalhes: { motivo: "LGPD: líder pediu exclusão da conta", novoLiderId: substituto.id },
            ip: ipAtor,
          },
          tx,
        );
      } else {
        await tx.equipe.update({ where: { id: equipe.id }, data: { excluidaEm: agora } });
        resultado.deletedTeams.push({ teamId: equipe.id, teamName: equipe.nome });
        await registrarAuditoria(
          {
            usuarioId: ator.id,
            acao: "EQUIPE_EXCLUIDA",
            entidade: "equipe",
            entidadeId: equipe.id,
            detalhes: { motivo: "LGPD: único integrante pediu exclusão da conta" },
            ip: ipAtor,
          },
          tx,
        );
      }
    }

    const emailAnonimo = `removido+${id}@anonimizado.local`;

    await tx.integranteEquipe.updateMany({ where: { usuarioId: id, saiuEm: null }, data: { saiuEm: agora } });
    await tx.mentorEquipe.deleteMany({ where: { mentorId: id } });
    await tx.sessao.deleteMany({ where: { usuarioId: id } });
    await tx.tokenUsuario.deleteMany({ where: { usuarioId: id } });
    await tx.preferenciaNotificacao.deleteMany({ where: { usuarioId: id } });

    // E-mails para a pessoa: o que não saiu é descartado; o que saiu fica só como registro do envio.
    await tx.notificacao.deleteMany({ where: { destinatarioId: id, status: { not: "ENVIADA" } } });
    await tx.notificacao.updateMany({
      where: { destinatarioId: id },
      data: { emailDestino: emailAnonimo, corpo: CORPO_REMOVIDO, erro: null },
    });
    // O nome completo nos e-mails enviados a outras pessoas. Com uma palavra só,
    // trocar o nome poderia atingir o texto de terceiros — nesse caso fica.
    if (atual.nome.trim().includes(" ")) {
      for (const nome of new Set([atual.nome, nomeNoHtml(atual.nome)])) {
        await tx.$executeRaw`UPDATE notificacoes SET corpo = replace(corpo, ${nome}, ${NOME_REMOVIDO}) WHERE strpos(corpo, ${nome}) > 0`;
      }
    }
    // Auditoria: o histórico de ações fica, mas sem o e-mail e sem o IP da pessoa.
    await tx.$executeRaw`UPDATE registros_auditoria SET detalhes = replace(detalhes::text, ${atual.email}, ${emailAnonimo})::jsonb WHERE strpos(detalhes::text, ${atual.email}) > 0`;
    await tx.registroAuditoria.updateMany({ where: { usuarioId: id }, data: { ip: null } });

    await tx.usuario.update({
      where: { id },
      data: {
        nome: NOME_REMOVIDO,
        email: emailAnonimo,
        telefone: null,
        senhaHash: null,
        cursoId: null,
        semestre: null,
        ativo: false,
        excluidoEm: agora,
      },
    });

    await registrarAuditoria(
      {
        usuarioId: ator.id,
        acao: "USUARIO_EXCLUIDO_LGPD",
        entidade: "usuario",
        entidadeId: id,
        detalhes: { perfil: atual.perfil, ...resultado },
        ip: ipAtor,
      },
      tx,
    );

    return resultado;
  });
}

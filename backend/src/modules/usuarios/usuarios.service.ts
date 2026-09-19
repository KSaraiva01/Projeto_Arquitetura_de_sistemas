import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { registrarAuditoria, type Db } from "../../shared/auditoria";
import { PERFIL_DA_API, PERFIL_PARA_API, semestreDaApi, semestreParaApi, type ApiRole } from "../../shared/dto";
import { ConflictError, NotFoundError } from "../../shared/errors";
import { enviarAtivacaoConta } from "../auth/auth.service";
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

/** RF-03 — nova conta de ADMIN/MENTOR; a pessoa define a senha pelo link de ativação. */
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
        consentimentoLgpdEm: new Date(),
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
  if (input.email && input.email !== atual.email) {
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
    await registrarAuditoria(
      { usuarioId: ator.id, acao: "USUARIO_ATUALIZADO", entidade: "usuario", entidadeId: id, detalhes: { campos: Object.keys(input) }, ip: ator.ip },
      tx,
    );
    return usuario;
  });

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

export interface ResultadoAnonimizacao {
  promotedLeaders: Array<{ teamId: string; teamName: string; newLeaderId: string; newLeaderName: string }>;
  deletedTeams: Array<{ teamId: string; teamName: string }>;
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
 */
export async function anonimizarUsuario(id: string, ator: Ator): Promise<ResultadoAnonimizacao> {
  const atual = await prisma.usuario.findFirst({ where: { id, excluidoEm: null } });
  if (!atual) throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");

  if (atual.perfil === "ADMIN" && (await contarOutrosAdminsAtivos(id)) === 0) {
    throw new ConflictError("Este é o último administrador ativo do sistema e não pode ser excluído.", "LAST_ACTIVE_ADMIN");
  }

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
            ip: ator.ip,
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
            ip: ator.ip,
          },
          tx,
        );
      }
    }

    await tx.integranteEquipe.updateMany({ where: { usuarioId: id, saiuEm: null }, data: { saiuEm: agora } });
    await tx.mentorEquipe.deleteMany({ where: { mentorId: id } });
    await tx.sessao.updateMany({ where: { usuarioId: id, revogadaEm: null }, data: { revogadaEm: agora } });
    await tx.tokenUsuario.deleteMany({ where: { usuarioId: id } });
    await tx.preferenciaNotificacao.deleteMany({ where: { usuarioId: id } });

    await tx.usuario.update({
      where: { id },
      data: {
        nome: "Usuário removido",
        email: `removido+${id}@anonimizado.local`,
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
        ip: ator.ip,
      },
      tx,
    );

    return resultado;
  });
}

import { env } from "../../config/env";
import type { Prisma, TipoToken, Usuario } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { registrarAuditoria, type Db } from "../../shared/auditoria";
import { HASH_FALSO, conferirSenha, gerarHashSenha, gerarTokenOpaco, hashDoToken } from "../../shared/crypto";
import {
  PERFIL_PARA_API,
  STATUS_JORNADA_PARA_API,
  semestreParaApi,
  type ApiJourneyStatus,
  type ApiRole,
} from "../../shared/dto";
import { emailAtivacaoConta, emailRecuperacaoSenha } from "../../shared/email/templates";
import { ForbiddenError, UnauthorizedError } from "../../shared/errors";
import { ACCESS_TOKEN_TTL_SEGUNDOS, assinarAccessToken } from "../../shared/jwt";
import { carregarJornada, numeroColuna } from "../equipes/jornada";
import { enfileirar, processarFilaEmSegundoPlano } from "../notificacoes/notificacoes.service";
import type { NotificationPreferencesInput } from "./auth.schemas";

export interface Contexto {
  ip?: string | null;
  userAgent?: string | null;
}

/** Usuário da sessão no formato do frontend (ApiSessionUser). */
export interface UsuarioSessao {
  id: string;
  name: string;
  email: string;
  role: ApiRole;
  phone: string | null;
  course: string | null;
  semester: string | null;
  isActive: boolean;
  createdAt: Date;
  teams: Array<{
    id: string;
    name: string;
    memberRole: "LEADER" | "MEMBER";
    journeyStage: number;
    journeyStatus: ApiJourneyStatus;
  }>;
  mentoredTeamIds?: string[];
}

export interface Sessao {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UsuarioSessao;
}

type UsuarioComCurso = Prisma.UsuarioGetPayload<{ include: { curso: true } }>;

const incluirCurso = { curso: true } as const;

/**
 * Monta a visão do usuário com o escopo dele: aluno recebe as equipes de que
 * participa (com o papel LEADER/MEMBER derivado de `equipes.lider_id`),
 * mentor recebe as equipes que acompanha, admin vê tudo e não precisa de lista.
 */
export async function montarUsuarioSessao(usuario: UsuarioComCurso): Promise<UsuarioSessao> {
  const participacoes = await prisma.integranteEquipe.findMany({
    where: { usuarioId: usuario.id, saiuEm: null, equipe: { excluidaEm: null } },
    select: {
      equipe: {
        select: {
          id: true,
          nome: true,
          liderId: true,
          statusJornada: true,
          etapaAtual: { select: { id: true, ordem: true, etapaPadraoId: true, nome: true, descricao: true, etapaPadrao: { select: { numero: true } } } },
        },
      },
    },
    orderBy: { entrouEm: "asc" },
  });

  const teams: UsuarioSessao["teams"] = [];
  for (const { equipe } of participacoes) {
    let journeyStage = equipe.etapaAtual?.etapaPadrao?.numero ?? 1;
    if (equipe.etapaAtual && !equipe.etapaAtual.etapaPadrao) {
      journeyStage = numeroColuna(equipe.etapaAtual, await carregarJornada(equipe.id));
    }
    teams.push({
      id: equipe.id,
      name: equipe.nome,
      memberRole: equipe.liderId === usuario.id ? "LEADER" : "MEMBER",
      journeyStage,
      journeyStatus: STATUS_JORNADA_PARA_API[equipe.statusJornada],
    });
  }

  const base: UsuarioSessao = {
    id: usuario.id,
    name: usuario.nome,
    email: usuario.email,
    role: PERFIL_PARA_API[usuario.perfil],
    phone: usuario.telefone,
    course: usuario.curso?.nome ?? null,
    semester: semestreParaApi(usuario.semestre),
    isActive: usuario.ativo,
    createdAt: usuario.criadoEm,
    teams,
  };

  if (usuario.perfil === "MENTOR") {
    const mentorias = await prisma.mentorEquipe.findMany({
      where: { mentorId: usuario.id, equipe: { excluidaEm: null } },
      select: { equipeId: true },
    });
    base.mentoredTeamIds = mentorias.map((m) => m.equipeId);
  }

  return base;
}

async function emitirSessao(usuario: UsuarioComCurso, contexto: Contexto): Promise<Sessao> {
  const refreshToken = gerarTokenOpaco();

  await prisma.sessao.create({
    data: {
      usuarioId: usuario.id,
      refreshTokenHash: hashDoToken(refreshToken),
      expiraEm: new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000),
      userAgent: contexto.userAgent ?? null,
      ip: contexto.ip ?? null,
    },
  });

  return {
    accessToken: assinarAccessToken({ sub: usuario.id, perfil: usuario.perfil }),
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SEGUNDOS,
    user: await montarUsuarioSessao(usuario),
  };
}

/**
 * RF-01 — login com e-mail e senha, o mesmo endpoint para todos os perfis:
 * a `role` na resposta diz ao frontend para qual painel ir. E-mail inexistente
 * e senha errada devolvem a mesma mensagem, para não revelar contas.
 *
 * RF-02: conta criada pelo líder e ainda sem senha (`senha_hash` nulo) não
 * entra — precisa do link de ativação recebido por e-mail.
 */
export async function login(input: { email: string; password: string }, contexto: Contexto): Promise<Sessao> {
  const usuario = await prisma.usuario.findUnique({ where: { email: input.email }, include: incluirCurso });

  // Mesmo sem usuário rodamos o bcrypt, para o tempo de resposta não denunciar a conta.
  const senhaConfere = await conferirSenha(input.password, usuario?.senhaHash ?? HASH_FALSO);

  if (usuario && !usuario.excluidoEm && usuario.senhaHash === null) {
    throw new ForbiddenError(
      "Sua conta ainda não tem senha. Use o link de ativação enviado por e-mail (ou peça um novo em 'Esqueci minha senha').",
      "PASSWORD_NOT_SET",
    );
  }

  if (!usuario || usuario.excluidoEm || !senhaConfere) {
    await registrarAuditoria({
      usuarioId: usuario?.id ?? null,
      acao: "LOGIN_FALHOU",
      entidade: "usuario",
      entidadeId: usuario?.id ?? null,
      detalhes: { email: input.email },
      ip: contexto.ip,
    });
    throw new UnauthorizedError("E-mail ou senha incorretos.", "INVALID_CREDENTIALS");
  }

  if (!usuario.ativo) {
    throw new ForbiddenError("Esta conta está desativada. Procure a coordenação do InfoHub.", "ACCOUNT_DISABLED");
  }

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "LOGIN",
    entidade: "usuario",
    entidadeId: usuario.id,
    ip: contexto.ip,
  });

  return emitirSessao(usuario, contexto);
}

/**
 * Troca um refresh token por uma sessão nova (rotação). Um token já revogado
 * que volta a ser usado indica vazamento: todas as sessões do usuário caem.
 */
export async function renovar(refreshToken: string, contexto: Contexto): Promise<Sessao> {
  const hash = hashDoToken(refreshToken);
  const sessao = await prisma.sessao.findUnique({ where: { refreshTokenHash: hash } });

  if (!sessao) {
    throw new UnauthorizedError("Sessão inválida ou expirada. Faça login novamente.", "INVALID_REFRESH_TOKEN");
  }

  if (sessao.revogadaEm) {
    await prisma.sessao.updateMany({
      where: { usuarioId: sessao.usuarioId, revogadaEm: null },
      data: { revogadaEm: new Date() },
    });
    await registrarAuditoria({
      usuarioId: sessao.usuarioId,
      acao: "SESSAO_REUTILIZADA",
      entidade: "sessao",
      entidadeId: sessao.id,
      ip: contexto.ip,
    });
    throw new UnauthorizedError("Sessão inválida. Faça login novamente.", "INVALID_REFRESH_TOKEN");
  }

  if (sessao.expiraEm.getTime() < Date.now()) {
    throw new UnauthorizedError("Sessão expirada. Faça login novamente.", "INVALID_REFRESH_TOKEN");
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: sessao.usuarioId }, include: incluirCurso });
  if (!usuario || !usuario.ativo || usuario.excluidoEm) {
    await prisma.sessao.update({ where: { id: sessao.id }, data: { revogadaEm: new Date() } });
    throw new UnauthorizedError("Sessão inválida. Faça login novamente.", "INVALID_REFRESH_TOKEN");
  }

  await prisma.sessao.update({ where: { id: sessao.id }, data: { revogadaEm: new Date() } });
  return emitirSessao(usuario, contexto);
}

export async function sair(refreshToken: string | undefined, usuarioId: string | undefined, contexto: Contexto) {
  if (refreshToken) {
    await prisma.sessao.updateMany({
      where: { refreshTokenHash: hashDoToken(refreshToken), revogadaEm: null },
      data: { revogadaEm: new Date() },
    });
  }
  if (usuarioId) {
    await registrarAuditoria({ usuarioId, acao: "LOGOUT", entidade: "usuario", entidadeId: usuarioId, ip: contexto.ip });
  }
}

export async function usuarioAtual(usuarioId: string): Promise<UsuarioSessao> {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, include: incluirCurso });
  if (!usuario) throw new UnauthorizedError("Usuário não encontrado.", "USER_NOT_FOUND");
  return montarUsuarioSessao(usuario);
}

// ---------------------------------------------------------------------------
// Tokens de ativação (RF-02) e recuperação (RF-01)
// ---------------------------------------------------------------------------

/**
 * Gera um token de uso único para o usuário e devolve o valor em claro (só
 * existe no e-mail). Tokens anteriores do mesmo tipo são descartados.
 */
export async function emitirTokenUsuario(usuarioId: string, tipo: TipoToken, db: Db = prisma) {
  const token = gerarTokenOpaco();
  const ttlMs =
    tipo === "ATIVACAO_CONTA"
      ? env.ACTIVATION_EXPIRES_IN_HOURS * 60 * 60 * 1000
      : env.PASSWORD_RESET_EXPIRES_IN_MINUTES * 60 * 1000;

  await db.tokenUsuario.deleteMany({ where: { usuarioId, tipo, usadoEm: null } });
  await db.tokenUsuario.create({
    data: { usuarioId, tipo, tokenHash: hashDoToken(token), expiraEm: new Date(Date.now() + ttlMs) },
  });

  return token;
}

/** Gera o token de ativação e enfileira o e-mail (RF-02/RF-03). */
export async function enviarAtivacaoConta(
  usuario: Pick<Usuario, "id" | "nome" | "email">,
  contexto: string,
  db: Db = prisma,
) {
  const token = await emitirTokenUsuario(usuario.id, "ATIVACAO_CONTA", db);
  await enfileirar(
    {
      tipo: "ATIVACAO_CONTA",
      destinatario: { id: usuario.id, email: usuario.email, nome: usuario.nome },
      modelo: emailAtivacaoConta(usuario.nome, token, contexto),
    },
    db,
  );
}

/**
 * RF-01 — "esqueci minha senha". A resposta é sempre a mesma, exista o
 * e-mail ou não. Conta ainda sem senha recebe um novo link de ATIVAÇÃO.
 */
export async function solicitarRecuperacao(email: string, contexto: Contexto) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.ativo || usuario.excluidoEm) return;

  if (usuario.senhaHash === null) {
    await enviarAtivacaoConta(usuario, "Sua conta no InfoHub ainda não foi ativada.");
  } else {
    const token = await emitirTokenUsuario(usuario.id, "RECUPERACAO_SENHA");
    await enfileirar({
      tipo: "RECUPERACAO_SENHA",
      destinatario: { id: usuario.id, email: usuario.email, nome: usuario.nome },
      modelo: emailRecuperacaoSenha(usuario.nome, token),
    });
  }

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "RECUPERACAO_SENHA_SOLICITADA",
    entidade: "usuario",
    entidadeId: usuario.id,
    ip: contexto.ip,
  });
  processarFilaEmSegundoPlano();
}

/**
 * RF-01/RF-02 — define a senha a partir do token do e-mail (ativação ou
 * recuperação). Uso único, com validade; derruba as sessões abertas.
 */
export async function definirSenha(input: { token: string; password: string }, contexto: Contexto) {
  const registro = await prisma.tokenUsuario.findUnique({
    where: { tokenHash: hashDoToken(input.token) },
    include: { usuario: true },
  });

  if (!registro || registro.usadoEm || registro.expiraEm.getTime() < Date.now()) {
    throw new UnauthorizedError(
      "Este link é inválido ou já expirou. Solicite um novo em 'Esqueci minha senha'.",
      "INVALID_RESET_TOKEN",
    );
  }
  if (!registro.usuario.ativo || registro.usuario.excluidoEm) {
    throw new UnauthorizedError("Este link é inválido.", "INVALID_RESET_TOKEN");
  }

  const senhaHash = await gerarHashSenha(input.password);

  await prisma.$transaction(async (tx) => {
    await tx.tokenUsuario.update({ where: { id: registro.id }, data: { usadoEm: new Date() } });
    await tx.usuario.update({ where: { id: registro.usuarioId }, data: { senhaHash } });
    await tx.sessao.updateMany({
      where: { usuarioId: registro.usuarioId, revogadaEm: null },
      data: { revogadaEm: new Date() },
    });
    await registrarAuditoria(
      {
        usuarioId: registro.usuarioId,
        acao: registro.tipo === "ATIVACAO_CONTA" ? "CONTA_ATIVADA" : "SENHA_REDEFINIDA",
        entidade: "usuario",
        entidadeId: registro.usuarioId,
        ip: contexto.ip,
      },
      tx,
    );
  });

  return registro.tipo;
}

/** Troca de senha por usuário autenticado. Derruba as outras sessões. */
export async function alterarSenha(
  usuarioId: string,
  input: { currentPassword: string; newPassword: string },
  contexto: Contexto,
) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new UnauthorizedError("Usuário não encontrado.", "USER_NOT_FOUND");

  const confere = await conferirSenha(input.currentPassword, usuario.senhaHash ?? HASH_FALSO);
  if (!confere || usuario.senhaHash === null) {
    throw new UnauthorizedError("A senha atual está incorreta.", "INVALID_CREDENTIALS");
  }

  const senhaHash = await gerarHashSenha(input.newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id: usuarioId }, data: { senhaHash } });
    await tx.sessao.updateMany({ where: { usuarioId, revogadaEm: null }, data: { revogadaEm: new Date() } });
    await registrarAuditoria(
      { usuarioId, acao: "SENHA_ALTERADA", entidade: "usuario", entidadeId: usuarioId, ip: contexto.ip },
      tx,
    );
  });
}

/** Confere a senha do próprio usuário antes de uma ação sensível (exclusão LGPD). */
export async function confirmarSenhaPropria(usuarioId: string, senha: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  const confere = await conferirSenha(senha, usuario?.senhaHash ?? HASH_FALSO);
  if (!usuario || !usuario.senhaHash || !confere) {
    throw new UnauthorizedError("Senha incorreta.", "INVALID_CREDENTIALS");
  }
}

// ---------------------------------------------------------------------------
// RF-21 — preferências de notificação
// ---------------------------------------------------------------------------

export async function listarPreferencias(usuarioId: string) {
  const linhas = await prisma.preferenciaNotificacao.findMany({ where: { usuarioId } });
  return { data: linhas.map((p) => ({ type: p.tipo, enabled: p.ativo })) };
}

export async function salvarPreferencias(usuarioId: string, input: NotificationPreferencesInput) {
  await prisma.$transaction(
    input.preferences.map((p) =>
      prisma.preferenciaNotificacao.upsert({
        where: { usuarioId_tipo: { usuarioId, tipo: p.type } },
        update: { ativo: p.enabled },
        create: { usuarioId, tipo: p.type, ativo: p.enabled },
      }),
    ),
  );
  return listarPreferencias(usuarioId);
}

import type { PoolClient } from "pg";
import { withTransaction } from "../../config/database.js";
import { env } from "../../config/env.js";
import { recordAudit } from "../../shared/audit.js";
import {
  ForbiddenError,
  UnauthorizedError,
} from "../../shared/errors/AppError.js";
import { sendMail } from "../../shared/mail/mailer.js";
import {
  firstAccessTemplate,
  passwordChangedTemplate,
  passwordResetTemplate,
} from "../../shared/mail/templates.js";
import {
  DUMMY_PASSWORD_HASH,
  generateOpaqueToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../../shared/utils/crypto.js";
import {
  getAccessTokenTtlSeconds,
  signAccessToken,
} from "../../shared/utils/jwt.js";
import * as repository from "./auth.repository.js";
import type { UserRow } from "./auth.repository.js";

interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuthenticatedSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: PublicUser;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRow["perfil"];
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
    journeyStatus: string;
  }>;
  mentoredTeamIds?: string[];
}

function toPublicUser(
  user: UserRow,
  teams: PublicUser["teams"],
  mentoredTeamIds?: string[],
): PublicUser {
  return {
    id: user.id,
    name: user.nome,
    email: user.email,
    role: user.perfil,
    phone: user.telefone,
    course: user.curso,
    semester: user.semestre,
    isActive: user.ativo,
    createdAt: user.criado_em,
    teams,
    ...(mentoredTeamIds ? { mentoredTeamIds } : {}),
  };
}

/**
 * Monta a visão pública do usuário com o escopo de acesso dele:
 * aluno recebe as equipes de que participa, mentor recebe as equipes que
 * acompanha (Q10), administrador não precisa de escopo — vê tudo.
 */
export async function buildPublicUser(user: UserRow): Promise<PublicUser> {
  const memberships = await repository.findTeamMemberships(user.id);
  const teams = memberships.map((row) => ({
    id: row.equipe_id,
    name: row.equipe_nome,
    memberRole: row.papel,
    journeyStage: row.etapa_numero,
    journeyStatus: row.status_jornada,
  }));

  if (user.perfil === "MENTOR") {
    const mentoredTeamIds = await repository.findMentoredTeamIds(user.id);
    return toPublicUser(user, teams, mentoredTeamIds);
  }

  return toPublicUser(user, teams);
}

async function issueSession(
  user: UserRow,
  context: RequestContext,
): Promise<AuthenticatedSession> {
  const refreshToken = generateOpaqueToken();
  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  );

  await repository.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
    userAgent: context.userAgent ?? null,
    ipAddress: context.ipAddress ?? null,
  });

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.perfil,
    email: user.email,
    name: user.nome,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: getAccessTokenTtlSeconds(),
    user: await buildPublicUser(user),
  };
}

/**
 * RF-01 — login com e-mail e senha.
 *
 * Administrador, mentor e aluno usam o mesmo endpoint; é a `role` na resposta
 * que diz ao frontend para qual painel redirecionar. E-mail inexistente e
 * senha errada devolvem exatamente a mesma mensagem, para não revelar quais
 * contas existem.
 *
 * RF-02: conta criada pelo formulário ainda sem senha (senha_hash NULL) não
 * entra — precisa usar o link de primeiro acesso recebido por e-mail.
 */
export async function login(
  input: { email: string; password: string },
  context: RequestContext,
): Promise<AuthenticatedSession> {
  const user = await repository.findUserByEmail(input.email);

  // Mesmo sem usuário (ou sem senha) rodamos um bcrypt.compare, para o tempo
  // de resposta não denunciar a existência da conta.
  const passwordMatches = await verifyPassword(
    input.password,
    user?.senha_hash ?? DUMMY_PASSWORD_HASH,
  );

  if (user && user.senha_hash === null) {
    throw new ForbiddenError(
      "Sua conta ainda não tem senha. Use o link de primeiro acesso enviado por e-mail (ou peça um novo em 'Esqueci minha senha').",
      "PASSWORD_NOT_SET",
    );
  }

  if (!user || !passwordMatches) {
    await recordAudit({
      userId: user?.id ?? null,
      action: "USER_LOGIN_FAILED",
      entityType: "usuario",
      entityId: user?.id ?? null,
      details: { email: input.email },
      ipAddress: context.ipAddress ?? null,
    });

    throw new UnauthorizedError(
      "E-mail ou senha incorretos.",
      "INVALID_CREDENTIALS",
    );
  }

  if (!user.ativo) {
    throw new ForbiddenError(
      "Esta conta está desativada. Procure a coordenação do InfoHub.",
      "ACCOUNT_DISABLED",
    );
  }

  await repository.touchLastLogin(user.id);
  await recordAudit({
    userId: user.id,
    action: "USER_LOGIN",
    entityType: "usuario",
    entityId: user.id,
    ipAddress: context.ipAddress ?? null,
  });

  return issueSession(user, context);
}

/**
 * Troca um refresh token por uma nova sessão.
 *
 * O token antigo é revogado e um novo é emitido (rotação): se um refresh
 * token vazar e for usado, o legítimo para de funcionar e a fraude aparece.
 */
export async function refresh(
  refreshToken: string,
  context: RequestContext,
): Promise<AuthenticatedSession> {
  const tokenHash = hashToken(refreshToken);
  const stored = await repository.findRefreshTokenByHash(tokenHash);

  if (!stored || stored.revogado_em || stored.expira_em.getTime() < Date.now()) {
    throw new UnauthorizedError(
      "Sessão inválida ou expirada. Faça login novamente.",
      "INVALID_REFRESH_TOKEN",
    );
  }

  const user = await repository.findUserById(stored.usuario_id);

  if (!user || !user.ativo) {
    await repository.revokeAllRefreshTokens(stored.usuario_id);
    throw new UnauthorizedError(
      "Sessão inválida. Faça login novamente.",
      "INVALID_REFRESH_TOKEN",
    );
  }

  await repository.revokeRefreshToken(tokenHash);
  return issueSession(user, context);
}

export async function logout(
  refreshToken: string | undefined,
  userId: string | undefined,
  context: RequestContext,
): Promise<void> {
  if (refreshToken) {
    await repository.revokeRefreshToken(hashToken(refreshToken));
  }

  if (userId) {
    await recordAudit({
      userId,
      action: "USER_LOGOUT",
      entityType: "usuario",
      entityId: userId,
      ipAddress: context.ipAddress ?? null,
    });
  }
}

/**
 * Gera (dentro de uma transação) um token de definição de senha para o
 * usuário e devolve o valor em claro, que só existe no e-mail. Usado no
 * cadastro do aluno (RF-02), na criação de admin/mentor (RF-03) e na
 * recuperação (RF-01).
 */
export async function issuePasswordToken(
  client: PoolClient,
  userId: string,
  purpose: "FIRST_ACCESS" | "PASSWORD_RESET",
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateOpaqueToken();
  const ttlMs =
    purpose === "FIRST_ACCESS"
      ? env.FIRST_ACCESS_EXPIRES_IN_HOURS * 60 * 60 * 1000
      : env.PASSWORD_RESET_EXPIRES_IN_MINUTES * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);

  await repository.invalidatePasswordTokens(userId, client);
  await repository.createPasswordToken({
    userId,
    tokenHash: hashToken(token),
    purpose,
    expiresAt,
    client,
  });

  return { token, expiresAt };
}

/**
 * RF-01 — solicitação de recuperação de senha.
 *
 * A resposta é sempre a mesma, exista o e-mail ou não: o endpoint é público
 * e não pode servir para descobrir quem tem conta no sistema.
 *
 * Se a conta ainda não tem senha (aluno que perdeu o e-mail de boas-vindas),
 * o que sai é um novo link de PRIMEIRO ACESSO, não de recuperação.
 */
export async function requestPasswordReset(
  email: string,
  context: RequestContext,
): Promise<void> {
  const user = await repository.findUserByEmail(email);

  if (!user || !user.ativo) {
    return;
  }

  const purpose = user.senha_hash === null ? "FIRST_ACCESS" : "PASSWORD_RESET";

  const { token } = await withTransaction(async (client) => {
    const issued = await issuePasswordToken(client, user.id, purpose);
    await recordAudit(
      {
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        entityType: "usuario",
        entityId: user.id,
        details: { purpose },
        ipAddress: context.ipAddress ?? null,
      },
      client,
    );
    return issued;
  });

  if (purpose === "FIRST_ACCESS") {
    const memberships = await repository.findTeamMemberships(user.id);
    const template = firstAccessTemplate(
      user.nome,
      memberships[0]?.equipe_nome ?? "InfoHub",
      token,
      env.FIRST_ACCESS_EXPIRES_IN_HOURS,
    );
    await sendMail({
      to: user.email,
      recipientId: user.id,
      type: "FIRST_ACCESS",
      ...template,
    });
    return;
  }

  const template = passwordResetTemplate(
    user.nome,
    token,
    env.PASSWORD_RESET_EXPIRES_IN_MINUTES,
  );

  await sendMail({
    to: user.email,
    recipientId: user.id,
    type: "PASSWORD_RESET",
    ...template,
  });
}

/**
 * RF-01/RF-02 — conclusão: define a senha usando o token do e-mail. Serve
 * tanto para o primeiro acesso quanto para a recuperação; o token é de uso
 * único e tem validade.
 */
export async function resetPassword(
  input: { token: string; password: string },
  context: RequestContext,
): Promise<void> {
  const tokenHash = hashToken(input.token);
  const stored = await repository.findPasswordTokenByHash(tokenHash);

  if (!stored || stored.usado_em || stored.expira_em.getTime() < Date.now()) {
    throw new UnauthorizedError(
      "Este link é inválido ou já expirou. Solicite um novo em 'Esqueci minha senha'.",
      "INVALID_RESET_TOKEN",
    );
  }

  const user = await repository.findUserById(stored.usuario_id);

  if (!user || !user.ativo) {
    throw new UnauthorizedError(
      "Este link de redefinição é inválido.",
      "INVALID_RESET_TOKEN",
    );
  }

  const passwordHash = await hashPassword(input.password);

  await withTransaction(async (client) => {
    await repository.consumePasswordToken(client, {
      tokenId: stored.id,
      userId: user.id,
      passwordHash,
    });
    await recordAudit(
      {
        userId: user.id,
        action: "PASSWORD_RESET_COMPLETED",
        entityType: "usuario",
        entityId: user.id,
        details: { purpose: stored.finalidade },
        ipAddress: context.ipAddress ?? null,
      },
      client,
    );
  });

  // No primeiro acesso não faz sentido avisar que "a senha foi alterada".
  if (stored.finalidade === "PASSWORD_RESET") {
    const template = passwordChangedTemplate(user.nome);
    await sendMail({
      to: user.email,
      recipientId: user.id,
      type: "PASSWORD_RESET",
      ...template,
    });
  }
}

/** Troca de senha por um usuário já autenticado. */
export async function changePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
  context: RequestContext,
): Promise<void> {
  const user = await repository.findUserById(userId);

  if (!user) {
    throw new UnauthorizedError("Usuário não encontrado.", "USER_NOT_FOUND");
  }

  const matches = await verifyPassword(
    input.currentPassword,
    user.senha_hash ?? DUMMY_PASSWORD_HASH,
  );

  if (!matches || user.senha_hash === null) {
    throw new UnauthorizedError(
      "A senha atual está incorreta.",
      "INVALID_CREDENTIALS",
    );
  }

  const passwordHash = await hashPassword(input.newPassword);

  await withTransaction(async (client) => {
    await repository.updatePassword(client, user.id, passwordHash);
    await repository.revokeAllRefreshTokens(user.id, client);
    await recordAudit(
      {
        userId: user.id,
        action: "PASSWORD_CHANGED",
        entityType: "usuario",
        entityId: user.id,
        ipAddress: context.ipAddress ?? null,
      },
      client,
    );
  });

  const template = passwordChangedTemplate(user.nome);
  await sendMail({
    to: user.email,
    recipientId: user.id,
    type: "PASSWORD_RESET",
    ...template,
  });
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await repository.findUserById(userId);

  if (!user) {
    throw new UnauthorizedError("Usuário não encontrado.", "USER_NOT_FOUND");
  }

  return buildPublicUser(user);
}

/** Confere a senha do próprio usuário antes de uma ação sensível (exclusão LGPD). */
export async function assertOwnPassword(userId: string, password: string) {
  const user = await repository.findUserById(userId);
  const matches = await verifyPassword(
    password,
    user?.senha_hash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !user.senha_hash || !matches) {
    throw new UnauthorizedError("Senha incorreta.", "INVALID_CREDENTIALS");
  }

  return user;
}

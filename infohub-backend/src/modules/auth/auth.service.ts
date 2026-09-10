import { withTransaction } from "../../config/database.js";
import { env } from "../../config/env.js";
import { recordAudit } from "../../shared/audit.js";
import {
  ForbiddenError,
  UnauthorizedError,
} from "../../shared/errors/AppError.js";
import { sendMail } from "../../shared/mail/mailer.js";
import {
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
  role: UserRow["role"];
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
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    course: user.course,
    semester: user.semester,
    isActive: user.is_active,
    createdAt: user.created_at,
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
    id: row.team_id,
    name: row.team_name,
    memberRole: row.member_role,
    journeyStage: row.journey_stage,
    journeyStatus: row.journey_status,
  }));

  if (user.role === "MENTOR") {
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
    role: user.role,
    email: user.email,
    name: user.name,
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
 */
export async function login(
  input: { email: string; password: string },
  context: RequestContext,
): Promise<AuthenticatedSession> {
  const user = await repository.findUserByEmail(input.email);

  // Mesmo sem usuário rodamos um bcrypt.compare, para o tempo de resposta
  // não denunciar a existência da conta.
  const passwordMatches = await verifyPassword(
    input.password,
    user?.password_hash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    await recordAudit({
      userId: user?.id ?? null,
      action: "USER_LOGIN_FAILED",
      entityType: "app_user",
      entityId: user?.id ?? null,
      details: { email: input.email },
      ipAddress: context.ipAddress ?? null,
    });

    throw new UnauthorizedError(
      "E-mail ou senha incorretos.",
      "INVALID_CREDENTIALS",
    );
  }

  if (!user.is_active) {
    throw new ForbiddenError(
      "Esta conta está desativada. Procure a coordenação do InfoHub.",
      "ACCOUNT_DISABLED",
    );
  }

  await repository.touchLastLogin(user.id);
  await recordAudit({
    userId: user.id,
    action: "USER_LOGIN",
    entityType: "app_user",
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

  if (!stored || stored.revoked_at || stored.expires_at.getTime() < Date.now()) {
    throw new UnauthorizedError(
      "Sessão inválida ou expirada. Faça login novamente.",
      "INVALID_REFRESH_TOKEN",
    );
  }

  const user = await repository.findUserById(stored.user_id);

  if (!user || !user.is_active) {
    await repository.revokeAllRefreshTokens(stored.user_id);
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
      entityType: "app_user",
      entityId: userId,
      ipAddress: context.ipAddress ?? null,
    });
  }
}

/**
 * RF-01 — solicitação de recuperação de senha.
 *
 * A resposta é sempre a mesma, exista o e-mail ou não: o endpoint é público
 * e não pode servir para descobrir quem tem conta no sistema.
 */
export async function requestPasswordReset(
  email: string,
  context: RequestContext,
): Promise<void> {
  const user = await repository.findUserByEmail(email);

  if (!user || !user.is_active) {
    return;
  }

  const token = generateOpaqueToken();
  const expiresAt = new Date(
    Date.now() + env.PASSWORD_RESET_EXPIRES_IN_MINUTES * 60 * 1000,
  );

  await withTransaction(async (client) => {
    await repository.invalidatePasswordResetTokens(user.id, client);
    await repository.createPasswordResetToken({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      client,
    });
    await recordAudit(
      {
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        entityType: "app_user",
        entityId: user.id,
        ipAddress: context.ipAddress ?? null,
      },
      client,
    );
  });

  const template = passwordResetTemplate(
    user.name,
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

/** RF-01 — conclusão da recuperação: token de uso único, com validade. */
export async function resetPassword(
  input: { token: string; password: string },
  context: RequestContext,
): Promise<void> {
  const tokenHash = hashToken(input.token);
  const stored = await repository.findPasswordResetByHash(tokenHash);

  if (!stored || stored.used_at || stored.expires_at.getTime() < Date.now()) {
    throw new UnauthorizedError(
      "Este link de redefinição é inválido ou já expirou. Solicite um novo.",
      "INVALID_RESET_TOKEN",
    );
  }

  const user = await repository.findUserById(stored.user_id);

  if (!user || !user.is_active) {
    throw new UnauthorizedError(
      "Este link de redefinição é inválido.",
      "INVALID_RESET_TOKEN",
    );
  }

  const passwordHash = await hashPassword(input.password);

  await withTransaction(async (client) => {
    await repository.consumePasswordReset(client, {
      tokenId: stored.id,
      userId: user.id,
      passwordHash,
    });
    await recordAudit(
      {
        userId: user.id,
        action: "PASSWORD_RESET_COMPLETED",
        entityType: "app_user",
        entityId: user.id,
        ipAddress: context.ipAddress ?? null,
      },
      client,
    );
  });

  const template = passwordChangedTemplate(user.name);
  await sendMail({
    to: user.email,
    recipientId: user.id,
    type: "PASSWORD_RESET",
    ...template,
  });
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

  const matches = await verifyPassword(input.currentPassword, user.password_hash);

  if (!matches) {
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
        entityType: "app_user",
        entityId: user.id,
        ipAddress: context.ipAddress ?? null,
      },
      client,
    );
  });

  const template = passwordChangedTemplate(user.name);
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

import { withTransaction } from "../../config/database.js";
import { env } from "../../config/env.js";
import { recordAudit } from "../../shared/audit.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors/AppError.js";
import { sendMail } from "../../shared/mail/mailer.js";
import { accountCreatedTemplate } from "../../shared/mail/templates.js";
import {
  generateOpaqueToken,
  generateTemporaryPassword,
  hashPassword,
  hashToken,
} from "../../shared/utils/crypto.js";
import * as authRepository from "../auth/auth.repository.js";
import * as repository from "./users.repository.js";
import type { UserSummaryRow } from "./users.repository.js";
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
} from "./users.schemas.js";

export interface PublicUserSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  course: string | null;
  semester: string | null;
  role: UserSummaryRow["role"];
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  mentoredTeams: number;
}

function toPublic(row: UserSummaryRow): PublicUserSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    course: row.course,
    semester: row.semester,
    role: row.role,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    mentoredTeams: row.mentored_teams,
  };
}

export async function listUsers(filters: ListUsersQuery) {
  const { rows, total } = await repository.list(filters);

  return {
    data: rows.map(toPublic),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    },
  };
}

export async function getUser(id: string): Promise<PublicUserSummary> {
  const user = await repository.findById(id);

  if (!user) {
    throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");
  }

  return toPublic(user);
}

/**
 * RF-03 — cria uma conta de administrador ou mentor.
 *
 * Ninguém escolhe a senha por outra pessoa: gravamos uma senha aleatória que
 * jamais é exibida e mandamos um link de definição de senha por e-mail,
 * reaproveitando o mesmo fluxo (e a mesma expiração) da recuperação.
 */
export async function createUser(
  input: CreateUserInput,
  actor: { id: string; ipAddress?: string | null },
): Promise<PublicUserSummary> {
  const existing = await repository.findByEmail(input.email);

  if (existing) {
    throw new ConflictError(
      "Já existe um usuário cadastrado com este e-mail.",
      "EMAIL_ALREADY_USED",
    );
  }

  const temporaryPasswordHash = await hashPassword(generateTemporaryPassword());
  const resetToken = generateOpaqueToken();
  const expiresAt = new Date(
    Date.now() + env.PASSWORD_RESET_EXPIRES_IN_MINUTES * 60 * 1000,
  );

  const userId = await withTransaction(async (client) => {
    const id = await repository.insert(client, {
      name: input.name,
      email: input.email,
      passwordHash: temporaryPasswordHash,
      role: input.role,
      phone: input.phone ?? null,
    });

    await authRepository.createPasswordResetToken({
      userId: id,
      tokenHash: hashToken(resetToken),
      expiresAt,
      client,
    });

    await recordAudit(
      {
        userId: actor.id,
        action: "USER_CREATED",
        entityType: "app_user",
        entityId: id,
        details: { email: input.email, role: input.role },
        ipAddress: actor.ipAddress ?? null,
      },
      client,
    );

    return id;
  });

  const template = accountCreatedTemplate(
    input.name,
    input.role,
    resetToken,
    env.PASSWORD_RESET_EXPIRES_IN_MINUTES,
  );

  await sendMail({
    to: input.email,
    recipientId: userId,
    type: "ACCOUNT_CREATED",
    ...template,
  });

  return getUser(userId);
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actor: { id: string; ipAddress?: string | null },
): Promise<PublicUserSummary> {
  const current = await repository.findById(id);

  if (!current) {
    throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");
  }

  if (input.role && current.role === "STUDENT") {
    throw new BadRequestError(
      "Não é possível transformar uma conta de aluno em administrador ou mentor por aqui.",
      "CANNOT_PROMOTE_STUDENT",
    );
  }

  // Rebaixar o último administrador ativo deixaria o sistema sem ninguém
  // capaz de gerenciar contas.
  if (input.role && input.role !== "ADMIN" && current.role === "ADMIN") {
    const remaining = await repository.countActiveAdmins(id);
    if (remaining === 0) {
      throw new ConflictError(
        "Este é o último administrador ativo. Promova outro antes de alterar o perfil deste.",
        "LAST_ACTIVE_ADMIN",
      );
    }
  }

  if (input.email) {
    const existing = await repository.findByEmail(input.email);
    if (existing && existing.id !== id) {
      throw new ConflictError(
        "Já existe um usuário cadastrado com este e-mail.",
        "EMAIL_ALREADY_USED",
      );
    }
  }

  const updated = await repository.update(id, {
    name: input.name,
    email: input.email,
    role: input.role,
    phone: input.phone,
    course: input.course,
    semester: input.semester,
  });

  if (!updated) {
    throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");
  }

  await recordAudit({
    userId: actor.id,
    action: "USER_UPDATED",
    entityType: "app_user",
    entityId: id,
    details: { changes: input },
    ipAddress: actor.ipAddress ?? null,
  });

  return toPublic(updated);
}

/**
 * RF-03 — ativa ou desativa uma conta.
 *
 * Desativar também revoga as sessões abertas: sem isso o usuário continuaria
 * navegando até o access token expirar.
 */
export async function setUserStatus(
  id: string,
  isActive: boolean,
  actor: { id: string; ipAddress?: string | null },
): Promise<PublicUserSummary> {
  const current = await repository.findById(id);

  if (!current) {
    throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");
  }

  if (!isActive && id === actor.id) {
    throw new BadRequestError(
      "Você não pode desativar a própria conta.",
      "CANNOT_DEACTIVATE_SELF",
    );
  }

  if (!isActive && current.role === "ADMIN") {
    const remaining = await repository.countActiveAdmins(id);
    if (remaining === 0) {
      throw new ConflictError(
        "Este é o último administrador ativo do sistema e não pode ser desativado.",
        "LAST_ACTIVE_ADMIN",
      );
    }
  }

  if (current.is_active === isActive) {
    return toPublic(current);
  }

  await repository.setActive(id, isActive);

  if (!isActive) {
    await authRepository.revokeAllRefreshTokens(id);
  }

  await recordAudit({
    userId: actor.id,
    action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    entityType: "app_user",
    entityId: id,
    ipAddress: actor.ipAddress ?? null,
  });

  return getUser(id);
}

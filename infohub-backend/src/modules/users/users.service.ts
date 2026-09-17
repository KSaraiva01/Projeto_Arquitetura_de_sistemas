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
import * as authRepository from "../auth/auth.repository.js";
import { issuePasswordToken } from "../auth/auth.service.js";
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
  role: UserSummaryRow["perfil"];
  isActive: boolean;
  hasPassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  mentoredTeams: number;
}

interface Actor {
  id: string;
  ipAddress?: string | null;
}

function toPublic(row: UserSummaryRow): PublicUserSummary {
  return {
    id: row.id,
    name: row.nome,
    email: row.email,
    phone: row.telefone,
    course: row.curso,
    semester: row.semestre,
    role: row.perfil,
    isActive: row.ativo,
    hasPassword: row.senha_definida,
    lastLoginAt: row.ultimo_login_em,
    createdAt: row.criado_em,
    mentoredTeams: row.equipes_mentoradas,
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

  if (!user || user.anonimizado_em) {
    throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");
  }

  return toPublic(user);
}

/**
 * RF-03 — cria uma conta de administrador ou mentor.
 *
 * Ninguém escolhe a senha por outra pessoa: a conta nasce com senha_hash
 * NULL e o usuário recebe por e-mail um link de primeiro acesso, o mesmo
 * mecanismo do cadastro do aluno (RF-02).
 */
export async function createUser(
  input: CreateUserInput,
  actor: Actor,
): Promise<PublicUserSummary> {
  const existing = await repository.findByEmail(input.email);

  if (existing) {
    throw new ConflictError(
      "Já existe um usuário cadastrado com este e-mail.",
      "EMAIL_ALREADY_USED",
    );
  }

  const { userId, token } = await withTransaction(async (client) => {
    const id = await repository.insert(client, {
      name: input.name,
      email: input.email,
      role: input.role,
      phone: input.phone ?? null,
    });

    const issued = await issuePasswordToken(client, id, "FIRST_ACCESS");

    await recordAudit(
      {
        userId: actor.id,
        action: "USER_CREATED",
        entityType: "usuario",
        entityId: id,
        details: { email: input.email, role: input.role },
        ipAddress: actor.ipAddress ?? null,
      },
      client,
    );

    return { userId: id, token: issued.token };
  });

  const template = accountCreatedTemplate(
    input.name,
    input.role,
    token,
    env.FIRST_ACCESS_EXPIRES_IN_HOURS * 60,
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
  actor: Actor,
): Promise<PublicUserSummary> {
  const current = await repository.findById(id);

  if (!current || current.anonimizado_em) {
    throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");
  }

  if (input.role && current.perfil === "STUDENT") {
    throw new BadRequestError(
      "Não é possível transformar uma conta de aluno em administrador ou mentor por aqui.",
      "CANNOT_PROMOTE_STUDENT",
    );
  }

  // Rebaixar o último administrador ativo deixaria o sistema sem ninguém
  // capaz de gerenciar contas.
  if (input.role && input.role !== "ADMIN" && current.perfil === "ADMIN") {
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
    nome: input.name,
    email: input.email,
    perfil: input.role,
    telefone: input.phone,
    curso: input.course,
    semestre: input.semester,
  });

  if (!updated) {
    throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");
  }

  await recordAudit({
    userId: actor.id,
    action: "USER_UPDATED",
    entityType: "usuario",
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
  actor: Actor,
): Promise<PublicUserSummary> {
  const current = await repository.findById(id);

  if (!current || current.anonimizado_em) {
    throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");
  }

  if (!isActive && id === actor.id) {
    throw new BadRequestError(
      "Você não pode desativar a própria conta.",
      "CANNOT_DEACTIVATE_SELF",
    );
  }

  if (!isActive && current.perfil === "ADMIN") {
    const remaining = await repository.countActiveAdmins(id);
    if (remaining === 0) {
      throw new ConflictError(
        "Este é o último administrador ativo do sistema e não pode ser desativado.",
        "LAST_ACTIVE_ADMIN",
      );
    }
  }

  if (current.ativo === isActive) {
    return toPublic(current);
  }

  await repository.setActive(id, isActive);

  if (!isActive) {
    await authRepository.revokeAllRefreshTokens(id);
  }

  await recordAudit({
    userId: actor.id,
    action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    entityType: "usuario",
    entityId: id,
    ipAddress: actor.ipAddress ?? null,
  });

  return getUser(id);
}

export interface AnonymizeResult {
  promotedLeaders: Array<{ teamId: string; teamName: string; newLeaderName: string }>;
  deletedTeams: Array<{ teamId: string; teamName: string }>;
}

/**
 * RNF-02 (LGPD) — atende o pedido de exclusão de conta.
 *
 * O que acontece com cada coisa ligada à pessoa:
 *  - dados pessoais (nome, e-mail, telefone, curso...) são apagados da linha
 *    de `usuario`, que fica só como âncora — assim as entregas, comentários
 *    e o histórico da EQUIPE continuam íntegros, mas sem identificar ninguém;
 *  - se ela era líder e a equipe tem outro integrante ativo, o mais antigo é
 *    promovido a líder (Q1: nenhuma equipe fica sem líder);
 *  - se ela era a única integrante, a equipe é excluída logicamente (Q4);
 *  - vínculos de membro e de mentor são encerrados; sessões e tokens somem.
 */
export async function anonymizeUser(
  id: string,
  actor: Actor,
): Promise<AnonymizeResult> {
  const current = await repository.findById(id);

  if (!current || current.anonimizado_em) {
    throw new NotFoundError("Usuário não encontrado.", "USER_NOT_FOUND");
  }

  if (current.perfil === "ADMIN") {
    const remaining = await repository.countActiveAdmins(id);
    if (remaining === 0) {
      throw new ConflictError(
        "Este é o último administrador ativo do sistema e não pode ser excluído.",
        "LAST_ACTIVE_ADMIN",
      );
    }
  }

  return withTransaction(async (client) => {
    const result: AnonymizeResult = { promotedLeaders: [], deletedTeams: [] };

    const leaderships = await repository.findLeaderships(client, id);

    // Primeiro o líder sai (para liberar o índice "um líder por equipe"),
    // depois o substituto assume.
    await repository.deactivateMemberships(client, id);

    for (const team of leaderships) {
      if (team.substituto_id) {
        await repository.promoteToLeader(client, team.equipe_id, team.substituto_id);
        result.promotedLeaders.push({
          teamId: team.equipe_id,
          teamName: team.equipe_nome,
          newLeaderName: team.substituto_nome ?? "",
        });
      } else {
        await repository.softDeleteTeam(client, team.equipe_id, actor.id);
        result.deletedTeams.push({ teamId: team.equipe_id, teamName: team.equipe_nome });
        await recordAudit(
          {
            userId: actor.id,
            action: "TEAM_DELETED",
            entityType: "equipe",
            entityId: team.equipe_id,
            details: { reason: "LGPD: único integrante pediu exclusão da conta" },
            ipAddress: actor.ipAddress ?? null,
          },
          client,
        );
      }
    }

    await repository.removeMentorships(client, id);
    await repository.anonymize(client, id);

    await recordAudit(
      {
        userId: actor.id,
        action: "USER_ANONYMIZED",
        entityType: "usuario",
        entityId: id,
        details: {
          role: current.perfil,
          promotedLeaders: result.promotedLeaders,
          deletedTeams: result.deletedTeams,
        },
        ipAddress: actor.ipAddress ?? null,
      },
      client,
    );

    return result;
  });
}

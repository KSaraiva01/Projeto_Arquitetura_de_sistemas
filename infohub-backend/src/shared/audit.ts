import type { PoolClient } from "pg";
import { query } from "../config/database.js";

/**
 * Ações auditadas (RNF-05). Manter a lista fechada evita que cada módulo
 * invente um nome diferente para a mesma coisa.
 */
export type AuditAction =
  | "USER_LOGIN"
  | "USER_LOGIN_FAILED"
  | "USER_LOGOUT"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_ACTIVATED"
  | "USER_DEACTIVATED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "PASSWORD_CHANGED"
  | "USER_ANONYMIZED"
  | "TEAM_REGISTERED"
  | "TEAM_DELETED"
  | "TEAM_STAGE_CHANGED"
  | "TEAM_STAGE_ADDED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_SUBMITTED"
  | "TASK_APPROVED"
  | "TASK_REJECTED";

export interface AuditInput {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Grava uma entrada de auditoria.
 *
 * Passe `client` quando a ação fizer parte de uma transação — assim o
 * registro some junto se a operação principal sofrer rollback.
 */
export async function recordAudit(
  input: AuditInput,
  client?: PoolClient,
): Promise<void> {
  const sql = `
    INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, detalhes, ip)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  const params = [
    input.userId ?? null,
    input.action,
    input.entityType,
    input.entityId ?? null,
    input.details ? JSON.stringify(input.details) : null,
    input.ipAddress ?? null,
  ];

  if (client) {
    await client.query(sql, params);
    return;
  }

  await query(sql, params);
}

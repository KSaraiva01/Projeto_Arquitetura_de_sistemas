import type { PoolClient } from "pg";
import { query, queryOne } from "../../config/database.js";
import type { UserRole } from "../../shared/types/domain.js";
import type { ListUsersQuery } from "./users.schemas.js";

export interface UserSummaryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  course: string | null;
  semester: string | null;
  role: UserRole;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  mentored_teams: number;
}

const SUMMARY_COLUMNS = `
  u.id, u.name, u.email, u.phone, u.course, u.semester,
  u.role, u.is_active, u.last_login_at, u.created_at,
  (SELECT COUNT(*) FROM team_mentor tm WHERE tm.mentor_id = u.id) AS mentored_teams
`;

export function findById(id: string) {
  return queryOne<UserSummaryRow>(
    `SELECT ${SUMMARY_COLUMNS} FROM app_user u WHERE u.id = $1`,
    [id],
  );
}

export function findByEmail(email: string) {
  return queryOne<{ id: string }>(
    `SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
}

/**
 * Listagem paginada com filtros (base para RF-07 no painel do administrador).
 * As condições são montadas em array para que os valores sempre entrem como
 * parâmetros ($1, $2...) — nunca concatenados na string SQL.
 */
export async function list(filters: ListUsersQuery) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.role) {
    params.push(filters.role);
    conditions.push(`u.role = $${params.length}`);
  }

  if (filters.isActive !== undefined) {
    params.push(filters.isActive);
    conditions.push(`u.is_active = $${params.length}`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (filters.page - 1) * filters.pageSize;

  const totalResult = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM app_user u ${where}`,
    params,
  );

  params.push(filters.pageSize, offset);

  const rowsResult = await query<UserSummaryRow>(
    `SELECT ${SUMMARY_COLUMNS}
       FROM app_user u
       ${where}
      ORDER BY u.name
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return {
    rows: rowsResult.rows,
    total: totalResult.rows[0]?.total ?? 0,
  };
}

export async function insert(
  client: PoolClient,
  data: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    phone?: string | null;
  },
) {
  const result = await client.query<{ id: string }>(
    `INSERT INTO app_user (name, email, password_hash, role, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [data.name, data.email, data.passwordHash, data.role, data.phone ?? null],
  );

  return result.rows[0]!.id;
}

/**
 * UPDATE dinâmico: só as colunas realmente enviadas entram no SET.
 * Retorna null quando nada foi alterado.
 */
export async function update(
  id: string,
  data: Record<string, unknown>,
): Promise<UserSummaryRow | null> {
  const entries = Object.entries(data).filter(
    ([, value]) => value !== undefined,
  );

  if (entries.length === 0) return findById(id);

  const params: unknown[] = [id];
  const assignments = entries.map(([column, value]) => {
    params.push(value);
    return `${column} = $${params.length}`;
  });

  const result = await query<{ id: string }>(
    `UPDATE app_user SET ${assignments.join(", ")} WHERE id = $1 RETURNING id`,
    params,
  );

  if (result.rowCount === 0) return null;
  return findById(id);
}

export async function setActive(id: string, isActive: boolean) {
  const result = await query<{ id: string }>(
    `UPDATE app_user SET is_active = $2 WHERE id = $1 RETURNING id`,
    [id, isActive],
  );

  return (result.rowCount ?? 0) > 0;
}

/** Impede que o sistema fique sem nenhum administrador ativo. */
export async function countActiveAdmins(excludeUserId?: string) {
  const result = await query<{ total: number }>(
    `SELECT COUNT(*) AS total
       FROM app_user
      WHERE role = 'ADMIN' AND is_active AND ($1::uuid IS NULL OR id <> $1)`,
    [excludeUserId ?? null],
  );

  return result.rows[0]?.total ?? 0;
}

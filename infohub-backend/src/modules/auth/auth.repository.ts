import type { PoolClient } from "pg";
import { query, queryOne } from "../../config/database.js";
import type {
  JourneyStatus,
  TeamMemberRole,
  UserRole,
} from "../../shared/types/domain.js";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  course: string | null;
  semester: string | null;
  role: UserRole;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
}

export interface TeamMembershipRow {
  team_id: string;
  team_name: string;
  member_role: TeamMemberRole;
  journey_stage: number;
  journey_status: JourneyStatus;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  expires_at: Date;
  revoked_at: Date | null;
}

export interface PasswordResetRow {
  id: string;
  user_id: string;
  expires_at: Date;
  used_at: Date | null;
}

const USER_COLUMNS = `
  id, name, email, password_hash, phone, course, semester,
  role, is_active, last_login_at, created_at
`;

export function findUserByEmail(email: string) {
  return queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM app_user WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
}

export function findUserById(id: string) {
  return queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM app_user WHERE id = $1`,
    [id],
  );
}

export async function touchLastLogin(userId: string) {
  await query(`UPDATE app_user SET last_login_at = NOW() WHERE id = $1`, [
    userId,
  ]);
}

/**
 * Equipes das quais o usuário participa.
 *
 * O frontend usa `member_role` para decidir entre a área do líder e a do
 * integrante — no banco, o papel de líder é por equipe (team_member.role),
 * não uma role global do usuário.
 */
export async function findTeamMemberships(userId: string) {
  const result = await query<TeamMembershipRow>(
    `SELECT tm.team_id,
            t.name           AS team_name,
            tm.role          AS member_role,
            t.journey_stage,
            t.journey_status
       FROM team_member tm
       JOIN team t ON t.id = tm.team_id
      WHERE tm.user_id = $1
        AND tm.is_active
        AND t.is_active
      ORDER BY tm.joined_at`,
    [userId],
  );

  return result.rows;
}

/** Q10 — o mentor enxerga apenas as equipes que acompanha. */
export async function findMentoredTeamIds(mentorId: string) {
  const result = await query<{ team_id: string }>(
    `SELECT tm.team_id
       FROM team_mentor tm
       JOIN team t ON t.id = tm.team_id
      WHERE tm.mentor_id = $1 AND t.is_active`,
    [mentorId],
  );

  return result.rows.map((row) => row.team_id);
}

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------

export async function createRefreshToken(params: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  await query(
    `INSERT INTO refresh_token (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      params.userId,
      params.tokenHash,
      params.expiresAt,
      params.userAgent?.slice(0, 255) ?? null,
      params.ipAddress ?? null,
    ],
  );
}

export function findRefreshTokenByHash(tokenHash: string) {
  return queryOne<RefreshTokenRow>(
    `SELECT id, user_id, expires_at, revoked_at
       FROM refresh_token
      WHERE token_hash = $1`,
    [tokenHash],
  );
}

export async function revokeRefreshToken(tokenHash: string) {
  const result = await query(
    `UPDATE refresh_token
        SET revoked_at = NOW()
      WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash],
  );

  return (result.rowCount ?? 0) > 0;
}

/** Encerra todas as sessões do usuário (troca de senha, desativação da conta). */
export async function revokeAllRefreshTokens(
  userId: string,
  client?: PoolClient,
) {
  const sql = `UPDATE refresh_token SET revoked_at = NOW()
                WHERE user_id = $1 AND revoked_at IS NULL`;

  if (client) {
    await client.query(sql, [userId]);
    return;
  }
  await query(sql, [userId]);
}

/** Limpeza de tokens vencidos; pode ser chamada por uma rotina agendada. */
export async function deleteExpiredRefreshTokens() {
  const result = await query(
    `DELETE FROM refresh_token WHERE expires_at < NOW() - INTERVAL '30 days'`,
  );
  return result.rowCount ?? 0;
}

// ---------------------------------------------------------------------------
// Tokens de recuperação de senha
// ---------------------------------------------------------------------------

export async function createPasswordResetToken(params: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  client?: PoolClient;
}) {
  const sql = `INSERT INTO password_reset_token (user_id, token_hash, expires_at)
               VALUES ($1, $2, $3)`;
  const values = [params.userId, params.tokenHash, params.expiresAt];

  if (params.client) {
    await params.client.query(sql, values);
    return;
  }
  await query(sql, values);
}

export function findPasswordResetByHash(tokenHash: string) {
  return queryOne<PasswordResetRow>(
    `SELECT id, user_id, expires_at, used_at
       FROM password_reset_token
      WHERE token_hash = $1`,
    [tokenHash],
  );
}

/**
 * Invalida os pedidos de redefinição ainda abertos do usuário.
 * Chamado antes de gerar um novo, para que só o último link funcione.
 */
export async function invalidatePasswordResetTokens(
  userId: string,
  client?: PoolClient,
) {
  const sql = `UPDATE password_reset_token SET used_at = NOW()
                WHERE user_id = $1 AND used_at IS NULL`;

  if (client) {
    await client.query(sql, [userId]);
    return;
  }
  await query(sql, [userId]);
}

/**
 * Aplica a nova senha, marca o token como usado e derruba as sessões —
 * tudo na mesma transação, para não existir estado intermediário em que a
 * senha mudou mas o token continua válido.
 */
export async function consumePasswordReset(
  client: PoolClient,
  params: { tokenId: string; userId: string; passwordHash: string },
) {
  await client.query(
    `UPDATE password_reset_token SET used_at = NOW() WHERE id = $1`,
    [params.tokenId],
  );
  await client.query(
    `UPDATE app_user SET password_hash = $2 WHERE id = $1`,
    [params.userId, params.passwordHash],
  );
  await client.query(
    `UPDATE refresh_token SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [params.userId],
  );
}

export async function updatePassword(
  client: PoolClient,
  userId: string,
  passwordHash: string,
) {
  await client.query(`UPDATE app_user SET password_hash = $2 WHERE id = $1`, [
    userId,
    passwordHash,
  ]);
}

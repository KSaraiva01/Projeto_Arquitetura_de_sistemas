import type { PoolClient } from "pg";
import { query, queryOne } from "../../config/database.js";
import type {
  JourneyStatus,
  TeamMemberRole,
  TokenPurpose,
  UserRole,
} from "../../shared/types/domain.js";

export interface UserRow {
  id: string;
  nome: string;
  email: string;
  senha_hash: string | null;
  telefone: string | null;
  curso: string | null;
  semestre: string | null;
  perfil: UserRole;
  ativo: boolean;
  ultimo_login_em: Date | null;
  criado_em: Date;
}

export interface TeamMembershipRow {
  equipe_id: string;
  equipe_nome: string;
  papel: TeamMemberRole;
  etapa_numero: number;
  status_jornada: JourneyStatus;
}

export interface SessionTokenRow {
  id: string;
  usuario_id: string;
  expira_em: Date;
  revogado_em: Date | null;
}

export interface PasswordTokenRow {
  id: string;
  usuario_id: string;
  finalidade: TokenPurpose;
  expira_em: Date;
  usado_em: Date | null;
}

const USER_COLUMNS = `
  id, nome, email, senha_hash, telefone, curso, semestre,
  perfil, ativo, ultimo_login_em, criado_em
`;

export function findUserByEmail(email: string) {
  return queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM usuario WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
}

export function findUserById(id: string) {
  return queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM usuario WHERE id = $1`,
    [id],
  );
}

export async function touchLastLogin(userId: string) {
  await query(`UPDATE usuario SET ultimo_login_em = NOW() WHERE id = $1`, [
    userId,
  ]);
}

/**
 * Equipes das quais o usuário participa.
 *
 * O front usa `papel` para decidir entre a área do líder e a do integrante.
 * `etapa_numero` é a coluna do kanban em que a equipe está: o número da última
 * etapa padrão da jornada dela cuja ordem é <= a da etapa atual (uma etapa
 * extra criada depois da 4 aparece na coluna 4).
 */
export async function findTeamMemberships(userId: string) {
  const result = await query<TeamMembershipRow>(
    `SELECT em.equipe_id,
            e.nome           AS equipe_nome,
            em.papel,
            e.status_jornada,
            (SELECT MAX(et.numero)
               FROM equipe_etapa ee2
               JOIN etapa et ON et.id = ee2.etapa_id
              WHERE ee2.equipe_id = e.id AND ee2.ordem <= atual.ordem) AS etapa_numero
       FROM equipe_membro em
       JOIN equipe e        ON e.id = em.equipe_id
       JOIN equipe_etapa atual ON atual.id = e.etapa_atual_id
      WHERE em.usuario_id = $1
        AND em.ativo
        AND e.excluida_em IS NULL
      ORDER BY em.entrou_em`,
    [userId],
  );

  return result.rows;
}

/** Q10 — o mentor enxerga apenas as equipes que acompanha. */
export async function findMentoredTeamIds(mentorId: string) {
  const result = await query<{ equipe_id: string }>(
    `SELECT em.equipe_id
       FROM equipe_mentor em
       JOIN equipe e ON e.id = em.equipe_id
      WHERE em.mentor_id = $1 AND e.excluida_em IS NULL`,
    [mentorId],
  );

  return result.rows.map((row) => row.equipe_id);
}

// ---------------------------------------------------------------------------
// Sessões (refresh tokens) — tabela token_sessao
// ---------------------------------------------------------------------------

export async function createRefreshToken(params: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  await query(
    `INSERT INTO token_sessao (usuario_id, token_hash, expira_em, user_agent, ip)
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
  return queryOne<SessionTokenRow>(
    `SELECT id, usuario_id, expira_em, revogado_em
       FROM token_sessao
      WHERE token_hash = $1`,
    [tokenHash],
  );
}

export async function revokeRefreshToken(tokenHash: string) {
  const result = await query(
    `UPDATE token_sessao
        SET revogado_em = NOW()
      WHERE token_hash = $1 AND revogado_em IS NULL`,
    [tokenHash],
  );

  return (result.rowCount ?? 0) > 0;
}

/** Encerra todas as sessões do usuário (troca de senha, desativação da conta). */
export async function revokeAllRefreshTokens(
  userId: string,
  client?: PoolClient,
) {
  const sql = `UPDATE token_sessao SET revogado_em = NOW()
                WHERE usuario_id = $1 AND revogado_em IS NULL`;

  if (client) {
    await client.query(sql, [userId]);
    return;
  }
  await query(sql, [userId]);
}

// ---------------------------------------------------------------------------
// Tokens de senha (primeiro acesso e recuperação) — tabela token_senha
// ---------------------------------------------------------------------------

export async function createPasswordToken(params: {
  userId: string;
  tokenHash: string;
  purpose: TokenPurpose;
  expiresAt: Date;
  client?: PoolClient;
}) {
  const sql = `INSERT INTO token_senha (usuario_id, token_hash, finalidade, expira_em)
               VALUES ($1, $2, $3, $4)`;
  const values = [params.userId, params.tokenHash, params.purpose, params.expiresAt];

  if (params.client) {
    await params.client.query(sql, values);
    return;
  }
  await query(sql, values);
}

export function findPasswordTokenByHash(tokenHash: string) {
  return queryOne<PasswordTokenRow>(
    `SELECT id, usuario_id, finalidade, expira_em, usado_em
       FROM token_senha
      WHERE token_hash = $1`,
    [tokenHash],
  );
}

/**
 * Invalida os tokens ainda abertos do usuário.
 * Chamado antes de gerar um novo, para que só o último link funcione.
 */
export async function invalidatePasswordTokens(
  userId: string,
  client?: PoolClient,
) {
  const sql = `UPDATE token_senha SET usado_em = NOW()
                WHERE usuario_id = $1 AND usado_em IS NULL`;

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
export async function consumePasswordToken(
  client: PoolClient,
  params: { tokenId: string; userId: string; passwordHash: string },
) {
  await client.query(
    `UPDATE token_senha SET usado_em = NOW() WHERE id = $1`,
    [params.tokenId],
  );
  await client.query(
    `UPDATE usuario SET senha_hash = $2 WHERE id = $1`,
    [params.userId, params.passwordHash],
  );
  await client.query(
    `UPDATE token_sessao SET revogado_em = NOW()
      WHERE usuario_id = $1 AND revogado_em IS NULL`,
    [params.userId],
  );
}

export async function updatePassword(
  client: PoolClient,
  userId: string,
  passwordHash: string,
) {
  await client.query(`UPDATE usuario SET senha_hash = $2 WHERE id = $1`, [
    userId,
    passwordHash,
  ]);
}

import type { PoolClient } from "pg";
import { query, queryOne } from "../../config/database.js";
import type { UserRole } from "../../shared/types/domain.js";
import type { ListUsersQuery } from "./users.schemas.js";

export interface UserSummaryRow {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  curso: string | null;
  semestre: string | null;
  perfil: UserRole;
  ativo: boolean;
  senha_definida: boolean;
  anonimizado_em: Date | null;
  ultimo_login_em: Date | null;
  criado_em: Date;
  equipes_mentoradas: number;
}

const SUMMARY_COLUMNS = `
  u.id, u.nome, u.email, u.telefone, u.curso, u.semestre,
  u.perfil, u.ativo, (u.senha_hash IS NOT NULL) AS senha_definida,
  u.anonimizado_em, u.ultimo_login_em, u.criado_em,
  (SELECT COUNT(*)::int FROM equipe_mentor em WHERE em.mentor_id = u.id) AS equipes_mentoradas
`;

export function findById(id: string) {
  return queryOne<UserSummaryRow>(
    `SELECT ${SUMMARY_COLUMNS} FROM usuario u WHERE u.id = $1`,
    [id],
  );
}

export function findByEmail(email: string) {
  return queryOne<{ id: string; perfil: UserRole; anonimizado_em: Date | null }>(
    `SELECT id, perfil, anonimizado_em FROM usuario WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
}

/**
 * Listagem paginada com filtros (RF-03, painel do administrador).
 * As condições são montadas em array para que os valores sempre entrem como
 * parâmetros ($1, $2...) — nunca concatenados na string SQL.
 */
export async function list(filters: ListUsersQuery) {
  const conditions: string[] = ["u.anonimizado_em IS NULL"];
  const params: unknown[] = [];

  if (filters.role) {
    params.push(filters.role);
    conditions.push(`u.perfil = $${params.length}`);
  }

  if (filters.isActive !== undefined) {
    params.push(filters.isActive);
    conditions.push(`u.ativo = $${params.length}`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(u.nome ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const offset = (filters.page - 1) * filters.pageSize;

  const totalResult = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM usuario u ${where}`,
    params,
  );

  params.push(filters.pageSize, offset);

  const rowsResult = await query<UserSummaryRow>(
    `SELECT ${SUMMARY_COLUMNS}
       FROM usuario u
       ${where}
      ORDER BY u.nome
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return {
    rows: rowsResult.rows,
    total: totalResult.rows[0]?.total ?? 0,
  };
}

/**
 * Cria a conta SEM senha: senha_hash fica NULL até o usuário usar o link de
 * primeiro acesso (RF-02/RF-03).
 */
export async function insert(
  client: PoolClient,
  data: {
    name: string;
    email: string;
    role: UserRole;
    phone?: string | null;
    course?: string | null;
    semester?: string | null;
    consent?: boolean;
  },
) {
  const result = await client.query<{ id: string }>(
    `INSERT INTO usuario (nome, email, perfil, telefone, curso, semestre, consentimento_lgpd_em)
     VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $7 THEN NOW() END)
     RETURNING id`,
    [
      data.name,
      data.email,
      data.role,
      data.phone ?? null,
      data.course ?? null,
      data.semester ?? null,
      data.consent ?? false,
    ],
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
    `UPDATE usuario SET ${assignments.join(", ")} WHERE id = $1 RETURNING id`,
    params,
  );

  if (result.rowCount === 0) return null;
  return findById(id);
}

export async function setActive(id: string, isActive: boolean) {
  const result = await query<{ id: string }>(
    `UPDATE usuario SET ativo = $2 WHERE id = $1 RETURNING id`,
    [id, isActive],
  );

  return (result.rowCount ?? 0) > 0;
}

/** Impede que o sistema fique sem nenhum administrador ativo. */
export async function countActiveAdmins(excludeUserId?: string) {
  const result = await query<{ total: number }>(
    `SELECT COUNT(*) AS total
       FROM usuario
      WHERE perfil = 'ADMIN' AND ativo AND ($1::uuid IS NULL OR id <> $1)`,
    [excludeUserId ?? null],
  );

  return result.rows[0]?.total ?? 0;
}

// ---------------------------------------------------------------------------
// RNF-02 (LGPD) — exclusão de conta
// ---------------------------------------------------------------------------

export interface LeadershipRow {
  equipe_id: string;
  equipe_nome: string;
  substituto_id: string | null;
  substituto_nome: string | null;
}

/**
 * Equipes ativas em que o usuário é líder, já com o integrante mais antigo
 * que pode assumir a liderança (ou NULL se ele era o único).
 */
export async function findLeaderships(client: PoolClient, userId: string) {
  const result = await client.query<LeadershipRow>(
    `SELECT em.equipe_id,
            e.nome AS equipe_nome,
            sub.usuario_id AS substituto_id,
            su.nome        AS substituto_nome
       FROM equipe_membro em
       JOIN equipe e ON e.id = em.equipe_id
  LEFT JOIN LATERAL (
              SELECT m2.usuario_id
                FROM equipe_membro m2
                JOIN usuario u2 ON u2.id = m2.usuario_id
               WHERE m2.equipe_id = em.equipe_id
                 AND m2.usuario_id <> em.usuario_id
                 AND m2.ativo AND u2.ativo AND u2.anonimizado_em IS NULL
               ORDER BY m2.entrou_em, u2.nome
               LIMIT 1
            ) sub ON TRUE
  LEFT JOIN usuario su ON su.id = sub.usuario_id
      WHERE em.usuario_id = $1
        AND em.papel = 'LEADER'
        AND em.ativo
        AND e.excluida_em IS NULL`,
    [userId],
  );

  return result.rows;
}

export async function promoteToLeader(
  client: PoolClient,
  teamId: string,
  userId: string,
) {
  await client.query(
    `UPDATE equipe_membro SET papel = 'LEADER'
      WHERE equipe_id = $1 AND usuario_id = $2`,
    [teamId, userId],
  );
}

export async function deactivateMemberships(client: PoolClient, userId: string) {
  await client.query(
    `UPDATE equipe_membro SET ativo = FALSE, saiu_em = NOW()
      WHERE usuario_id = $1 AND ativo`,
    [userId],
  );
}

export async function removeMentorships(client: PoolClient, userId: string) {
  await client.query(`DELETE FROM equipe_mentor WHERE mentor_id = $1`, [userId]);
}

export async function softDeleteTeam(
  client: PoolClient,
  teamId: string,
  actorId: string | null,
) {
  await client.query(
    `UPDATE equipe SET excluida_em = NOW(), excluida_por = $2
      WHERE id = $1 AND excluida_em IS NULL`,
    [teamId, actorId],
  );
}

/**
 * Apaga os dados pessoais e deixa a linha só como "âncora" das entregas,
 * comentários e histórico que ela assinou. O e-mail vira um valor único
 * inválido para liberar o endereço real para um novo cadastro.
 */
export async function anonymize(client: PoolClient, userId: string) {
  await client.query(
    `UPDATE usuario
        SET nome = 'Usuário removido',
            email = 'removido-' || id::text || '@anonimizado.invalid',
            senha_hash = NULL,
            telefone = NULL,
            curso = NULL,
            semestre = NULL,
            ativo = FALSE,
            anonimizado_em = NOW()
      WHERE id = $1`,
    [userId],
  );
  await client.query(`DELETE FROM token_sessao WHERE usuario_id = $1`, [userId]);
  await client.query(`DELETE FROM token_senha WHERE usuario_id = $1`, [userId]);
}

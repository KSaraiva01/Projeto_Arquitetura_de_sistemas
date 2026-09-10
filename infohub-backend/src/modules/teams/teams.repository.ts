import type { PoolClient } from "pg";
import { query, queryOne } from "../../config/database.js";
import { buildTeamScopeCondition } from "../../shared/scope.js";
import type {
  IdeaStage,
  JourneyStatus,
  TeamMemberRole,
} from "../../shared/types/domain.js";
import type { AuthenticatedUser } from "../../types/express.js";
import type { ListTeamsQuery } from "./teams.schemas.js";

export interface TeamRow {
  id: string;
  name: string;
  description: string;
  category_id: string;
  category_name: string;
  idea_stage: IdeaStage;
  journey_stage: number;
  journey_status: JourneyStatus;
  semester: string;
  how_did_you_hear: string | null;
  is_active: boolean;
  created_at: Date;
  leader_id: string | null;
  leader_name: string | null;
  leader_email: string | null;
  leader_course: string | null;
  member_count: number;
  open_tasks: number;
  overdue_tasks: number;
  mentors: Array<{ id: string; name: string }>;
}

export interface TeamMemberDetailRow {
  user_id: string;
  name: string;
  email: string;
  course: string | null;
  semester: string | null;
  phone: string | null;
  member_role: TeamMemberRole;
  joined_at: Date;
}

export interface StageHistoryRow {
  id: string;
  from_stage: number | null;
  to_stage: number;
  reason: string | null;
  changed_at: Date;
  changed_by_name: string | null;
}

export interface PendingTaskRow {
  id: string;
  title: string;
  journey_stage: number;
  status: string;
  due_date: string;
}

/**
 * Colunas do cartão do kanban: além dos dados da equipe, o líder, a
 * contagem de integrantes e o resumo de tarefas que o cartão exibe.
 *
 * Os mentores vêm agregados como JSON para evitar o problema clássico de
 * uma equipe com 2 mentores virar 2 linhas e duplicar o cartão.
 */
const TEAM_CARD_COLUMNS = `
  t.id, t.name, t.description, t.category_id, t.idea_stage,
  t.journey_stage, t.journey_status, t.semester, t.how_did_you_hear,
  t.is_active, t.created_at,
  c.name AS category_name,
  leader.user_id  AS leader_id,
  lu.name         AS leader_name,
  lu.email        AS leader_email,
  lu.course       AS leader_course,
  (SELECT COUNT(*)::int FROM team_member mc
    WHERE mc.team_id = t.id AND mc.is_active)                       AS member_count,
  (SELECT COUNT(*)::int FROM task tk
    WHERE tk.team_id = t.id
      AND tk.status NOT IN ('APPROVED'))                            AS open_tasks,
  (SELECT COUNT(*)::int FROM task tk
    WHERE tk.team_id = t.id AND tk.status = 'OVERDUE')              AS overdue_tasks,
  COALESCE((
    SELECT json_agg(json_build_object('id', mu.id, 'name', mu.name) ORDER BY mu.name)
      FROM team_mentor tm
      JOIN app_user mu ON mu.id = tm.mentor_id
     WHERE tm.team_id = t.id
  ), '[]'::json) AS mentors
`;

const TEAM_CARD_JOINS = `
       FROM team t
       JOIN idea_category c ON c.id = t.category_id
  LEFT JOIN team_member leader
         ON leader.team_id = t.id
        AND leader.role = 'LEADER'
        AND leader.is_active
  LEFT JOIN app_user lu ON lu.id = leader.user_id
`;

/**
 * RF-06/RF-07 — equipes visíveis para o usuário, com filtros.
 *
 * Sem paginação de propósito: o kanban precisa de todas as colunas
 * preenchidas de uma vez, e a escala do InfoHub é de dezenas de equipes por
 * semestre, não milhares.
 */
export async function listTeams(
  user: AuthenticatedUser,
  filters: ListTeamsQuery,
) {
  const params: unknown[] = [];
  const conditions: string[] = [];

  const scope = buildTeamScopeCondition(user, params);
  if (scope) conditions.push(scope);

  if (!filters.includeInactive) {
    conditions.push("t.is_active");
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    const i = params.length;
    conditions.push(
      `(t.name ILIKE $${i} OR t.description ILIKE $${i} OR lu.name ILIKE $${i} OR c.name ILIKE $${i})`,
    );
  }

  if (filters.stage) {
    params.push(filters.stage);
    conditions.push(`t.journey_stage = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`t.journey_status = $${params.length}`);
  }

  if (filters.categoryId) {
    params.push(filters.categoryId);
    conditions.push(`t.category_id = $${params.length}`);
  }

  if (filters.semester) {
    params.push(filters.semester);
    conditions.push(`t.semester = $${params.length}`);
  }

  if (filters.course) {
    params.push(filters.course);
    conditions.push(`lu.course = $${params.length}`);
  }

  if (filters.mentorId) {
    params.push(filters.mentorId);
    conditions.push(
      `EXISTS (SELECT 1 FROM team_mentor f_tm
                WHERE f_tm.team_id = t.id AND f_tm.mentor_id = $${params.length})`,
    );
  }

  if (filters.taskStatus) {
    params.push(filters.taskStatus);
    conditions.push(
      `EXISTS (SELECT 1 FROM task f_tk
                WHERE f_tk.team_id = t.id AND f_tk.status = $${params.length})`,
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query<TeamRow>(
    `SELECT ${TEAM_CARD_COLUMNS}
     ${TEAM_CARD_JOINS}
     ${where}
     ORDER BY t.journey_stage, t.created_at`,
    params,
  );

  return result.rows;
}

/** Uma equipe, respeitando o escopo do usuário. Null quando fora do escopo. */
export async function findTeamById(user: AuthenticatedUser, teamId: string) {
  const params: unknown[] = [teamId];
  const conditions = ["t.id = $1"];

  const scope = buildTeamScopeCondition(user, params);
  if (scope) conditions.push(scope);

  return queryOne<TeamRow>(
    `SELECT ${TEAM_CARD_COLUMNS}
     ${TEAM_CARD_JOINS}
     WHERE ${conditions.join(" AND ")}`,
    params,
  );
}

/** Existe a equipe, ignorando escopo? Serve para distinguir 404 de 403. */
export async function teamExists(teamId: string) {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM team WHERE id = $1`,
    [teamId],
  );
  return row !== null;
}

export async function findMembers(teamId: string) {
  const result = await query<TeamMemberDetailRow>(
    `SELECT m.user_id, u.name, u.email, u.course, u.semester, u.phone,
            m.role AS member_role, m.joined_at
       FROM team_member m
       JOIN app_user u ON u.id = m.user_id
      WHERE m.team_id = $1 AND m.is_active
      ORDER BY (m.role = 'LEADER') DESC, u.name`,
    [teamId],
  );
  return result.rows;
}

/** RF-08 — histórico de etapas da equipe. */
export async function findStageHistory(teamId: string) {
  const result = await query<StageHistoryRow>(
    `SELECT h.id, h.from_stage, h.to_stage, h.reason, h.changed_at,
            u.name AS changed_by_name
       FROM team_stage_history h
  LEFT JOIN app_user u ON u.id = h.changed_by
      WHERE h.team_id = $1
      ORDER BY h.changed_at DESC`,
    [teamId],
  );
  return result.rows;
}

/**
 * RN-01 — tarefas obrigatórias que ainda não foram aprovadas nas etapas que
 * a equipe está deixando para trás.
 *
 * O intervalo é [fromStage, toStage), ou seja: ao pular da etapa 3 para a 5,
 * checa as obrigatórias das etapas 3 e 4.
 */
export async function findPendingMandatoryTasks(
  teamId: string,
  fromStage: number,
  toStage: number,
) {
  const result = await query<PendingTaskRow>(
    `SELECT id, title, journey_stage, status, due_date
       FROM task
      WHERE team_id = $1
        AND is_mandatory
        AND status <> 'APPROVED'
        AND journey_stage >= $2
        AND journey_stage < $3
      ORDER BY journey_stage, due_date`,
    [teamId, fromStage, toStage],
  );
  return result.rows;
}

export async function updateStage(
  client: PoolClient,
  params: {
    teamId: string;
    fromStage: number;
    toStage: number;
    changedBy: string;
    reason: string | null;
  },
) {
  await client.query(`UPDATE team SET journey_stage = $2 WHERE id = $1`, [
    params.teamId,
    params.toStage,
  ]);

  await client.query(
    `INSERT INTO team_stage_history (team_id, from_stage, to_stage, changed_by, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      params.teamId,
      params.fromStage,
      params.toStage,
      params.changedBy,
      params.reason,
    ],
  );
}

/**
 * Recalcula o status da jornada.
 *
 * "Ao concluir a Etapa 6 com todos os entregáveis aprovados, a equipe é
 * marcada como Pronta para o InovAMF" — e o inverso também vale: se uma
 * entrega for reaberta depois disso, a equipe volta para IN_PROGRESS.
 * Uma equipe já encaminhada (REFERRED) não é mexida.
 */
export async function recomputeJourneyStatus(
  client: PoolClient,
  teamId: string,
): Promise<JourneyStatus | null> {
  const result = await client.query<{ journey_status: JourneyStatus }>(
    `UPDATE team t
        SET journey_status = CASE
              WHEN t.journey_stage = 6
               AND NOT EXISTS (
                     SELECT 1 FROM task tk
                      WHERE tk.team_id = t.id
                        AND tk.is_mandatory
                        AND tk.status <> 'APPROVED'
                   )
               AND EXISTS (
                     SELECT 1 FROM task tk
                      WHERE tk.team_id = t.id AND tk.is_mandatory
                   )
              THEN 'READY_FOR_INOVAMF'::journey_status
              ELSE 'IN_PROGRESS'::journey_status
            END
      WHERE t.id = $1
        AND t.journey_status <> 'REFERRED'
      RETURNING t.journey_status`,
    [teamId],
  );

  return result.rows[0]?.journey_status ?? null;
}

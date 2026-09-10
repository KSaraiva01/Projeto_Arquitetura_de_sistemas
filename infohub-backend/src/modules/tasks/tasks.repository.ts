import { query, queryOne } from "../../config/database.js";
import { buildTeamScopeCondition } from "../../shared/scope.js";
import type { TaskStatus } from "../../shared/types/domain.js";
import type { AuthenticatedUser } from "../../types/express.js";
import type { CalendarQuery, ListTasksQuery } from "./tasks.schemas.js";

export interface TaskRow {
  id: string;
  team_id: string;
  team_name: string;
  title: string;
  description: string | null;
  journey_stage: number;
  due_date: string;
  status: TaskStatus;
  is_mandatory: boolean;
  created_at: Date;
  submission_count: number;
  last_submission_at: Date | null;
}

export interface CalendarEventRow {
  kind: "DUE" | "REMINDER";
  event_date: string;
  task_id: string;
  title: string;
  journey_stage: number;
  status: TaskStatus;
  is_mandatory: boolean;
  team_id: string;
  team_name: string;
  reminder_sent: boolean | null;
}

const TASK_COLUMNS = `
  tk.id, tk.team_id, tk.title, tk.description, tk.journey_stage,
  tk.due_date, tk.status, tk.is_mandatory, tk.created_at,
  t.name AS team_name,
  (SELECT COUNT(*)::int FROM task_submission s WHERE s.task_id = tk.id) AS submission_count,
  (SELECT MAX(s.submitted_at) FROM task_submission s WHERE s.task_id = tk.id) AS last_submission_at
`;

/**
 * Condições comuns a toda leitura de tarefa: só as tarefas de equipes que o
 * usuário enxerga (RNF-03). O escopo é aplicado sobre a tabela `team`,
 * apelidada de `t` na query.
 */
function baseConditions(user: AuthenticatedUser, params: unknown[]) {
  const conditions = ["t.is_active"];
  const scope = buildTeamScopeCondition(user, params);
  if (scope) conditions.push(scope);
  return conditions;
}

export async function listTasks(
  user: AuthenticatedUser,
  filters: ListTasksQuery,
) {
  const params: unknown[] = [];
  const conditions = baseConditions(user, params);

  if (filters.teamId) {
    params.push(filters.teamId);
    conditions.push(`tk.team_id = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`tk.status = $${params.length}`);
  }

  if (filters.stage) {
    params.push(filters.stage);
    conditions.push(`tk.journey_stage = $${params.length}`);
  }

  if (filters.dueFrom) {
    params.push(filters.dueFrom);
    conditions.push(`tk.due_date >= $${params.length}::date`);
  }

  if (filters.dueTo) {
    params.push(filters.dueTo);
    conditions.push(`tk.due_date <= $${params.length}::date`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    const i = params.length;
    conditions.push(`(tk.title ILIKE $${i} OR t.name ILIKE $${i})`);
  }

  const result = await query<TaskRow>(
    `SELECT ${TASK_COLUMNS}
       FROM task tk
       JOIN team t ON t.id = tk.team_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY tk.due_date, tk.title`,
    params,
  );

  return result.rows;
}

export function findTaskById(user: AuthenticatedUser, taskId: string) {
  const params: unknown[] = [taskId];
  const conditions = ["tk.id = $1", ...baseConditions(user, params)];

  return queryOne<TaskRow>(
    `SELECT ${TASK_COLUMNS}
       FROM task tk
       JOIN team t ON t.id = tk.team_id
      WHERE ${conditions.join(" AND ")}`,
    params,
  );
}

/**
 * Eventos do calendário num intervalo de datas.
 *
 * Duas fontes viram uma lista só via UNION ALL:
 *  - `DUE`: o prazo de entrega da tarefa (RF-12);
 *  - `REMINDER`: cada data de lembrete configurada na tarefa (RF-17).
 *
 * O `remind_at` é TIMESTAMPTZ e é convertido para data local do servidor
 * antes de comparar, para um lembrete às 23h não cair no dia seguinte.
 */
export async function listCalendarEvents(
  user: AuthenticatedUser,
  filters: CalendarQuery,
) {
  const params: unknown[] = [];
  const conditions = baseConditions(user, params);

  if (filters.teamId) {
    params.push(filters.teamId);
    conditions.push(`tk.team_id = $${params.length}`);
  }

  params.push(filters.from);
  const fromIndex = params.length;
  params.push(filters.to);
  const toIndex = params.length;

  const shared = conditions.join(" AND ");

  const dueQuery = `
    SELECT 'DUE'::text        AS kind,
           tk.due_date::text  AS event_date,
           tk.id              AS task_id,
           tk.title,
           tk.journey_stage,
           tk.status,
           tk.is_mandatory,
           tk.team_id,
           t.name             AS team_name,
           NULL::boolean      AS reminder_sent
      FROM task tk
      JOIN team t ON t.id = tk.team_id
     WHERE ${shared}
       AND tk.due_date BETWEEN $${fromIndex}::date AND $${toIndex}::date
  `;

  if (!filters.includeReminders) {
    const result = await query<CalendarEventRow>(
      `${dueQuery} ORDER BY event_date, title`,
      params,
    );
    return result.rows;
  }

  const reminderQuery = `
    SELECT 'REMINDER'::text            AS kind,
           (r.remind_at::date)::text   AS event_date,
           tk.id                       AS task_id,
           tk.title,
           tk.journey_stage,
           tk.status,
           tk.is_mandatory,
           tk.team_id,
           t.name                      AS team_name,
           r.is_sent                   AS reminder_sent
      FROM task_reminder r
      JOIN task tk ON tk.id = r.task_id
      JOIN team t  ON t.id = tk.team_id
     WHERE ${shared}
       AND r.remind_at::date BETWEEN $${fromIndex}::date AND $${toIndex}::date
  `;

  const result = await query<CalendarEventRow>(
    `${dueQuery} UNION ALL ${reminderQuery} ORDER BY event_date, kind, title`,
    params,
  );

  return result.rows;
}

/** Contadores do cabeçalho do calendário. */
export async function summarize(
  user: AuthenticatedUser,
  filters: CalendarQuery,
) {
  const params: unknown[] = [];
  const conditions = baseConditions(user, params);

  if (filters.teamId) {
    params.push(filters.teamId);
    conditions.push(`tk.team_id = $${params.length}`);
  }

  params.push(filters.from, filters.to);

  const result = await query<{
    total: number;
    overdue: number;
    pending: number;
    approved: number;
  }>(
    `SELECT COUNT(*)::int                                          AS total,
            COUNT(*) FILTER (WHERE tk.status = 'OVERDUE')::int     AS overdue,
            COUNT(*) FILTER (WHERE tk.status IN ('PENDING','IN_PROGRESS','SUBMITTED','REJECTED'))::int AS pending,
            COUNT(*) FILTER (WHERE tk.status = 'APPROVED')::int    AS approved
       FROM task tk
       JOIN team t ON t.id = tk.team_id
      WHERE ${conditions.join(" AND ")}
        AND tk.due_date BETWEEN $${params.length - 1}::date AND $${params.length}::date`,
    params,
  );

  return (
    result.rows[0] ?? { total: 0, overdue: 0, pending: 0, approved: 0 }
  );
}

/**
 * RN-04 — tarefas vencidas sem entrega viram atrasadas.
 *
 * Roda sob demanda antes de montar o calendário e a lista, para o painel
 * nunca mostrar como "pendente" algo cujo prazo já passou. Quando existir a
 * rotina agendada de lembretes, ela chama a mesma função.
 */
export async function markOverdueTasks(): Promise<number> {
  const result = await query(
    `UPDATE task
        SET status = 'OVERDUE'
      WHERE status IN ('PENDING', 'IN_PROGRESS')
        AND due_date < CURRENT_DATE`,
  );

  return result.rowCount ?? 0;
}

import type { PoolClient } from "pg";
import { query, queryOne } from "../../config/database.js";
import { buildTeamScopeCondition } from "../../shared/scope.js";
import type { SubmissionType, TaskStatus } from "../../shared/types/domain.js";
import type { AuthenticatedUser } from "../../types/express.js";
import type { CalendarQuery, ListTasksQuery } from "./tasks.schemas.js";

export interface TaskRow {
  id: string;
  equipe_id: string;
  equipe_nome: string;
  equipe_etapa_id: string;
  etapa_numero: number;
  etapa_nome: string;
  titulo: string;
  descricao: string | null;
  prazo: string;
  status: TaskStatus;
  obrigatoria: boolean;
  criado_em: Date;
  total_entregas: number;
  ultima_entrega_em: Date | null;
}

export interface CalendarEventRow {
  kind: "DUE" | "REMINDER";
  event_date: string;
  task_id: string;
  titulo: string;
  etapa_numero: number;
  etapa_nome: string;
  status: TaskStatus;
  obrigatoria: boolean;
  equipe_id: string;
  equipe_nome: string;
  reminder_sent: boolean | null;
}

export interface TemplateRow {
  id: string;
  etapa_id: string;
  etapa_numero: number;
  etapa_nome: string;
  titulo: string;
  descricao: string | null;
  obrigatoria: boolean;
}

export interface SubmissionRow {
  id: string;
  versao: number;
  tipo: SubmissionType;
  url: string;
  nome_arquivo: string | null;
  tamanho_bytes: number | null;
  tipo_mime: string | null;
  enviado_em: Date;
  enviado_por_id: string | null;
  enviado_por_nome: string | null;
}

export interface CommentRow {
  id: string;
  entrega_id: string | null;
  entrega_versao: number | null;
  autor_id: string | null;
  autor_nome: string | null;
  decisao: TaskStatus | null;
  texto: string;
  criado_em: Date;
}

export interface ReminderRow {
  id: string;
  dias_antes: number;
  enviar_em: Date;
  enviado_em: Date | null;
}

/** Coluna do kanban da etapa em que a tarefa está (ver teams.repository). */
const TASK_STAGE_NUMBER_SQL = `
  (SELECT MAX(et.numero)
     FROM equipe_etapa ee2
     JOIN etapa et ON et.id = ee2.etapa_id
    WHERE ee2.equipe_id = tk.equipe_id AND ee2.ordem <= ee.ordem)
`;

const TASK_COLUMNS = `
  tk.id, tk.equipe_id, tk.equipe_etapa_id, tk.titulo, tk.descricao,
  tk.prazo, tk.status, tk.obrigatoria, tk.criado_em,
  e.nome                    AS equipe_nome,
  ee.nome                   AS etapa_nome,
  ${TASK_STAGE_NUMBER_SQL}  AS etapa_numero,
  (SELECT COUNT(*)::int FROM entrega s WHERE s.tarefa_id = tk.id)         AS total_entregas,
  (SELECT MAX(s.enviado_em) FROM entrega s WHERE s.tarefa_id = tk.id)     AS ultima_entrega_em
`;

const TASK_JOINS = `
  FROM tarefa tk
  JOIN equipe e        ON e.id = tk.equipe_id
  JOIN equipe_etapa ee ON ee.id = tk.equipe_etapa_id
`;

/**
 * Condições comuns a toda leitura de tarefa: só as tarefas de equipes não
 * excluídas que o usuário enxerga (RNF-03). O escopo é aplicado sobre a
 * tabela `equipe`, apelidada de `e` na query.
 */
function baseConditions(user: AuthenticatedUser, params: unknown[]) {
  const conditions = ["e.excluida_em IS NULL"];
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
    conditions.push(`tk.equipe_id = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`tk.status = $${params.length}`);
  }

  if (filters.stage) {
    params.push(filters.stage);
    conditions.push(`${TASK_STAGE_NUMBER_SQL} = $${params.length}`);
  }

  if (filters.dueFrom) {
    params.push(filters.dueFrom);
    conditions.push(`tk.prazo >= $${params.length}::date`);
  }

  if (filters.dueTo) {
    params.push(filters.dueTo);
    conditions.push(`tk.prazo <= $${params.length}::date`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    const i = params.length;
    conditions.push(`(tk.titulo ILIKE $${i} OR e.nome ILIKE $${i})`);
  }

  const result = await query<TaskRow>(
    `SELECT ${TASK_COLUMNS}
     ${TASK_JOINS}
      WHERE ${conditions.join(" AND ")}
      ORDER BY tk.prazo, tk.titulo`,
    params,
  );

  return result.rows;
}

export function findTaskById(user: AuthenticatedUser, taskId: string) {
  const params: unknown[] = [taskId];
  const conditions = ["tk.id = $1", ...baseConditions(user, params)];

  return queryOne<TaskRow>(
    `SELECT ${TASK_COLUMNS}
     ${TASK_JOINS}
      WHERE ${conditions.join(" AND ")}`,
    params,
  );
}

/** Existe a tarefa, ignorando escopo? Para distinguir 404 de 403. */
export async function taskExists(taskId: string) {
  const row = await queryOne<{ id: string }>(`SELECT id FROM tarefa WHERE id = $1`, [taskId]);
  return row !== null;
}

/**
 * Eventos do calendário num intervalo de datas (RF-13).
 *
 * Duas fontes viram uma lista só via UNION ALL:
 *  - `DUE`: o prazo de entrega da tarefa (RF-12);
 *  - `REMINDER`: cada data de lembrete configurada na tarefa (RF-17).
 */
export async function listCalendarEvents(
  user: AuthenticatedUser,
  filters: CalendarQuery,
) {
  const params: unknown[] = [];
  const conditions = baseConditions(user, params);

  if (filters.teamId) {
    params.push(filters.teamId);
    conditions.push(`tk.equipe_id = $${params.length}`);
  }

  params.push(filters.from);
  const fromIndex = params.length;
  params.push(filters.to);
  const toIndex = params.length;

  const shared = conditions.join(" AND ");

  const dueQuery = `
    SELECT 'DUE'::text        AS kind,
           tk.prazo::text     AS event_date,
           tk.id              AS task_id,
           tk.titulo,
           ${TASK_STAGE_NUMBER_SQL} AS etapa_numero,
           ee.nome            AS etapa_nome,
           tk.status,
           tk.obrigatoria,
           tk.equipe_id,
           e.nome             AS equipe_nome,
           NULL::boolean      AS reminder_sent
    ${TASK_JOINS}
     WHERE ${shared}
       AND tk.prazo BETWEEN $${fromIndex}::date AND $${toIndex}::date
  `;

  if (!filters.includeReminders) {
    const result = await query<CalendarEventRow>(
      `${dueQuery} ORDER BY event_date, titulo`,
      params,
    );
    return result.rows;
  }

  const reminderQuery = `
    SELECT 'REMINDER'::text            AS kind,
           (r.enviar_em::date)::text   AS event_date,
           tk.id                       AS task_id,
           tk.titulo,
           ${TASK_STAGE_NUMBER_SQL}    AS etapa_numero,
           ee.nome                     AS etapa_nome,
           tk.status,
           tk.obrigatoria,
           tk.equipe_id,
           e.nome                      AS equipe_nome,
           (r.enviado_em IS NOT NULL)  AS reminder_sent
      FROM lembrete r
      JOIN tarefa tk       ON tk.id = r.tarefa_id
      JOIN equipe e        ON e.id = tk.equipe_id
      JOIN equipe_etapa ee ON ee.id = tk.equipe_etapa_id
     WHERE ${shared}
       AND r.enviar_em::date BETWEEN $${fromIndex}::date AND $${toIndex}::date
  `;

  const result = await query<CalendarEventRow>(
    `${dueQuery} UNION ALL ${reminderQuery} ORDER BY event_date, kind, titulo`,
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
    conditions.push(`tk.equipe_id = $${params.length}`);
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
       FROM tarefa tk
       JOIN equipe e ON e.id = tk.equipe_id
      WHERE ${conditions.join(" AND ")}
        AND tk.prazo BETWEEN $${params.length - 1}::date AND $${params.length}::date`,
    params,
  );

  return (
    result.rows[0] ?? { total: 0, overdue: 0, pending: 0, approved: 0 }
  );
}

// ---------------------------------------------------------------------------
// RF-11 — modelos de tarefa
// ---------------------------------------------------------------------------

const TEMPLATE_COLUMNS = `
  m.id, m.etapa_id, et.numero AS etapa_numero, et.nome AS etapa_nome,
  m.titulo, m.descricao, m.obrigatoria
`;

export async function findTemplates() {
  const result = await query<TemplateRow>(
    `SELECT ${TEMPLATE_COLUMNS}
       FROM modelo_tarefa m
       JOIN etapa et ON et.id = m.etapa_id
      WHERE m.ativo
      ORDER BY et.numero, m.titulo`,
  );
  return result.rows;
}

export function findTemplateById(id: string) {
  return queryOne<TemplateRow>(
    `SELECT ${TEMPLATE_COLUMNS}
       FROM modelo_tarefa m
       JOIN etapa et ON et.id = m.etapa_id
      WHERE m.id = $1 AND m.ativo`,
    [id],
  );
}

// ---------------------------------------------------------------------------
// Etapas da jornada da equipe (para posicionar a tarefa)
// ---------------------------------------------------------------------------

export function findTeamCurrentStage(teamId: string) {
  return queryOne<{ id: string; nome: string }>(
    `SELECT ee.id, ee.nome
       FROM equipe e JOIN equipe_etapa ee ON ee.id = e.etapa_atual_id
      WHERE e.id = $1`,
    [teamId],
  );
}

export function findTeamStageById(teamId: string, stageId: string) {
  return queryOne<{ id: string; nome: string }>(
    `SELECT id, nome FROM equipe_etapa WHERE equipe_id = $1 AND id = $2`,
    [teamId, stageId],
  );
}

/** A etapa da jornada da equipe que corresponde à etapa do catálogo do modelo. */
export function findTeamStageByCatalog(teamId: string, catalogStageId: string) {
  return queryOne<{ id: string; nome: string }>(
    `SELECT id, nome FROM equipe_etapa WHERE equipe_id = $1 AND etapa_id = $2`,
    [teamId, catalogStageId],
  );
}

// ---------------------------------------------------------------------------
// RF-12 — escrita de tarefas
// ---------------------------------------------------------------------------

export async function insertTask(
  client: PoolClient,
  data: {
    teamId: string;
    stageId: string;
    templateId: string | null;
    title: string;
    description: string | null;
    dueDate: string;
    isMandatory: boolean;
    createdBy: string;
  },
) {
  const result = await client.query<{ id: string }>(
    `INSERT INTO tarefa
       (equipe_id, equipe_etapa_id, modelo_id, titulo, descricao, prazo, obrigatoria, criado_por)
     VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8)
     RETURNING id`,
    [
      data.teamId,
      data.stageId,
      data.templateId,
      data.title,
      data.description,
      data.dueDate,
      data.isMandatory,
      data.createdBy,
    ],
  );
  return result.rows[0]!.id;
}

/**
 * UPDATE dinâmico das colunas editáveis. `columns` já vem com os nomes das
 * colunas do banco (titulo, descricao, prazo, obrigatoria).
 */
export async function updateTask(
  client: PoolClient,
  taskId: string,
  columns: Record<string, unknown>,
) {
  const entries = Object.entries(columns).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;

  const params: unknown[] = [taskId];
  const assignments = entries.map(([column, value]) => {
    params.push(value);
    return column === "prazo"
      ? `${column} = $${params.length}::date`
      : `${column} = $${params.length}`;
  });

  await client.query(
    `UPDATE tarefa SET ${assignments.join(", ")} WHERE id = $1`,
    params,
  );
}

export async function setTaskStatus(
  client: PoolClient,
  taskId: string,
  status: TaskStatus,
) {
  await client.query(`UPDATE tarefa SET status = $2 WHERE id = $1`, [taskId, status]);
}

// ---------------------------------------------------------------------------
// RF-17 — lembretes
// ---------------------------------------------------------------------------

/**
 * Cria um lembrete por "dias antes", às 9h do dia calculado. O que já
 * ficaria no passado não é criado (uma tarefa criada hoje para amanhã não
 * ganha lembrete de "3 dias antes").
 */
export async function insertReminders(
  client: PoolClient,
  taskId: string,
  dueDate: string,
  daysBefore: number[],
) {
  if (daysBefore.length === 0) return;

  await client.query(
    `INSERT INTO lembrete (tarefa_id, dias_antes, enviar_em)
     SELECT $1, d, (($2::date - d) + TIME '09:00')::timestamptz
       FROM unnest($3::int[]) AS d
      WHERE (($2::date - d) + TIME '09:00')::timestamptz > NOW()
     ON CONFLICT (tarefa_id, dias_antes) DO NOTHING`,
    [taskId, dueDate, daysBefore],
  );
}

/**
 * RF-17 — o mentor adiou (ou adiantou) o prazo: os lembretes AINDA NÃO
 * enviados são recalculados a partir de `dias_antes`; os já enviados ficam
 * como registro. Lembretes que cairiam no passado são removidos.
 */
export async function rescheduleReminders(
  client: PoolClient,
  taskId: string,
  newDueDate: string,
) {
  await client.query(
    `UPDATE lembrete
        SET enviar_em = (($2::date - dias_antes) + TIME '09:00')::timestamptz
      WHERE tarefa_id = $1 AND enviado_em IS NULL`,
    [taskId, newDueDate],
  );
  await client.query(
    `DELETE FROM lembrete
      WHERE tarefa_id = $1 AND enviado_em IS NULL AND enviar_em <= NOW()`,
    [taskId],
  );
}

export async function findReminders(taskId: string) {
  const result = await query<ReminderRow>(
    `SELECT id, dias_antes, enviar_em, enviado_em
       FROM lembrete WHERE tarefa_id = $1 ORDER BY enviar_em`,
    [taskId],
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// RF-14/RF-16 — entregas versionadas
// ---------------------------------------------------------------------------

export async function findSubmissions(taskId: string) {
  const result = await query<SubmissionRow>(
    `SELECT s.id, s.versao, s.tipo, s.url, s.nome_arquivo, s.tamanho_bytes, s.tipo_mime,
            s.enviado_em, s.enviado_por AS enviado_por_id, u.nome AS enviado_por_nome
       FROM entrega s
  LEFT JOIN usuario u ON u.id = s.enviado_por
      WHERE s.tarefa_id = $1
      ORDER BY s.versao DESC`,
    [taskId],
  );
  return result.rows;
}

/** Reenvio = nova versão (RF-16). A versão anterior nunca é sobrescrita. */
export async function insertSubmission(
  client: PoolClient,
  data: {
    taskId: string;
    submittedBy: string;
    type: SubmissionType;
    url: string;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
  },
) {
  const result = await client.query<{ id: string; versao: number }>(
    `INSERT INTO entrega
       (tarefa_id, enviado_por, tipo, url, nome_arquivo, tamanho_bytes, tipo_mime, versao)
     VALUES ($1, $2, $3, $4, $5, $6, $7,
             (SELECT COALESCE(MAX(versao), 0) + 1 FROM entrega WHERE tarefa_id = $1))
     RETURNING id, versao`,
    [
      data.taskId,
      data.submittedBy,
      data.type,
      data.url,
      data.fileName,
      data.fileSize,
      data.mimeType,
    ],
  );
  return result.rows[0]!;
}

export function findLatestSubmission(taskId: string) {
  return queryOne<{ id: string; versao: number }>(
    `SELECT id, versao FROM entrega WHERE tarefa_id = $1 ORDER BY versao DESC LIMIT 1`,
    [taskId],
  );
}

// ---------------------------------------------------------------------------
// RF-15 — comentários de avaliação (só INSERT: o histórico sobrevive)
// ---------------------------------------------------------------------------

export async function findComments(taskId: string) {
  const result = await query<CommentRow>(
    `SELECT c.id, c.entrega_id, s.versao AS entrega_versao,
            c.autor_id, u.nome AS autor_nome, c.decisao, c.texto, c.criado_em
       FROM comentario_tarefa c
  LEFT JOIN entrega s ON s.id = c.entrega_id
  LEFT JOIN usuario u ON u.id = c.autor_id
      WHERE c.tarefa_id = $1
      ORDER BY c.criado_em DESC`,
    [taskId],
  );
  return result.rows;
}

export async function insertComment(
  client: PoolClient,
  data: {
    taskId: string;
    submissionId: string | null;
    authorId: string;
    decision: TaskStatus | null;
    content: string;
  },
) {
  await client.query(
    `INSERT INTO comentario_tarefa (tarefa_id, entrega_id, autor_id, decisao, texto)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.taskId, data.submissionId, data.authorId, data.decision, data.content],
  );
}

// ---------------------------------------------------------------------------
// Rotina agendada (jobs/scheduler.ts)
// ---------------------------------------------------------------------------

/**
 * RN-04 — tarefas vencidas sem entrega viram OVERDUE. O status é GRAVADO
 * (não calculado na consulta) para o contador do dashboard ser um COUNT
 * direto e para o aviso de atraso ter um momento único para ser disparado.
 */
export async function markOverdueTasks(): Promise<number> {
  const result = await query(
    `UPDATE tarefa
        SET status = 'OVERDUE'
      WHERE status IN ('PENDING', 'IN_PROGRESS')
        AND prazo < CURRENT_DATE`,
  );

  return result.rowCount ?? 0;
}

export interface DueReminderRow {
  lembrete_id: string;
  dias_antes: number;
  tarefa_id: string;
  titulo: string;
  prazo: string;
  equipe_id: string;
  equipe_nome: string;
}

/** Lembretes cuja hora chegou e que ainda não foram enviados. */
export async function findDueReminders(limit = 200) {
  const result = await query<DueReminderRow>(
    `SELECT r.id AS lembrete_id, r.dias_antes,
            tk.id AS tarefa_id, tk.titulo, tk.prazo,
            e.id AS equipe_id, e.nome AS equipe_nome
       FROM lembrete r
       JOIN tarefa tk ON tk.id = r.tarefa_id
       JOIN equipe e  ON e.id = tk.equipe_id
      WHERE r.enviado_em IS NULL
        AND r.enviar_em <= NOW()
        AND tk.status NOT IN ('APPROVED', 'SUBMITTED')
        AND e.excluida_em IS NULL
      ORDER BY r.enviar_em
      LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export async function markReminderSent(reminderId: string) {
  await query(`UPDATE lembrete SET enviado_em = NOW() WHERE id = $1`, [reminderId]);
}

export interface OverdueTaskRow {
  tarefa_id: string;
  titulo: string;
  prazo: string;
  equipe_id: string;
  equipe_nome: string;
}

/** Tarefas atrasadas que ainda não geraram nenhum aviso de atraso. */
export async function findOverdueUnnotified(limit = 200) {
  const result = await query<OverdueTaskRow>(
    `SELECT tk.id AS tarefa_id, tk.titulo, tk.prazo, e.id AS equipe_id, e.nome AS equipe_nome
       FROM tarefa tk
       JOIN equipe e ON e.id = tk.equipe_id
      WHERE tk.status = 'OVERDUE'
        AND e.excluida_em IS NULL
        AND NOT EXISTS (
              SELECT 1 FROM notificacao n
               WHERE n.tarefa_id = tk.id AND n.tipo = 'OVERDUE'
            )
      ORDER BY tk.prazo
      LIMIT $1`,
    [limit],
  );
  return result.rows;
}

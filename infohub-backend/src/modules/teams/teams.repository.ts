import type { PoolClient } from "pg";
import { query, queryOne } from "../../config/database.js";
import { buildTeamScopeCondition } from "../../shared/scope.js";
import type {
  IdeaStage,
  JourneyStatus,
  TaskStatus,
  TeamMemberRole,
} from "../../shared/types/domain.js";
import type { AuthenticatedUser } from "../../types/express.js";
import type { ListTeamsQuery } from "./teams.schemas.js";

/** Linha do cartão do kanban / listagem de equipes. */
export interface TeamRow {
  id: string;
  nome: string;
  descricao: string;
  area_id: string;
  area_nome: string;
  estagio_ideia: IdeaStage;
  etapa_atual_id: string;
  etapa_atual_nome: string;
  etapa_atual_ordem: number;
  etapa_atual_extra: boolean;
  etapa_numero: number;
  status_jornada: JourneyStatus;
  semestre: string;
  como_conheceu: string | null;
  excluida_em: Date | null;
  criado_em: Date;
  lider_id: string | null;
  lider_nome: string | null;
  lider_email: string | null;
  lider_curso: string | null;
  total_membros: number;
  tarefas_abertas: number;
  tarefas_atrasadas: number;
  mentores: Array<{ id: string; name: string }>;
}

/** Uma etapa da jornada de UMA equipe (linha de equipe_etapa). */
export interface JourneyStageRow {
  id: string;
  ordem: number;
  numero: number | null; // NULL = etapa extra
  nome: string;
  descricao: string | null;
  criado_em: Date;
}

export interface StageCatalogRow {
  id: string;
  numero: number;
  nome: string;
}

export interface TeamMemberDetailRow {
  usuario_id: string;
  nome: string;
  email: string;
  curso: string | null;
  semestre: string | null;
  telefone: string | null;
  papel: TeamMemberRole;
  entrou_em: Date;
}

export interface StageHistoryRow {
  id: string;
  de_ordem: number | null;
  de_numero: number | null;
  de_nome: string | null;
  para_ordem: number;
  para_numero: number | null;
  para_nome: string;
  motivo: string | null;
  forcado: boolean;
  movido_em: Date;
  movido_por_nome: string | null;
}

export interface PendingTaskRow {
  id: string;
  titulo: string;
  etapa_numero: number;
  etapa_nome: string;
  status: TaskStatus;
  prazo: string;
}

export interface NoteRow {
  id: string;
  autor_id: string | null;
  autor_nome: string | null;
  texto: string;
  criado_em: Date;
  atualizado_em: Date;
}

export interface RecipientRow {
  id: string;
  nome: string;
  email: string;
}

/**
 * Coluna do kanban em que a equipe está: o número da última etapa PADRÃO da
 * jornada dela com ordem <= a da etapa atual. Uma etapa extra encaixada
 * depois da 4 aparece, portanto, na coluna 4.
 */
const KANBAN_COLUMN_SQL = `
  (SELECT MAX(et.numero)
     FROM equipe_etapa ee2
     JOIN etapa et ON et.id = ee2.etapa_id
    WHERE ee2.equipe_id = e.id AND ee2.ordem <= atual.ordem)
`;

/**
 * Colunas do cartão do kanban: além dos dados da equipe, o líder, a etapa
 * atual, a contagem de integrantes e o resumo de tarefas que o cartão exibe.
 *
 * Os mentores vêm agregados como JSON para evitar o problema clássico de
 * uma equipe com 2 mentores virar 2 linhas e duplicar o cartão.
 */
const TEAM_CARD_COLUMNS = `
  e.id, e.nome, e.descricao, e.area_id, e.estagio_ideia,
  e.etapa_atual_id, e.status_jornada, e.semestre, e.como_conheceu,
  e.excluida_em, e.criado_em,
  a.nome                     AS area_nome,
  atual.nome                 AS etapa_atual_nome,
  atual.ordem                AS etapa_atual_ordem,
  (atual.etapa_id IS NULL)   AS etapa_atual_extra,
  ${KANBAN_COLUMN_SQL}       AS etapa_numero,
  lider.usuario_id           AS lider_id,
  lu.nome                    AS lider_nome,
  lu.email                   AS lider_email,
  lu.curso                   AS lider_curso,
  (SELECT COUNT(*)::int FROM equipe_membro mc
    WHERE mc.equipe_id = e.id AND mc.ativo)                          AS total_membros,
  (SELECT COUNT(*)::int FROM tarefa tk
    WHERE tk.equipe_id = e.id AND tk.status <> 'APPROVED')           AS tarefas_abertas,
  (SELECT COUNT(*)::int FROM tarefa tk
    WHERE tk.equipe_id = e.id AND tk.status = 'OVERDUE')             AS tarefas_atrasadas,
  COALESCE((
    SELECT json_agg(json_build_object('id', mu.id, 'name', mu.nome) ORDER BY mu.nome)
      FROM equipe_mentor em
      JOIN usuario mu ON mu.id = em.mentor_id
     WHERE em.equipe_id = e.id
  ), '[]'::json) AS mentores
`;

const TEAM_CARD_JOINS = `
       FROM equipe e
       JOIN area_ideia a      ON a.id = e.area_id
       JOIN equipe_etapa atual ON atual.id = e.etapa_atual_id
  LEFT JOIN equipe_membro lider
         ON lider.equipe_id = e.id AND lider.papel = 'LEADER' AND lider.ativo
  LEFT JOIN usuario lu ON lu.id = lider.usuario_id
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
    conditions.push("e.excluida_em IS NULL");
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    const i = params.length;
    conditions.push(
      `(e.nome ILIKE $${i} OR e.descricao ILIKE $${i} OR lu.nome ILIKE $${i} OR a.nome ILIKE $${i})`,
    );
  }

  if (filters.stage) {
    params.push(filters.stage);
    conditions.push(`${KANBAN_COLUMN_SQL} = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`e.status_jornada = $${params.length}`);
  }

  if (filters.categoryId) {
    params.push(filters.categoryId);
    conditions.push(`e.area_id = $${params.length}`);
  }

  if (filters.semester) {
    params.push(filters.semester);
    conditions.push(`e.semestre = $${params.length}`);
  }

  if (filters.course) {
    params.push(filters.course);
    conditions.push(`lu.curso = $${params.length}`);
  }

  if (filters.mentorId) {
    params.push(filters.mentorId);
    conditions.push(
      `EXISTS (SELECT 1 FROM equipe_mentor f_em
                WHERE f_em.equipe_id = e.id AND f_em.mentor_id = $${params.length})`,
    );
  }

  if (filters.taskStatus) {
    params.push(filters.taskStatus);
    conditions.push(
      `EXISTS (SELECT 1 FROM tarefa f_tk
                WHERE f_tk.equipe_id = e.id AND f_tk.status = $${params.length})`,
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query<TeamRow>(
    `SELECT ${TEAM_CARD_COLUMNS}
     ${TEAM_CARD_JOINS}
     ${where}
     ORDER BY atual.ordem, e.criado_em`,
    params,
  );

  return result.rows;
}

/** Uma equipe, respeitando o escopo do usuário. Null quando fora do escopo. */
export async function findTeamById(user: AuthenticatedUser, teamId: string) {
  const params: unknown[] = [teamId];
  const conditions = ["e.id = $1"];

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
    `SELECT id FROM equipe WHERE id = $1`,
    [teamId],
  );
  return row !== null;
}

/** Catálogo das etapas padrão — as colunas do kanban. */
export async function findStageCatalog() {
  const result = await query<StageCatalogRow>(
    `SELECT id, numero, nome FROM etapa ORDER BY numero`,
  );
  return result.rows;
}

/** A jornada completa de uma equipe (padrão + extras), em ordem. */
export async function findJourney(teamId: string) {
  const result = await query<JourneyStageRow>(
    `SELECT ee.id, ee.ordem, et.numero, ee.nome, ee.descricao, ee.criado_em
       FROM equipe_etapa ee
  LEFT JOIN etapa et ON et.id = ee.etapa_id
      WHERE ee.equipe_id = $1
      ORDER BY ee.ordem`,
    [teamId],
  );
  return result.rows;
}

export async function findMembers(teamId: string) {
  const result = await query<TeamMemberDetailRow>(
    `SELECT m.usuario_id, u.nome, u.email, u.curso, u.semestre, u.telefone,
            m.papel, m.entrou_em
       FROM equipe_membro m
       JOIN usuario u ON u.id = m.usuario_id
      WHERE m.equipe_id = $1 AND m.ativo
      ORDER BY (m.papel = 'LEADER') DESC, u.nome`,
    [teamId],
  );
  return result.rows;
}

/** RF-08 — histórico de etapas da equipe (quem moveu, quando, por quê). */
export async function findStageHistory(teamId: string) {
  const result = await query<StageHistoryRow>(
    `SELECT h.id,
            de.ordem    AS de_ordem,   et_de.numero   AS de_numero,   de.nome   AS de_nome,
            para.ordem  AS para_ordem, et_para.numero AS para_numero, para.nome AS para_nome,
            h.motivo, h.forcado, h.movido_em,
            u.nome AS movido_por_nome
       FROM historico_etapa h
  LEFT JOIN equipe_etapa de      ON de.id = h.de_equipe_etapa_id
  LEFT JOIN etapa et_de          ON et_de.id = de.etapa_id
       JOIN equipe_etapa para    ON para.id = h.para_equipe_etapa_id
  LEFT JOIN etapa et_para        ON et_para.id = para.etapa_id
  LEFT JOIN usuario u            ON u.id = h.movido_por
      WHERE h.equipe_id = $1
      ORDER BY h.movido_em DESC`,
    [teamId],
  );
  return result.rows;
}

/**
 * RN-01 — tarefas obrigatórias ainda não aprovadas nas etapas que a equipe
 * está deixando para trás: ordem no intervalo [deOrdem, paraOrdem).
 * Vale para etapas extras também, porque a comparação é por ordem.
 */
export async function findPendingMandatoryTasks(
  teamId: string,
  fromOrder: number,
  toOrder: number,
) {
  const result = await query<PendingTaskRow>(
    `SELECT tk.id, tk.titulo, tk.status, tk.prazo,
            COALESCE(et.numero, 0) AS etapa_numero,
            ee.nome                AS etapa_nome
       FROM tarefa tk
       JOIN equipe_etapa ee ON ee.id = tk.equipe_etapa_id
  LEFT JOIN etapa et        ON et.id = ee.etapa_id
      WHERE tk.equipe_id = $1
        AND tk.obrigatoria
        AND tk.status <> 'APPROVED'
        AND ee.ordem >= $2
        AND ee.ordem <  $3
      ORDER BY ee.ordem, tk.prazo`,
    [teamId, fromOrder, toOrder],
  );
  return result.rows;
}

export async function updateStage(
  client: PoolClient,
  params: {
    teamId: string;
    fromStageId: string;
    toStageId: string;
    changedBy: string;
    reason: string | null;
    forced: boolean;
  },
) {
  await client.query(`UPDATE equipe SET etapa_atual_id = $2 WHERE id = $1`, [
    params.teamId,
    params.toStageId,
  ]);

  await client.query(
    `INSERT INTO historico_etapa
       (equipe_id, de_equipe_etapa_id, para_equipe_etapa_id, movido_por, motivo, forcado)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      params.teamId,
      params.fromStageId,
      params.toStageId,
      params.changedBy,
      params.reason,
      params.forced,
    ],
  );
}

/**
 * RN-07 — recalcula o status da jornada.
 *
 * A equipe fica "Pronta para o InovAMF" quando está na ÚLTIMA etapa da sua
 * jornada (padrão ou extra) com todas as tarefas obrigatórias aprovadas — e o
 * inverso também vale: se uma entrega for reaberta, volta para IN_PROGRESS.
 * Uma equipe já encaminhada (REFERRED) não é mexida.
 */
export async function recomputeJourneyStatus(
  client: PoolClient,
  teamId: string,
): Promise<JourneyStatus | null> {
  const result = await client.query<{ status_jornada: JourneyStatus }>(
    `UPDATE equipe e
        SET status_jornada = CASE
              WHEN (SELECT ordem FROM equipe_etapa WHERE id = e.etapa_atual_id)
                 = (SELECT MAX(ordem) FROM equipe_etapa WHERE equipe_id = e.id)
               AND EXISTS (
                     SELECT 1 FROM tarefa tk
                      WHERE tk.equipe_id = e.id AND tk.obrigatoria
                   )
               AND NOT EXISTS (
                     SELECT 1 FROM tarefa tk
                      WHERE tk.equipe_id = e.id
                        AND tk.obrigatoria
                        AND tk.status <> 'APPROVED'
                   )
              THEN 'READY_FOR_INOVAMF'::status_jornada
              ELSE 'IN_PROGRESS'::status_jornada
            END
      WHERE e.id = $1
        AND e.status_jornada <> 'REFERRED'
      RETURNING e.status_jornada`,
    [teamId],
  );

  return result.rows[0]?.status_jornada ?? null;
}

// ---------------------------------------------------------------------------
// Etapas extras (mudança de requisito: mentor acrescenta etapas por equipe)
// ---------------------------------------------------------------------------

/**
 * Insere uma etapa extra logo depois de `afterOrder`, empurrando as
 * seguintes. A unicidade (equipe_id, ordem) é DEFERRABLE no schema
 * justamente para o UPDATE em lote não esbarrar nela no meio do caminho.
 */
export async function insertExtraStage(
  client: PoolClient,
  params: {
    teamId: string;
    name: string;
    description: string | null;
    afterOrder: number;
    createdBy: string;
  },
) {
  await client.query(
    `UPDATE equipe_etapa SET ordem = ordem + 1
      WHERE equipe_id = $1 AND ordem > $2`,
    [params.teamId, params.afterOrder],
  );

  const result = await client.query<{ id: string }>(
    `INSERT INTO equipe_etapa (equipe_id, etapa_id, nome, descricao, ordem, criada_por)
     VALUES ($1, NULL, $2, $3, $4, $5)
     RETURNING id`,
    [
      params.teamId,
      params.name,
      params.description,
      params.afterOrder + 1,
      params.createdBy,
    ],
  );

  return result.rows[0]!.id;
}

// ---------------------------------------------------------------------------
// RF-02/RF-05 — cadastro da ideia
// ---------------------------------------------------------------------------

export async function insertTeam(
  client: PoolClient,
  data: {
    name: string;
    description: string;
    areaId: string;
    ideaStage: IdeaStage;
    semester: string;
    howDidYouHear: string | null;
  },
) {
  const result = await client.query<{ id: string }>(
    `INSERT INTO equipe (nome, descricao, area_id, estagio_ideia, semestre, como_conheceu)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      data.name,
      data.description,
      data.areaId,
      data.ideaStage,
      data.semester,
      data.howDidYouHear,
    ],
  );
  return result.rows[0]!.id;
}

/**
 * Copia as etapas do catálogo para a jornada da equipe e coloca a equipe na
 * primeira delas, registrando a entrada no histórico.
 */
export async function createJourney(client: PoolClient, teamId: string) {
  await client.query(
    `INSERT INTO equipe_etapa (equipe_id, etapa_id, nome, descricao, ordem)
     SELECT $1, et.id, et.nome, et.descricao, et.numero FROM etapa et`,
    [teamId],
  );

  const first = await client.query<{ id: string }>(
    `SELECT id FROM equipe_etapa WHERE equipe_id = $1 ORDER BY ordem LIMIT 1`,
    [teamId],
  );
  const firstStageId = first.rows[0]!.id;

  await client.query(`UPDATE equipe SET etapa_atual_id = $2 WHERE id = $1`, [
    teamId,
    firstStageId,
  ]);

  await client.query(
    `INSERT INTO historico_etapa (equipe_id, de_equipe_etapa_id, para_equipe_etapa_id)
     VALUES ($1, NULL, $2)`,
    [teamId, firstStageId],
  );

  return firstStageId;
}

export async function insertMember(
  client: PoolClient,
  params: { teamId: string; userId: string; role: TeamMemberRole },
) {
  await client.query(
    `INSERT INTO equipe_membro (equipe_id, usuario_id, papel)
     VALUES ($1, $2, $3)
     ON CONFLICT (equipe_id, usuario_id) DO NOTHING`,
    [params.teamId, params.userId, params.role],
  );
}

export async function findAreaById(areaId: string) {
  return queryOne<{ id: string; nome: string }>(
    `SELECT id, nome FROM area_ideia WHERE id = $1 AND ativa`,
    [areaId],
  );
}

// ---------------------------------------------------------------------------
// Q10/Q11 — mentores da equipe
// ---------------------------------------------------------------------------

export function findActiveMentor(mentorId: string) {
  return queryOne<{ id: string; nome: string }>(
    `SELECT id, nome FROM usuario
      WHERE id = $1 AND perfil = 'MENTOR' AND ativo AND anonimizado_em IS NULL`,
    [mentorId],
  );
}

export async function assignMentor(params: {
  teamId: string;
  mentorId: string;
  assignedBy: string;
}) {
  const result = await query(
    `INSERT INTO equipe_mentor (equipe_id, mentor_id, atribuido_por)
     VALUES ($1, $2, $3)
     ON CONFLICT (equipe_id, mentor_id) DO NOTHING`,
    [params.teamId, params.mentorId, params.assignedBy],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function unassignMentor(teamId: string, mentorId: string) {
  const result = await query(
    `DELETE FROM equipe_mentor WHERE equipe_id = $1 AND mentor_id = $2`,
    [teamId, mentorId],
  );
  return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Q4 — exclusão lógica
// ---------------------------------------------------------------------------

export async function softDelete(teamId: string, actorId: string) {
  const result = await query(
    `UPDATE equipe SET excluida_em = NOW(), excluida_por = $2
      WHERE id = $1 AND excluida_em IS NULL`,
    [teamId, actorId],
  );
  return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// RF-10 — anotações internas do mentor
// ---------------------------------------------------------------------------

export async function findNotes(teamId: string) {
  const result = await query<NoteRow>(
    `SELECT n.id, n.autor_id, u.nome AS autor_nome, n.texto, n.criado_em, n.atualizado_em
       FROM anotacao_mentor n
  LEFT JOIN usuario u ON u.id = n.autor_id
      WHERE n.equipe_id = $1
      ORDER BY n.criado_em DESC`,
    [teamId],
  );
  return result.rows;
}

export async function insertNote(params: {
  teamId: string;
  authorId: string;
  content: string;
}) {
  const result = await query<{ id: string }>(
    `INSERT INTO anotacao_mentor (equipe_id, autor_id, texto)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [params.teamId, params.authorId, params.content],
  );
  return result.rows[0]!.id;
}

// ---------------------------------------------------------------------------
// Destinatários de notificações
// ---------------------------------------------------------------------------

/** Integrantes ativos da equipe, com conta ativa (para e-mails RF-19/RF-20). */
export async function findMemberRecipients(teamId: string) {
  const result = await query<RecipientRow>(
    `SELECT u.id, u.nome, u.email
       FROM equipe_membro m
       JOIN usuario u ON u.id = m.usuario_id
      WHERE m.equipe_id = $1 AND m.ativo AND u.ativo AND u.anonimizado_em IS NULL
      ORDER BY (m.papel = 'LEADER') DESC, u.nome`,
    [teamId],
  );
  return result.rows;
}

/** Mentores da equipe (para o aviso de entrega recebida, RF-14). */
export async function findMentorRecipients(teamId: string) {
  const result = await query<RecipientRow>(
    `SELECT u.id, u.nome, u.email
       FROM equipe_mentor em
       JOIN usuario u ON u.id = em.mentor_id
      WHERE em.equipe_id = $1 AND u.ativo AND u.anonimizado_em IS NULL
      ORDER BY u.nome`,
    [teamId],
  );
  return result.rows;
}

/** Administradores ativos (aviso de nova ideia cadastrada, RF-19). */
export async function findAdminRecipients() {
  const result = await query<RecipientRow>(
    `SELECT id, nome, email FROM usuario
      WHERE perfil = 'ADMIN' AND ativo AND anonimizado_em IS NULL
      ORDER BY nome`,
  );
  return result.rows;
}

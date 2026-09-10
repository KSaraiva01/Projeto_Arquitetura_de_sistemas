import { withTransaction } from "../../config/database.js";
import { recordAudit } from "../../shared/audit.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/AppError.js";
import { canManageJourney } from "../../shared/scope.js";
import {
  JOURNEY_STAGE_NAMES,
  type JourneyStage,
} from "../../shared/types/domain.js";
import type { AuthenticatedUser } from "../../types/express.js";
import * as repository from "./teams.repository.js";
import type { TeamRow } from "./teams.repository.js";
import type { ChangeStageInput, ListTeamsQuery } from "./teams.schemas.js";

export interface TeamCard {
  id: string;
  name: string;
  description: string;
  category: { id: string; name: string };
  ideaStage: TeamRow["idea_stage"];
  journeyStage: number;
  journeyStageName: string;
  journeyStatus: TeamRow["journey_status"];
  semester: string;
  howDidYouHear: string | null;
  isActive: boolean;
  createdAt: Date;
  leader: {
    id: string;
    name: string;
    email: string;
    course: string | null;
  } | null;
  mentors: Array<{ id: string; name: string }>;
  memberCount: number;
  openTasks: number;
  overdueTasks: number;
}

function toCard(row: TeamRow): TeamCard {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: { id: row.category_id, name: row.category_name },
    ideaStage: row.idea_stage,
    journeyStage: row.journey_stage,
    journeyStageName:
      JOURNEY_STAGE_NAMES[row.journey_stage as JourneyStage] ?? "—",
    journeyStatus: row.journey_status,
    semester: row.semester,
    howDidYouHear: row.how_did_you_hear,
    isActive: row.is_active,
    createdAt: row.created_at,
    leader: row.leader_id
      ? {
          id: row.leader_id,
          name: row.leader_name ?? "",
          email: row.leader_email ?? "",
          course: row.leader_course,
        }
      : null,
    mentors: row.mentors ?? [],
    memberCount: row.member_count,
    openTasks: row.open_tasks,
    overdueTasks: row.overdue_tasks,
  };
}

/**
 * RF-06 — equipes agrupadas pelas 6 etapas, no formato que o kanban consome.
 *
 * Toda coluna vem na resposta, inclusive as vazias: o frontend precisa
 * renderizar a coluna para ela poder receber um cartão arrastado.
 */
export async function getBoard(
  user: AuthenticatedUser,
  filters: ListTeamsQuery,
) {
  const rows = await repository.listTeams(user, filters);
  const cards = rows.map(toCard);

  const columns = ([1, 2, 3, 4, 5, 6] as JourneyStage[]).map((stage) => ({
    stage,
    name: JOURNEY_STAGE_NAMES[stage],
    teams: cards.filter((card) => card.journeyStage === stage),
  }));

  return {
    columns,
    total: cards.length,
    canDrag: canManageJourney(user),
  };
}

export async function listTeams(
  user: AuthenticatedUser,
  filters: ListTeamsQuery,
) {
  const rows = await repository.listTeams(user, filters);
  return { data: rows.map(toCard), total: rows.length };
}

/**
 * Carrega a equipe garantindo o escopo do usuário.
 *
 * Quando a equipe existe mas está fora do escopo respondemos 403, e não 404:
 * o usuário precisa saber que o problema é permissão, não um id errado.
 */
async function loadTeamInScope(user: AuthenticatedUser, teamId: string) {
  const team = await repository.findTeamById(user, teamId);

  if (team) return team;

  if (await repository.teamExists(teamId)) {
    throw new ForbiddenError(
      "Você não tem acesso a esta equipe.",
      "TEAM_OUT_OF_SCOPE",
    );
  }

  throw new NotFoundError("Equipe não encontrada.", "TEAM_NOT_FOUND");
}

/** RF-08 — página de detalhe da equipe. */
export async function getTeamDetail(user: AuthenticatedUser, teamId: string) {
  const team = await loadTeamInScope(user, teamId);

  const [members, stageHistory] = await Promise.all([
    repository.findMembers(teamId),
    repository.findStageHistory(teamId),
  ]);

  return {
    team: toCard(team),
    members: members.map((member) => ({
      id: member.user_id,
      name: member.name,
      email: member.email,
      course: member.course,
      semester: member.semester,
      phone: member.phone,
      role: member.member_role,
      joinedAt: member.joined_at,
    })),
    stageHistory: stageHistory.map((entry) => ({
      id: entry.id,
      fromStage: entry.from_stage,
      toStage: entry.to_stage,
      reason: entry.reason,
      changedAt: entry.changed_at,
      changedByName: entry.changed_by_name,
    })),
  };
}

/**
 * RN-01 — o que impede a equipe de avançar até `toStage`.
 *
 * Consultado antes de aplicar a mudança e também pelo frontend, para o
 * diálogo de confirmação do arrastar mostrar exatamente o que falta.
 */
export async function getStageBlockers(
  user: AuthenticatedUser,
  teamId: string,
  toStage: number,
) {
  const team = await loadTeamInScope(user, teamId);

  if (toStage <= team.journey_stage) {
    return { blockers: [], isAdvancing: false };
  }

  const pending = await repository.findPendingMandatoryTasks(
    teamId,
    team.journey_stage,
    toStage,
  );

  return {
    isAdvancing: true,
    blockers: pending.map((task) => ({
      id: task.id,
      title: task.title,
      stage: task.journey_stage,
      status: task.status,
      dueDate: task.due_date,
    })),
  };
}

/**
 * RF-09 — move a equipe entre as etapas. É o que o arrastar do kanban chama.
 *
 * Avançar com tarefas obrigatórias pendentes é recusado com 409 e a lista do
 * que falta; o mentor decide e repete com `force: true`. Retroceder nunca é
 * bloqueado — corrigir um avanço feito por engano precisa ser fácil.
 */
export async function changeStage(
  user: AuthenticatedUser,
  teamId: string,
  input: ChangeStageInput,
  ipAddress: string | null,
) {
  if (!canManageJourney(user)) {
    throw new ForbiddenError(
      "Apenas administradores e mentores podem mover equipes entre etapas.",
      "CANNOT_MANAGE_JOURNEY",
    );
  }

  const team = await loadTeamInScope(user, teamId);
  const fromStage = team.journey_stage;

  if (input.toStage === fromStage) {
    throw new BadRequestError(
      "A equipe já está nesta etapa.",
      "STAGE_UNCHANGED",
    );
  }

  if (!team.is_active) {
    throw new BadRequestError(
      "Esta equipe está inativa e não pode mudar de etapa.",
      "TEAM_INACTIVE",
    );
  }

  const isAdvancing = input.toStage > fromStage;
  let pendingTasks: Awaited<
    ReturnType<typeof repository.findPendingMandatoryTasks>
  > = [];

  if (isAdvancing) {
    pendingTasks = await repository.findPendingMandatoryTasks(
      teamId,
      fromStage,
      input.toStage,
    );

    if (pendingTasks.length > 0 && !input.force) {
      throw new ConflictError(
        `Esta equipe tem ${pendingTasks.length} tarefa(s) obrigatória(s) sem aprovação nas etapas anteriores.`,
        "STAGE_REQUIREMENTS_PENDING",
        {
          pendingTasks: pendingTasks.map((task) => ({
            id: task.id,
            title: task.title,
            stage: task.journey_stage,
            status: task.status,
            dueDate: task.due_date,
          })),
        },
      );
    }
  }

  const journeyStatus = await withTransaction(async (client) => {
    await repository.updateStage(client, {
      teamId,
      fromStage,
      toStage: input.toStage,
      changedBy: user.id,
      reason: input.reason ?? null,
    });

    const status = await repository.recomputeJourneyStatus(client, teamId);

    await recordAudit(
      {
        userId: user.id,
        action: "TEAM_STAGE_CHANGED",
        entityType: "team",
        entityId: teamId,
        details: {
          fromStage,
          toStage: input.toStage,
          direction: isAdvancing ? "advance" : "rollback",
          forced: isAdvancing && pendingTasks.length > 0,
          pendingTaskCount: pendingTasks.length,
          reason: input.reason ?? null,
        },
        ipAddress,
      },
      client,
    );

    return status;
  });

  const updated = await repository.findTeamById(user, teamId);

  return {
    team: updated ? toCard(updated) : null,
    fromStage,
    toStage: input.toStage,
    journeyStatus,
    forced: isAdvancing && pendingTasks.length > 0,
    skippedTasks: pendingTasks.map((task) => ({
      id: task.id,
      title: task.title,
      stage: task.journey_stage,
    })),
  };
}

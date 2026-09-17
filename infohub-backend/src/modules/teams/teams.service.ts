import { withTransaction } from "../../config/database.js";
import { env } from "../../config/env.js";
import { recordAudit } from "../../shared/audit.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/AppError.js";
import { sendMail } from "../../shared/mail/mailer.js";
import {
  firstAccessTemplate,
  newRegistrationTemplate,
  stageChangedTemplate,
} from "../../shared/mail/templates.js";
import { canManageJourney } from "../../shared/scope.js";
import type { AuthenticatedUser } from "../../types/express.js";
import { issuePasswordToken } from "../auth/auth.service.js";
import * as usersRepository from "../users/users.repository.js";
import * as repository from "./teams.repository.js";
import type { JourneyStageRow, TeamRow } from "./teams.repository.js";
import type {
  AddStageInput,
  AssignMentorInput,
  ChangeStageInput,
  CreateNoteInput,
  ListTeamsQuery,
  RegisterTeamInput,
  StageBlockersQuery,
} from "./teams.schemas.js";

interface Actor {
  id: string;
  ipAddress?: string | null;
}

export interface JourneyStage {
  id: string;
  order: number;
  number: number | null;
  name: string;
  description: string | null;
  isExtra: boolean;
  isCurrent: boolean;
}

export interface TeamCard {
  id: string;
  name: string;
  description: string;
  category: { id: string; name: string };
  ideaStage: TeamRow["estagio_ideia"];
  /** Coluna do kanban (número da etapa padrão). */
  journeyStage: number;
  journeyStageName: string;
  currentStage: { id: string; name: string; order: number; isExtra: boolean };
  journeyStatus: TeamRow["status_jornada"];
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
    name: row.nome,
    description: row.descricao,
    category: { id: row.area_id, name: row.area_nome },
    ideaStage: row.estagio_ideia,
    journeyStage: row.etapa_numero,
    journeyStageName: row.etapa_atual_nome,
    currentStage: {
      id: row.etapa_atual_id,
      name: row.etapa_atual_nome,
      order: row.etapa_atual_ordem,
      isExtra: row.etapa_atual_extra,
    },
    journeyStatus: row.status_jornada,
    semester: row.semestre,
    howDidYouHear: row.como_conheceu,
    isActive: row.excluida_em === null,
    createdAt: row.criado_em,
    leader: row.lider_id
      ? {
          id: row.lider_id,
          name: row.lider_nome ?? "",
          email: row.lider_email ?? "",
          course: row.lider_curso,
        }
      : null,
    mentors: row.mentores ?? [],
    memberCount: row.total_membros,
    openTasks: row.tarefas_abertas,
    overdueTasks: row.tarefas_atrasadas,
  };
}

function toJourneyStage(row: JourneyStageRow, currentId: string): JourneyStage {
  return {
    id: row.id,
    order: row.ordem,
    number: row.numero,
    name: row.nome,
    description: row.descricao,
    isExtra: row.numero === null,
    isCurrent: row.id === currentId,
  };
}

/** Edição do programa em que a equipe entra: "2026/1" ou "2026/2". */
function currentSemester(): string {
  const now = new Date();
  return `${now.getFullYear()}/${now.getMonth() < 6 ? 1 : 2}`;
}

/**
 * RF-06 — equipes agrupadas pelas etapas padrão, no formato que o kanban
 * consome. Toda coluna vem na resposta, inclusive as vazias: o front precisa
 * renderizar a coluna para ela poder receber um cartão arrastado.
 */
export async function getBoard(
  user: AuthenticatedUser,
  filters: ListTeamsQuery,
) {
  const [rows, catalog] = await Promise.all([
    repository.listTeams(user, filters),
    repository.findStageCatalog(),
  ]);
  const cards = rows.map(toCard);

  const columns = catalog.map((stage) => ({
    stage: stage.numero,
    name: stage.nome,
    teams: cards.filter((card) => card.journeyStage === stage.numero),
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

/** RF-07/RF-08 — página de detalhe da equipe, com jornada e histórico. */
export async function getTeamDetail(user: AuthenticatedUser, teamId: string) {
  const team = await loadTeamInScope(user, teamId);

  const [members, journey, stageHistory] = await Promise.all([
    repository.findMembers(teamId),
    repository.findJourney(teamId),
    repository.findStageHistory(teamId),
  ]);

  return {
    team: toCard(team),
    members: members.map((member) => ({
      id: member.usuario_id,
      name: member.nome,
      email: member.email,
      course: member.curso,
      semester: member.semestre,
      phone: member.telefone,
      role: member.papel,
      joinedAt: member.entrou_em,
    })),
    journey: journey.map((stage) => toJourneyStage(stage, team.etapa_atual_id)),
    stageHistory: stageHistory.map((entry) => ({
      id: entry.id,
      fromStage: entry.de_numero,
      fromStageName: entry.de_nome,
      toStage: entry.para_numero,
      toStageName: entry.para_nome,
      direction:
        entry.de_ordem === null
          ? "start"
          : entry.para_ordem > entry.de_ordem
            ? "advance"
            : "rollback",
      reason: entry.motivo,
      forced: entry.forcado,
      changedAt: entry.movido_em,
      changedByName: entry.movido_por_nome,
    })),
  };
}

/**
 * Resolve o destino de uma mudança de etapa dentro da jornada DA equipe:
 * por número (coluna do kanban → etapa padrão) ou por id (etapa extra).
 */
function resolveTargetStage(
  journey: JourneyStageRow[],
  target: { toStage?: number; toStageId?: string },
) {
  const stage = target.toStageId
    ? journey.find((row) => row.id === target.toStageId)
    : journey.find((row) => row.numero === target.toStage);

  if (!stage) {
    throw new BadRequestError(
      "A etapa de destino não existe na jornada desta equipe.",
      "STAGE_NOT_FOUND",
    );
  }

  return stage;
}

function stageLabel(stage: JourneyStageRow): string {
  return stage.numero ? `${stage.numero}. ${stage.nome}` : stage.nome;
}

/**
 * RN-01 — o que impede a equipe de avançar até a etapa de destino.
 *
 * Consultado antes de aplicar a mudança e também pelo front, para o
 * diálogo de confirmação do arrastar mostrar exatamente o que falta.
 */
export async function getStageBlockers(
  user: AuthenticatedUser,
  teamId: string,
  target: StageBlockersQuery,
) {
  const team = await loadTeamInScope(user, teamId);
  const journey = await repository.findJourney(teamId);
  const to = resolveTargetStage(journey, target);

  if (to.ordem <= team.etapa_atual_ordem) {
    return { blockers: [], isAdvancing: false };
  }

  const pending = await repository.findPendingMandatoryTasks(
    teamId,
    team.etapa_atual_ordem,
    to.ordem,
  );

  return {
    isAdvancing: true,
    blockers: pending.map((task) => ({
      id: task.id,
      title: task.titulo,
      stage: task.etapa_numero,
      stageName: task.etapa_nome,
      status: task.status,
      dueDate: task.prazo,
    })),
  };
}

/**
 * RF-09 — move a equipe entre as etapas. É o que o arrastar do kanban chama,
 * e é AQUI que mora a RN-01 (não no controller nem no banco).
 *
 * Avançar com tarefas obrigatórias pendentes é recusado com 409 e a lista do
 * que falta; o mentor decide e repete com `force: true`, e o histórico guarda
 * que foi forçado. Retroceder nunca é bloqueado — corrigir um avanço feito
 * por engano precisa ser fácil.
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

  if (team.excluida_em) {
    throw new BadRequestError(
      "Esta equipe foi excluída e não pode mudar de etapa.",
      "TEAM_INACTIVE",
    );
  }

  const journey = await repository.findJourney(teamId);
  const from = journey.find((row) => row.id === team.etapa_atual_id)!;
  const to = resolveTargetStage(journey, input);

  if (to.id === from.id) {
    throw new BadRequestError("A equipe já está nesta etapa.", "STAGE_UNCHANGED");
  }

  const isAdvancing = to.ordem > from.ordem;
  let pendingTasks: Awaited<
    ReturnType<typeof repository.findPendingMandatoryTasks>
  > = [];

  if (isAdvancing) {
    pendingTasks = await repository.findPendingMandatoryTasks(
      teamId,
      from.ordem,
      to.ordem,
    );

    if (pendingTasks.length > 0 && !input.force) {
      throw new ConflictError(
        `Esta equipe tem ${pendingTasks.length} tarefa(s) obrigatória(s) sem aprovação nas etapas anteriores.`,
        "STAGE_REQUIREMENTS_PENDING",
        {
          pendingTasks: pendingTasks.map((task) => ({
            id: task.id,
            title: task.titulo,
            stage: task.etapa_numero,
            stageName: task.etapa_nome,
            status: task.status,
            dueDate: task.prazo,
          })),
        },
      );
    }
  }

  const forced = isAdvancing && pendingTasks.length > 0;

  const journeyStatus = await withTransaction(async (client) => {
    await repository.updateStage(client, {
      teamId,
      fromStageId: from.id,
      toStageId: to.id,
      changedBy: user.id,
      reason: input.reason ?? null,
      forced,
    });

    const status = await repository.recomputeJourneyStatus(client, teamId);

    await recordAudit(
      {
        userId: user.id,
        action: "TEAM_STAGE_CHANGED",
        entityType: "equipe",
        entityId: teamId,
        details: {
          from: stageLabel(from),
          to: stageLabel(to),
          direction: isAdvancing ? "advance" : "rollback",
          forced,
          pendingTaskCount: pendingTasks.length,
          reason: input.reason ?? null,
        },
        ipAddress,
      },
      client,
    );

    return status;
  });

  // RF-19: avisa os integrantes. Falha de e-mail não desfaz a mudança.
  const recipients = await repository.findMemberRecipients(teamId);
  for (const person of recipients) {
    const template = stageChangedTemplate(person.nome, team.nome, to.nome, isAdvancing);
    await sendMail({
      to: person.email,
      recipientId: person.id,
      teamId,
      type: "STAGE_CHANGED",
      ...template,
    });
  }

  const updated = await repository.findTeamById(user, teamId);

  return {
    team: updated ? toCard(updated) : null,
    fromStage: from.numero ?? team.etapa_numero,
    fromStageId: from.id,
    fromStageName: from.nome,
    toStage: to.numero ?? updated?.etapa_numero ?? team.etapa_numero,
    toStageId: to.id,
    toStageName: to.nome,
    isAdvancing,
    journeyStatus,
    forced,
    skippedTasks: pendingTasks.map((task) => ({
      id: task.id,
      title: task.titulo,
      stage: task.etapa_numero,
    })),
  };
}

/**
 * Mudança de requisito: o mentor acrescenta uma etapa extra à jornada de
 * UMA equipe. Sem `afterStage`, a etapa entra no fim (antes do InovAMF).
 */
export async function addExtraStage(
  user: AuthenticatedUser,
  teamId: string,
  input: AddStageInput,
  ipAddress: string | null,
) {
  if (!canManageJourney(user)) {
    throw new ForbiddenError(
      "Apenas administradores e mentores podem alterar a jornada da equipe.",
      "CANNOT_MANAGE_JOURNEY",
    );
  }

  const team = await loadTeamInScope(user, teamId);
  const journey = await repository.findJourney(teamId);

  let afterOrder = journey[journey.length - 1]!.ordem;
  if (input.afterStage !== undefined || input.afterStageId !== undefined) {
    afterOrder = resolveTargetStage(journey, {
      toStage: input.afterStage,
      toStageId: input.afterStageId,
    }).ordem;
  }

  const stageId = await withTransaction(async (client) => {
    const id = await repository.insertExtraStage(client, {
      teamId,
      name: input.name,
      description: input.description ?? null,
      afterOrder,
      createdBy: user.id,
    });

    // Uma etapa a mais depois da atual pode tirar a equipe da "última etapa".
    await repository.recomputeJourneyStatus(client, teamId);

    await recordAudit(
      {
        userId: user.id,
        action: "TEAM_STAGE_ADDED",
        entityType: "equipe",
        entityId: teamId,
        details: { stageId: id, name: input.name, afterOrder },
        ipAddress,
      },
      client,
    );

    return id;
  });

  const updatedJourney = await repository.findJourney(teamId);

  return {
    stageId,
    journey: updatedJourney.map((stage) =>
      toJourneyStage(stage, team.etapa_atual_id),
    ),
  };
}

/** Q4 — exclusão LÓGICA da equipe: some das telas, fica no banco. */
export async function deleteTeam(
  user: AuthenticatedUser,
  teamId: string,
  ipAddress: string | null,
) {
  const team = await loadTeamInScope(user, teamId);

  if (team.excluida_em) {
    throw new ConflictError("Esta equipe já foi excluída.", "TEAM_ALREADY_DELETED");
  }

  await repository.softDelete(teamId, user.id);

  await recordAudit({
    userId: user.id,
    action: "TEAM_DELETED",
    entityType: "equipe",
    entityId: teamId,
    details: { name: team.nome },
    ipAddress,
  });
}

// ---------------------------------------------------------------------------
// Q10/Q11 — mentores da equipe (só ADMIN chega aqui)
// ---------------------------------------------------------------------------

export async function assignMentor(
  user: AuthenticatedUser,
  teamId: string,
  input: AssignMentorInput,
) {
  const team = await loadTeamInScope(user, teamId);
  const mentor = await repository.findActiveMentor(input.mentorId);

  if (!mentor) {
    throw new NotFoundError(
      "Mentor não encontrado (a conta precisa ser de perfil MENTOR e estar ativa).",
      "MENTOR_NOT_FOUND",
    );
  }

  const added = await repository.assignMentor({
    teamId,
    mentorId: mentor.id,
    assignedBy: user.id,
  });

  return {
    added,
    mentor: { id: mentor.id, name: mentor.nome },
    team: { id: team.id, name: team.nome },
  };
}

export async function unassignMentor(
  user: AuthenticatedUser,
  teamId: string,
  mentorId: string,
) {
  await loadTeamInScope(user, teamId);
  const removed = await repository.unassignMentor(teamId, mentorId);

  if (!removed) {
    throw new NotFoundError("Este mentor não acompanha esta equipe.", "MENTOR_NOT_ASSIGNED");
  }
}

// ---------------------------------------------------------------------------
// RF-10 — anotações internas do mentor
// ---------------------------------------------------------------------------

export async function listNotes(user: AuthenticatedUser, teamId: string) {
  await loadTeamInScope(user, teamId);
  const notes = await repository.findNotes(teamId);

  return {
    data: notes.map((note) => ({
      id: note.id,
      author: note.autor_id ? { id: note.autor_id, name: note.autor_nome ?? "" } : null,
      content: note.texto,
      createdAt: note.criado_em,
      updatedAt: note.atualizado_em,
    })),
  };
}

export async function createNote(
  user: AuthenticatedUser,
  teamId: string,
  input: CreateNoteInput,
) {
  await loadTeamInScope(user, teamId);
  const id = await repository.insertNote({
    teamId,
    authorId: user.id,
    content: input.content,
  });
  return { id };
}

// ---------------------------------------------------------------------------
// RF-02/RF-04/RF-05 — cadastro da ideia (formulário público)
// ---------------------------------------------------------------------------

interface CreatedAccount {
  id: string;
  name: string;
  email: string;
  token: string | null; // null = já tinha senha; não precisa de primeiro acesso
}

/**
 * RF-02 — o formulário inicial cria a equipe, a conta do líder e as dos
 * integrantes, tudo em uma transação.
 *
 * Como fica a senha antes do primeiro acesso? Não existe: a conta nasce com
 * senha_hash NULL e cada pessoa recebe por e-mail um token de primeiro acesso
 * (token_senha, finalidade FIRST_ACCESS) para definir a própria senha.
 *
 * Q12 — quem já tem conta de aluno entra direto na equipe, sem aceite.
 */
export async function registerTeam(
  input: RegisterTeamInput,
  actor: { ipAddress?: string | null },
) {
  const area = await repository.findAreaById(input.team.areaId);
  if (!area) {
    throw new BadRequestError("Área da ideia inválida.", "INVALID_AREA");
  }

  const leaderEmail = input.leader.email;
  const members = input.members.filter(
    (member, index, all) =>
      member.email !== leaderEmail &&
      all.findIndex((other) => other.email === member.email) === index,
  );

  const { teamId, accounts } = await withTransaction(async (client) => {
    const teamId = await repository.insertTeam(client, {
      name: input.team.name,
      description: input.team.description,
      areaId: input.team.areaId,
      ideaStage: input.team.ideaStage,
      semester: currentSemester(),
      howDidYouHear: input.team.howDidYouHear ?? null,
    });

    await repository.createJourney(client, teamId);

    const accounts: CreatedAccount[] = [];

    async function ensureStudent(person: {
      name: string;
      email: string;
      course: string;
      phone?: string;
      semester?: string;
    }): Promise<CreatedAccount> {
      const existing = await usersRepository.findByEmail(person.email);

      if (existing && existing.perfil !== "STUDENT") {
        throw new ConflictError(
          `O e-mail ${person.email} pertence a uma conta de mentor ou administrador.`,
          "EMAIL_NOT_STUDENT",
        );
      }

      if (existing) {
        const full = await usersRepository.findById(existing.id);
        const needsFirstAccess = full !== null && !full.senha_definida;
        const issued = needsFirstAccess
          ? await issuePasswordToken(client, existing.id, "FIRST_ACCESS")
          : null;

        return {
          id: existing.id,
          name: full?.nome ?? person.name,
          email: person.email,
          token: issued?.token ?? null,
        };
      }

      const id = await usersRepository.insert(client, {
        name: person.name,
        email: person.email,
        role: "STUDENT",
        phone: person.phone ?? null,
        course: person.course,
        semester: person.semester ?? null,
        consent: true,
      });
      const issued = await issuePasswordToken(client, id, "FIRST_ACCESS");

      return { id, name: person.name, email: person.email, token: issued.token };
    }

    const leader = await ensureStudent(input.leader);
    await repository.insertMember(client, {
      teamId,
      userId: leader.id,
      role: "LEADER",
    });
    accounts.push(leader);

    for (const member of members) {
      const account = await ensureStudent(member);
      await repository.insertMember(client, {
        teamId,
        userId: account.id,
        role: "MEMBER",
      });
      accounts.push(account);
    }

    await recordAudit(
      {
        userId: leader.id,
        action: "TEAM_REGISTERED",
        entityType: "equipe",
        entityId: teamId,
        details: {
          name: input.team.name,
          area: area.nome,
          leaderEmail,
          memberCount: members.length,
        },
        ipAddress: actor.ipAddress ?? null,
      },
      client,
    );

    return { teamId, accounts };
  });

  // E-mails só depois do COMMIT: se a transação falhar, ninguém recebe link.
  for (const account of accounts) {
    if (!account.token) continue;
    const template = firstAccessTemplate(
      account.name,
      input.team.name,
      account.token,
      env.FIRST_ACCESS_EXPIRES_IN_HOURS,
    );
    await sendMail({
      to: account.email,
      recipientId: account.id,
      teamId,
      type: "FIRST_ACCESS",
      ...template,
    });
  }

  // RF-19: a coordenação fica sabendo da nova ideia.
  const admins = await repository.findAdminRecipients();
  for (const admin of admins) {
    const template = newRegistrationTemplate(
      admin.nome,
      input.team.name,
      input.leader.name,
      area.nome,
    );
    await sendMail({
      to: admin.email,
      recipientId: admin.id,
      teamId,
      type: "NEW_REGISTRATION",
      ...template,
    });
  }

  return {
    teamId,
    leaderId: accounts[0]!.id,
    memberCount: members.length,
  };
}

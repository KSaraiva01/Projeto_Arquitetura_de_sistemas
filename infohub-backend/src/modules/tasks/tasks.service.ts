import { withTransaction } from "../../config/database.js";
import { recordAudit } from "../../shared/audit.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/AppError.js";
import { sendMail } from "../../shared/mail/mailer.js";
import {
  newTaskTemplate,
  reviewResultTemplate,
  submissionReceivedTemplate,
} from "../../shared/mail/templates.js";
import { canMentor } from "../../shared/scope.js";
import type { AuthenticatedUser } from "../../types/express.js";
import * as teamsRepository from "../teams/teams.repository.js";
import * as repository from "./tasks.repository.js";
import type { CalendarEventRow, TaskRow } from "./tasks.repository.js";
import type {
  CalendarQuery,
  CreateSubmissionInput,
  CreateTaskInput,
  ListTasksQuery,
  ReviewTaskInput,
  UpdateTaskInput,
} from "./tasks.schemas.js";

export interface PublicTask {
  id: string;
  teamId: string;
  teamName: string;
  title: string;
  description: string | null;
  stage: number;
  stageId: string;
  stageName: string;
  dueDate: string;
  status: TaskRow["status"];
  isMandatory: boolean;
  submissionCount: number;
  lastSubmissionAt: Date | null;
  createdAt: Date;
}

function toPublicTask(row: TaskRow): PublicTask {
  return {
    id: row.id,
    teamId: row.equipe_id,
    teamName: row.equipe_nome,
    title: row.titulo,
    description: row.descricao,
    stage: row.etapa_numero,
    stageId: row.equipe_etapa_id,
    stageName: row.etapa_nome,
    dueDate: row.prazo,
    status: row.status,
    isMandatory: row.obrigatoria,
    submissionCount: row.total_entregas,
    lastSubmissionAt: row.ultima_entrega_em,
    createdAt: row.criado_em,
  };
}

export interface CalendarEvent {
  kind: "DUE" | "REMINDER";
  date: string;
  taskId: string;
  title: string;
  stage: number;
  stageName: string;
  status: TaskRow["status"];
  isMandatory: boolean;
  teamId: string;
  teamName: string;
  reminderSent: boolean | null;
}

function toEvent(row: CalendarEventRow): CalendarEvent {
  return {
    kind: row.kind,
    date: row.event_date,
    taskId: row.task_id,
    title: row.titulo,
    stage: row.etapa_numero,
    stageName: row.etapa_nome,
    status: row.status,
    isMandatory: row.obrigatoria,
    teamId: row.equipe_id,
    teamName: row.equipe_nome,
    reminderSent: row.reminder_sent,
  };
}

/**
 * Carrega a tarefa garantindo o escopo. Fora do escopo = 403, inexistente =
 * 404 — o usuário precisa saber qual dos dois é.
 */
async function loadTaskInScope(user: AuthenticatedUser, taskId: string) {
  const task = await repository.findTaskById(user, taskId);
  if (task) return task;

  if (await repository.taskExists(taskId)) {
    throw new ForbiddenError("Você não tem acesso a esta tarefa.", "TASK_OUT_OF_SCOPE");
  }
  throw new NotFoundError("Tarefa não encontrada.", "TASK_NOT_FOUND");
}

function assertMentor(user: AuthenticatedUser) {
  if (!canMentor(user)) {
    throw new ForbiddenError(
      "Apenas administradores e mentores podem fazer isso.",
      "INSUFFICIENT_ROLE",
    );
  }
}

export async function listTasks(
  user: AuthenticatedUser,
  filters: ListTasksQuery,
) {
  const rows = await repository.listTasks(user, filters);
  return { data: rows.map(toPublicTask), total: rows.length };
}

/** RF-13 — detalhe com as entregas (RF-16), os comentários (RF-15) e os lembretes. */
export async function getTask(user: AuthenticatedUser, taskId: string) {
  const row = await loadTaskInScope(user, taskId);

  const [submissions, comments, reminders] = await Promise.all([
    repository.findSubmissions(taskId),
    repository.findComments(taskId),
    repository.findReminders(taskId),
  ]);

  return {
    ...toPublicTask(row),
    submissions: submissions.map((s) => ({
      id: s.id,
      version: s.versao,
      type: s.tipo,
      url: s.url,
      fileName: s.nome_arquivo,
      fileSize: s.tamanho_bytes,
      mimeType: s.tipo_mime,
      submittedAt: s.enviado_em,
      submittedBy: s.enviado_por_id
        ? { id: s.enviado_por_id, name: s.enviado_por_nome ?? "" }
        : null,
    })),
    comments: comments.map((c) => ({
      id: c.id,
      submissionId: c.entrega_id,
      submissionVersion: c.entrega_versao,
      author: c.autor_id ? { id: c.autor_id, name: c.autor_nome ?? "" } : null,
      decision: c.decisao,
      content: c.texto,
      createdAt: c.criado_em,
    })),
    reminders: reminders.map((r) => ({
      id: r.id,
      daysBefore: r.dias_antes,
      remindAt: r.enviar_em,
      sentAt: r.enviado_em,
    })),
  };
}

/**
 * Calendário de atividades e prazos.
 *
 * Os eventos já vêm agrupados por dia, no formato que a grade do mês
 * consome direto — evita o frontend ter que reagrupar uma lista solta.
 */
export async function getCalendar(
  user: AuthenticatedUser,
  filters: CalendarQuery,
) {
  const [rows, summary] = await Promise.all([
    repository.listCalendarEvents(user, filters),
    repository.summarize(user, filters),
  ]);

  const events = rows.map(toEvent);
  const byDay = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const bucket = byDay.get(event.date);
    if (bucket) {
      bucket.push(event);
    } else {
      byDay.set(event.date, [event]);
    }
  }

  return {
    range: { from: filters.from, to: filters.to },
    summary,
    days: [...byDay.entries()]
      .map(([date, dayEvents]) => ({ date, events: dayEvents }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    events,
  };
}

/** RF-11 — modelos disponíveis para o "criar a partir de modelo". */
export async function listTemplates() {
  const rows = await repository.findTemplates();
  return {
    data: rows.map((t) => ({
      id: t.id,
      stage: t.etapa_numero,
      stageName: t.etapa_nome,
      title: t.titulo,
      description: t.descricao,
      isMandatory: t.obrigatoria,
    })),
  };
}

/**
 * RF-12 — cria a tarefa (avulsa ou a partir de modelo) e agenda os lembretes
 * (RF-17). Avisa os integrantes por e-mail (RF-19).
 */
export async function createTask(
  user: AuthenticatedUser,
  input: CreateTaskInput,
  ipAddress: string | null,
) {
  assertMentor(user);

  const team = await teamsRepository.findTeamById(user, input.teamId);
  if (!team) {
    if (await teamsRepository.teamExists(input.teamId)) {
      throw new ForbiddenError("Você não tem acesso a esta equipe.", "TEAM_OUT_OF_SCOPE");
    }
    throw new NotFoundError("Equipe não encontrada.", "TEAM_NOT_FOUND");
  }
  if (team.excluida_em) {
    throw new BadRequestError("Esta equipe foi excluída.", "TEAM_INACTIVE");
  }

  const template = input.templateId
    ? await repository.findTemplateById(input.templateId)
    : null;
  if (input.templateId && !template) {
    throw new NotFoundError("Modelo de tarefa não encontrado.", "TEMPLATE_NOT_FOUND");
  }

  // Em qual etapa da jornada DA equipe a tarefa entra:
  //   stageId informado > etapa do modelo > etapa atual da equipe.
  let stage = input.stageId
    ? await repository.findTeamStageById(input.teamId, input.stageId)
    : null;
  if (input.stageId && !stage) {
    throw new BadRequestError(
      "A etapa informada não pertence à jornada desta equipe.",
      "STAGE_NOT_FOUND",
    );
  }
  if (!stage && template) {
    stage = await repository.findTeamStageByCatalog(input.teamId, template.etapa_id);
  }
  if (!stage) {
    stage = await repository.findTeamCurrentStage(input.teamId);
  }
  if (!stage) {
    throw new BadRequestError("A equipe não tem jornada configurada.", "JOURNEY_MISSING");
  }

  const title = input.title ?? template!.titulo;
  const description = input.description ?? template?.descricao ?? null;
  const isMandatory = input.isMandatory ?? template?.obrigatoria ?? false;

  const taskId = await withTransaction(async (client) => {
    const id = await repository.insertTask(client, {
      teamId: input.teamId,
      stageId: stage.id,
      templateId: template?.id ?? null,
      title,
      description,
      dueDate: input.dueDate,
      isMandatory,
      createdBy: user.id,
    });

    await repository.insertReminders(client, id, input.dueDate, input.reminderDaysBefore);

    // Uma obrigatória nova pode tirar a equipe do "pronta para o InovAMF".
    await teamsRepository.recomputeJourneyStatus(client, input.teamId);

    await recordAudit(
      {
        userId: user.id,
        action: "TASK_CREATED",
        entityType: "tarefa",
        entityId: id,
        details: { teamId: input.teamId, title, dueDate: input.dueDate, isMandatory },
        ipAddress,
      },
      client,
    );

    return id;
  });

  const recipients = await teamsRepository.findMemberRecipients(input.teamId);
  for (const person of recipients) {
    const mail = newTaskTemplate(person.nome, team.nome, title, input.dueDate, isMandatory);
    await sendMail({
      to: person.email,
      recipientId: person.id,
      teamId: input.teamId,
      taskId,
      type: "NEW_TASK",
      ...mail,
    });
  }

  return getTask(user, taskId);
}

/**
 * RF-12/RF-17/Q8 — edita a tarefa. Mudou o prazo? Os lembretes ainda não
 * enviados são recalculados, e uma tarefa "atrasada" cujo novo prazo é
 * futuro volta a ficar pendente.
 */
export async function updateTask(
  user: AuthenticatedUser,
  taskId: string,
  input: UpdateTaskInput,
  ipAddress: string | null,
) {
  assertMentor(user);
  const task = await loadTaskInScope(user, taskId);

  const dueDateChanged = input.dueDate !== undefined && input.dueDate !== task.prazo;
  const today = new Date().toISOString().slice(0, 10);

  await withTransaction(async (client) => {
    await repository.updateTask(client, taskId, {
      titulo: input.title,
      descricao: input.description,
      prazo: input.dueDate,
      obrigatoria: input.isMandatory,
    });

    if (dueDateChanged) {
      await repository.rescheduleReminders(client, taskId, input.dueDate!);

      if (task.status === "OVERDUE" && input.dueDate! >= today) {
        await repository.setTaskStatus(client, taskId, "PENDING");
      }
    }

    if (input.isMandatory !== undefined) {
      await teamsRepository.recomputeJourneyStatus(client, task.equipe_id);
    }

    await recordAudit(
      {
        userId: user.id,
        action: "TASK_UPDATED",
        entityType: "tarefa",
        entityId: taskId,
        details: { changes: input, previousDueDate: task.prazo, dueDateChanged },
        ipAddress,
      },
      client,
    );
  });

  return getTask(user, taskId);
}

/**
 * RF-14/RF-16 — entrega. Cada envio vira uma nova versão; a tarefa passa a
 * SUBMITTED e os mentores da equipe são avisados.
 */
export async function submit(
  user: AuthenticatedUser,
  taskId: string,
  input: CreateSubmissionInput,
  ipAddress: string | null,
) {
  const task = await loadTaskInScope(user, taskId);

  if (task.status === "APPROVED") {
    throw new ConflictError(
      "Esta tarefa já foi aprovada e não aceita novas entregas.",
      "TASK_ALREADY_APPROVED",
    );
  }

  const submission = await withTransaction(async (client) => {
    const created = await repository.insertSubmission(client, {
      taskId,
      submittedBy: user.id,
      type: input.type,
      url: input.url,
      fileName: input.type === "FILE" ? (input.fileName ?? null) : null,
      fileSize: input.type === "FILE" ? (input.fileSize ?? null) : null,
      mimeType: input.type === "FILE" ? (input.mimeType ?? null) : null,
    });

    await repository.setTaskStatus(client, taskId, "SUBMITTED");

    await recordAudit(
      {
        userId: user.id,
        action: "TASK_SUBMITTED",
        entityType: "tarefa",
        entityId: taskId,
        details: { submissionId: created.id, version: created.versao, type: input.type },
        ipAddress,
      },
      client,
    );

    return created;
  });

  const mentors = await teamsRepository.findMentorRecipients(task.equipe_id);
  for (const mentor of mentors) {
    const mail = submissionReceivedTemplate(
      mentor.nome,
      task.equipe_nome,
      task.titulo,
      submission.versao,
      user.name,
    );
    await sendMail({
      to: mentor.email,
      recipientId: mentor.id,
      teamId: task.equipe_id,
      taskId,
      type: "SUBMITTED",
      ...mail,
    });
  }

  return getTask(user, taskId);
}

/**
 * RF-15 — aprovar ou solicitar ajustes. O comentário fica ligado à versão
 * avaliada; rodadas anteriores continuam no histórico. Aprovar/reprovar
 * recalcula o status da jornada (RN-07) e avisa os integrantes (RF-20).
 */
export async function review(
  user: AuthenticatedUser,
  taskId: string,
  input: ReviewTaskInput,
  ipAddress: string | null,
) {
  assertMentor(user);
  const task = await loadTaskInScope(user, taskId);

  const latest = await repository.findLatestSubmission(taskId);
  if (!latest) {
    throw new ConflictError(
      "Esta tarefa ainda não tem nenhuma entrega para avaliar.",
      "NO_SUBMISSION",
    );
  }

  await withTransaction(async (client) => {
    await repository.insertComment(client, {
      taskId,
      submissionId: latest.id,
      authorId: user.id,
      decision: input.decision,
      content: input.comment,
    });

    await repository.setTaskStatus(client, taskId, input.decision);
    await teamsRepository.recomputeJourneyStatus(client, task.equipe_id);

    await recordAudit(
      {
        userId: user.id,
        action: input.decision === "APPROVED" ? "TASK_APPROVED" : "TASK_REJECTED",
        entityType: "tarefa",
        entityId: taskId,
        details: { submissionId: latest.id, version: latest.versao },
        ipAddress,
      },
      client,
    );
  });

  const recipients = await teamsRepository.findMemberRecipients(task.equipe_id);
  for (const person of recipients) {
    const mail = reviewResultTemplate(
      person.nome,
      task.equipe_nome,
      task.titulo,
      input.decision === "APPROVED",
      input.comment,
    );
    await sendMail({
      to: person.email,
      recipientId: person.id,
      teamId: task.equipe_id,
      taskId,
      type: input.decision,
      ...mail,
    });
  }

  return getTask(user, taskId);
}

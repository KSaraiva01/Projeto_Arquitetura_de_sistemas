import { NotFoundError } from "../../shared/errors/AppError.js";
import {
  JOURNEY_STAGE_NAMES,
  type JourneyStage,
} from "../../shared/types/domain.js";
import type { AuthenticatedUser } from "../../types/express.js";
import * as repository from "./tasks.repository.js";
import type { CalendarEventRow, TaskRow } from "./tasks.repository.js";
import type { CalendarQuery, ListTasksQuery } from "./tasks.schemas.js";

export interface PublicTask {
  id: string;
  teamId: string;
  teamName: string;
  title: string;
  description: string | null;
  stage: number;
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
    teamId: row.team_id,
    teamName: row.team_name,
    title: row.title,
    description: row.description,
    stage: row.journey_stage,
    stageName: JOURNEY_STAGE_NAMES[row.journey_stage as JourneyStage] ?? "—",
    dueDate: row.due_date,
    status: row.status,
    isMandatory: row.is_mandatory,
    submissionCount: row.submission_count,
    lastSubmissionAt: row.last_submission_at,
    createdAt: row.created_at,
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
    title: row.title,
    stage: row.journey_stage,
    stageName: JOURNEY_STAGE_NAMES[row.journey_stage as JourneyStage] ?? "—",
    status: row.status,
    isMandatory: row.is_mandatory,
    teamId: row.team_id,
    teamName: row.team_name,
    reminderSent: row.reminder_sent,
  };
}

export async function listTasks(
  user: AuthenticatedUser,
  filters: ListTasksQuery,
) {
  await repository.markOverdueTasks();
  const rows = await repository.listTasks(user, filters);
  return { data: rows.map(toPublicTask), total: rows.length };
}

export async function getTask(user: AuthenticatedUser, taskId: string) {
  const row = await repository.findTaskById(user, taskId);

  if (!row) {
    throw new NotFoundError(
      "Tarefa não encontrada ou fora do seu acesso.",
      "TASK_NOT_FOUND",
    );
  }

  return toPublicTask(row);
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
  await repository.markOverdueTasks();

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

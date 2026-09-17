import type { RequestHandler } from "express";
import {
  getBody,
  getParams,
  getQuery,
} from "../../shared/middlewares/validate.js";
import * as service from "./tasks.service.js";
import type {
  CalendarQuery,
  CreateSubmissionInput,
  CreateTaskInput,
  ListTasksQuery,
  ReviewTaskInput,
  TaskIdParam,
  UpdateTaskInput,
} from "./tasks.schemas.js";

export const list: RequestHandler = async (req, res) => {
  const filters = getQuery<ListTasksQuery>(res);
  res.status(200).json(await service.listTasks(req.user!, filters));
};

/** Calendário de atividades e prazos. */
export const calendar: RequestHandler = async (req, res) => {
  const filters = getQuery<CalendarQuery>(res);
  res.status(200).json(await service.getCalendar(req.user!, filters));
};

/** RF-11 — modelos de tarefa. */
export const templates: RequestHandler = async (_req, res) => {
  res.status(200).json(await service.listTemplates());
};

export const detail: RequestHandler = async (req, res) => {
  const { id } = getParams<TaskIdParam>(res);
  res.status(200).json({ task: await service.getTask(req.user!, id) });
};

/** RF-12 — nova tarefa (avulsa ou de modelo). */
export const create: RequestHandler = async (req, res) => {
  const input = getBody<CreateTaskInput>(req);
  const task = await service.createTask(req.user!, input, req.ip ?? null);
  res.status(201).json({ task, message: "Tarefa criada e equipe avisada por e-mail." });
};

/** RF-12/RF-17 — edição (prazo recalcula lembretes). */
export const update: RequestHandler = async (req, res) => {
  const { id } = getParams<TaskIdParam>(res);
  const input = getBody<UpdateTaskInput>(req);
  const task = await service.updateTask(req.user!, id, input, req.ip ?? null);
  res.status(200).json({ task, message: "Tarefa atualizada." });
};

/** RF-14/RF-16 — entrega (nova versão). */
export const submit: RequestHandler = async (req, res) => {
  const { id } = getParams<TaskIdParam>(res);
  const input = getBody<CreateSubmissionInput>(req);
  const task = await service.submit(req.user!, id, input, req.ip ?? null);
  res.status(201).json({
    task,
    message: `Entrega registrada (versão ${task.submissionCount}). O mentor foi avisado.`,
  });
};

/** RF-15 — aprovar / solicitar ajustes. */
export const review: RequestHandler = async (req, res) => {
  const { id } = getParams<TaskIdParam>(res);
  const input = getBody<ReviewTaskInput>(req);
  const task = await service.review(req.user!, id, input, req.ip ?? null);
  res.status(200).json({
    task,
    message:
      input.decision === "APPROVED"
        ? "Entrega aprovada."
        : "Ajustes solicitados; a equipe foi avisada.",
  });
};

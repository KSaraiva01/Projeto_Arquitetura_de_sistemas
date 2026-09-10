import type { RequestHandler } from "express";
import { getParams, getQuery } from "../../shared/middlewares/validate.js";
import * as service from "./tasks.service.js";
import type {
  CalendarQuery,
  ListTasksQuery,
  TaskIdParam,
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

export const detail: RequestHandler = async (req, res) => {
  const { id } = getParams<TaskIdParam>(res);
  res.status(200).json({ task: await service.getTask(req.user!, id) });
};

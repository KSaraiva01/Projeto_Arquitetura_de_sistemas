import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import {
  validateParams,
  validateQuery,
} from "../../shared/middlewares/validate.js";
import * as controller from "./tasks.controller.js";
import {
  calendarQuerySchema,
  listTasksQuerySchema,
  taskIdParamSchema,
} from "./tasks.schemas.js";

/**
 * RF-13 — consulta de tarefas e prazos.
 * Prefixo: /api/tasks
 *
 * Leitura para todos os perfis; o escopo restringe o que cada um enxerga.
 * A criação e a avaliação de tarefas (RF-11, RF-15) entram no próximo módulo.
 */
export const tasksRouter = Router();

tasksRouter.use(authenticate);

tasksRouter.get(
  "/calendar",
  validateQuery(calendarQuerySchema),
  controller.calendar,
);

tasksRouter.get("/", validateQuery(listTasksQuerySchema), controller.list);

tasksRouter.get("/:id", validateParams(taskIdParamSchema), controller.detail);

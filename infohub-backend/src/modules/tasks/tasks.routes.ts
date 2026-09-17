import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../../shared/middlewares/authenticate.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../shared/middlewares/validate.js";
import * as controller from "./tasks.controller.js";
import {
  calendarQuerySchema,
  createSubmissionSchema,
  createTaskSchema,
  listTasksQuerySchema,
  reviewTaskSchema,
  taskIdParamSchema,
  updateTaskSchema,
} from "./tasks.schemas.js";

/**
 * RF-11 a RF-17 — tarefas, entregas, avaliação e calendário.
 * Prefixo: /api/tasks
 *
 * Leitura para todos os perfis (o escopo restringe o que cada um enxerga).
 * Criar, editar e avaliar é de ADMIN/MENTOR; entregar é de quem está na
 * equipe.
 */
export const tasksRouter = Router();

tasksRouter.use(authenticate);

tasksRouter.get("/calendar", validateQuery(calendarQuerySchema), controller.calendar);

tasksRouter.get("/templates", authorize("ADMIN", "MENTOR"), controller.templates);

tasksRouter.get("/", validateQuery(listTasksQuerySchema), controller.list);

tasksRouter.post(
  "/",
  authorize("ADMIN", "MENTOR"),
  validateBody(createTaskSchema),
  controller.create,
);

tasksRouter.get("/:id", validateParams(taskIdParamSchema), controller.detail);

tasksRouter.patch(
  "/:id",
  authorize("ADMIN", "MENTOR"),
  validateParams(taskIdParamSchema),
  validateBody(updateTaskSchema),
  controller.update,
);

tasksRouter.post(
  "/:id/submissions",
  validateParams(taskIdParamSchema),
  validateBody(createSubmissionSchema),
  controller.submit,
);

tasksRouter.post(
  "/:id/review",
  authorize("ADMIN", "MENTOR"),
  validateParams(taskIdParamSchema),
  validateBody(reviewTaskSchema),
  controller.review,
);

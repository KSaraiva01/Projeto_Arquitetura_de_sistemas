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
import * as controller from "./users.controller.js";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from "./users.schemas.js";

/**
 * RF-03 — gestão de contas de administrador e mentor.
 * Prefixo: /api/users — exclusivo do perfil ADMIN (RNF-03).
 */
export const usersRouter = Router();

usersRouter.use(authenticate, authorize("ADMIN"));

usersRouter.get("/", validateQuery(listUsersQuerySchema), controller.list);

usersRouter.post("/", validateBody(createUserSchema), controller.create);

usersRouter.get("/:id", validateParams(userIdParamSchema), controller.getById);

usersRouter.patch(
  "/:id",
  validateParams(userIdParamSchema),
  validateBody(updateUserSchema),
  controller.update,
);

usersRouter.patch(
  "/:id/status",
  validateParams(userIdParamSchema),
  validateBody(updateUserStatusSchema),
  controller.updateStatus,
);

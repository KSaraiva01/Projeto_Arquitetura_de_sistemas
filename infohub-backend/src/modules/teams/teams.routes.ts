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
import * as controller from "./teams.controller.js";
import {
  changeStageSchema,
  listTeamsQuerySchema,
  teamIdParamSchema,
} from "./teams.schemas.js";

/**
 * RF-06 a RF-09 — equipes e jornada.
 * Prefixo: /api/teams
 *
 * Todas as rotas são autenticadas; o que cada perfil enxerga é decidido pelo
 * escopo em `shared/scope.ts`, não por rotas separadas.
 */
export const teamsRouter = Router();

teamsRouter.use(authenticate);

teamsRouter.get("/", validateQuery(listTeamsQuerySchema), controller.list);

teamsRouter.get(
  "/board",
  validateQuery(listTeamsQuerySchema),
  controller.board,
);

teamsRouter.get("/:id", validateParams(teamIdParamSchema), controller.detail);

teamsRouter.get(
  "/:id/stage-blockers",
  authorize("ADMIN", "MENTOR"),
  validateParams(teamIdParamSchema),
  controller.stageBlockers,
);

teamsRouter.patch(
  "/:id/stage",
  authorize("ADMIN", "MENTOR"),
  validateParams(teamIdParamSchema),
  validateBody(changeStageSchema),
  controller.changeStage,
);

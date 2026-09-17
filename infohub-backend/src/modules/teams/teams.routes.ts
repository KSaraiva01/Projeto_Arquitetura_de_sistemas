import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../../shared/middlewares/authenticate.js";
import { registerLimiter } from "../../shared/middlewares/rateLimit.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../shared/middlewares/validate.js";
import * as controller from "./teams.controller.js";
import {
  addStageSchema,
  assignMentorSchema,
  changeStageSchema,
  mentorParamSchema,
  createNoteSchema,
  listTeamsQuerySchema,
  registerTeamSchema,
  stageBlockersQuerySchema,
  teamIdParamSchema,
} from "./teams.schemas.js";

/**
 * RF-02 e RF-05 a RF-10 — equipes e jornada.
 * Prefixo: /api/teams
 *
 * Só o cadastro é público. Nas demais, o que cada perfil enxerga é decidido
 * pelo escopo em `shared/scope.ts`, não por rotas separadas — exceto as
 * anotações do mentor (RF-10), que o aluno nem consegue chamar.
 */
export const teamsRouter = Router();

// RF-02: formulário inicial — público, com limite por IP.
teamsRouter.post(
  "/register",
  registerLimiter,
  validateBody(registerTeamSchema),
  controller.register,
);

teamsRouter.use(authenticate);

teamsRouter.get("/", validateQuery(listTeamsQuerySchema), controller.list);

teamsRouter.get(
  "/board",
  validateQuery(listTeamsQuerySchema),
  controller.board,
);

teamsRouter.get("/:id", validateParams(teamIdParamSchema), controller.detail);

teamsRouter.delete(
  "/:id",
  authorize("ADMIN"),
  validateParams(teamIdParamSchema),
  controller.remove,
);

teamsRouter.get(
  "/:id/stage-blockers",
  authorize("ADMIN", "MENTOR"),
  validateParams(teamIdParamSchema),
  validateQuery(stageBlockersQuerySchema),
  controller.stageBlockers,
);

teamsRouter.patch(
  "/:id/stage",
  authorize("ADMIN", "MENTOR"),
  validateParams(teamIdParamSchema),
  validateBody(changeStageSchema),
  controller.changeStage,
);

teamsRouter.post(
  "/:id/stages",
  authorize("ADMIN", "MENTOR"),
  validateParams(teamIdParamSchema),
  validateBody(addStageSchema),
  controller.addStage,
);

// Q10/Q11: quem acompanha a equipe — decisão da coordenação.
teamsRouter.post(
  "/:id/mentors",
  authorize("ADMIN"),
  validateParams(teamIdParamSchema),
  validateBody(assignMentorSchema),
  controller.assignMentor,
);

teamsRouter.delete(
  "/:id/mentors/:mentorId",
  authorize("ADMIN"),
  validateParams(mentorParamSchema),
  controller.unassignMentor,
);

// RF-10: anotações internas — o perfil STUDENT recebe 403 antes de qualquer
// consulta ao banco.
teamsRouter.get(
  "/:id/notes",
  authorize("ADMIN", "MENTOR"),
  validateParams(teamIdParamSchema),
  controller.listNotes,
);

teamsRouter.post(
  "/:id/notes",
  authorize("ADMIN", "MENTOR"),
  validateParams(teamIdParamSchema),
  validateBody(createNoteSchema),
  controller.createNote,
);

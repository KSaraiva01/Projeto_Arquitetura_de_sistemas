import { Router } from "express";
import { autenticar, autorizar } from "../../shared/middlewares/autenticar";
import { limiteCadastro } from "../../shared/middlewares/rate-limit";
import { getBody, getParams, getQuery, validarBody, validarParams, validarQuery } from "../../shared/middlewares/validar";
import * as service from "./equipes.service";
import {
  addMemberSchema,
  addStageSchema,
  assignMentorSchema,
  changeStageSchema,
  listTeamsQuerySchema,
  manualReminderSchema,
  memberParamSchema,
  mentorParamSchema,
  noteParamSchema,
  noteSchema,
  referSchema,
  registerTeamSchema,
  stageBlockersQuerySchema,
  stageParamSchema,
  teamIdParamSchema,
  updateTeamSchema,
  type AddMemberInput,
  type AddStageInput,
  type AssignMentorInput,
  type ChangeStageInput,
  type ListTeamsQuery,
  type ManualReminderInput,
  type MemberParam,
  type MentorParam,
  type NoteInput,
  type NoteParam,
  type ReferInput,
  type RegisterTeamInput,
  type StageBlockersQuery,
  type StageParam,
  type TeamIdParam,
  type UpdateTeamInput,
} from "./equipes.schemas";

/**
 * RF-02 e RF-05 a RF-10, RF-20 — equipes e jornada. Prefixo: /api/teams
 *
 * Só o cadastro é público. Nas demais, o que cada perfil enxerga é decidido
 * pelo escopo (shared/escopo.ts), não por rotas separadas — exceto as
 * anotações internas (RF-10), que o aluno nem consegue chamar.
 */
export const teamsRouter = Router();

const ip = (req: { ip?: string }) => req.ip ?? null;

// RF-02: formulário inicial — público, com limite por IP.
teamsRouter.post("/register", limiteCadastro, validarBody(registerTeamSchema), async (req, res) => {
  res.status(201).json(await service.cadastrarEquipe(getBody<RegisterTeamInput>(req), ip(req)));
});

teamsRouter.use(autenticar);

teamsRouter.get("/", validarQuery(listTeamsQuerySchema), async (req, res) => {
  res.json(await service.listarEquipes(req.usuario!, getQuery<ListTeamsQuery>(res)));
});

teamsRouter.get("/board", validarQuery(listTeamsQuerySchema), async (req, res) => {
  res.json(await service.board(req.usuario!, getQuery<ListTeamsQuery>(res)));
});

teamsRouter.get("/:id", validarParams(teamIdParamSchema), async (req, res) => {
  res.json(await service.detalheEquipe(req.usuario!, getParams<TeamIdParam>(res).id));
});

teamsRouter.patch("/:id", validarParams(teamIdParamSchema), validarBody(updateTeamSchema), async (req, res) => {
  res.json(await service.atualizarEquipe(req.usuario!, getParams<TeamIdParam>(res).id, getBody<UpdateTeamInput>(req), ip(req)));
});

// Q4 — exclusão lógica (só ADMIN).
teamsRouter.delete("/:id", autorizar("ADMIN"), validarParams(teamIdParamSchema), async (req, res) => {
  await service.excluirEquipe(req.usuario!, getParams<TeamIdParam>(res).id, ip(req));
  res.status(204).send();
});

// --- Jornada (RF-09, RN-01) — ADMIN/MENTOR ---------------------------------

teamsRouter.get(
  "/:id/stage-blockers",
  autorizar("ADMIN", "MENTOR"),
  validarParams(teamIdParamSchema),
  validarQuery(stageBlockersQuerySchema),
  async (req, res) => {
    res.json(await service.bloqueiosDeEtapa(req.usuario!, getParams<TeamIdParam>(res).id, getQuery<StageBlockersQuery>(res)));
  },
);

teamsRouter.patch(
  "/:id/stage",
  autorizar("ADMIN", "MENTOR"),
  validarParams(teamIdParamSchema),
  validarBody(changeStageSchema),
  async (req, res) => {
    res.json(await service.mudarEtapa(req.usuario!, getParams<TeamIdParam>(res).id, getBody<ChangeStageInput>(req), ip(req)));
  },
);

teamsRouter.post(
  "/:id/stages",
  autorizar("ADMIN", "MENTOR"),
  validarParams(teamIdParamSchema),
  validarBody(addStageSchema),
  async (req, res) => {
    res.status(201).json(await service.adicionarEtapaExtra(req.usuario!, getParams<TeamIdParam>(res).id, getBody<AddStageInput>(req), ip(req)));
  },
);

teamsRouter.delete("/:id/stages/:stageId", autorizar("ADMIN", "MENTOR"), validarParams(stageParamSchema), async (req, res) => {
  const { id, stageId } = getParams<StageParam>(res);
  res.json(await service.removerEtapaExtra(req.usuario!, id, stageId, ip(req)));
});

// "Depois das 6 etapas a gente encaminha para o InovAMF" — coordenação.
teamsRouter.post("/:id/refer", autorizar("ADMIN"), validarParams(teamIdParamSchema), validarBody(referSchema), async (req, res) => {
  res.json(await service.encaminharAoInovamf(req.usuario!, getParams<TeamIdParam>(res).id, getBody<ReferInput>(req).force, ip(req)));
});

// --- Mentores (só ADMIN) -----------------------------------------------------

teamsRouter.post("/:id/mentors", autorizar("ADMIN"), validarParams(teamIdParamSchema), validarBody(assignMentorSchema), async (req, res) => {
  res.json(await service.atribuirMentor(req.usuario!, getParams<TeamIdParam>(res).id, getBody<AssignMentorInput>(req).mentorId, ip(req)));
});

teamsRouter.delete("/:id/mentors/:mentorId", autorizar("ADMIN"), validarParams(mentorParamSchema), async (req, res) => {
  const { id, mentorId } = getParams<MentorParam>(res);
  res.json(await service.removerMentor(req.usuario!, id, mentorId, ip(req)));
});

// --- Integrantes (líder, mentor ou admin) ------------------------------------

teamsRouter.post("/:id/members", validarParams(teamIdParamSchema), validarBody(addMemberSchema), async (req, res) => {
  res.status(201).json(await service.adicionarIntegrante(req.usuario!, getParams<TeamIdParam>(res).id, getBody<AddMemberInput>(req), ip(req)));
});

teamsRouter.delete("/:id/members/:userId", validarParams(memberParamSchema), async (req, res) => {
  const { id, userId } = getParams<MemberParam>(res);
  await service.removerIntegrante(req.usuario!, id, userId, ip(req));
  res.status(204).send();
});

teamsRouter.post("/:id/members/:userId/promote", validarParams(memberParamSchema), async (req, res) => {
  const { id, userId } = getParams<MemberParam>(res);
  res.json(await service.promoverLider(req.usuario!, id, userId, ip(req)));
});

// --- RF-10: anotações internas — o aluno recebe 403 antes de qualquer consulta

teamsRouter.get("/:id/notes", autorizar("ADMIN", "MENTOR"), validarParams(teamIdParamSchema), async (req, res) => {
  res.json(await service.listarAnotacoes(req.usuario!, getParams<TeamIdParam>(res).id));
});

teamsRouter.post("/:id/notes", autorizar("ADMIN", "MENTOR"), validarParams(teamIdParamSchema), validarBody(noteSchema), async (req, res) => {
  res.status(201).json(await service.criarAnotacao(req.usuario!, getParams<TeamIdParam>(res).id, getBody<NoteInput>(req)));
});

teamsRouter.patch("/:id/notes/:noteId", autorizar("ADMIN", "MENTOR"), validarParams(noteParamSchema), validarBody(noteSchema), async (req, res) => {
  const { id, noteId } = getParams<NoteParam>(res);
  res.json(await service.atualizarAnotacao(req.usuario!, id, noteId, getBody<NoteInput>(req)));
});

teamsRouter.delete("/:id/notes/:noteId", autorizar("ADMIN", "MENTOR"), validarParams(noteParamSchema), async (req, res) => {
  const { id, noteId } = getParams<NoteParam>(res);
  await service.excluirAnotacao(req.usuario!, id, noteId);
  res.status(204).send();
});

// --- RF-20: lembrete manual (ADMIN/MENTOR) -----------------------------------

teamsRouter.post("/:id/reminders", autorizar("ADMIN", "MENTOR"), validarParams(teamIdParamSchema), validarBody(manualReminderSchema), async (req, res) => {
  res.json(await service.lembreteManual(req.usuario!, getParams<TeamIdParam>(res).id, getBody<ManualReminderInput>(req), ip(req)));
});

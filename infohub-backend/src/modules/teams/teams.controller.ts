import type { RequestHandler } from "express";
import {
  getBody,
  getParams,
  getQuery,
} from "../../shared/middlewares/validate.js";
import * as service from "./teams.service.js";
import type {
  AddStageInput,
  AssignMentorInput,
  ChangeStageInput,
  CreateNoteInput,
  ListTeamsQuery,
  MentorParam,
  RegisterTeamInput,
  StageBlockersQuery,
  TeamIdParam,
} from "./teams.schemas.js";

export const list: RequestHandler = async (req, res) => {
  const filters = getQuery<ListTeamsQuery>(res);
  res.status(200).json(await service.listTeams(req.user!, filters));
};

/** RF-06 — equipes já agrupadas por etapa, prontas para o kanban. */
export const board: RequestHandler = async (req, res) => {
  const filters = getQuery<ListTeamsQuery>(res);
  res.status(200).json(await service.getBoard(req.user!, filters));
};

export const detail: RequestHandler = async (req, res) => {
  const { id } = getParams<TeamIdParam>(res);
  res.status(200).json(await service.getTeamDetail(req.user!, id));
};

/** Prévia da RN-01, para o diálogo de confirmação do arrastar. */
export const stageBlockers: RequestHandler = async (req, res) => {
  const { id } = getParams<TeamIdParam>(res);
  const target = getQuery<StageBlockersQuery>(res);
  res.status(200).json(await service.getStageBlockers(req.user!, id, target));
};

/** RF-09 — o arrastar do kanban cai aqui. */
export const changeStage: RequestHandler = async (req, res) => {
  const { id } = getParams<TeamIdParam>(res);
  const input = getBody<ChangeStageInput>(req);

  const result = await service.changeStage(req.user!, id, input, req.ip ?? null);

  res.status(200).json({
    ...result,
    message: result.isAdvancing
      ? `Equipe avançada para "${result.toStageName}".`
      : `Equipe retornada para "${result.toStageName}".`,
  });
};

/** Etapa extra na jornada desta equipe. */
export const addStage: RequestHandler = async (req, res) => {
  const { id } = getParams<TeamIdParam>(res);
  const input = getBody<AddStageInput>(req);

  const result = await service.addExtraStage(req.user!, id, input, req.ip ?? null);

  res.status(201).json({
    ...result,
    message: `Etapa "${input.name}" acrescentada à jornada da equipe.`,
  });
};

/** Q4 — exclusão lógica. */
export const remove: RequestHandler = async (req, res) => {
  const { id } = getParams<TeamIdParam>(res);
  await service.deleteTeam(req.user!, id, req.ip ?? null);
  res.status(200).json({ message: "Equipe excluída." });
};

/** RF-10 — anotações internas (só ADMIN/MENTOR chegam aqui). */
export const listNotes: RequestHandler = async (req, res) => {
  const { id } = getParams<TeamIdParam>(res);
  res.status(200).json(await service.listNotes(req.user!, id));
};

export const createNote: RequestHandler = async (req, res) => {
  const { id } = getParams<TeamIdParam>(res);
  const input = getBody<CreateNoteInput>(req);
  res.status(201).json(await service.createNote(req.user!, id, input));
};

/** RF-02 — formulário público de cadastro da ideia. */
export const register: RequestHandler = async (req, res) => {
  const input = getBody<RegisterTeamInput>(req);
  const result = await service.registerTeam(input, { ipAddress: req.ip ?? null });

  res.status(201).json({
    ...result,
    message:
      "Ideia cadastrada! Enviamos para o e-mail do líder e dos integrantes um link para definir a senha de acesso.",
  });
};

/** Q10/Q11 — atribui um mentor à equipe. */
export const assignMentor: RequestHandler = async (req, res) => {
  const { id } = getParams<TeamIdParam>(res);
  const input = getBody<AssignMentorInput>(req);
  const result = await service.assignMentor(req.user!, id, input);

  res.status(result.added ? 201 : 200).json({
    ...result,
    message: result.added
      ? `${result.mentor.name} agora acompanha a equipe ${result.team.name}.`
      : `${result.mentor.name} já acompanhava esta equipe.`,
  });
};

export const unassignMentor: RequestHandler = async (req, res) => {
  const { id, mentorId } = getParams<MentorParam>(res);
  await service.unassignMentor(req.user!, id, mentorId);
  res.status(200).json({ message: "Mentor desvinculado da equipe." });
};

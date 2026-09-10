import type { RequestHandler } from "express";
import {
  getBody,
  getParams,
  getQuery,
} from "../../shared/middlewares/validate.js";
import * as service from "./teams.service.js";
import type {
  ChangeStageInput,
  ListTeamsQuery,
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
  const toStage = Number(req.query.toStage);

  if (!Number.isInteger(toStage) || toStage < 1 || toStage > 6) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Informe toStage entre 1 e 6.",
      },
    });
    return;
  }

  res.status(200).json(await service.getStageBlockers(req.user!, id, toStage));
};

/** RF-09 — o arrastar do kanban cai aqui. */
export const changeStage: RequestHandler = async (req, res) => {
  const { id } = getParams<TeamIdParam>(res);
  const input = getBody<ChangeStageInput>(req);

  const result = await service.changeStage(req.user!, id, input, req.ip ?? null);

  res.status(200).json({
    ...result,
    message:
      result.fromStage < result.toStage
        ? `Equipe avançada para a etapa ${result.toStage}.`
        : `Equipe retornada para a etapa ${result.toStage}.`,
  });
};

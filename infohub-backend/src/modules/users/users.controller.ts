import type { Request, RequestHandler } from "express";
import {
  getBody,
  getParams,
  getQuery,
} from "../../shared/middlewares/validate.js";
import * as service from "./users.service.js";
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
  UpdateUserStatusInput,
  UserIdParam,
} from "./users.schemas.js";

function actorFrom(req: Request) {
  return { id: req.user!.id, ipAddress: req.ip ?? null };
}

export const list: RequestHandler = async (_req, res) => {
  const filters = getQuery<ListUsersQuery>(res);
  res.status(200).json(await service.listUsers(filters));
};

export const getById: RequestHandler = async (_req, res) => {
  const { id } = getParams<UserIdParam>(res);
  res.status(200).json({ user: await service.getUser(id) });
};

export const create: RequestHandler = async (req, res) => {
  const input = getBody<CreateUserInput>(req);
  const user = await service.createUser(input, actorFrom(req));

  res.status(201).json({
    user,
    message:
      "Conta criada. Enviamos um e-mail com o link para o usuário definir a senha.",
  });
};

export const update: RequestHandler = async (req, res) => {
  const { id } = getParams<UserIdParam>(res);
  const input = getBody<UpdateUserInput>(req);

  res.status(200).json({ user: await service.updateUser(id, input, actorFrom(req)) });
};

export const updateStatus: RequestHandler = async (req, res) => {
  const { id } = getParams<UserIdParam>(res);
  const { isActive } = getBody<UpdateUserStatusInput>(req);

  const user = await service.setUserStatus(id, isActive, actorFrom(req));

  res.status(200).json({
    user,
    message: isActive ? "Conta reativada." : "Conta desativada.",
  });
};

import { Router, type RequestHandler } from "express";
import { autenticar, autorizar } from "../../shared/middlewares/autenticar";
import { getBody, getParams, getQuery, validarBody, validarParams, validarQuery } from "../../shared/middlewares/validar";
import * as service from "./usuarios.service";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdParamSchema,
  type CreateUserInput,
  type ListUsersQuery,
  type UpdateUserInput,
  type UpdateUserStatusInput,
  type UserIdParam,
} from "./usuarios.schemas";

/**
 * RF-03 — gestão de contas (admin/mentor) e exclusão LGPD por administrador.
 * Prefixo: /api/users — exclusivo do perfil ADMIN (RNF-03).
 */
export const usersRouter = Router();

usersRouter.use(autenticar, autorizar("ADMIN"));

const ator = (req: Parameters<RequestHandler>[0]) => ({ id: req.usuario!.id, ip: req.ip ?? null });

usersRouter.get("/", validarQuery(listUsersQuerySchema), async (_req, res) => {
  res.json(await service.listarUsuarios(getQuery<ListUsersQuery>(res)));
});

usersRouter.post("/", validarBody(createUserSchema), async (req, res) => {
  const usuario = await service.criarUsuario(getBody<CreateUserInput>(req), ator(req));
  res.status(201).json({ user: usuario, message: "Conta criada. Enviamos o link de ativação por e-mail." });
});

usersRouter.get("/:id", validarParams(userIdParamSchema), async (_req, res) => {
  res.json({ user: await service.obterUsuario(getParams<UserIdParam>(res).id) });
});

usersRouter.patch("/:id", validarParams(userIdParamSchema), validarBody(updateUserSchema), async (req, res) => {
  res.json({ user: await service.atualizarUsuario(getParams<UserIdParam>(res).id, getBody<UpdateUserInput>(req), ator(req)) });
});

usersRouter.patch("/:id/status", validarParams(userIdParamSchema), validarBody(updateUserStatusSchema), async (req, res) => {
  const { isActive } = getBody<UpdateUserStatusInput>(req);
  res.json({ user: await service.definirStatus(getParams<UserIdParam>(res).id, isActive, ator(req)) });
});

usersRouter.delete("/:id", validarParams(userIdParamSchema), async (req, res) => {
  const resultado = await service.anonimizarUsuario(getParams<UserIdParam>(res).id, ator(req));
  res.json({ ...resultado, message: "Dados pessoais do usuário foram excluídos (LGPD)." });
});

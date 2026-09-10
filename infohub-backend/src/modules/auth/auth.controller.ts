import type { Request, RequestHandler, Response } from "express";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../shared/errors/AppError.js";
import { getBody } from "../../shared/middlewares/validate.js";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RefreshInput,
  ResetPasswordInput,
} from "./auth.schemas.js";
import * as service from "./auth.service.js";

const REFRESH_COOKIE = "infohub_refresh_token";

function contextFrom(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  };
}

/**
 * O refresh token vai em cookie httpOnly (inacessível a JavaScript, portanto
 * fora do alcance de XSS) e também no corpo, para clientes que não usam
 * cookies — mobile, Insomnia, testes automatizados.
 */
function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "none" : "lax",
    path: `${env.API_PREFIX}/auth`,
    maxAge: env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: `${env.API_PREFIX}/auth` });
}

function readRefreshToken(req: Request): string | undefined {
  const fromBody = (req.body as RefreshInput | undefined)?.refreshToken;
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[
    REFRESH_COOKIE
  ];
  return fromBody ?? fromCookie;
}

export const login: RequestHandler = async (req, res) => {
  const input = getBody<LoginInput>(req);
  const session = await service.login(input, contextFrom(req));

  setRefreshCookie(res, session.refreshToken);
  res.status(200).json(session);
};

export const refresh: RequestHandler = async (req, res) => {
  const token = readRefreshToken(req);

  if (!token) {
    throw new UnauthorizedError(
      "Refresh token não informado.",
      "MISSING_REFRESH_TOKEN",
    );
  }

  const session = await service.refresh(token, contextFrom(req));

  setRefreshCookie(res, session.refreshToken);
  res.status(200).json(session);
};

export const logout: RequestHandler = async (req, res) => {
  await service.logout(readRefreshToken(req), req.user?.id, contextFrom(req));

  clearRefreshCookie(res);
  res.status(204).send();
};

export const me: RequestHandler = async (req, res) => {
  const user = await service.getCurrentUser(req.user!.id);
  res.status(200).json({ user });
};

export const forgotPassword: RequestHandler = async (req, res) => {
  const input = getBody<ForgotPasswordInput>(req);
  await service.requestPasswordReset(input.email, contextFrom(req));

  // Resposta idêntica exista ou não a conta — ver auth.service.
  res.status(202).json({
    message:
      "Se houver uma conta com este e-mail, enviaremos as instruções de redefinição em instantes.",
  });
};

export const resetPassword: RequestHandler = async (req, res) => {
  const input = getBody<ResetPasswordInput>(req);
  await service.resetPassword(input, contextFrom(req));

  clearRefreshCookie(res);
  res.status(200).json({
    message: "Senha redefinida com sucesso. Faça login com a nova senha.",
  });
};

export const changePassword: RequestHandler = async (req, res) => {
  const input = getBody<ChangePasswordInput>(req);
  await service.changePassword(req.user!.id, input, contextFrom(req));

  clearRefreshCookie(res);
  res.status(200).json({
    message:
      "Senha alterada com sucesso. Por segurança, entre novamente com a nova senha.",
  });
};

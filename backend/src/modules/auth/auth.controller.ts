import type { Request, RequestHandler, Response } from "express";
import { env } from "../../config/env";
import { UnauthorizedError } from "../../shared/errors";
import { contextoDe, getBody } from "../../shared/middlewares/validar";
import { anonimizarUsuario } from "../usuarios/usuarios.service";
import type {
  ChangePasswordInput,
  DeleteAccountInput,
  ForgotPasswordInput,
  LoginInput,
  NotificationPreferencesInput,
  RefreshInput,
  ResetPasswordInput,
} from "./auth.schemas";
import * as service from "./auth.service";

const COOKIE_REFRESH = "infohub_refresh_token";
const CAMINHO_COOKIE = "/api/auth";

/**
 * O refresh token vai em cookie httpOnly (fora do alcance de XSS) e também
 * no corpo da resposta, para clientes sem cookie (Insomnia, testes, mobile).
 */
function gravarCookie(res: Response, token: string) {
  res.cookie(COOKIE_REFRESH, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax", // mesmo domínio: API e frontend saem do mesmo processo
    path: CAMINHO_COOKIE,
    maxAge: env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  });
}

function limparCookie(res: Response) {
  res.clearCookie(COOKIE_REFRESH, { path: CAMINHO_COOKIE });
}

function lerRefreshToken(req: Request): string | undefined {
  const doCorpo = (req.body as RefreshInput | undefined)?.refreshToken;
  const doCookie = (req.cookies as Record<string, string> | undefined)?.[COOKIE_REFRESH];
  return doCorpo ?? doCookie;
}

export const login: RequestHandler = async (req, res) => {
  const sessao = await service.login(getBody<LoginInput>(req), contextoDe(req));
  gravarCookie(res, sessao.refreshToken);
  res.status(200).json(sessao);
};

export const refresh: RequestHandler = async (req, res) => {
  const token = lerRefreshToken(req);
  if (!token) throw new UnauthorizedError("Refresh token não informado.", "MISSING_REFRESH_TOKEN");
  const sessao = await service.renovar(token, contextoDe(req));
  gravarCookie(res, sessao.refreshToken);
  res.status(200).json(sessao);
};

export const logout: RequestHandler = async (req, res) => {
  await service.sair(lerRefreshToken(req), req.usuario?.id, contextoDe(req));
  limparCookie(res);
  res.status(204).send();
};

export const me: RequestHandler = async (req, res) => {
  res.status(200).json({ user: await service.usuarioAtual(req.usuario!.id) });
};

export const forgotPassword: RequestHandler = async (req, res) => {
  await service.solicitarRecuperacao(getBody<ForgotPasswordInput>(req).email, contextoDe(req));
  // Resposta idêntica exista ou não a conta.
  res.status(202).json({
    message: "Se houver uma conta com este e-mail, enviaremos as instruções em instantes.",
  });
};

export const resetPassword: RequestHandler = async (req, res) => {
  const tipo = await service.definirSenha(getBody<ResetPasswordInput>(req), contextoDe(req));
  limparCookie(res);
  res.status(200).json({
    message:
      tipo === "ATIVACAO_CONTA"
        ? "Conta ativada! Faça login com a senha que você acabou de criar."
        : "Senha redefinida com sucesso. Faça login com a nova senha.",
  });
};

export const changePassword: RequestHandler = async (req, res) => {
  await service.alterarSenha(req.usuario!.id, getBody<ChangePasswordInput>(req), contextoDe(req));
  limparCookie(res);
  res.status(200).json({
    message: "Senha alterada com sucesso. Por segurança, entre novamente com a nova senha.",
  });
};

/** RNF-02 (LGPD) — o próprio usuário exclui a conta. */
export const deleteAccount: RequestHandler = async (req, res) => {
  await service.confirmarSenhaPropria(req.usuario!.id, getBody<DeleteAccountInput>(req).password);
  const resultado = await anonimizarUsuario(req.usuario!.id, { id: req.usuario!.id, ip: req.ip ?? null });
  limparCookie(res);
  res.status(200).json({
    ...resultado,
    message: "Sua conta foi excluída. Seus dados pessoais foram apagados do InfoHub.",
  });
};

export const getPreferences: RequestHandler = async (req, res) => {
  res.status(200).json(await service.listarPreferencias(req.usuario!.id));
};

export const updatePreferences: RequestHandler = async (req, res) => {
  res.status(200).json(await service.salvarPreferencias(req.usuario!.id, getBody<NotificationPreferencesInput>(req)));
};

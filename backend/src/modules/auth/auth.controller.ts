import type { Request, RequestHandler, Response } from "express";
import { env } from "../../config/env";
import { UnauthorizedError } from "../../shared/errors";
import { contextoDe, getBody } from "../../shared/middlewares/validar";
import { anonimizarUsuario } from "../usuarios/usuarios.service";
import type {
  ChangePasswordInput,
  ConfirmEmailInput,
  DeleteAccountInput,
  ForgotPasswordInput,
  LoginInput,
  NotificationPreferencesInput,
  RefreshInput,
  ResendConfirmationInput,
  ResetPasswordInput,
} from "./auth.schemas";
import * as service from "./auth.service";

const COOKIE_REFRESH = "infohub_refresh_token";
/** Marca a sessão aberta sem "Lembrar-me": a renovação mantém o cookie como de sessão. */
const COOKIE_TEMPORARIA = "infohub_sessao_temporaria";
const CAMINHO_COOKIE = "/api/auth";

const opcoesCookie = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax", // mesmo domínio: API e frontend saem do mesmo processo
  path: CAMINHO_COOKIE,
} as const;

/**
 * O refresh token vai em cookie httpOnly (fora do alcance de XSS) e também
 * no corpo da resposta, para clientes sem cookie (Insomnia, testes, mobile).
 * Sem "Lembrar-me" o cookie não tem validade própria: some quando o
 * navegador fecha (a sessão no banco continua expirando no prazo normal).
 */
function gravarCookie(res: Response, token: string, lembrar: boolean) {
  res.cookie(COOKIE_REFRESH, token, {
    ...opcoesCookie,
    ...(lembrar ? { maxAge: env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000 } : {}),
  });
  if (lembrar) {
    res.clearCookie(COOKIE_TEMPORARIA, { path: CAMINHO_COOKIE });
  } else {
    res.cookie(COOKIE_TEMPORARIA, "1", opcoesCookie);
  }
}

function limparCookie(res: Response) {
  res.clearCookie(COOKIE_REFRESH, { path: CAMINHO_COOKIE });
  res.clearCookie(COOKIE_TEMPORARIA, { path: CAMINHO_COOKIE });
}

function lerCookie(req: Request, nome: string): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[nome];
}

function lerRefreshToken(req: Request): string | undefined {
  const doCorpo = (req.body as RefreshInput | undefined)?.refreshToken;
  return doCorpo ?? lerCookie(req, COOKIE_REFRESH);
}

export const login: RequestHandler = async (req, res) => {
  const body = getBody<LoginInput>(req);
  const sessao = await service.login(body, contextoDe(req));
  gravarCookie(res, sessao.refreshToken, body.rememberMe !== false);
  res.status(200).json(sessao);
};

export const refresh: RequestHandler = async (req, res) => {
  const token = lerRefreshToken(req);
  if (!token) throw new UnauthorizedError("Refresh token não informado.", "MISSING_REFRESH_TOKEN");
  const sessao = await service.renovar(token, contextoDe(req));
  gravarCookie(res, sessao.refreshToken, !lerCookie(req, COOKIE_TEMPORARIA));
  res.status(200).json(sessao);
};

export const logout: RequestHandler = async (req, res) => {
  await service.sair(lerRefreshToken(req), contextoDe(req));
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

export const confirmEmail: RequestHandler = async (req, res) => {
  const resultado = await service.confirmarEmail(getBody<ConfirmEmailInput>(req).token, contextoDe(req));
  res.status(200).json({
    alreadyConfirmed: resultado === "JA_CONFIRMADO",
    message:
      resultado === "JA_CONFIRMADO"
        ? "Seu e-mail já estava confirmado. É só entrar com seu e-mail e senha."
        : "E-mail confirmado! Agora você já pode entrar no InfoHub.",
  });
};

export const resendConfirmation: RequestHandler = async (req, res) => {
  await service.reenviarConfirmacao(getBody<ResendConfirmationInput>(req).email, contextoDe(req));
  // Resposta idêntica exista ou não a conta.
  res.status(202).json({
    message: "Se houver uma conta aguardando confirmação com este e-mail, enviaremos um novo link em instantes.",
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

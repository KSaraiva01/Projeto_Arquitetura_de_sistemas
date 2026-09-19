import rateLimit from "express-rate-limit";
import { env } from "../../config/env";

const json = (message: string) => ({ error: { code: "TOO_MANY_REQUESTS", message } });

/** Limite global da API, só para conter abuso grosseiro. */
export const limiteGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isDevelopment ? 10_000 : 900,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: json("Muitas requisições. Aguarde alguns minutos e tente novamente."),
});

/** Login: 10 tentativas malsucedidas a cada 15 minutos por IP. */
export const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isDevelopment ? 100 : 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: json("Muitas tentativas de login. Aguarde 15 minutos antes de tentar de novo."),
});

/** Recuperação/ativação de senha: evita virar ferramenta de spam. */
export const limiteSenha = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.isDevelopment ? 100 : 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: json("Muitas solicitações. Tente novamente mais tarde."),
});

/** RF-02: o formulário de ideia é público; limita cadastros em massa por IP. */
export const limiteCadastro = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.isDevelopment ? 100 : 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: json("Muitos cadastros a partir deste endereço. Tente novamente mais tarde."),
});

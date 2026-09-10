import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";

const json = (message: string) => ({
  error: { code: "TOO_MANY_REQUESTS", message },
});

/** Limite global, só para conter abuso grosseiro da API. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isDevelopment ? 10_000 : 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: json("Muitas requisições. Aguarde alguns minutos e tente novamente."),
});

/** Protege o login contra força bruta: 10 tentativas a cada 15 minutos por IP. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isDevelopment ? 100 : 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: json(
    "Muitas tentativas de login. Aguarde 15 minutos antes de tentar de novo.",
  ),
});

/** Evita que o endpoint de recuperação vire ferramenta de spam de e-mail. */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.isDevelopment ? 100 : 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: json(
    "Muitas solicitações de recuperação de senha. Tente novamente mais tarde.",
  ),
});

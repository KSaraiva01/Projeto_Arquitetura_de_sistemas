import "./config/zod.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { router } from "./routes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./shared/middlewares/errorHandler.js";
import { globalLimiter } from "./shared/middlewares/rateLimit.js";


/**
 * Em desenvolvimento qualquer porta de localhost é aceita: o servidor do
 * Next costuma trocar de porta quando a 3000 já está ocupada, e ficar
 * perseguindo isso no .env só gera erro de CORS difícil de diagnosticar.
 *
 * Em produção vale exclusivamente a lista de CORS_ORIGINS.
 */
function resolveCorsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) {
  // Requisições sem Origin (curl, health check, server-to-server) passam.
  if (!origin) return callback(null, true);

  if (env.corsOrigins.includes(origin)) return callback(null, true);

  if (env.isDevelopment && /^http:\/\/localhost:\d+$/.test(origin)) {
    return callback(null, true);
  }

  callback(new Error(`Origem não autorizada pelo CORS: ${origin}`));
}

export function createApp() {
  const app = express();

  // Atrás de proxy (Vercel, Render, nginx) req.ip precisa vir do
  // X-Forwarded-For — caso contrário o rate limit veria um IP só.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin: resolveCorsOrigin,
      credentials: true, // necessário para o cookie do refresh token
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(globalLimiter);

  app.use(env.API_PREFIX, router);

  // Precisam ser os últimos, nesta ordem.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

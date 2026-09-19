import "./config/zod";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { apiRouter } from "./routes";
import { rotaNaoEncontrada, tratarErros } from "./shared/middlewares/erros";
import { limiteGlobal } from "./shared/middlewares/rate-limit";

/**
 * Monta a API do InfoHub sob /api. O frontend (Next) é acoplado depois, em
 * server.ts — tudo no mesmo processo e na mesma porta, sem CORS.
 */
export function criarApi() {
  const api = express.Router();

  api.use(express.json({ limit: "1mb" }));
  api.use(express.urlencoded({ extended: true }));
  api.use(cookieParser());
  api.use(limiteGlobal);

  api.use(apiRouter);

  // Precisam ser os últimos, nesta ordem.
  api.use(rotaNaoEncontrada);
  api.use(tratarErros);

  return api;
}

export function criarApp() {
  const app = express();

  // Atrás do proxy do Coolify, req.ip precisa vir do X-Forwarded-For —
  // senão o rate limit veria um único IP.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // Cabeçalhos de segurança. A CSP fica por conta do Next (inline scripts).
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use("/api", criarApi());

  return app;
}

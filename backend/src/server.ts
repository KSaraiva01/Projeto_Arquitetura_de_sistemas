import fs from "node:fs";
import type { Server } from "node:http";
import path from "node:path";
import next from "next";
import { criarApp } from "./app";
import { env } from "./config/env";
import { iniciarScheduler } from "./jobs/scheduler";
import { prisma, schemaBanco } from "./lib/prisma";

/**
 * Ponto de entrada do monolito: UM processo, UMA porta.
 *
 *   /api/*  → Express (backend/src)
 *   /*      → Next.js (frontend/), servindo as páginas do sistema
 *
 * Em desenvolvimento (`npm run dev`) o Next sobe em modo dev com HMR; em
 * produção (`npm start`) serve o build feito por `npm run build`.
 */
/**
 * Raiz do repositório: os scripts npm rodam de lá (e o Dockerfile usa
 * WORKDIR /app). Em dev `__dirname` é backend/src e em produção é dist/, por
 * isso a busca sobe até achar a pasta do frontend.
 */
function localizarPastaFrontend(): string {
  const candidatos = [process.cwd(), path.resolve(__dirname, ".."), path.resolve(__dirname, "../..")];
  for (const base of candidatos) {
    const pasta = path.join(base, "frontend");
    if (fs.existsSync(path.join(pasta, "next.config.ts"))) return pasta;
  }
  return path.join(process.cwd(), "frontend");
}

const pastaFrontend = localizarPastaFrontend();

async function bootstrap() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    console.log(`[db] conectado — schema "${schemaBanco}"`);
  } catch (error) {
    console.error("[db] não foi possível conectar ao PostgreSQL. Confira DATABASE_URL.", error instanceof Error ? error.message : error);
    process.exit(1);
  }

  fs.mkdirSync(env.uploadsDir, { recursive: true });

  const app = criarApp();

  if (fs.existsSync(path.join(pastaFrontend, "next.config.ts"))) {
    const dev = env.isDevelopment;
    const nextApp = next({ dev, dir: pastaFrontend, turbopack: dev, hostname: env.HOST, port: env.PORT });
    const handle = nextApp.getRequestHandler();
    await nextApp.prepare();
    app.use((req, res) => void handle(req, res));
    console.log(`[web] Next.js ${dev ? "em modo desenvolvimento (HMR)" : "servindo o build de produção"}`);
  } else {
    console.warn("[web] pasta frontend/ não encontrada — servindo apenas a API.");
  }

  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(
      `\n  InfoHub rodando em http://localhost:${env.PORT}  (API em /api)` +
        `\n  Ambiente: ${env.NODE_ENV}  |  E-mail: ${env.MAIL_DRIVER}  |  Uploads: ${env.uploadsDir}\n`,
    );
  });

  const pararScheduler = iniciarScheduler();
  registrarEncerramento(server, pararScheduler);
}

/**
 * Encerramento gracioso: para de aceitar conexões, espera as em curso e
 * fecha o banco. Sem isso um deploy pode cortar uma transação no meio.
 */
function registrarEncerramento(server: Server, pararScheduler: () => void) {
  let encerrando = false;

  const encerrar = (sinal: string) => {
    if (encerrando) return;
    encerrando = true;
    pararScheduler();
    console.log(`\n[server] ${sinal} recebido, encerrando...`);

    server.close(async () => {
      await prisma.$disconnect();
      console.log("[server] encerrado.");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("[server] encerramento forçado após 10s.");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGINT", () => encerrar("SIGINT"));
  process.on("SIGTERM", () => encerrar("SIGTERM"));
}

void bootstrap();

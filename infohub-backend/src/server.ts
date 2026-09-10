import type { Server } from "node:http";
import { createApp } from "./app.js";
import { assertDatabaseConnection, closePool } from "./config/database.js";
import { env } from "./config/env.js";

async function bootstrap() {
  try {
    const version = await assertDatabaseConnection();
    console.log(`[db] conectado — ${version.split(",")[0]}`);
  } catch (error) {
    console.error(
      "[db] não foi possível conectar ao PostgreSQL. Confira DATABASE_URL no .env.",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(
      `\n  InfoHub API rodando em http://localhost:${env.PORT}${env.API_PREFIX}` +
        `\n  Ambiente: ${env.NODE_ENV}  |  E-mail: ${env.MAIL_DRIVER}\n`,
    );
  });

  registerShutdown(server);
}

/**
 * Encerramento gracioso: para de aceitar conexões novas, espera as em curso
 * terminarem e fecha o pool do banco. Sem isso, um deploy pode cortar uma
 * transação no meio.
 */
function registerShutdown(server: Server) {
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n[server] ${signal} recebido, encerrando...`);

    server.close(async () => {
      await closePool();
      console.log("[server] encerrado com sucesso.");
      process.exit(0);
    });

    // Rede de segurança: se algo travar, não ficamos pendurados para sempre.
    setTimeout(() => {
      console.error("[server] encerramento forçado após 10s.");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

void bootstrap();

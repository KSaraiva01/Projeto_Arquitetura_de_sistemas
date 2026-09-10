import { closePool, query } from "../config/database.js";
import { env } from "../config/env.js";

/**
 * Apaga e recria o schema `public` inteiro — usado em desenvolvimento
 * quando uma migration precisa ser reescrita.
 *
 * Bloqueado em produção: aqui não existe "desfazer".
 */
async function reset() {
  if (env.isProduction) {
    throw new Error(
      "db:reset é destrutivo e está bloqueado quando NODE_ENV=production.",
    );
  }

  console.warn(
    `[reset] apagando TODOS os dados do banco "${env.DATABASE_URL ?? env.PGDATABASE}"...`,
  );

  await query("DROP SCHEMA public CASCADE");
  await query("CREATE SCHEMA public");

  console.log(
    "[reset] schema recriado. Rode `npm run db:migrate` e `npm run db:seed`.",
  );
}

reset()
  .catch((error: unknown) => {
    console.error("[reset]", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closePool());

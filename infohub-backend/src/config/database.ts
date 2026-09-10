import { Pool, types, type PoolClient, type QueryResultRow } from "pg";
import { env } from "./env.js";

/**
 * Ajustes de parsing do driver.
 *
 * - DATE (1082): o pg devolveria um objeto Date à meia-noite no fuso local,
 *   o que faz um prazo "2026-09-10" virar "2026-09-09" dependendo do
 *   servidor. Mantemos como string "YYYY-MM-DD".
 * - INT8 (20): COUNT(*) volta como string por padrão; convertemos para
 *   number, já que a escala do InfoHub nunca chega perto de 2^53.
 */
types.setTypeParser(types.builtins.DATE, (value) => value);
types.setTypeParser(types.builtins.INT8, (value) => Number.parseInt(value, 10));

export const pool = new Pool(
  env.DATABASE_URL
    ? {
        connectionString: env.DATABASE_URL,
        ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: env.PGHOST,
        port: env.PGPORT,
        user: env.PGUSER,
        password: env.PGPASSWORD,
        database: env.PGDATABASE,
        ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
      },
);

pool.on("error", (error) => {
  console.error("[db] erro em cliente ocioso do pool:", error);
});

/** Executa uma query no pool. Use sempre parâmetros ($1, $2...), nunca concatenação. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
) {
  const startedAt = Date.now();
  const result = await pool.query<T>(text, params as unknown[]);

  if (env.isDevelopment) {
    const elapsed = Date.now() - startedAt;
    const preview = text.replace(/\s+/g, " ").trim().slice(0, 90);
    console.debug(`[db] ${elapsed}ms | ${result.rowCount} linha(s) | ${preview}`);
  }

  return result;
}

/** Retorna a primeira linha da query, ou null quando não houver resultado. */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] ?? null;
}

/**
 * Roda um bloco dentro de uma transação: commit ao final, rollback em
 * qualquer erro. Use para operações que tocam mais de uma tabela — por
 * exemplo criar usuário + registrar auditoria.
 */
export async function withTransaction<T>(
  handler: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Verifica a conectividade antes de o servidor começar a aceitar requisições. */
export async function assertDatabaseConnection() {
  const result = await pool.query<{ version: string }>("SELECT version()");
  return result.rows[0]?.version ?? "desconhecida";
}

export async function closePool() {
  await pool.end();
}

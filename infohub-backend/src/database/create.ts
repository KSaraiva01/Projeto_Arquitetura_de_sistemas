import { Client } from "pg";
import { env } from "../config/env.js";

/**
 * Cria o banco de dados do InfoHub, caso ainda não exista.
 *
 * Roda antes das migrations e conecta no banco administrativo `postgres`,
 * porque não dá para criar um banco estando conectado a ele mesmo. Evita
 * depender do psql estar no PATH do Windows.
 */
function parseTarget() {
  if (env.DATABASE_URL) {
    const url = new URL(env.DATABASE_URL);
    return {
      host: url.hostname,
      port: Number(url.port || 5432),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
    };
  }

  return {
    host: env.PGHOST,
    port: env.PGPORT,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    database: env.PGDATABASE,
  };
}

async function createDatabase() {
  const target = parseTarget();

  const admin = new Client({
    host: target.host,
    port: target.port,
    user: target.user,
    password: target.password,
    database: "postgres",
    ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

  await admin.connect();

  try {
    const existing = await admin.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [target.database],
    );

    if (existing.rowCount && existing.rowCount > 0) {
      console.log(`[create] banco "${target.database}" já existe.`);
      return;
    }

    // O nome do banco não pode entrar como parâmetro ($1) num CREATE DATABASE,
    // então validamos o formato antes de interpolar.
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(target.database)) {
      throw new Error(
        `Nome de banco inválido: "${target.database}". Use apenas letras, números e underscore.`,
      );
    }

    await admin.query(`CREATE DATABASE "${target.database}"`);
    console.log(`[create] banco "${target.database}" criado com sucesso.`);
  } finally {
    await admin.end();
  }
}

createDatabase().catch((error: unknown) => {
  console.error("[create]", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

/**
 * Aplicador dos arquivos SQL do InfoHub.
 *
 * O projeto não usa ORM nem runner de migrations: o schema inteiro vive em
 * `database/schema.sql`, em SQL puro. Este script só cria o banco (se ainda não
 * existir) e manda o arquivo para o PostgreSQL usando o mesmo driver `pg` da
 * API — assim não é preciso ter o psql no PATH do Windows.
 *
 * Uso:
 *   node scripts/db.mjs setup       # cria o banco (se faltar) e aplica o schema
 *   node scripts/db.mjs seed-demo   # dados de demonstração (apaga as equipes)
 *   node scripts/db.mjs reset       # apaga o schema inteiro e aplica de novo
 *
 * Ou pelos atalhos: npm run db:setup | db:seed:demo | db:reset
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const BACKEND_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Onde procurar os .sql: primeiro o que estiver em SQL_DIR, depois a pasta
 * `database/` do próprio back-end e por fim a da raiz do repositório do
 * projeto (que é onde os arquivos vivem hoje).
 */
const SQL_DIRS = [
  process.env.SQL_DIR ? resolve(process.env.SQL_DIR) : null,
  join(BACKEND_ROOT, "database"),
  resolve(BACKEND_ROOT, "..", "..", "database"),
].filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

function target() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: Number(url.port || 5432),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
    };
  }

  return {
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "postgres",
    database: process.env.PGDATABASE ?? "infohub",
  };
}

const ssl =
  process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;

function sqlFile(name) {
  for (const dir of SQL_DIRS) {
    const candidate = join(dir, name);
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(
    `Arquivo "${name}" não encontrado. Procurei em:\n` +
      SQL_DIRS.map((dir) => `  - ${dir}`).join("\n"),
  );
}

/** Abre uma conexão já com os avisos (RAISE NOTICE) aparecendo no terminal. */
async function connect(database) {
  const config = { ...target(), ssl };
  const client = new Client({ ...config, database: database ?? config.database });

  client.on("notice", (notice) => {
    if (notice.message) console.log(notice.message);
  });

  await client.connect();
  return client;
}

async function createDatabaseIfMissing() {
  const { database } = target();

  // Não dá para criar um banco estando conectado a ele mesmo: entra pelo banco
  // administrativo `postgres`.
  const admin = await connect("postgres");

  try {
    const existing = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [database],
    );

    if (existing.rowCount > 0) {
      console.log(`[db] banco "${database}" já existe.`);
      return;
    }

    // CREATE DATABASE não aceita parâmetro ($1), então o nome é validado antes
    // de ser interpolado.
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(database)) {
      throw new Error(
        `Nome de banco inválido: "${database}". Use apenas letras, números e underscore.`,
      );
    }

    await admin.query(`CREATE DATABASE "${database}"`);
    console.log(`[db] banco "${database}" criado.`);
  } finally {
    await admin.end();
  }
}

/**
 * Executa o arquivo inteiro em uma única chamada. Os próprios arquivos abrem e
 * fecham a transação (BEGIN/COMMIT), então um erro no meio não deixa o banco
 * pela metade.
 */
async function runFile(name) {
  const path = sqlFile(name);
  const sql = await readFile(path, "utf8");
  const client = await connect();

  try {
    await client.query(sql);
    console.log(`[db] ${name} aplicado (${path}).`);
  } finally {
    await client.end();
  }
}

/** O schema já foi aplicado neste banco? (a tabela `usuario` existe) */
async function schemaExists() {
  const client = await connect();
  try {
    const result = await client.query(
      "SELECT to_regclass('public.usuario') AS tabela",
    );
    return result.rows[0]?.tabela !== null;
  } finally {
    await client.end();
  }
}

async function setup() {
  await createDatabaseIfMissing();

  // O schema.sql é feito para um banco vazio (CREATE TYPE/TABLE sem IF NOT
  // EXISTS, para ficar simples de ler). Se já foi aplicado, não roda de novo.
  if (await schemaExists()) {
    console.log(
      "[db] o schema já está aplicado neste banco. Para recriar do zero: npm run db:reset",
    );
    return;
  }

  await runFile("schema.sql");
  console.log(
    "\n[db] Pronto. Login inicial: admin@amf.edu.br / InfoHub@2026 — troque no primeiro acesso.",
  );
}

async function seedDemo() {
  if (isProduction) {
    throw new Error(
      "db:seed:demo apaga as equipes existentes e está bloqueado quando NODE_ENV=production.",
    );
  }

  await runFile("seed_demo.sql");
}

async function reset() {
  if (isProduction) {
    throw new Error(
      "db:reset é destrutivo e está bloqueado quando NODE_ENV=production.",
    );
  }

  const { database } = target();
  console.warn(`[db] apagando TODOS os objetos do banco "${database}"...`);

  const client = await connect();
  try {
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
  } finally {
    await client.end();
  }

  await runFile("schema.sql");
  console.log("[db] schema recriado do zero.");
}

const commands = { setup, "seed-demo": seedDemo, reset };
const command = process.argv[2];

if (!commands[command]) {
  console.error(
    `Uso: node scripts/db.mjs <${Object.keys(commands).join(" | ")}>`,
  );
  process.exit(1);
}

try {
  await commands[command]();
} catch (error) {
  console.error(`[db] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}

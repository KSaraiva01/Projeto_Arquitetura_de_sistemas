import "../config/zod.js";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { closePool, pool, query } from "../config/database.js";

/**
 * Runner de migrations em SQL puro.
 *
 * Cada arquivo em ./migrations roda uma única vez, em ordem alfabética
 * (por isso o prefixo numérico), dentro de uma transação. O que já rodou
 * fica registrado em schema_migrations junto com o checksum do arquivo,
 * para detectar edição de migration já aplicada.
 */

const MIGRATIONS_DIR = join(__dirname, "migrations");

interface AppliedMigration {
  name: string;
  checksum: string;
  applied_at: Date;
}

function readMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(MIGRATIONS_DIR, name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      return { name, sql, checksum };
    });
}

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       VARCHAR(255) PRIMARY KEY,
      checksum   CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getApplied() {
  const result = await query<AppliedMigration>(
    "SELECT name, checksum, applied_at FROM schema_migrations ORDER BY name",
  );
  return new Map(result.rows.map((row) => [row.name, row]));
}

async function up() {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const files = readMigrationFiles();

  let executed = 0;

  for (const file of files) {
    const previous = applied.get(file.name);

    if (previous) {
      if (previous.checksum !== file.checksum) {
        throw new Error(
          `A migration ${file.name} já foi aplicada mas o arquivo mudou. ` +
            `Crie uma nova migration em vez de editar uma existente ` +
            `(ou rode "npm run db:reset" em ambiente de desenvolvimento).`,
        );
      }
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(file.sql);
      await client.query(
        "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
        [file.name, file.checksum],
      );
      await client.query("COMMIT");
      console.log(`[migrate] aplicada: ${file.name}`);
      executed += 1;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`[migrate] falhou: ${file.name}`);
      throw error;
    } finally {
      client.release();
    }
  }

  console.log(
    executed === 0
      ? "[migrate] banco já está atualizado, nada a aplicar."
      : `[migrate] ${executed} migration(s) aplicada(s) com sucesso.`,
  );
}

async function status() {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const files = readMigrationFiles();

  console.log("\nMigrations:\n");
  for (const file of files) {
    const previous = applied.get(file.name);
    if (!previous) {
      console.log(`  [ ] ${file.name}  (pendente)`);
    } else if (previous.checksum !== file.checksum) {
      console.log(`  [!] ${file.name}  (aplicada, mas o arquivo foi alterado)`);
    } else {
      console.log(
        `  [x] ${file.name}  (${previous.applied_at.toISOString().slice(0, 19).replace("T", " ")})`,
      );
    }
  }
  console.log("");
}

async function main() {
  const command = process.argv[2] ?? "up";

  switch (command) {
    case "up":
      await up();
      break;
    case "status":
      await status();
      break;
    default:
      console.error(`Comando desconhecido: ${command}. Use "up" ou "status".`);
      process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error("[migrate]", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closePool());

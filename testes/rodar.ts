/**
 * `npm test` — testes de ponta a ponta da API contra um PostgreSQL descartável.
 *
 *   TEST_DATABASE_URL="postgresql://usuario:senha@localhost:5432/postgres?schema=infohub_teste" npm test
 *   npm test -- 03        ← só os arquivos cujo nome contém "03"
 *
 * Antes de CADA arquivo de teste o schema é apagado e recriado (migrations +
 * seed da G1): todo arquivo começa do mesmo cenário e pode rodar sozinho.
 *
 * Segurança: o schema precisa terminar em `_teste` e o `.env` do projeto
 * (banco da faculdade, credenciais de e-mail) nunca é lido — os e-mails saem
 * só pelo driver console.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "pg";

const RAIZ = path.resolve(__dirname, "..");

function abortar(mensagem: string): never {
  console.error(`\n[testes] ${mensagem}\n`);
  process.exit(1);
}

const url = process.env.TEST_DATABASE_URL ?? "";
if (!url) {
  abortar(
    "Defina TEST_DATABASE_URL apontando para um PostgreSQL descartável (o seu, local), com um schema terminado em _teste:\n" +
      '  TEST_DATABASE_URL="postgresql://postgres:senha@localhost:5432/postgres?schema=infohub_teste" npm test',
  );
}
const schema = new URL(url.replace(/^postgres(ql)?:/, "http:")).searchParams.get("schema") ?? "";
if (!/^[a-z_][a-z0-9_]*_teste$/i.test(schema)) {
  abortar(`O schema de TEST_DATABASE_URL precisa terminar em _teste (veio "${schema || "nenhum"}"): ele é apagado a cada arquivo.`);
}

const filtro = process.argv[2] ?? "";
const arquivos = fs
  .readdirSync(__dirname)
  .filter((nome) => nome.endsWith(".test.ts") && nome.includes(filtro))
  .sort();
if (!arquivos.length) abortar(`Nenhum arquivo de teste com "${filtro}" no nome.`);

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "infohub-testes-"));
const envVazio = path.join(pasta, "vazio.env");
fs.writeFileSync(envVazio, "");

const ambiente: NodeJS.ProcessEnv = {
  ...process.env,
  // O dotenv lê este arquivo vazio no lugar do .env do projeto.
  DOTENV_CONFIG_PATH: envVazio,
  DOTENV_CONFIG_QUIET: "true",
  NODE_ENV: "test",
  DATABASE_URL: url,
  JWT_SECRET: "segredo-usado-so-nos-testes-com-mais-de-32-caracteres",
  APP_URL: "http://localhost:3000",
  MAIL_DRIVER: "console",
  MAIL_FROM: "InfoHub <testes@example.com>",
  JOBS_ENABLED: "false",
  UPLOADS_DIR: path.join(pasta, "uploads"),
  BACKUP_ENABLED: "false",
  BACKUP_DIR: path.join(pasta, "backups"),
  SEED_ADMIN_NOME: "Administrador InfoHub",
  SEED_ADMIN_EMAIL: "admin@infohub.amf.edu.br",
  SEED_ADMIN_SENHA: "Admin@123",
  SEED_DEMO: "true",
};

function executar(args: string[], rotulo: string) {
  const r = spawnSync(process.execPath, args, { cwd: RAIZ, env: ambiente, encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stdout, r.stderr);
    abortar(`${rotulo} falhou.`);
  }
}

async function recriarBanco() {
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    await cliente.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await cliente.query(`CREATE SCHEMA "${schema}"`);
  } finally {
    await cliente.end();
  }
  fs.rmSync(path.join(pasta, "uploads"), { recursive: true, force: true });
  fs.rmSync(path.join(pasta, "backups"), { recursive: true, force: true });
  executar([path.join(RAIZ, "node_modules/prisma/build/index.js"), "migrate", "deploy"], "prisma migrate deploy");
  executar(["--import", "tsx", "prisma/seed.ts"], "seed");
}

async function main() {
  console.log(`[testes] banco: schema "${schema}" | ${arquivos.length} arquivo(s)`);
  const falharam: string[] = [];
  for (const arquivo of arquivos) {
    const inicio = Date.now();
    await recriarBanco();
    console.log(`\n▶ ${arquivo} (banco recriado em ${((Date.now() - inicio) / 1000).toFixed(1)} s)`);
    const r = spawnSync(
      process.execPath,
      ["--import", "tsx", "--test", "--test-isolation=none", "--test-reporter=spec", path.join("testes", arquivo)],
      { cwd: RAIZ, env: ambiente, stdio: "inherit" },
    );
    if (r.status !== 0) falharam.push(arquivo);
  }

  fs.rmSync(pasta, { recursive: true, force: true });
  console.log(
    falharam.length
      ? `\n[testes] ${falharam.length} de ${arquivos.length} arquivo(s) com falha: ${falharam.join(", ")}`
      : `\n[testes] todos os ${arquivos.length} arquivo(s) passaram.`,
  );
  process.exitCode = falharam.length ? 1 : 0;
}

main().catch((erro) => abortar(erro instanceof Error ? erro.message : String(erro)));

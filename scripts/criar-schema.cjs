/**
 * Primeiro passo do deploy (G1: "seed obrigatório no deploy — cria schema,
 * tabelas e inserts"): garante que o schema da dupla existe no PostgreSQL
 * compartilhado da faculdade. Na sequência, `prisma migrate deploy` cria as
 * tabelas e `prisma db seed` faz os inserts (ver `npm run db:preparar`).
 *
 * O nome vem do `?schema=` da DATABASE_URL — a mesma convenção do Prisma —
 * e `public` é recusado, porque pertence a outro grupo.
 */
require("dotenv").config({ quiet: true });
const { Client } = require("pg");

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("[criar-schema] DATABASE_URL não definida (veja .env.example).");
  process.exit(1);
}

const schema = new URL(url.replace(/^postgres(ql)?:/, "http:")).searchParams.get("schema");
if (!schema || schema === "public") {
  console.error(
    "\n[criar-schema] DATABASE_URL precisa terminar com `?schema=<nome_do_grupo>` (e não `public`).\n" +
      "O banco é compartilhado com outras duplas — abortando para não afetar o schema public.\n",
  );
  process.exit(1);
}
if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) {
  console.error(`[criar-schema] nome de schema inválido: "${schema}" (use letras, números e _).`);
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const existe = await client.query("SELECT 1 FROM information_schema.schemata WHERE schema_name = $1", [schema]);
    if (existe.rowCount) {
      console.log(`[criar-schema] schema "${schema}" já existe.`);
    } else {
      await client.query(`CREATE SCHEMA "${schema}"`);
      console.log(`[criar-schema] schema "${schema}" criado.`);
    }
  } finally {
    await client.end();
  }
})().catch((erro) => {
  console.error("[criar-schema] falhou:", erro.message);
  process.exit(1);
});

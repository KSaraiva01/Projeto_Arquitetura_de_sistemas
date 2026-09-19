/**
 * Trava de segurança: o PostgreSQL da faculdade é compartilhado entre várias
 * duplas, cada uma no seu schema. Este script impede rodar comandos
 * destrutivos (migrate reset / db push) se a DATABASE_URL não apontar para um
 * schema próprio — sem `?schema=...`, ou com `schema=public`, o Prisma agiria
 * sobre o schema `public`, que não é nosso.
 */
require("dotenv").config({ quiet: true });

const url = process.env.DATABASE_URL ?? "";
const schema = new URL(url.replace(/^postgres(ql)?:/, "http:")).searchParams.get("schema");

if (!schema || schema === "public") {
  console.error(
    "\n[checar-schema] DATABASE_URL precisa terminar com `?schema=<nome_do_grupo>` (e não `public`).\n" +
      "O banco é compartilhado com outras duplas — abortando para não afetar o schema public.\n",
  );
  process.exit(1);
}

console.log(`[checar-schema] ok — schema alvo: ${schema}`);

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Instância única do Prisma Client para toda a aplicação (API, jobs e seed).
 *
 * No Prisma 7 o client precisa de um driver adapter — aqui o adapter do `pg`,
 * que gerencia o pool de conexões com o PostgreSQL. A URL vem de
 * DATABASE_URL (carregada do .env pelo ponto de entrada: server.ts / seed.ts).
 *
 * ATENÇÃO — schema do banco:
 * O PostgreSQL da faculdade é compartilhado entre várias duplas, cada uma no
 * seu schema (`?schema=infohub_losekann` na URL). As migrations respeitam
 * esse parâmetro, mas o driver `pg` NÃO: sem tratamento, o client gravaria
 * no schema `public` (de outro grupo). Por isso o schema é extraído da URL
 * e aplicado tanto ao adapter (queries geradas) quanto ao `search_path` da
 * conexão (queries brutas via $queryRaw).
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não definida. Copie .env.example para .env ou configure a variável no Coolify.",
  );
}

/** Lê o `?schema=` da DATABASE_URL (mesma convenção usada pelo Prisma Migrate). */
export function schemaDaUrl(url: string): string {
  const parsed = new URL(url.replace(/^postgres(ql)?:/, "http:"));
  return parsed.searchParams.get("schema") ?? "public";
}

export const schemaBanco = schemaDaUrl(connectionString);

const adapter = new PrismaPg(
  {
    connectionString,
    // Garante o schema também para conexões/queries fora do Prisma Client.
    options: `-c search_path="${schemaBanco}"`,
  },
  { schema: schemaBanco },
);

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export type { PrismaClient } from "../generated/prisma/client";

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Configuração do Prisma 7.
 *
 * A URL do banco e o comando de seed vivem aqui (não mais no schema.prisma
 * nem no package.json). DATABASE_URL vem do .env (local) ou das variáveis
 * de ambiente do Coolify (produção).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

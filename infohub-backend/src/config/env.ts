import "dotenv/config";
import { z } from "zod";

/**
 * Toda variável de ambiente é validada aqui, uma única vez, na subida do
 * processo. Se algo estiver faltando o servidor morre imediatamente com uma
 * mensagem clara — em vez de falhar no meio de uma requisição.
 */
const envSchema = z.object({
  // Servidor
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  API_PREFIX: z.string().default("/api"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  // Banco de dados
  DATABASE_URL: z.string().optional(),
  PGHOST: z.string().default("localhost"),
  PGPORT: z.coerce.number().int().positive().default(5432),
  PGUSER: z.string().default("postgres"),
  PGPASSWORD: z.string().default("postgres"),
  PGDATABASE: z.string().default("infohub"),
  DATABASE_SSL: z.enum(["true", "false"]).default("false"),

  // Autenticação
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET precisa ter no mínimo 32 caracteres"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),
  PASSWORD_RESET_EXPIRES_IN_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(60),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),

  // E-mail (RNF-06)
  MAIL_DRIVER: z.enum(["console", "resend"]).default("console"),
  MAIL_FROM: z.string().default("InfoHub <nao-responda@infohub.amf.edu.br>"),
  RESEND_API_KEY: z.string().optional(),
  APP_URL: z.string().default("http://localhost:3000"),

  // Seed
  SEED_ADMIN_NAME: z.string().default("Administrador InfoHub"),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@amf.edu.br"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("InfoHub@2026"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  console.error(
    `\n[env] Configuração inválida. Confira o seu arquivo .env:\n${details}\n\n` +
      `Dica: copie o .env.example para .env e preencha os valores.\n`,
  );
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  isDevelopment: raw.NODE_ENV === "development",
  isTest: raw.NODE_ENV === "test",
  databaseSsl: raw.DATABASE_SSL === "true",
  corsOrigins: raw.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;

if (env.isProduction && env.MAIL_DRIVER === "console") {
  console.warn(
    "[env] MAIL_DRIVER=console em produção: nenhum e-mail será realmente enviado.",
  );
}

if (env.MAIL_DRIVER === "resend" && !env.RESEND_API_KEY) {
  console.error("[env] MAIL_DRIVER=resend exige RESEND_API_KEY definida.");
  process.exit(1);
}

export type Env = typeof env;

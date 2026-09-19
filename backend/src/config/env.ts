import "dotenv/config";
import path from "node:path";
import { z } from "zod";

/**
 * Toda variável de ambiente é validada aqui, uma única vez, na subida do
 * processo. Faltou algo? O servidor morre na hora com uma mensagem clara,
 * em vez de falhar no meio de uma requisição.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  /** URL pública do sistema — usada nos links dos e-mails. */
  APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória."),

  // Autenticação (RF-01)
  JWT_SECRET: z.string().min(32, "JWT_SECRET precisa ter no mínimo 32 caracteres."),
  JWT_EXPIRES_IN_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),
  PASSWORD_RESET_EXPIRES_IN_MINUTES: z.coerce.number().int().positive().default(60),
  /** RF-02: o link de ativação dura mais — o aluno pode demorar dias para abrir o e-mail. */
  ACTIVATION_EXPIRES_IN_HOURS: z.coerce.number().int().positive().default(72),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),

  // Arquivos (RNF-04)
  UPLOADS_DIR: z.string().default("uploads"),
  UPLOAD_MAX_MB: z.coerce.number().int().positive().default(50),
  UPLOAD_MAX_FILES: z.coerce.number().int().positive().default(5),

  // E-mail (RF-18/19, RNF-06)
  MAIL_DRIVER: z.enum(["console", "smtp", "resend"]).default("console"),
  MAIL_FROM: z.string().default("InfoHub <nao-responda@infohub.amf.edu.br>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  MAIL_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),

  // Rotina agendada (RN-04, RF-17, RNF-06)
  JOBS_ENABLED: z.enum(["true", "false"]).default("true"),
  JOBS_INTERVAL_MINUTES: z.coerce.number().int().min(1).max(1440).default(10),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const detalhes = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  console.error(
    `\n[env] Configuração inválida. Confira o .env (ou as variáveis no Coolify):\n${detalhes}\n\nDica: copie .env.example para .env e preencha os valores.\n`,
  );
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  isDevelopment: raw.NODE_ENV === "development",
  jobsEnabled: raw.JOBS_ENABLED === "true",
  smtpSecure: raw.SMTP_SECURE === "true",
  uploadsDir: path.resolve(process.cwd(), raw.UPLOADS_DIR),
  uploadMaxBytes: raw.UPLOAD_MAX_MB * 1024 * 1024,
} as const;

if (env.isProduction && env.MAIL_DRIVER === "console") {
  console.warn("[env] MAIL_DRIVER=console em produção: nenhum e-mail será realmente enviado.");
}
if (env.MAIL_DRIVER === "smtp" && !env.SMTP_HOST) {
  console.error("[env] MAIL_DRIVER=smtp exige SMTP_HOST (e normalmente SMTP_USER/SMTP_PASS).");
  process.exit(1);
}
if (env.MAIL_DRIVER === "resend" && !env.RESEND_API_KEY) {
  console.error("[env] MAIL_DRIVER=resend exige RESEND_API_KEY.");
  process.exit(1);
}

export type Env = typeof env;

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Hash usado em bcrypt.compare quando o e-mail informado não existe.
 *
 * Sem isso o login responderia visivelmente mais rápido para e-mails
 * inexistentes, permitindo descobrir quais contas existem no sistema.
 */
export const DUMMY_PASSWORD_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.PjLxjXHV2xVFvVR4rG8pJt/xR8Bq";

/** Token opaco enviado ao usuário (refresh / recuperação de senha). */
export function generateOpaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Guardamos apenas o SHA-256 dos tokens opacos. Um vazamento do banco não
 * entrega sessões ativas, e a busca continua sendo um lookup por índice.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Senha temporária legível, usada ao criar conta de admin/mentor. */
export function generateTemporaryPassword(): string {
  return `${randomBytes(6).toString("base64url")}@${randomBytes(2).toString("hex")}`;
}

/** Comparação de strings resistente a timing attack. */
export function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

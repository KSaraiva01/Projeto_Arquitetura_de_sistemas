import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../config/env";

export function gerarHashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, env.BCRYPT_ROUNDS);
}

export function conferirSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

/**
 * Hash usado no bcrypt.compare quando o e-mail não existe: sem isso o login
 * responderia mais rápido para contas inexistentes, revelando quais existem.
 */
export const HASH_FALSO = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.PjLxjXHV2xVFvVR4rG8pJt/xR8Bq";

/** Token opaco enviado ao usuário (refresh, ativação, recuperação). */
export function gerarTokenOpaco(bytes = 48): string {
  return randomBytes(bytes).toString("base64url");
}

/** Só o SHA-256 do token vai para o banco; o valor em claro fica no e-mail/cookie. */
export function hashDoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

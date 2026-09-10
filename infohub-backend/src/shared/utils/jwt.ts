import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../errors/AppError.js";
import type { UserRole } from "../types/domain.js";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
  name: string;
}

const ISSUER = "infohub-api";

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: ISSUER,
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: ISSUER });

    if (typeof decoded === "string" || !decoded.sub) {
      throw new UnauthorizedError("Token inválido.", "INVALID_TOKEN");
    }

    return decoded as unknown as AccessTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError(
        "Sua sessão expirou. Faça login novamente.",
        "TOKEN_EXPIRED",
      );
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Token inválido.", "INVALID_TOKEN");
    }
    throw error;
  }
}

/** Segundos de validade do access token, útil para devolver ao cliente. */
export function getAccessTokenTtlSeconds(): number {
  const match = /^(\d+)([smhd])$/.exec(env.JWT_EXPIRES_IN);
  if (!match) return 900;

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

  return amount * (multipliers[unit as string] ?? 60);
}

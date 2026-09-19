import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { Perfil } from "../generated/prisma/client";
import { UnauthorizedError } from "./errors";

export interface AccessTokenPayload {
  sub: string;
  perfil: Perfil;
}

const EMISSOR = "infohub";

export const ACCESS_TOKEN_TTL_SEGUNDOS = env.JWT_EXPIRES_IN_MINUTES * 60;

export function assinarAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_SEGUNDOS,
    issuer: EMISSOR,
  });
}

export function verificarAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: EMISSOR });
    if (typeof decoded === "string" || !decoded.sub) {
      throw new UnauthorizedError("Token inválido.", "INVALID_TOKEN");
    }
    return { sub: decoded.sub, perfil: (decoded as { perfil: Perfil }).perfil };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Sua sessão expirou. Faça login novamente.", "TOKEN_EXPIRED");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Token inválido.", "INVALID_TOKEN");
    }
    throw error;
  }
}

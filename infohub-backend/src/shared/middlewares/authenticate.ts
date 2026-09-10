import type { RequestHandler } from "express";
import { queryOne } from "../../config/database.js";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";
import type { UserRole } from "../types/domain.js";
import { verifyAccessToken } from "../utils/jwt.js";

interface CurrentUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

/**
 * Exige um access token válido no header `Authorization: Bearer <token>`.
 *
 * Além de conferir a assinatura do JWT, relemos o usuário no banco a cada
 * requisição: uma conta desativada pelo administrador (RF-03) precisa perder
 * o acesso na hora, e não só quando o token expirar.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedError(
        "Autenticação necessária.",
        "MISSING_CREDENTIALS",
      );
    }

    const payload = verifyAccessToken(header.slice("Bearer ".length).trim());

    const user = await queryOne<CurrentUserRow>(
      `SELECT id, name, email, role, is_active FROM app_user WHERE id = $1`,
      [payload.sub],
    );

    if (!user) {
      throw new UnauthorizedError("Usuário não encontrado.", "USER_NOT_FOUND");
    }

    if (!user.is_active) {
      throw new ForbiddenError(
        "Esta conta está desativada. Procure a coordenação do InfoHub.",
        "ACCOUNT_DISABLED",
      );
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restringe a rota aos perfis informados (RNF-03).
 * Use sempre depois de `authenticate`.
 */
export function authorize(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new UnauthorizedError("Autenticação necessária.", "MISSING_CREDENTIALS"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(
        new ForbiddenError(
          "Seu perfil não tem permissão para esta operação.",
          "INSUFFICIENT_ROLE",
        ),
      );
      return;
    }

    next();
  };
}

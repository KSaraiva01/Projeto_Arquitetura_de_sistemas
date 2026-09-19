import type { RequestHandler } from "express";
import type { Perfil } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ForbiddenError, UnauthorizedError } from "../errors";
import { verificarAccessToken } from "../jwt";

/**
 * Exige `Authorization: Bearer <access token>`.
 *
 * Além de conferir a assinatura do JWT, relemos o usuário no banco a cada
 * requisição: uma conta desativada pelo administrador (RF-03) ou excluída
 * (LGPD) perde o acesso na hora, não só quando o token expirar.
 */
export const autenticar: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Autenticação necessária.", "MISSING_CREDENTIALS");
    }

    const payload = verificarAccessToken(header.slice("Bearer ".length).trim());

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, excluidoEm: true },
    });

    if (!usuario || usuario.excluidoEm) {
      throw new UnauthorizedError("Usuário não encontrado.", "USER_NOT_FOUND");
    }
    if (!usuario.ativo) {
      throw new ForbiddenError(
        "Esta conta está desativada. Procure a coordenação do InfoHub.",
        "ACCOUNT_DISABLED",
      );
    }

    req.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil };
    next();
  } catch (error) {
    next(error);
  }
};

/** Restringe a rota aos perfis informados (RNF-03). Use sempre depois de `autenticar`. */
export function autorizar(...perfis: Perfil[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.usuario) {
      next(new UnauthorizedError("Autenticação necessária.", "MISSING_CREDENTIALS"));
      return;
    }
    if (!perfis.includes(req.usuario.perfil)) {
      next(new ForbiddenError("Seu perfil não tem permissão para esta operação.", "INSUFFICIENT_ROLE"));
      return;
    }
    next();
  };
}

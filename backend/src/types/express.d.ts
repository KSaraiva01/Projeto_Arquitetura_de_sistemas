import type { Perfil } from "../generated/prisma/client";

/**
 * Usuário autenticado, anexado à requisição pelo middleware `autenticar`.
 * Reflete o estado ATUAL no banco (perfil/ativo), não só o que estava no JWT.
 */
export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
    interface Locals {
      query?: unknown;
      params?: unknown;
    }
  }
}

export {};

import type { UserRole } from "../shared/types/domain.js";

/**
 * Dados do usuário autenticado, anexados à requisição pelo middleware
 * `authenticate`. Sempre refletem o estado atual no banco — não apenas o
 * que estava dentro do JWT quando ele foi emitido.
 */
export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
    interface Locals {
      query?: unknown;
      params?: unknown;
    }
  }
}

export {};

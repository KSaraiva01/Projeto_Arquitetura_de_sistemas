import type { AuthenticatedUser } from "../types/express.js";

/**
 * Escopo de visibilidade das equipes (RNF-03).
 *
 * - ADMIN vê todas.
 * - MENTOR vê apenas as equipes que acompanha — decisão Q10, materializada
 *   na tabela `team_mentor`.
 * - STUDENT vê apenas as equipes das quais participa.
 *
 * Devolve um fragmento SQL para o WHERE, ou `null` quando não há restrição.
 * O `alias` é o nome dado à tabela `team` na query que vai usar o fragmento.
 *
 * Importante: o id do usuário entra como parâmetro no array `params` — nunca
 * concatenado na string.
 */
export function buildTeamScopeCondition(
  user: AuthenticatedUser,
  params: unknown[],
  alias = "t",
): string | null {
  if (user.role === "ADMIN") {
    return null;
  }

  params.push(user.id);
  const index = params.length;

  if (user.role === "MENTOR") {
    return `EXISTS (
      SELECT 1 FROM team_mentor scope_tm
       WHERE scope_tm.team_id = ${alias}.id
         AND scope_tm.mentor_id = $${index}
    )`;
  }

  return `EXISTS (
    SELECT 1 FROM team_member scope_mb
     WHERE scope_mb.team_id = ${alias}.id
       AND scope_mb.user_id = $${index}
       AND scope_mb.is_active
  )`;
}

/** Só administrador e mentor mexem na jornada da equipe (RF-09). */
export function canManageJourney(user: AuthenticatedUser): boolean {
  return user.role === "ADMIN" || user.role === "MENTOR";
}

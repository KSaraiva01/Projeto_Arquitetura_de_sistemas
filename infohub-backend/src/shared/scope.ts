import type { AuthenticatedUser } from "../types/express.js";

/**
 * Escopo de visibilidade das equipes (RNF-03).
 *
 * - ADMIN vê todas.
 * - MENTOR vê apenas as equipes que acompanha — decisão Q10, materializada
 *   na tabela `equipe_mentor`.
 * - STUDENT vê apenas as equipes das quais participa (`equipe_membro`).
 *
 * Devolve um fragmento SQL para o WHERE, ou `null` quando não há restrição.
 * O `alias` é o nome dado à tabela `equipe` na query que vai usar o fragmento.
 *
 * Importante: o id do usuário entra como parâmetro no array `params` — nunca
 * concatenado na string.
 */
export function buildTeamScopeCondition(
  user: AuthenticatedUser,
  params: unknown[],
  alias = "e",
): string | null {
  if (user.role === "ADMIN") {
    return null;
  }

  params.push(user.id);
  const index = params.length;

  if (user.role === "MENTOR") {
    return `EXISTS (
      SELECT 1 FROM equipe_mentor escopo_em
       WHERE escopo_em.equipe_id = ${alias}.id
         AND escopo_em.mentor_id = $${index}
    )`;
  }

  return `EXISTS (
    SELECT 1 FROM equipe_membro escopo_mb
     WHERE escopo_mb.equipe_id = ${alias}.id
       AND escopo_mb.usuario_id = $${index}
       AND escopo_mb.ativo
  )`;
}

/** Só administrador e mentor mexem na jornada da equipe (RF-09). */
export function canManageJourney(user: AuthenticatedUser): boolean {
  return user.role === "ADMIN" || user.role === "MENTOR";
}

/** Anotações internas (RF-10) e avaliação de entregas (RF-15): mesmo critério. */
export const canMentor = canManageJourney;

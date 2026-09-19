import type { Prisma } from "../generated/prisma/client";
import type { UsuarioAutenticado } from "../types/express";

/**
 * Escopo de visibilidade (RNF-03, nota da RF-10: "cada um vê o que está
 * disponível para ele").
 *
 *  - ADMIN vê todas as equipes.
 *  - MENTOR vê só as equipes que acompanha (`mentores_equipe`).
 *  - ALUNO vê só as equipes de que participa (`integrantes_equipe`, ativo).
 *
 * Devolve um fragmento de `where` do Prisma para ser combinado (AND) com os
 * filtros da consulta. Toda listagem/consulta de equipe ou tarefa passa por
 * aqui — é a única porta.
 */
export function escopoEquipe(usuario: UsuarioAutenticado): Prisma.EquipeWhereInput {
  if (usuario.perfil === "ADMIN") return {};
  if (usuario.perfil === "MENTOR") {
    return { mentores: { some: { mentorId: usuario.id } } };
  }
  return { integrantes: { some: { usuarioId: usuario.id, saiuEm: null } } };
}

/** Mesmo escopo, aplicado a tarefas (pela equipe da tarefa). */
export function escopoTarefa(usuario: UsuarioAutenticado): Prisma.TarefaWhereInput {
  const equipe = escopoEquipe(usuario);
  return Object.keys(equipe).length ? { equipe } : {};
}

/** Só administrador e mentor movem a equipe de etapa (nota da RF-11) e avaliam entregas (RF-15). */
export function podeMentorar(usuario: UsuarioAutenticado): boolean {
  return usuario.perfil === "ADMIN" || usuario.perfil === "MENTOR";
}

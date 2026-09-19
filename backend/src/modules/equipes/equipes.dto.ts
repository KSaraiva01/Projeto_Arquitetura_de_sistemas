import type { Prisma } from "../../generated/prisma/client";
import {
  ESTAGIO_IDEIA_PARA_API,
  STATUS_JORNADA_PARA_API,
  semestreParaApi,
  type ApiIdeaStage,
  type ApiJourneyStatus,
} from "../../shared/dto";
import { numeroColuna, selecaoEtapa, type EtapaDaJornada } from "./jornada";

/**
 * `include` padrão para montar o cartão da equipe (kanban e listagens).
 * Traz a jornada inteira porque a coluna de uma etapa extra depende das
 * etapas anteriores, e as tarefas só com o status, para os contadores.
 */
export const incluirCard = {
  area: { select: { id: true, nome: true } },
  lider: { select: { id: true, nome: true, email: true, curso: { select: { nome: true } } } },
  mentores: { select: { mentor: { select: { id: true, nome: true } } } },
  etapaAtual: { select: selecaoEtapa },
  etapas: { select: selecaoEtapa, orderBy: { ordem: "asc" } },
  integrantes: { where: { saiuEm: null }, select: { id: true } },
  tarefas: { select: { status: true } },
} satisfies Prisma.EquipeInclude;

export type EquipeCardRow = Prisma.EquipeGetPayload<{ include: typeof incluirCard }>;

/** Cartão da equipe no formato do frontend (ApiTeamCard). */
export interface EquipeCard {
  id: string;
  name: string;
  description: string;
  category: { id: string; name: string };
  ideaStage: ApiIdeaStage;
  /** Coluna do kanban (número da etapa padrão). */
  journeyStage: number;
  journeyStageName: string;
  /** Etapa exata da jornada da equipe — pode ser uma etapa extra. */
  currentStage: { id: string; name: string; order: number; isExtra: boolean };
  journeyStatus: ApiJourneyStatus;
  /** Período de ingresso ("2026/2"). Nome mantido por compatibilidade com o front. */
  semester: string;
  period: string;
  howDidYouHear: string | null;
  isActive: boolean;
  createdAt: Date;
  readyAt: Date | null;
  referredAt: Date | null;
  leader: { id: string; name: string; email: string; course: string | null } | null;
  mentors: Array<{ id: string; name: string }>;
  memberCount: number;
  openTasks: number;
  overdueTasks: number;
}

export function paraCard(equipe: EquipeCardRow): EquipeCard {
  const jornada: EtapaDaJornada[] = equipe.etapas;
  const atual = equipe.etapaAtual ?? jornada[0] ?? null;
  const coluna = atual ? numeroColuna(atual, jornada) : 1;

  return {
    id: equipe.id,
    name: equipe.nome,
    description: equipe.descricao,
    category: { id: equipe.area.id, name: equipe.area.nome },
    ideaStage: ESTAGIO_IDEIA_PARA_API[equipe.estagioIdeia],
    journeyStage: coluna,
    journeyStageName: atual?.nome ?? "",
    currentStage: atual
      ? { id: atual.id, name: atual.nome, order: atual.ordem, isExtra: atual.etapaPadraoId === null }
      : { id: "", name: "", order: 0, isExtra: false },
    journeyStatus: STATUS_JORNADA_PARA_API[equipe.statusJornada],
    semester: equipe.periodoIngresso,
    period: equipe.periodoIngresso,
    howDidYouHear: equipe.comoConheceu,
    isActive: equipe.excluidaEm === null,
    createdAt: equipe.criadoEm,
    readyAt: equipe.prontaEm,
    referredAt: equipe.encaminhadaEm,
    leader: equipe.lider
      ? { id: equipe.lider.id, name: equipe.lider.nome, email: equipe.lider.email, course: equipe.lider.curso?.nome ?? null }
      : null,
    mentors: equipe.mentores.map((m) => ({ id: m.mentor.id, name: m.mentor.nome })),
    memberCount: equipe.integrantes.length,
    openTasks: equipe.tarefas.filter((t) => t.status !== "APROVADA").length,
    overdueTasks: equipe.tarefas.filter((t) => t.status === "ATRASADA").length,
  };
}

export const incluirIntegrante = {
  usuario: { select: { id: true, nome: true, email: true, telefone: true, semestre: true, curso: { select: { nome: true } } } },
} satisfies Prisma.IntegranteEquipeInclude;

type IntegranteRow = Prisma.IntegranteEquipeGetPayload<{ include: typeof incluirIntegrante }>;

/** Integrante no formato do frontend (ApiTeamMember). */
export function paraIntegrante(i: IntegranteRow, liderId: string) {
  return {
    id: i.usuario.id,
    name: i.usuario.nome,
    email: i.usuario.email,
    course: i.usuario.curso?.nome ?? null,
    semester: semestreParaApi(i.usuario.semestre),
    phone: i.usuario.telefone,
    role: i.usuario.id === liderId ? ("LEADER" as const) : ("MEMBER" as const),
    joinedAt: i.entrouEm,
  };
}

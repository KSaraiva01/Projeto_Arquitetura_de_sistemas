import type { StatusJornada } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import type { Db } from "../../shared/auditoria";

/**
 * Jornada da equipe: as 6 etapas padrão copiadas no cadastro mais as extras
 * que o mentor incluir (decisão da coordenação: "padrão 6, ajustável por
 * equipe; depois da última, encaminha ao InovAMF").
 */

export interface EtapaDaJornada {
  id: string;
  ordem: number;
  etapaPadraoId: string | null;
  nome: string;
  descricao: string | null;
  etapaPadrao: { numero: number } | null;
}

export const selecaoEtapa = {
  id: true,
  ordem: true,
  etapaPadraoId: true,
  nome: true,
  descricao: true,
  etapaPadrao: { select: { numero: true } },
} as const;

export function carregarJornada(equipeId: string, db: Db = prisma): Promise<EtapaDaJornada[]> {
  return db.etapaEquipe.findMany({
    where: { equipeId },
    select: selecaoEtapa,
    orderBy: { ordem: "asc" },
  });
}

/**
 * Coluna do kanban (1–6) de uma etapa: o número da própria etapa padrão ou,
 * para uma etapa extra, o da última etapa padrão que vem antes dela.
 */
export function numeroColuna(etapa: EtapaDaJornada, jornada: EtapaDaJornada[]): number {
  if (etapa.etapaPadrao) return etapa.etapaPadrao.numero;
  let numero = 1;
  for (const outra of jornada) {
    if (outra.ordem < etapa.ordem && outra.etapaPadrao) numero = outra.etapaPadrao.numero;
  }
  return numero;
}

/** Formato que o frontend consome em `journey` (ApiJourneyStage). */
export function etapaParaApi(etapa: EtapaDaJornada, etapaAtualId: string | null) {
  return {
    id: etapa.id,
    order: etapa.ordem,
    number: etapa.etapaPadrao?.numero ?? null,
    name: etapa.nome,
    description: etapa.descricao,
    isExtra: etapa.etapaPadraoId === null,
    isCurrent: etapa.id === etapaAtualId,
  };
}

/** Copia as etapas padrão para a jornada de uma equipe recém-criada (RF-05). */
export async function criarJornada(equipeId: string, db: Db): Promise<EtapaDaJornada[]> {
  const padrao = await db.etapaPadrao.findMany({ orderBy: { numero: "asc" } });
  if (padrao.length === 0) {
    throw new Error("Catálogo de etapas vazio — rode `npm run db:seed`.");
  }
  await db.etapaEquipe.createMany({
    data: padrao.map((etapa) => ({
      equipeId,
      ordem: etapa.numero,
      etapaPadraoId: etapa.id,
      nome: etapa.nome,
      descricao: etapa.descricao,
    })),
  });
  return carregarJornada(equipeId, db);
}

/**
 * Recalcula o status do funil da equipe (chamado após mudar de etapa, criar,
 * editar ou avaliar tarefas e ao incluir etapas extras):
 *
 *  - ENCAMINHADA é definitivo: só a coordenação marca, e nada aqui desfaz;
 *  - PRONTA_INOVAMF quando a equipe está na ÚLTIMA etapa da própria jornada,
 *    essa etapa tem ao menos uma tarefa obrigatória e nenhuma tarefa
 *    obrigatória da jornada inteira está sem aprovação (RN-01/RN-02);
 *  - caso contrário, EM_ANDAMENTO.
 */
export async function recalcularStatusJornada(equipeId: string, db: Db): Promise<StatusJornada> {
  const equipe = await db.equipe.findUniqueOrThrow({
    where: { id: equipeId },
    select: { statusJornada: true, etapaAtualId: true },
  });
  if (equipe.statusJornada === "ENCAMINHADA") return "ENCAMINHADA";

  const ultima = await db.etapaEquipe.findFirst({
    where: { equipeId },
    orderBy: { ordem: "desc" },
    select: { id: true },
  });
  const naUltima = ultima !== null && ultima.id === equipe.etapaAtualId;

  let pronta = false;
  if (naUltima) {
    const [obrigatoriasNaUltima, obrigatoriasPendentes] = await Promise.all([
      db.tarefa.count({ where: { equipeId, etapaEquipeId: ultima.id, obrigatoria: true } }),
      db.tarefa.count({ where: { equipeId, obrigatoria: true, status: { not: "APROVADA" } } }),
    ]);
    pronta = obrigatoriasNaUltima > 0 && obrigatoriasPendentes === 0;
  }

  const novoStatus: StatusJornada = pronta ? "PRONTA_INOVAMF" : "EM_ANDAMENTO";
  if (novoStatus !== equipe.statusJornada) {
    await db.equipe.update({
      where: { id: equipeId },
      data: { statusJornada: novoStatus, prontaEm: pronta ? new Date() : null },
    });
  }
  return novoStatus;
}

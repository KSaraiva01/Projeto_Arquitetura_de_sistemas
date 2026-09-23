import type { Prisma } from "../../generated/prisma/client";
import { STATUS_TAREFA_PARA_API, TIPO_ANEXO_PARA_API, type ApiTaskStatus } from "../../shared/dto";
import { numeroColuna, selecaoEtapa } from "../equipes/jornada";

/** `include` da tarefa em listagens: equipe (com a jornada, para a coluna), etapa, contadores. */
export const incluirTarefa = {
  equipe: {
    select: { id: true, nome: true, liderId: true, excluidaEm: true, etapas: { select: selecaoEtapa, orderBy: { ordem: "asc" } } },
  },
  etapaEquipe: { select: selecaoEtapa },
  _count: { select: { entregas: true } },
  entregas: { orderBy: { versao: "desc" }, take: 1, select: { enviadoEm: true } },
} satisfies Prisma.TarefaInclude;

export type TarefaRow = Prisma.TarefaGetPayload<{ include: typeof incluirTarefa }>;

/** Tarefa no formato do frontend (ApiTask). */
export interface TarefaApi {
  id: string;
  teamId: string;
  teamName: string;
  title: string;
  description: string | null;
  stage: number;
  stageId: string;
  stageName: string;
  dueDate: Date;
  status: ApiTaskStatus;
  isMandatory: boolean;
  submissionCount: number;
  lastSubmissionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function paraTarefa(t: TarefaRow): TarefaApi {
  return {
    id: t.id,
    teamId: t.equipe.id,
    teamName: t.equipe.nome,
    title: t.titulo,
    description: t.descricao,
    stage: numeroColuna(t.etapaEquipe, t.equipe.etapas),
    stageId: t.etapaEquipe.id,
    stageName: t.etapaEquipe.nome,
    dueDate: t.prazo,
    status: STATUS_TAREFA_PARA_API[t.status],
    isMandatory: t.obrigatoria,
    submissionCount: t._count.entregas,
    lastSubmissionAt: t.entregas[0]?.enviadoEm ?? null,
    createdAt: t.criadoEm,
    updatedAt: t.atualizadoEm,
  };
}

export const incluirEntrega = {
  anexos: { orderBy: { criadoEm: "asc" } },
  enviadoPor: { select: { id: true, nome: true } },
} satisfies Prisma.EntregaInclude;

type EntregaRow = Prisma.EntregaGetPayload<{ include: typeof incluirEntrega }>;

export function paraAnexo(tarefaId: string, a: EntregaRow["anexos"][number]) {
  return {
    id: a.id,
    type: TIPO_ANEXO_PARA_API[a.tipo],
    name: a.nomeOriginal,
    /** Link externo (LINK) ou rota de download autenticada (FILE). */
    url: a.tipo === "LINK" ? (a.url ?? "") : `/api/tasks/${tarefaId}/attachments/${a.id}/download`,
    size: a.tamanhoBytes,
    mimeType: a.mimeType,
    createdAt: a.criadoEm,
  };
}

/** Entrega (ApiSubmission). Os campos do primeiro anexo ficam no topo por compatibilidade com o front antigo. */
export function paraEntrega(tarefaId: string, e: EntregaRow) {
  const anexos = e.anexos.map((a) => paraAnexo(tarefaId, a));
  const primeiro = anexos[0];
  return {
    id: e.id,
    version: e.versao,
    note: e.observacao,
    submittedAt: e.enviadoEm,
    submittedBy: e.enviadoPor ? { id: e.enviadoPor.id, name: e.enviadoPor.nome } : null,
    attachments: anexos,
    type: primeiro?.type ?? "FILE",
    url: primeiro?.url ?? "",
    fileName: primeiro?.type === "FILE" ? primeiro.name : null,
    fileSize: primeiro?.size ?? null,
    mimeType: primeiro?.mimeType ?? null,
  };
}

import type {
  EstagioIdeia,
  Perfil,
  StatusJornada,
  StatusTarefa,
  TipoAnexo,
} from "../generated/prisma/client";

/**
 * Fronteira entre o domínio (banco em português) e o contrato da API
 * (inglês, como o frontend já consome). Toda conversão de enum passa por
 * aqui — em um único lugar — para o resto do código não misturar os dois
 * vocabulários.
 */

export type ApiRole = "ADMIN" | "MENTOR" | "STUDENT";
export type ApiTaskStatus = "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "OVERDUE" | "APPROVED" | "REJECTED";
export type ApiJourneyStatus = "IN_PROGRESS" | "READY_FOR_INOVAMF" | "REFERRED";
export type ApiIdeaStage = "JUST_IDEA" | "PROTOTYPE" | "MVP_IN_DEV" | "MVP_READY";
export type ApiAttachmentType = "FILE" | "LINK";

export const PERFIL_PARA_API: Record<Perfil, ApiRole> = {
  ADMIN: "ADMIN",
  MENTOR: "MENTOR",
  ALUNO: "STUDENT",
};
export const PERFIL_DA_API: Record<ApiRole, Perfil> = {
  ADMIN: "ADMIN",
  MENTOR: "MENTOR",
  STUDENT: "ALUNO",
};

export const STATUS_TAREFA_PARA_API: Record<StatusTarefa, ApiTaskStatus> = {
  PENDENTE: "PENDING",
  EM_ANDAMENTO: "IN_PROGRESS",
  ENTREGUE: "SUBMITTED",
  ATRASADA: "OVERDUE",
  APROVADA: "APPROVED",
  REPROVADA: "REJECTED",
};
export const STATUS_TAREFA_DA_API: Record<ApiTaskStatus, StatusTarefa> = {
  PENDING: "PENDENTE",
  IN_PROGRESS: "EM_ANDAMENTO",
  SUBMITTED: "ENTREGUE",
  OVERDUE: "ATRASADA",
  APPROVED: "APROVADA",
  REJECTED: "REPROVADA",
};

export const STATUS_JORNADA_PARA_API: Record<StatusJornada, ApiJourneyStatus> = {
  EM_ANDAMENTO: "IN_PROGRESS",
  PRONTA_INOVAMF: "READY_FOR_INOVAMF",
  ENCAMINHADA: "REFERRED",
};
export const STATUS_JORNADA_DA_API: Record<ApiJourneyStatus, StatusJornada> = {
  IN_PROGRESS: "EM_ANDAMENTO",
  READY_FOR_INOVAMF: "PRONTA_INOVAMF",
  REFERRED: "ENCAMINHADA",
};

export const ESTAGIO_IDEIA_PARA_API: Record<EstagioIdeia, ApiIdeaStage> = {
  APENAS_IDEIA: "JUST_IDEA",
  PROTOTIPO: "PROTOTYPE",
  MVP_EM_DESENVOLVIMENTO: "MVP_IN_DEV",
  MVP_PRONTO: "MVP_READY",
};
export const ESTAGIO_IDEIA_DA_API: Record<ApiIdeaStage, EstagioIdeia> = {
  JUST_IDEA: "APENAS_IDEIA",
  PROTOTYPE: "PROTOTIPO",
  MVP_IN_DEV: "MVP_EM_DESENVOLVIMENTO",
  MVP_READY: "MVP_PRONTO",
};

export const TIPO_ANEXO_PARA_API: Record<TipoAnexo, ApiAttachmentType> = {
  ARQUIVO: "FILE",
  LINK: "LINK",
};

/** Rótulos em português para e-mails e relatórios. */
export const ROTULO_STATUS_TAREFA: Record<StatusTarefa, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  ENTREGUE: "Entregue",
  ATRASADA: "Atrasada",
  APROVADA: "Aprovada",
  REPROVADA: "Ajustar",
};

export const ROTULO_STATUS_JORNADA: Record<StatusJornada, string> = {
  EM_ANDAMENTO: "Em andamento",
  PRONTA_INOVAMF: "Pronta para o InovAMF",
  ENCAMINHADA: "Encaminhada ao InovAMF",
};

export const ROTULO_ESTAGIO_IDEIA: Record<EstagioIdeia, string> = {
  APENAS_IDEIA: "Apenas ideia",
  PROTOTIPO: "Protótipo",
  MVP_EM_DESENVOLVIMENTO: "MVP em desenvolvimento",
  MVP_PRONTO: "MVP pronto",
};

export const ROTULO_PERFIL: Record<Perfil, string> = {
  ADMIN: "Administrador",
  MENTOR: "Mentor",
  ALUNO: "Aluno",
};

/** Listas usadas nos schemas Zod (valores aceitos pela API). */
export const API_ROLES = ["ADMIN", "MENTOR", "STUDENT"] as const;
export const API_TASK_STATUSES = ["PENDING", "IN_PROGRESS", "SUBMITTED", "OVERDUE", "APPROVED", "REJECTED"] as const;
export const API_JOURNEY_STATUSES = ["IN_PROGRESS", "READY_FOR_INOVAMF", "REFERRED"] as const;
export const API_IDEA_STAGES = ["JUST_IDEA", "PROTOTYPE", "MVP_IN_DEV", "MVP_READY"] as const;

/** Semestre do aluno: o banco guarda o número; a API fala "6º semestre". */
export function semestreParaApi(semestre: number | null): string | null {
  return semestre === null ? null : `${semestre}º semestre`;
}

export function semestreDaApi(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = typeof valor === "number" ? valor : Number.parseInt(String(valor), 10);
  return Number.isFinite(numero) && numero >= 1 && numero <= 12 ? numero : null;
}

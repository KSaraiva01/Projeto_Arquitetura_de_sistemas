import { TaskStatus } from "@/lib/types";
import type { ApiJourneyStatus, ApiTaskStatus } from "@/lib/api-types";

const STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string }> = {
  pendente:      { label: "Pendente",      bg: "bg-badge-muted-bg",           text: "text-badge-muted-text" },
  em_andamento:  { label: "Em andamento",  bg: "bg-blue-500/15",             text: "text-blue-600 dark:text-blue-400" },
  entregue:      { label: "Entregue",      bg: "bg-purple-500/15",           text: "text-purple-600 dark:text-purple-400" },
  atrasada:      { label: "Atrasada",      bg: "bg-red-500/15",             text: "text-red-600 dark:text-red-400" },
  aprovada:      { label: "Aprovada",      bg: "bg-green-500/15",           text: "text-green-600 dark:text-green-400" },
  reprovada:     { label: "Ajustar",       bg: "bg-orange-500/15",          text: "text-orange-600 dark:text-orange-400" },
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

const TEAM_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ativa:          { label: "Ativa",                  bg: "bg-blue-500/15",    text: "text-blue-600 dark:text-blue-400" },
  pronta_inovamf: { label: "Pronta para InovAMF",   bg: "bg-green-500/15",   text: "text-green-600 dark:text-green-400" },
  encaminhada:    { label: "Encaminhada ao InovAMF", bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400" },
  inativa:        { label: "Inativa",                bg: "bg-badge-muted-bg", text: "text-muted" },
};

export function TeamStatusBadge({ status }: { status: string }) {
  const c = TEAM_STATUS_CONFIG[status] ?? TEAM_STATUS_CONFIG.ativa;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// Status no vocabulário da API, mapeados para as mesmas cores do protótipo.

const API_TASK_STATUS: Record<ApiTaskStatus, TaskStatus> = {
  PENDING: "pendente",
  IN_PROGRESS: "em_andamento",
  SUBMITTED: "entregue",
  OVERDUE: "atrasada",
  APPROVED: "aprovada",
  REJECTED: "reprovada",
};

export function TaskStatusBadge({ status }: { status: ApiTaskStatus }) {
  return <StatusBadge status={API_TASK_STATUS[status]} />;
}

const API_JOURNEY_STATUS: Record<ApiJourneyStatus, string> = {
  IN_PROGRESS: "ativa",
  READY_FOR_INOVAMF: "pronta_inovamf",
  REFERRED: "encaminhada",
};

/** Situação da equipe no funil; equipe excluída aparece como inativa. */
export function JourneyStatusBadge({ status, isActive = true }: { status: ApiJourneyStatus; isActive?: boolean }) {
  return <TeamStatusBadge status={isActive ? API_JOURNEY_STATUS[status] : "inativa"} />;
}

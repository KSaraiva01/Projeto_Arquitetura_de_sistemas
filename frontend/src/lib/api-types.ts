/**
 * Tipos das respostas da API do InfoHub.
 *
 * Espelham o que o backend devolve (camelCase), diferente de `types.ts`, que
 * descreve os dados mock do protótipo. Enquanto a migração do mock para a API
 * não termina, os dois convivem.
 */

export type ApiUserRole = "ADMIN" | "MENTOR" | "STUDENT";
export type ApiTeamMemberRole = "LEADER" | "MEMBER";

export type ApiTaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "OVERDUE"
  | "APPROVED"
  | "REJECTED";

export type ApiJourneyStatus =
  | "IN_PROGRESS"
  | "READY_FOR_INOVAMF"
  | "REFERRED";

export type ApiIdeaStage =
  | "JUST_IDEA"
  | "PROTOTYPE"
  | "MVP_IN_DEV"
  | "MVP_READY";

export interface ApiSessionUser {
  id: string;
  name: string;
  email: string;
  role: ApiUserRole;
  phone: string | null;
  course: string | null;
  semester: string | null;
  isActive: boolean;
  createdAt: string;
  teams: Array<{
    id: string;
    name: string;
    memberRole: ApiTeamMemberRole;
    journeyStage: number;
    journeyStatus: ApiJourneyStatus;
  }>;
  mentoredTeamIds?: string[];
}

export interface ApiSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: ApiSessionUser;
}

/**
 * Uma etapa da jornada de UMA equipe: as 6 padrão copiadas no cadastro mais
 * as extras que o mentor incluir só para ela.
 */
export interface ApiJourneyStage {
  id: string;
  /** Posição na jornada da equipe (1..n). */
  order: number;
  /** Número da etapa padrão (coluna do kanban); nulo = etapa extra. */
  number: number | null;
  name: string;
  description: string | null;
  isExtra: boolean;
  isCurrent: boolean;
}

export interface ApiTeamCard {
  id: string;
  name: string;
  description: string;
  category: { id: string; name: string };
  ideaStage: ApiIdeaStage;
  /** Coluna do kanban (1–6). Numa etapa extra, a da etapa padrão anterior. */
  journeyStage: number;
  journeyStageName: string;
  /** Etapa exata em que a equipe está — pode ser uma extra. */
  currentStage: { id: string; name: string; order: number; isExtra: boolean };
  /** A jornada inteira desta equipe, com as etapas extras. */
  journey: ApiJourneyStage[];
  journeyStatus: ApiJourneyStatus;
  semester: string;
  period: string;
  howDidYouHear: string | null;
  isActive: boolean;
  createdAt: string;
  readyAt: string | null;
  referredAt: string | null;
  leader: {
    id: string;
    name: string;
    email: string;
    course: string | null;
  } | null;
  mentors: Array<{ id: string; name: string }>;
  memberCount: number;
  openTasks: number;
  overdueTasks: number;
}

export interface ApiTeamMember {
  id: string;
  name: string;
  email: string;
  course: string | null;
  semester: string | null;
  phone: string | null;
  role: ApiTeamMemberRole;
  joinedAt: string;
}

export interface ApiStageHistoryEntry {
  id: string;
  fromStage: number | null;
  fromStageName: string | null;
  toStage: number | null;
  toStageName: string;
  direction: "start" | "advance" | "rollback";
  reason: string | null;
  forced: boolean;
  changedAt: string;
  changedByName: string | null;
}

/** RN-02 — um dos entregáveis finais obrigatórios e a tarefa da equipe feita dele. */
export interface ApiFinalDeliverable {
  templateId: string;
  title: string;
  /** Nulo = a tarefa ainda não foi criada para a equipe. */
  taskId: string | null;
  status: ApiTaskStatus | null;
}

/** RF-08 — `GET /teams/:id`. */
export interface ApiTeamDetail {
  team: ApiTeamCard;
  members: ApiTeamMember[];
  journey: ApiJourneyStage[];
  stageHistory: ApiStageHistoryEntry[];
  finalDeliverables: ApiFinalDeliverable[];
}

export interface ApiNote {
  id: string;
  author: { id: string; name: string } | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTask {
  id: string;
  teamId: string;
  teamName: string;
  title: string;
  description: string | null;
  /** Coluna do kanban da etapa da tarefa (1–6). */
  stage: number;
  stageId: string;
  stageName: string;
  dueDate: string;
  status: ApiTaskStatus;
  isMandatory: boolean;
  submissionCount: number;
  lastSubmissionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAttachment {
  id: string;
  type: "FILE" | "LINK";
  name: string;
  /** Link externo (LINK) ou rota de download autenticada (FILE). */
  url: string;
  size: number | null;
  mimeType: string | null;
  createdAt: string;
}

export interface ApiSubmission {
  id: string;
  version: number;
  note: string | null;
  submittedAt: string;
  submittedBy: { id: string; name: string } | null;
  attachments: ApiAttachment[];
}

export interface ApiTaskComment {
  id: string;
  submissionId: string | null;
  submissionVersion: number | null;
  author: { id: string; name: string } | null;
  decision: "APPROVED" | "REJECTED" | null;
  content: string;
  createdAt: string;
}

/** RF-17 — lembrete de uma tarefa: relativo ao prazo (`daysBefore`) ou em data fixa. */
export interface ApiTaskReminder {
  id: string;
  daysBefore: number | null;
  remindAt: string;
  sentAt: string | null;
}

export interface ApiTaskDetail extends ApiTask {
  submissions: ApiSubmission[];
  comments: ApiTaskComment[];
  reminders: ApiTaskReminder[];
}

export interface ApiTaskTemplate {
  id: string;
  /** Número da etapa padrão a que o modelo pertence. */
  stage: number;
  stageName: string;
  title: string;
  description: string | null;
  isMandatory: boolean;
}

export interface ApiBoard {
  columns: Array<{
    stage: number;
    name: string;
    teams: ApiTeamCard[];
  }>;
  total: number;
  /** Falso para aluno e integrante: o kanban vira somente leitura. */
  canDrag: boolean;
}

export interface ApiStageBlocker {
  id: string;
  title: string;
  stage: number;
  stageName: string;
  status: ApiTaskStatus;
  dueDate: string;
}

export interface ApiChangeStageResult {
  team: ApiTeamCard | null;
  fromStage: number;
  fromStageId: string;
  fromStageName: string;
  toStage: number;
  toStageId: string;
  toStageName: string;
  isAdvancing: boolean;
  journeyStatus: ApiJourneyStatus | null;
  forced: boolean;
  skippedTasks: Array<{ id: string; title: string; stage: number }>;
  message: string;
}

export interface ApiCalendarEvent {
  kind: "DUE" | "REMINDER";
  date: string;
  taskId: string;
  title: string;
  stage: number;
  stageName: string;
  status: ApiTaskStatus;
  isMandatory: boolean;
  teamId: string;
  teamName: string;
  reminderSent: boolean | null;
}

export interface ApiCalendar {
  range: { from: string; to: string };
  summary: {
    total: number;
    overdue: number;
    pending: number;
    approved: number;
  };
  days: Array<{ date: string; events: ApiCalendarEvent[] }>;
  events: ApiCalendarEvent[];
}

/** RF-03 — linha de `GET /users`. */
export interface ApiUserSummary {
  id: string;
  name: string;
  email: string;
  role: ApiUserRole;
  phone: string | null;
  course: string | null;
  semester: string | null;
  isActive: boolean;
  /** Falso = ainda não criou a senha pelo link de ativação. */
  hasPassword: boolean;
  /** Nulo = e-mail não confirmado (não consegue entrar). */
  emailConfirmedAt: string | null;
  createdAt: string;
  mentoredTeams: number;
}

/** RF-22 — `GET /reports/dashboard`. */
export interface ApiReportDashboard {
  filters: { period?: string; status?: ApiJourneyStatus; includeInactive: boolean };
  periods: string[];
  totals: {
    teams: number;
    activeTeams: number;
    readyForInovamf: number;
    referred: number;
    openTasks: number;
    overdueTasks: number;
    teamsWithOverdueTasks: number;
    newTeamsLast30Days: number;
  };
  byStage: Array<{ stage: number; name: string; teams: number }>;
  byArea: Array<{ name: string; teams: number }>;
  byStatus: Array<{ status: ApiJourneyStatus; teams: number }>;
}

/** Tipos de aviso por e-mail que a pessoa pode desligar (RF-21). */
export type ApiNotificationType =
  | "NOVA_TAREFA"
  | "PRAZO_PROXIMO"
  | "PRAZO_VENCIDO"
  | "TAREFA_ATRASADA"
  | "ENTREGA_RECEBIDA"
  | "ENTREGA_AVALIADA"
  | "LEMBRETE_MANUAL"
  | "NOVO_CADASTRO";

export const TASK_STATUS_LABELS: Record<ApiTaskStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  SUBMITTED: "Entregue",
  OVERDUE: "Atrasada",
  APPROVED: "Aprovada",
  REJECTED: "Ajustar",
};

export const JOURNEY_STATUS_LABELS: Record<ApiJourneyStatus, string> = {
  IN_PROGRESS: "Em andamento",
  READY_FOR_INOVAMF: "Pronta para o InovAMF",
  REFERRED: "Encaminhada",
};

export const IDEA_STAGE_LABELS: Record<ApiIdeaStage, string> = {
  JUST_IDEA: "Apenas ideia",
  PROTOTYPE: "Protótipo",
  MVP_IN_DEV: "MVP em desenvolvimento",
  MVP_READY: "MVP pronto",
};

/**
 * "Etapa 3" para uma etapa padrão, "Etapa extra" para uma incluída pelo
 * mentor. As padrão mantêm o número do catálogo mesmo com extras no meio,
 * para bater com as colunas do kanban.
 */
export function journeyStageLabel(stage: Pick<ApiJourneyStage, "number">): string {
  return stage.number === null ? "Etapa extra" : `Etapa ${stage.number}`;
}

export const ROLE_LABELS: Record<ApiUserRole, string> = {
  ADMIN: "Administrador",
  MENTOR: "Mentor",
  STUDENT: "Aluno",
};

/** Rota inicial de cada perfil depois do login. */
export function homePathFor(user: ApiSessionUser): string {
  if (user.role === "ADMIN") return "/admin";
  if (user.role === "MENTOR") return "/mentor";

  // Líder e integrante são ambos STUDENT; o que separa é o papel na equipe.
  const isLeader = user.teams.some((team) => team.memberRole === "LEADER");
  return isLeader ? "/aluno" : "/integrante";
}

/**
 * A equipe que o aluno acompanha: a ativa (RN-03 garante que só há uma), ou
 * a mais recente já encaminhada ao InovAMF.
 */
export function currentTeamOf(user: ApiSessionUser): ApiSessionUser["teams"][number] | null {
  return user.teams.find((team) => team.journeyStatus !== "REFERRED") ?? user.teams[user.teams.length - 1] ?? null;
}

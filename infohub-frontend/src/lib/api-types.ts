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

export interface ApiTeamCard {
  id: string;
  name: string;
  description: string;
  category: { id: string; name: string };
  ideaStage: ApiIdeaStage;
  journeyStage: number;
  journeyStageName: string;
  journeyStatus: ApiJourneyStatus;
  semester: string;
  howDidYouHear: string | null;
  isActive: boolean;
  createdAt: string;
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
  status: ApiTaskStatus;
  dueDate: string;
}

export interface ApiChangeStageResult {
  team: ApiTeamCard | null;
  fromStage: number;
  toStage: number;
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

/** Rota inicial de cada perfil depois do login. */
export function homePathFor(user: ApiSessionUser): string {
  if (user.role === "ADMIN") return "/admin";
  if (user.role === "MENTOR") return "/mentor";

  // Líder e integrante são ambos STUDENT; o que separa é o papel na equipe.
  const isLeader = user.teams.some((team) => team.memberRole === "LEADER");
  return isLeader ? "/aluno" : "/integrante";
}

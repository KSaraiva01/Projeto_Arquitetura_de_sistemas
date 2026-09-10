/**
 * Tipos do domínio compartilhados entre módulos.
 *
 * Os valores em maiúsculas espelham exatamente os ENUMs do PostgreSQL —
 * quando um enum mudar no banco, ele precisa mudar aqui junto.
 */

export const USER_ROLES = ["ADMIN", "MENTOR", "STUDENT"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const TEAM_MEMBER_ROLES = ["LEADER", "MEMBER"] as const;
export type TeamMemberRole = (typeof TEAM_MEMBER_ROLES)[number];

export const IDEA_STAGES = [
  "JUST_IDEA",
  "PROTOTYPE",
  "MVP_IN_DEV",
  "MVP_READY",
] as const;
export type IdeaStage = (typeof IDEA_STAGES)[number];

export const JOURNEY_STATUSES = [
  "IN_PROGRESS",
  "READY_FOR_INOVAMF",
  "REFERRED",
] as const;
export type JourneyStatus = (typeof JOURNEY_STATUSES)[number];

export const TASK_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "OVERDUE",
  "APPROVED",
  "REJECTED",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const EMAIL_TYPES = [
  "NEW_TASK",
  "DEADLINE_REMINDER",
  "OVERDUE",
  "APPROVED",
  "REJECTED",
  "NEW_REGISTRATION",
  "FILE_SUBMITTED",
  "MANUAL_REMINDER",
  "PASSWORD_RESET",
  "ACCOUNT_CREATED",
] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

/** As 6 etapas da jornada do empreendedor no InfoHub. */
export const JOURNEY_STAGES = [1, 2, 3, 4, 5, 6] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export const JOURNEY_STAGE_NAMES: Record<JourneyStage, string> = {
  1: "Envio da ideia",
  2: "Contato com a equipe",
  3: "Entendendo a ideia",
  4: "Proposta de valor",
  5: "Modelo de negócio",
  6: "Pitch e inscrição",
};

/**
 * Tipos do domínio compartilhados entre módulos.
 *
 * Os valores em maiúsculas espelham exatamente os ENUMs do PostgreSQL
 * (database/schema.sql) — quando um enum mudar no banco, ele precisa mudar
 * aqui junto. Os nomes das tabelas e colunas são em português; os códigos
 * dos enums são em inglês por serem o contrato da API com o front-end.
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

export const SUBMISSION_TYPES = ["FILE", "LINK"] as const;
export type SubmissionType = (typeof SUBMISSION_TYPES)[number];

export const TOKEN_PURPOSES = ["FIRST_ACCESS", "PASSWORD_RESET"] as const;
export type TokenPurpose = (typeof TOKEN_PURPOSES)[number];

export const NOTIFICATION_TYPES = [
  "NEW_REGISTRATION",
  "FIRST_ACCESS",
  "PASSWORD_RESET",
  "ACCOUNT_CREATED",
  "NEW_TASK",
  "DEADLINE_REMINDER",
  "OVERDUE",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "STAGE_CHANGED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Quantidade de etapas padrão da jornada (tabela `etapa`). As colunas do
 * kanban vêm do banco; este número só serve para validar o `toStage` que o
 * front manda como número.
 */
export const DEFAULT_STAGE_COUNT = 6;

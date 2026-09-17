import { z } from "zod";
import {
  DEFAULT_STAGE_COUNT,
  SUBMISSION_TYPES,
  TASK_STATUSES,
} from "../../shared/types/domain.js";

export const taskIdParamSchema = z.object({
  id: z.string().uuid("Identificador de tarefa inválido."),
});

/** Data no formato YYYY-MM-DD, sem hora e sem fuso. */
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use uma data no formato AAAA-MM-DD.");

export const listTasksQuerySchema = z.object({
  teamId: z.string().uuid().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  stage: z.coerce.number().int().min(1).max(DEFAULT_STAGE_COUNT).optional(),
  dueFrom: isoDateSchema.optional(),
  dueTo: isoDateSchema.optional(),
  search: z.string().trim().max(150).optional(),
});

/**
 * Intervalo do calendário.
 *
 * O limite de 366 dias evita que uma chamada sem filtro varra o histórico
 * inteiro; uma visão de mês ou de semana cabe folgado nisso.
 */
export const calendarQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    teamId: z.string().uuid().optional(),
    includeReminders: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .default(true),
  })
  .refine((data) => data.from <= data.to, {
    message: "A data inicial precisa ser anterior ou igual à final.",
    path: ["from"],
  })
  .refine(
    (data) => {
      const days =
        (Date.parse(data.to) - Date.parse(data.from)) / (1000 * 60 * 60 * 24);
      return days <= 366;
    },
    {
      message: "O intervalo do calendário não pode passar de 366 dias.",
      path: ["to"],
    },
  );

/**
 * RF-12 — nova tarefa para a equipe, avulsa ou a partir de um modelo (RF-11).
 * Com `templateId`, título/descrição/obrigatoriedade vêm do modelo, e a
 * etapa é a correspondente na jornada da equipe. Sem, a tarefa entra na
 * etapa atual da equipe (ou na `stageId` informada).
 */
export const createTaskSchema = z
  .object({
    teamId: z.string().uuid("Informe a equipe."),
    templateId: z.string().uuid().optional(),
    stageId: z.string().uuid().optional(),
    title: z.string().trim().min(3).max(255).optional(),
    description: z.string().trim().max(5000).optional(),
    dueDate: isoDateSchema,
    isMandatory: z.boolean().optional(),
    /** RF-17: quantos dias antes do prazo lembrar. Padrão: 3 e 1. */
    reminderDaysBefore: z
      .array(z.number().int().min(0).max(60))
      .max(5)
      .default([3, 1]),
  })
  .refine((data) => data.templateId !== undefined || data.title !== undefined, {
    message: "Informe o título da tarefa ou escolha um modelo.",
    path: ["title"],
  });

/** Q8 — prazo só muda por mentor/admin; a mudança recalcula os lembretes. */
export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(3).max(255).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    dueDate: isoDateSchema.optional(),
    isMandatory: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

/**
 * RF-14 — entrega. Q3: LINK para o Pitch Vídeo (YouTube), FILE para os
 * demais. Para FILE o cliente já fez o upload para o armazenamento e manda
 * aqui a URL/caminho e os metadados do arquivo.
 */
export const createSubmissionSchema = z
  .object({
    type: z.enum(SUBMISSION_TYPES),
    url: z.string().trim().min(1, "Informe o link ou o arquivo.").max(2048),
    fileName: z.string().trim().max(255).optional(),
    fileSize: z.number().int().nonnegative().optional(),
    mimeType: z.string().trim().max(100).optional(),
  })
  .refine((data) => data.type === "LINK" || data.fileName !== undefined, {
    message: "Para entrega de arquivo, informe o nome do arquivo.",
    path: ["fileName"],
  })
  .refine(
    (data) => data.type === "FILE" || /^https?:\/\//i.test(data.url),
    { message: "Informe um link começando com http:// ou https://.", path: ["url"] },
  );

/** RF-15 — aprovar ou solicitar ajustes, sempre com comentário. */
export const reviewTaskSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().trim().min(1, "Escreva um comentário para o aluno.").max(5000),
});

export type TaskIdParam = z.infer<typeof taskIdParamSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type ReviewTaskInput = z.infer<typeof reviewTaskSchema>;

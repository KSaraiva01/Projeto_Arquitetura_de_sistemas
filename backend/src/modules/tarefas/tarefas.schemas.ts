import { z } from "zod";
import { API_TASK_STATUSES } from "../../shared/dto";
import { NUMERO_ETAPAS_PADRAO } from "../equipes/equipes.schemas";

export const taskIdParamSchema = z.object({
  id: z.string().uuid("Identificador de tarefa inválido."),
});

/** Data no formato AAAA-MM-DD (o prazo é sempre o fim desse dia). */
const dataIsoSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use uma data no formato AAAA-MM-DD.");

export const listTasksQuerySchema = z.object({
  teamId: z.string().uuid().optional(),
  status: z.enum(API_TASK_STATUSES).optional(),
  stage: z.coerce.number().int().min(1).max(NUMERO_ETAPAS_PADRAO).optional(),
  dueFrom: dataIsoSchema.optional(),
  dueTo: dataIsoSchema.optional(),
  search: z.string().trim().max(150).optional(),
});

/** Intervalo do calendário (máx. 366 dias — uma visão de mês/semana cabe folgado). */
export const calendarQuerySchema = z
  .object({
    from: dataIsoSchema,
    to: dataIsoSchema,
    teamId: z.string().uuid().optional(),
    includeReminders: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .default(true),
  })
  .refine((d) => d.from <= d.to, { message: "A data inicial precisa ser anterior ou igual à final.", path: ["from"] })
  .refine((d) => (Date.parse(d.to) - Date.parse(d.from)) / 86_400_000 <= 366, {
    message: "O intervalo do calendário não pode passar de 366 dias.",
    path: ["to"],
  });

/**
 * RF-12 — nova tarefa, avulsa ou a partir de um modelo (RF-11). Com
 * `templateId`, título/descrição/obrigatoriedade vêm do modelo e a etapa é a
 * correspondente na jornada da equipe; sem, entra na `stageId` informada ou
 * na etapa atual da equipe. `reminderDaysBefore` configura os lembretes (RF-17).
 */
export const createTaskSchema = z
  .object({
    teamId: z.string().uuid("Informe a equipe."),
    templateId: z.string().uuid().optional(),
    stageId: z.string().uuid().optional(),
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(5000).optional(),
    dueDate: dataIsoSchema,
    isMandatory: z.boolean().optional(),
    reminderDaysBefore: z.array(z.number().int().min(0).max(60)).max(5).default([3, 1]),
  })
  .refine((d) => d.templateId !== undefined || d.title !== undefined, {
    message: "Informe o título da tarefa ou escolha um modelo.",
    path: ["title"],
  });

/** Só mentor/admin editam; mudar o prazo recalcula os lembretes (nota da RF-17). */
export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    dueDate: dataIsoSchema.optional(),
    isMandatory: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Informe ao menos um campo para atualizar." });

/** O aluno sinaliza que começou a tarefa (PENDING → IN_PROGRESS). */
export const updateTaskStatusSchema = z.object({
  status: z.literal("IN_PROGRESS"),
});

/**
 * RF-14 — entrega. Vem como multipart/form-data: um ou mais `files` e/ou um
 * `linkUrl` (Q3: pitch em vídeo pode ser link do YouTube/Drive), mais uma
 * `note` opcional. A verificação "ao menos um arquivo ou link" é feita no
 * serviço, que enxerga os arquivos recebidos pelo multer.
 */
export const submissionSchema = z.object({
  // O `.url()` do Zod aceita qualquer esquema (javascript:, data:…); o link vai
  // parar num <a href> na tela do mentor, então só http(s) passa.
  linkUrl: z
    .string()
    .trim()
    .url("Informe um link começando com http:// ou https://.")
    .max(1000)
    .refine((url) => /^https?:\/\//i.test(url), "Informe um link começando com http:// ou https://.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  linkTitle: z.string().trim().max(255).optional(),
  note: z.string().trim().max(2000).optional(),
});

/** RF-15 — aprovar ou solicitar ajustes, sempre com comentário. */
export const reviewTaskSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().trim().min(1, "Escreva um comentário para o aluno.").max(5000),
});

/** Comentário livre do mentor (sem decisão) ou do aluno na tarefa. */
export const commentSchema = z.object({
  content: z.string().trim().min(1, "Escreva o comentário.").max(5000),
});

/** RF-17 — novo lembrete: relativo (`daysBefore`) ou em data fixa (`remindAt`). */
export const reminderSchema = z
  .object({
    daysBefore: z.number().int().min(0).max(60).optional(),
    remindAt: dataIsoSchema.optional(),
  })
  .refine((d) => d.daysBefore !== undefined || d.remindAt !== undefined, {
    message: "Informe daysBefore ou remindAt.",
    path: ["daysBefore"],
  });

export const reminderParamSchema = z.object({
  id: z.string().uuid("Identificador de tarefa inválido."),
  reminderId: z.string().uuid("Identificador de lembrete inválido."),
});

export const attachmentParamSchema = z.object({
  id: z.string().uuid("Identificador de tarefa inválido."),
  attachmentId: z.string().uuid("Identificador de anexo inválido."),
});

export type TaskIdParam = z.infer<typeof taskIdParamSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type ReviewTaskInput = z.infer<typeof reviewTaskSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type ReminderInput = z.infer<typeof reminderSchema>;
export type ReminderParam = z.infer<typeof reminderParamSchema>;
export type AttachmentParam = z.infer<typeof attachmentParamSchema>;

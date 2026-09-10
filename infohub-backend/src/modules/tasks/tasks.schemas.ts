import { z } from "zod";
import { TASK_STATUSES } from "../../shared/types/domain.js";

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
  stage: z.coerce.number().int().min(1).max(6).optional(),
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

export type TaskIdParam = z.infer<typeof taskIdParamSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;

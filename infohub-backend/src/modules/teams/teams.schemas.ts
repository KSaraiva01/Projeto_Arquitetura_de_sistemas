import { z } from "zod";
import { JOURNEY_STAGES } from "../../shared/types/domain.js";

export const teamIdParamSchema = z.object({
  id: z.string().uuid("Identificador de equipe inválido."),
});

const journeyStageSchema = z.coerce
  .number()
  .int()
  .refine(
    (value): value is (typeof JOURNEY_STAGES)[number] =>
      JOURNEY_STAGES.includes(value as (typeof JOURNEY_STAGES)[number]),
    { message: "A etapa da jornada precisa estar entre 1 e 6." },
  );

/** RF-07 — busca e filtros do painel do administrador. */
export const listTeamsQuerySchema = z.object({
  search: z.string().trim().max(150).optional(),
  stage: journeyStageSchema.optional(),
  status: z.enum(["IN_PROGRESS", "READY_FOR_INOVAMF", "REFERRED"]).optional(),
  categoryId: z.string().uuid().optional(),
  mentorId: z.string().uuid().optional(),
  course: z.string().trim().max(150).optional(),
  semester: z.string().trim().max(30).optional(),
  taskStatus: z
    .enum([
      "PENDING",
      "IN_PROGRESS",
      "SUBMITTED",
      "OVERDUE",
      "APPROVED",
      "REJECTED",
    ])
    .optional(),
  includeInactive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default(false),
});

/**
 * RF-09 — mover a equipe entre as etapas (o arrastar do kanban).
 *
 * `force` é o "sim, avançar mesmo assim" do mentor: sem ele, avançar com
 * tarefas obrigatórias pendentes é recusado com a lista do que falta (RN-01).
 */
export const changeStageSchema = z.object({
  toStage: journeyStageSchema,
  reason: z.string().trim().max(500).optional(),
  force: z.boolean().default(false),
});

export type TeamIdParam = z.infer<typeof teamIdParamSchema>;
export type ListTeamsQuery = z.infer<typeof listTeamsQuerySchema>;
export type ChangeStageInput = z.infer<typeof changeStageSchema>;

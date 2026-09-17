import { z } from "zod";
import { emailSchema } from "../auth/auth.schemas.js";
import {
  DEFAULT_STAGE_COUNT,
  IDEA_STAGES,
  JOURNEY_STATUSES,
  TASK_STATUSES,
} from "../../shared/types/domain.js";

export const teamIdParamSchema = z.object({
  id: z.string().uuid("Identificador de equipe inválido."),
});

/** Número de uma etapa padrão (coluna do kanban), 1..6. */
const stageNumberSchema = z.coerce
  .number()
  .int()
  .min(1, `A etapa precisa estar entre 1 e ${DEFAULT_STAGE_COUNT}.`)
  .max(DEFAULT_STAGE_COUNT, `A etapa precisa estar entre 1 e ${DEFAULT_STAGE_COUNT}.`);

/** RF-07 — busca e filtros do painel do administrador. */
export const listTeamsQuerySchema = z.object({
  search: z.string().trim().max(150).optional(),
  stage: stageNumberSchema.optional(),
  status: z.enum(JOURNEY_STATUSES).optional(),
  categoryId: z.string().uuid().optional(),
  mentorId: z.string().uuid().optional(),
  course: z.string().trim().max(150).optional(),
  semester: z.string().trim().max(30).optional(),
  taskStatus: z.enum(TASK_STATUSES).optional(),
  includeInactive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default(false),
});

/**
 * Destino de uma mudança de etapa: o kanban manda o NÚMERO da coluna
 * (`toStage`); uma etapa extra, que não tem número, é referenciada pelo id da
 * linha de equipe_etapa (`toStageId`).
 */
const stageTargetSchema = z
  .object({
    toStage: stageNumberSchema.optional(),
    toStageId: z.string().uuid().optional(),
  })
  .refine((data) => data.toStage !== undefined || data.toStageId !== undefined, {
    message: "Informe toStage (número) ou toStageId (id da etapa).",
    path: ["toStage"],
  });

export const stageBlockersQuerySchema = stageTargetSchema;

/**
 * RF-09 — mover a equipe entre as etapas (o arrastar do kanban).
 *
 * `force` é o "sim, avançar mesmo assim" do mentor: sem ele, avançar com
 * tarefas obrigatórias pendentes é recusado com a lista do que falta (RN-01).
 */
export const changeStageSchema = z
  .object({
    toStage: stageNumberSchema.optional(),
    toStageId: z.string().uuid().optional(),
    reason: z.string().trim().max(500).optional(),
    force: z.boolean().default(false),
  })
  .refine((data) => data.toStage !== undefined || data.toStageId !== undefined, {
    message: "Informe toStage (número) ou toStageId (id da etapa).",
    path: ["toStage"],
  });

/** Etapa extra acrescentada pelo mentor à jornada de UMA equipe. */
export const addStageSchema = z.object({
  name: z.string().trim().min(3, "Dê um nome à etapa.").max(100),
  description: z.string().trim().max(1000).optional(),
  /** Depois de qual etapa padrão ela entra. Sem informar, vai para o fim. */
  afterStage: stageNumberSchema.optional(),
  afterStageId: z.string().uuid().optional(),
});

/** Q10/Q11 — atribuição de mentor à equipe (só ADMIN). */
export const assignMentorSchema = z.object({
  mentorId: z.string().uuid("Informe o mentor."),
});

export const mentorParamSchema = z.object({
  id: z.string().uuid("Identificador de equipe inválido."),
  mentorId: z.string().uuid("Identificador de mentor inválido."),
});

/** RF-10 — anotação interna do mentor. */
export const createNoteSchema = z.object({
  content: z.string().trim().min(1, "Escreva a anotação.").max(5000),
});

const personSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo.").max(255),
  email: emailSchema,
  course: z.string().trim().min(2, "Informe o curso.").max(150),
});

/**
 * RF-02/RF-04/RF-05 — formulário inicial da ideia. Não há campo de senha:
 * o líder e os integrantes recebem um link de primeiro acesso por e-mail.
 */
export const registerTeamSchema = z.object({
  team: z.object({
    name: z.string().trim().min(3, "Informe o nome da ideia.").max(255),
    description: z.string().trim().min(20, "Descreva a ideia com um pouco mais de detalhe.").max(5000),
    areaId: z.string().uuid("Selecione uma área."),
    ideaStage: z.enum(IDEA_STAGES),
    howDidYouHear: z.string().trim().max(150).optional(),
  }),
  leader: personSchema.extend({
    phone: z.string().trim().min(8, "Informe o telefone/WhatsApp.").max(30),
    semester: z.string().trim().min(1, "Informe o semestre.").max(30),
  }),
  members: z.array(personSchema).max(10).default([]),
  lgpdConsent: z.literal(true, {
    message: "É preciso aceitar os termos de uso de dados (LGPD).",
  }),
});

export type TeamIdParam = z.infer<typeof teamIdParamSchema>;
export type ListTeamsQuery = z.infer<typeof listTeamsQuerySchema>;
export type StageBlockersQuery = z.infer<typeof stageBlockersQuerySchema>;
export type ChangeStageInput = z.infer<typeof changeStageSchema>;
export type AddStageInput = z.infer<typeof addStageSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type AssignMentorInput = z.infer<typeof assignMentorSchema>;
export type MentorParam = z.infer<typeof mentorParamSchema>;
export type RegisterTeamInput = z.infer<typeof registerTeamSchema>;

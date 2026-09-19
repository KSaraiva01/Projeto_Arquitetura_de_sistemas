import { z } from "zod";
import { API_IDEA_STAGES, API_JOURNEY_STATUSES, API_TASK_STATUSES } from "../../shared/dto";
import { emailSchema, senhaSchema } from "../auth/auth.schemas";

export const NUMERO_ETAPAS_PADRAO = 6;

export const teamIdParamSchema = z.object({
  id: z.string().uuid("Identificador de equipe inválido."),
});

/** Número de uma etapa padrão (coluna do kanban), 1..6. */
const numeroEtapaSchema = z.coerce
  .number()
  .int()
  .min(1, `A etapa precisa estar entre 1 e ${NUMERO_ETAPAS_PADRAO}.`)
  .max(NUMERO_ETAPAS_PADRAO, `A etapa precisa estar entre 1 e ${NUMERO_ETAPAS_PADRAO}.`);

const periodoSchema = z.string().trim().regex(/^\d{4}\/[12]$/, "Use o formato AAAA/1 ou AAAA/2.");

/** RF-07 e RF-24 — busca e filtros do painel. */
export const listTeamsQuerySchema = z.object({
  search: z.string().trim().max(150).optional(),
  stage: numeroEtapaSchema.optional(),
  status: z.enum(API_JOURNEY_STATUSES).optional(),
  categoryId: z.string().uuid().optional(),
  mentorId: z.string().uuid().optional(),
  course: z.string().trim().max(120).optional(),
  /** Período de ingresso, ex.: 2026/2 (RF-24). O front antigo chama de `semester`. */
  period: periodoSchema.optional(),
  semester: periodoSchema.optional(),
  taskStatus: z.enum(API_TASK_STATUSES).optional(),
  includeInactive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .default(false),
});

/**
 * Destino de uma mudança de etapa: o kanban manda o NÚMERO da coluna
 * (`toStage`); uma etapa extra, sem número, é referenciada por `toStageId`.
 */
const alvoEtapa = {
  toStage: numeroEtapaSchema.optional(),
  toStageId: z.string().uuid().optional(),
};
const exigeAlvo = { message: "Informe toStage (número) ou toStageId (id da etapa).", path: ["toStage"] };

export const stageBlockersQuerySchema = z
  .object(alvoEtapa)
  .refine((d) => d.toStage !== undefined || d.toStageId !== undefined, exigeAlvo);

/** RF-09 — `force` é o "avançar mesmo assim" do mentor (RN-01). */
export const changeStageSchema = z
  .object({
    ...alvoEtapa,
    reason: z.string().trim().max(500).optional(),
    force: z.boolean().default(false),
  })
  .refine((d) => d.toStage !== undefined || d.toStageId !== undefined, exigeAlvo);

/** Etapa extra acrescentada pelo mentor à jornada de UMA equipe. */
export const addStageSchema = z.object({
  name: z.string().trim().min(3, "Dê um nome à etapa.").max(120),
  description: z.string().trim().max(2000).optional(),
  /** Depois de qual etapa ela entra. Sem informar, vai para o fim. */
  afterStage: numeroEtapaSchema.optional(),
  afterStageId: z.string().uuid().optional(),
});

export const stageParamSchema = z.object({
  id: z.string().uuid("Identificador de equipe inválido."),
  stageId: z.string().uuid("Identificador de etapa inválido."),
});

export const assignMentorSchema = z.object({
  mentorId: z.string().uuid("Informe o mentor."),
});

export const mentorParamSchema = z.object({
  id: z.string().uuid("Identificador de equipe inválido."),
  mentorId: z.string().uuid("Identificador de mentor inválido."),
});

/** RF-10 — anotação interna. */
export const noteSchema = z.object({
  content: z.string().trim().min(1, "Escreva a anotação.").max(5000),
});

export const noteParamSchema = z.object({
  id: z.string().uuid("Identificador de equipe inválido."),
  noteId: z.string().uuid("Identificador de anotação inválido."),
});

const pessoaSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo.").max(160),
  email: emailSchema,
  /** Nome do curso, como na tabela `cursos`. */
  course: z.string().trim().min(2, "Informe o curso.").max(120),
  semester: z.union([z.string().trim().max(30), z.number().int()]).optional(),
});

/**
 * RF-02/RF-04/RF-05 — formulário inicial da ideia (público).
 * O líder cria a própria senha no formulário; os colegas recebem por e-mail
 * um token de ativação para definir a deles.
 */
export const registerTeamSchema = z.object({
  team: z.object({
    name: z.string().trim().min(3, "Informe o nome da ideia.").max(160),
    description: z.string().trim().min(20, "Descreva a ideia com um pouco mais de detalhe.").max(5000),
    areaId: z.string().uuid("Selecione uma área."),
    ideaStage: z.enum(API_IDEA_STAGES, { message: "Informe o estágio atual da ideia." }),
    howDidYouHear: z.string().trim().max(120).optional(),
  }),
  leader: pessoaSchema.extend({
    phone: z.string().trim().min(8, "Informe o telefone/WhatsApp.").max(30),
    semester: z.union([z.string().trim().min(1, "Informe o semestre."), z.number().int()]),
    password: senhaSchema,
  }),
  members: z.array(pessoaSchema).max(10).default([]),
  lgpdConsent: z.literal(true, { message: "É preciso aceitar o tratamento de dados (LGPD)." }),
});

/** Líder/admin/mentor incluem um colega depois do cadastro. */
export const addMemberSchema = pessoaSchema;

export const memberParamSchema = z.object({
  id: z.string().uuid("Identificador de equipe inválido."),
  userId: z.string().uuid("Identificador de usuário inválido."),
});

/** Dados básicos da ideia, editáveis pelo líder e por admin/mentor. */
export const updateTeamSchema = z
  .object({
    name: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().min(20).max(5000).optional(),
    areaId: z.string().uuid().optional(),
    ideaStage: z.enum(API_IDEA_STAGES).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Informe ao menos um campo para atualizar." });

/** RF-20 — lembrete manual avulso. */
export const manualReminderSchema = z.object({
  subject: z.string().trim().min(3, "Informe o assunto.").max(120),
  message: z.string().trim().min(3, "Escreva a mensagem.").max(5000),
});

export const referSchema = z.object({
  force: z.boolean().default(false),
});

export type TeamIdParam = z.infer<typeof teamIdParamSchema>;
export type ListTeamsQuery = z.infer<typeof listTeamsQuerySchema>;
export type StageBlockersQuery = z.infer<typeof stageBlockersQuerySchema>;
export type ChangeStageInput = z.infer<typeof changeStageSchema>;
export type AddStageInput = z.infer<typeof addStageSchema>;
export type StageParam = z.infer<typeof stageParamSchema>;
export type AssignMentorInput = z.infer<typeof assignMentorSchema>;
export type MentorParam = z.infer<typeof mentorParamSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type NoteParam = z.infer<typeof noteParamSchema>;
export type RegisterTeamInput = z.infer<typeof registerTeamSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type MemberParam = z.infer<typeof memberParamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type ManualReminderInput = z.infer<typeof manualReminderSchema>;
export type ReferInput = z.infer<typeof referSchema>;

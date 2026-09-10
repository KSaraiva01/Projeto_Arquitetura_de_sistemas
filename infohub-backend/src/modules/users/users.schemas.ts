import { z } from "zod";
import { emailSchema } from "../auth/auth.schemas.js";

export const userIdParamSchema = z.object({
  id: z.string().uuid("Identificador de usuário inválido."),
});

/**
 * RF-03 — o administrador só cria contas de ADMIN ou MENTOR.
 * Contas de aluno nascem pelo formulário inicial de ideia (RF-02).
 */
export const createUserSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo.").max(255),
  email: emailSchema,
  role: z.enum(["ADMIN", "MENTOR"], {
    message: "O perfil precisa ser ADMIN ou MENTOR.",
  }),
  phone: z.string().trim().max(30).optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(3).max(255).optional(),
    email: emailSchema.optional(),
    role: z.enum(["ADMIN", "MENTOR"]).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    course: z.string().trim().max(150).nullable().optional(),
    semester: z.string().trim().max(30).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const listUsersQuerySchema = z.object({
  role: z.enum(["ADMIN", "MENTOR", "STUDENT"]).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  search: z.string().trim().max(150).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;

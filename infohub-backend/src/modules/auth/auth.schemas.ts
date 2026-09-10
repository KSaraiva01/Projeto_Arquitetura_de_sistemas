import { z } from "zod";

/**
 * Política de senha do InfoHub: mínimo de 8 caracteres com letra e número.
 * Curta o suficiente para os alunos não se irritarem, longa o suficiente
 * para não cair em ataque de dicionário trivial.
 */
export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter no mínimo 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.")
  .regex(/[A-Za-zÀ-ÿ]/, "A senha precisa conter ao menos uma letra.")
  .regex(/\d/, "A senha precisa conter ao menos um número.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido.")
  .max(255);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token de redefinição ausente."),
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe sua senha atual."),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "A nova senha precisa ser diferente da atual.",
    path: ["newPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

import { z } from "zod";

/**
 * Política de senha: mínimo de 8 caracteres com letra e número. Curta o
 * bastante para os alunos não se irritarem, longa o bastante para não cair
 * em ataque de dicionário trivial.
 */
export const senhaSchema = z
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
  .max(160);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
  /** "Lembrar-me": sem ele, o cookie da sessão some quando o navegador fecha. */
  rememberMe: z.boolean().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Serve para ativação de conta (RF-02) e recuperação (RF-01): mesmo fluxo.
 * `lgpdConsent` é exigido de quem ainda não aceitou a política de
 * privacidade — o colega cadastrado pelo líder, na ativação (RNF-02).
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token ausente."),
  password: senhaSchema,
  lgpdConsent: z.boolean().optional(),
});

/** Validação do e-mail: o token vem do link `/confirmar-email?token=…`. */
export const confirmEmailSchema = z.object({
  token: z.string().min(1, "Token ausente."),
});

export const resendConfirmationSchema = z.object({
  email: emailSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe sua senha atual."),
    newPassword: senhaSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "A nova senha precisa ser diferente da atual.",
    path: ["newPassword"],
  });

/** RNF-02 — o próprio usuário pede a exclusão da conta confirmando a senha. */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Confirme sua senha para excluir a conta."),
});

/** RF-21 — preferências de notificação do próprio usuário. */
export const notificationPreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        type: z.enum([
          "NOVA_TAREFA",
          "PRAZO_PROXIMO",
          "PRAZO_VENCIDO",
          "TAREFA_ATRASADA",
          "ENTREGA_RECEBIDA",
          "ENTREGA_AVALIADA",
          "LEMBRETE_MANUAL",
          "NOVO_CADASTRO",
        ]),
        enabled: z.boolean(),
      }),
    )
    .min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ConfirmEmailInput = z.infer<typeof confirmEmailSchema>;
export type ResendConfirmationInput = z.infer<typeof resendConfirmationSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;

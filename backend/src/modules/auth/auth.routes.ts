import { Router } from "express";
import { autenticar } from "../../shared/middlewares/autenticar";
import { limiteLogin, limiteSenha } from "../../shared/middlewares/rate-limit";
import { validarBody } from "../../shared/middlewares/validar";
import * as controller from "./auth.controller";
import {
  changePasswordSchema,
  confirmEmailSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  notificationPreferencesSchema,
  refreshSchema,
  resendConfirmationSchema,
  resetPasswordSchema,
} from "./auth.schemas";

/**
 * RF-01 (login, recuperação), RF-02 (ativação por token), confirmação do
 * e-mail, RNF-02 (exclusão da própria conta) e RF-21 (preferências).
 * Prefixo: /api/auth
 */
export const authRouter = Router();

authRouter.post("/login", limiteLogin, validarBody(loginSchema), controller.login);
authRouter.post("/refresh", validarBody(refreshSchema), controller.refresh);
authRouter.post("/logout", validarBody(refreshSchema), controller.logout);
authRouter.get("/me", autenticar, controller.me);

authRouter.post("/forgot-password", limiteSenha, validarBody(forgotPasswordSchema), controller.forgotPassword);
authRouter.post("/reset-password", limiteSenha, validarBody(resetPasswordSchema), controller.resetPassword);
authRouter.post("/change-password", autenticar, validarBody(changePasswordSchema), controller.changePassword);

// O token do link não dá para adivinhar: basta o limite global. Já o reenvio dispara e-mail.
authRouter.post("/confirm-email", validarBody(confirmEmailSchema), controller.confirmEmail);
authRouter.post("/resend-confirmation", limiteSenha, validarBody(resendConfirmationSchema), controller.resendConfirmation);

authRouter.delete("/me", autenticar, validarBody(deleteAccountSchema), controller.deleteAccount);

authRouter.get("/me/notification-preferences", autenticar, controller.getPreferences);
authRouter.put(
  "/me/notification-preferences",
  autenticar,
  validarBody(notificationPreferencesSchema),
  controller.updatePreferences,
);

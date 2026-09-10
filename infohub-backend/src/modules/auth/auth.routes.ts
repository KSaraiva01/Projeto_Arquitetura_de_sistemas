import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import {
  loginLimiter,
  passwordResetLimiter,
} from "../../shared/middlewares/rateLimit.js";
import { validateBody } from "../../shared/middlewares/validate.js";
import * as controller from "./auth.controller.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resetPasswordSchema,
} from "./auth.schemas.js";

/**
 * RF-01 — autenticação e recuperação de senha.
 * Prefixo: /api/auth
 */
export const authRouter = Router();

authRouter.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  controller.login,
);

authRouter.post(
  "/refresh",
  validateBody(refreshSchema),
  controller.refresh,
);

authRouter.post("/logout", validateBody(refreshSchema), controller.logout);

authRouter.get("/me", authenticate, controller.me);

authRouter.post(
  "/forgot-password",
  passwordResetLimiter,
  validateBody(forgotPasswordSchema),
  controller.forgotPassword,
);

authRouter.post(
  "/reset-password",
  passwordResetLimiter,
  validateBody(resetPasswordSchema),
  controller.resetPassword,
);

authRouter.post(
  "/change-password",
  authenticate,
  validateBody(changePasswordSchema),
  controller.changePassword,
);

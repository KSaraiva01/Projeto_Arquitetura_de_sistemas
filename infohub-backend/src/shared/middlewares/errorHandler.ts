import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../../config/env.js";
import { AppError, NotFoundError } from "../errors/AppError.js";

/** Códigos de erro do PostgreSQL que sabemos traduzir para o cliente. */
const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";
const PG_CHECK_VIOLATION = "23514";

function isPgError(error: unknown): error is { code: string; detail?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Rota não encontrada: ${req.method} ${req.originalUrl}`));
};

/**
 * Handler de erros da aplicação — precisa ser o ÚLTIMO middleware registrado.
 * Erros esperados viram respostas específicas; qualquer outra coisa vira 500
 * com a mensagem genérica, e o stack fica só no log do servidor.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Alguns campos estão inválidos.",
        fields: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  if (isPgError(error)) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      res.status(409).json({
        error: {
          code: "DUPLICATE_RECORD",
          message: "Já existe um registro com esses dados.",
        },
      });
      return;
    }

    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      res.status(409).json({
        error: {
          code: "RELATED_RECORD_MISSING",
          message: "O registro referenciado não existe ou está em uso.",
        },
      });
      return;
    }

    if (error.code === PG_CHECK_VIOLATION) {
      res.status(422).json({
        error: {
          code: "CONSTRAINT_VIOLATION",
          message: "Os dados enviados violam uma regra do banco de dados.",
        },
      });
      return;
    }
  }

  console.error(`[erro] ${req.method} ${req.originalUrl}`, error);

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Erro interno no servidor. Tente novamente em instantes.",
      ...(env.isProduction
        ? {}
        : { debug: error instanceof Error ? error.message : String(error) }),
    },
  });
};

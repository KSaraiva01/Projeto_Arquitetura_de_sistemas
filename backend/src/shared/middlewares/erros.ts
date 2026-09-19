import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { env } from "../../config/env";
import { Prisma } from "../../generated/prisma/client";
import { AppError, NotFoundError } from "../errors";

export const rotaNaoEncontrada: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Rota não encontrada: ${req.method} ${req.originalUrl}`, "ROUTE_NOT_FOUND"));
};

/**
 * Handler de erros da API — precisa ser o ÚLTIMO middleware do /api.
 *
 * Envelope único, o mesmo que o frontend já interpreta:
 *   { error: { code, message, details?, fields? } }
 *
 * Erros esperados viram respostas específicas; qualquer outra coisa vira 500
 * com mensagem genérica (o stack fica só no log do servidor).
 */
export const tratarErros: ErrorRequestHandler = (error, req, res, _next) => {
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
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    const limite = error.code === "LIMIT_FILE_SIZE" || error.code === "LIMIT_FILE_COUNT";
    res.status(limite ? 413 : 400).json({
      error: {
        code: `UPLOAD_${error.code}`,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? `Cada arquivo pode ter no máximo ${env.UPLOAD_MAX_MB} MB.`
            : error.code === "LIMIT_FILE_COUNT"
              ? `Envie no máximo ${env.UPLOAD_MAX_FILES} arquivos por vez.`
              : "Não foi possível receber o arquivo enviado.",
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({
        error: { code: "DUPLICATE_RECORD", message: "Já existe um registro com esses dados." },
      });
      return;
    }
    if (error.code === "P2003") {
      res.status(409).json({
        error: {
          code: "RELATED_RECORD_MISSING",
          message: "O registro referenciado não existe ou ainda está em uso.",
        },
      });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({
        error: { code: "NOT_FOUND", message: "Registro não encontrado." },
      });
      return;
    }
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({
      error: { code: "INVALID_JSON", message: "O corpo da requisição não é um JSON válido." },
    });
    return;
  }

  console.error(`[erro] ${req.method} ${req.originalUrl}`, error);

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Erro interno no servidor. Tente novamente em instantes.",
      ...(env.isProduction ? {} : { debug: error instanceof Error ? error.message : String(error) }),
    },
  });
};

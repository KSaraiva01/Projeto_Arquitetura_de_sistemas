/**
 * Erro de negócio previsto pela aplicação.
 *
 * Diferente de um erro inesperado (bug, banco fora do ar), um AppError é
 * seguro para mostrar ao cliente: a mensagem foi escrita pensando no usuário
 * e o `code` permite que o frontend trate o caso sem depender do texto.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 400,
    code = "APP_ERROR",
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code = "BAD_REQUEST", details?: unknown) {
    super(message, 400, code, details);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Credenciais inválidas.", code = "UNAUTHORIZED") {
    super(message, 401, code);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = "Você não tem permissão para acessar este recurso.",
    code = "FORBIDDEN",
  ) {
    super(message, 403, code);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado.", code = "NOT_FOUND") {
    super(message, 404, code);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = "CONFLICT", details?: unknown) {
    super(message, 409, code, details);
    this.name = "ConflictError";
  }
}

import type { Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";

/**
 * Validação de entrada com Zod.
 *
 * `req.body` recebe o dado já convertido pelo schema (strings viram números,
 * campos desconhecidos somem). `req.query` e `req.params` são somente-leitura
 * no Express 5, então o resultado vai para `res.locals` e é lido com
 * `getQuery`/`getParams`.
 */
export function validarBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validarQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(result.error);
      return;
    }
    res.locals.query = result.data;
    next();
  };
}

export function validarParams<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(result.error);
      return;
    }
    res.locals.params = result.data;
    next();
  };
}

export function getQuery<T>(res: Response): T {
  return res.locals.query as T;
}

export function getParams<T>(res: Response): T {
  return res.locals.params as T;
}

export function getBody<T>(req: Request): T {
  return req.body as T;
}

/** IP e user-agent da requisição, para auditoria e sessões. */
export function contextoDe(req: Request) {
  return {
    ip: req.ip ?? null,
    userAgent: req.get("user-agent")?.slice(0, 255) ?? null,
  };
}

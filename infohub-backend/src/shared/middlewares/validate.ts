import type { Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";

/**
 * Validação de entrada com Zod.
 *
 * `req.body` é gravável e recebe o dado já convertido pelo schema (datas
 * viram Date, números viram number, campos desconhecidos somem). Já
 * `req.query` e `req.params` são somente-leitura no Express 5, então o
 * resultado vai para `res.locals` e é lido pelos helpers `getQuery`/`getParams`.
 */

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
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

export function validateParams<T>(schema: ZodType<T>): RequestHandler {
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

/** Lê a query string já validada. Só use após `validateQuery` na mesma rota. */
export function getQuery<T>(res: Response): T {
  return res.locals.query as T;
}

/** Lê os params já validados. Só use após `validateParams` na mesma rota. */
export function getParams<T>(res: Response): T {
  return res.locals.params as T;
}

/** Lê o corpo já validado com o tipo do schema aplicado na rota. */
export function getBody<T>(req: Request): T {
  return req.body as T;
}

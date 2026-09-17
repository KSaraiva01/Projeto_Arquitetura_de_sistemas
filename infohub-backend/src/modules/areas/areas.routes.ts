import { Router } from "express";
import { query } from "../../config/database.js";

/**
 * RF-04 — áreas/setores da ideia, para o select do formulário inicial.
 * Prefixo: /api/areas — público, porque o formulário é público.
 */
export const areasRouter = Router();

areasRouter.get("/", async (_req, res) => {
  const result = await query<{ id: string; nome: string }>(
    `SELECT id, nome FROM area_ideia WHERE ativa ORDER BY nome`,
  );

  res.status(200).json({
    data: result.rows.map((row) => ({ id: row.id, name: row.nome })),
  });
});

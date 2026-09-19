import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

/** Cliente normal ou transacional — o registro entra na mesma transação da ação. */
export type Db = Prisma.TransactionClient | typeof prisma;

export interface RegistroAuditoriaInput {
  /** Nulo = ação do sistema (job). */
  usuarioId?: string | null;
  /** Ex.: EQUIPE_ETAPA_ALTERADA, TAREFA_AVALIADA, EMAIL_ENVIADO. */
  acao: string;
  entidade: "usuario" | "equipe" | "tarefa" | "entrega" | "notificacao" | "sessao";
  entidadeId?: string | null;
  detalhes?: Record<string, unknown>;
  ip?: string | null;
}

/**
 * RNF-05 — trilha de auditoria. Chamado dentro da transação da operação
 * (passando `db = tx`) para o registro nunca existir sem a ação, nem a ação
 * sem o registro.
 */
export async function registrarAuditoria(input: RegistroAuditoriaInput, db: Db = prisma) {
  await db.registroAuditoria.create({
    data: {
      usuarioId: input.usuarioId ?? null,
      acao: input.acao,
      entidade: input.entidade,
      entidadeId: input.entidadeId ?? null,
      detalhes: (input.detalhes ?? undefined) as Prisma.InputJsonValue | undefined,
      ip: input.ip ?? null,
    },
  });
}

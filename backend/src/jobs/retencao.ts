import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { UM_DIA_MS } from "../shared/datas";

export interface RelatorioRetencao {
  sessoes: number;
  tokens: number;
  notificacoes: number;
  registrosAcesso: number;
}

/** Ações da auditoria que só registram acesso — guardam IP e, no login falho, o e-mail digitado. */
const ACOES_DE_ACESSO = ["LOGIN", "LOGIN_FALHOU", "LOGOUT", "SESSAO_REUTILIZADA"];

/** Data de corte para "mais de N dias atrás"; 0 = aquela limpeza está desligada. */
function corte(dias: number): Date | null {
  return dias > 0 ? new Date(Date.now() - dias * UM_DIA_MS) : null;
}

/**
 * RNF-02 — política de retenção (docs/lgpd.md). Apaga o que já cumpriu a
 * finalidade:
 *
 *  - sessões expiradas ou encerradas há mais de RETENTION_SESSIONS_DAYS
 *    (guardam IP e navegador);
 *  - links de e-mail (ativação, recuperação, confirmação) usados ou vencidos
 *    há mais de RETENTION_TOKENS_DAYS;
 *  - e-mails enviados — ou que desistiram de reenviar — há mais de
 *    RETENTION_NOTIFICATIONS_DAYS (endereço e conteúdo);
 *  - registros de acesso (login/logout) há mais de RETENTION_ACCESS_LOG_DAYS.
 *
 * O histórico de negócio (etapas, tarefas, entregas, avaliações) fica enquanto
 * a equipe existir: é a trilha de auditoria do RNF-05. E-mail que ainda vai
 * ser (re)enviado nunca é apagado aqui.
 */
export async function aplicarRetencao(): Promise<RelatorioRetencao> {
  const sessoesAte = corte(env.RETENTION_SESSIONS_DAYS);
  const tokensAte = corte(env.RETENTION_TOKENS_DAYS);
  const notificacoesAte = corte(env.RETENTION_NOTIFICATIONS_DAYS);
  const acessoAte = corte(env.RETENTION_ACCESS_LOG_DAYS);

  const [sessoes, tokens, notificacoes, registrosAcesso] = await Promise.all([
    sessoesAte
      ? prisma.sessao.deleteMany({ where: { OR: [{ expiraEm: { lt: sessoesAte } }, { revogadaEm: { lt: sessoesAte } }] } })
      : { count: 0 },
    tokensAte
      ? prisma.tokenUsuario.deleteMany({ where: { OR: [{ usadoEm: { lt: tokensAte } }, { expiraEm: { lt: tokensAte } }] } })
      : { count: 0 },
    notificacoesAte
      ? prisma.notificacao.deleteMany({
          where: {
            criadoEm: { lt: notificacoesAte },
            OR: [{ status: "ENVIADA" }, { status: "FALHOU", proximoEnvioEm: null }],
          },
        })
      : { count: 0 },
    acessoAte
      ? prisma.registroAuditoria.deleteMany({ where: { acao: { in: ACOES_DE_ACESSO }, criadoEm: { lt: acessoAte } } })
      : { count: 0 },
  ]);

  return {
    sessoes: sessoes.count,
    tokens: tokens.count,
    notificacoes: notificacoes.count,
    registrosAcesso: registrosAcesso.count,
  };
}

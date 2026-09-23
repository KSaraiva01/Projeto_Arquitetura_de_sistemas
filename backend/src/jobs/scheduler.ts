import { env } from "../config/env";
import { UM_DIA_MS } from "../shared/datas";
import { prisma } from "../lib/prisma";
import { registrarAuditoria } from "../shared/auditoria";
import { emailPrazoProximo, emailPrazoVencido, emailTarefaAtrasada } from "../shared/email/templates";
import {
  destinatariosAcompanhamento,
  destinatariosDaEquipe,
  enfileirarParaTodos,
  processarFila,
} from "../modules/notificacoes/notificacoes.service";
import { backupSeNecessario, type ResultadoBackup } from "./backup";
import { aplicarRetencao, type RelatorioRetencao } from "./retencao";

export interface RelatorioJobs {
  tarefasAtrasadas: number;
  lembretesEnfileirados: number;
  avisosAtrasoEnfileirados: number;
  emailsEnviados: number;
  emailsComFalha: number;
  /** Só quando a limpeza da retenção rodou nesta execução (uma vez por dia). */
  retencao: RelatorioRetencao | null;
  /** Só quando um backup foi gerado nesta execução. */
  backup: ResultadoBackup | null;
}

/** A retenção roda no máximo uma vez por dia por processo — não precisa mais que isso. */
let ultimaRetencao = 0;

/**
 * Rotina agendada do InfoHub (nota da RN-04: "criar um job para enviar um
 * lembrete"). Roda na subida do servidor e a cada JOBS_INTERVAL_MINUTES:
 *
 *  1. RN-04 — tarefas vencidas sem entrega viram ATRASADA e geram UM aviso
 *     por integrante (PRAZO_VENCIDO) e por quem acompanha (TAREFA_ATRASADA);
 *  2. RF-17 — lembretes cuja hora chegou viram e-mails PRAZO_PROXIMO e são
 *     marcados com `enviado_em`, para nunca saírem duas vezes;
 *  3. RNF-06 — a fila de e-mails é processada (inclusive reenvios);
 *  4. RNF-02 — uma vez por dia, a política de retenção apaga o que venceu;
 *  5. RNF-07 — o backup, quando o último tem mais de BACKUP_INTERVAL_HOURS.
 *
 * As chaves de idempotência das notificações garantem que rodar o job de
 * novo (ou dois servidores ao mesmo tempo) não duplica nenhum e-mail.
 */
export async function executarJobs(): Promise<RelatorioJobs> {
  const relatorio: RelatorioJobs = {
    tarefasAtrasadas: 0,
    lembretesEnfileirados: 0,
    avisosAtrasoEnfileirados: 0,
    emailsEnviados: 0,
    emailsComFalha: 0,
    retencao: null,
    backup: null,
  };
  const agora = new Date();

  // 1. Tarefas vencidas sem entrega (pendentes/em andamento) → ATRASADA
  const vencidas = await prisma.tarefa.findMany({
    where: { status: { in: ["PENDENTE", "EM_ANDAMENTO"] }, prazo: { lt: agora }, equipe: { excluidaEm: null } },
    include: { equipe: { select: { id: true, nome: true } } },
  });

  for (const tarefa of vencidas) {
    await prisma.$transaction(async (tx) => {
      await tx.tarefa.update({ where: { id: tarefa.id }, data: { status: "ATRASADA" } });

      relatorio.avisosAtrasoEnfileirados += await enfileirarParaTodos(
        await destinatariosDaEquipe(tarefa.equipeId, tx),
        (pessoa) => ({
          tipo: "PRAZO_VENCIDO",
          modelo: emailPrazoVencido(pessoa.nome, tarefa.equipe.nome, tarefa.titulo, tarefa.prazo),
          chave: `PRAZO_VENCIDO:tarefa:${tarefa.id}:prazo:${tarefa.prazo.getTime()}:usuario:${pessoa.id}`,
          equipeId: tarefa.equipeId,
          tarefaId: tarefa.id,
        }),
        tx,
      );
      relatorio.avisosAtrasoEnfileirados += await enfileirarParaTodos(
        await destinatariosAcompanhamento(tarefa.equipeId, tx),
        (pessoa) => ({
          tipo: "TAREFA_ATRASADA",
          modelo: emailTarefaAtrasada(pessoa.nome, tarefa.equipe.nome, tarefa.titulo, tarefa.prazo, tarefa.equipeId, pessoa.perfil),
          chave: `TAREFA_ATRASADA:tarefa:${tarefa.id}:prazo:${tarefa.prazo.getTime()}:usuario:${pessoa.id}`,
          equipeId: tarefa.equipeId,
          tarefaId: tarefa.id,
        }),
        tx,
      );

      await registrarAuditoria(
        { acao: "TAREFA_MARCADA_ATRASADA", entidade: "tarefa", entidadeId: tarefa.id, detalhes: { prazo: tarefa.prazo, equipeId: tarefa.equipeId } },
        tx,
      );
    });
    relatorio.tarefasAtrasadas += 1;
  }

  // 2. Lembretes cuja hora chegou (só de tarefas ainda abertas). Vários vencendo
  // juntos para a mesma tarefa (ex.: o prazo foi antecipado) viram UM e-mail.
  const lembretes = await prisma.lembreteTarefa.findMany({
    where: {
      enviadoEm: null,
      lembrarEm: { lte: agora },
      tarefa: { status: { in: ["PENDENTE", "EM_ANDAMENTO", "REPROVADA"] }, equipe: { excluidaEm: null } },
    },
    include: { tarefa: { include: { equipe: { select: { id: true, nome: true } } } } },
    orderBy: { lembrarEm: "desc" },
  });

  const porTarefa = new Map<string, typeof lembretes>();
  for (const lembrete of lembretes) {
    porTarefa.set(lembrete.tarefaId, [...(porTarefa.get(lembrete.tarefaId) ?? []), lembrete]);
  }

  for (const grupo of porTarefa.values()) {
    const lembrete = grupo[0]!; // o mais perto do prazo
    const { tarefa } = lembrete;
    // "Em N dias" contado a partir de agora: se o job rodar atrasado, o texto continua certo.
    const diasRestantes = Math.max(0, Math.ceil((tarefa.prazo.getTime() - agora.getTime()) / UM_DIA_MS));
    await prisma.$transaction(async (tx) => {
      relatorio.lembretesEnfileirados += await enfileirarParaTodos(
        await destinatariosDaEquipe(tarefa.equipeId, tx),
        (pessoa) => ({
          tipo: "PRAZO_PROXIMO",
          modelo: emailPrazoProximo(pessoa.nome, tarefa.equipe.nome, tarefa.titulo, tarefa.prazo, diasRestantes),
          // O prazo entra na chave: se o mentor adiar a entrega, o lembrete reativado sai de novo.
          chave: `PRAZO_PROXIMO:lembrete:${lembrete.id}:prazo:${tarefa.prazo.getTime()}:usuario:${pessoa.id}`,
          equipeId: tarefa.equipeId,
          tarefaId: tarefa.id,
        }),
        tx,
      );
      await tx.lembreteTarefa.updateMany({ where: { id: { in: grupo.map((l) => l.id) } }, data: { enviadoEm: agora } });
    });
  }

  // 3. Fila de e-mails (novos + reenvios)
  const envio = await processarFila(200);
  relatorio.emailsEnviados = envio.enviadas;
  relatorio.emailsComFalha = envio.falhas;

  // 4 e 5 não podem derrubar o resto da rotina: uma falha aqui (disco cheio,
  // pasta sem permissão) fica no log e é tentada de novo na próxima execução.
  if (agora.getTime() - ultimaRetencao >= UM_DIA_MS) {
    try {
      relatorio.retencao = await aplicarRetencao();
      ultimaRetencao = agora.getTime();
    } catch (error) {
      console.error("[jobs] falha na limpeza da retenção:", error);
    }
  }

  try {
    relatorio.backup = await backupSeNecessario();
  } catch (error) {
    console.error("[jobs] falha no backup:", error);
  }

  return relatorio;
}

let executando = false;

async function tick() {
  if (executando) return; // uma execução por vez, mesmo que a anterior demore
  executando = true;
  try {
    const r = await executarJobs();
    if (r.tarefasAtrasadas || r.lembretesEnfileirados || r.avisosAtrasoEnfileirados || r.emailsEnviados || r.emailsComFalha) {
      console.log(
        `[jobs] atrasadas: ${r.tarefasAtrasadas} | lembretes: ${r.lembretesEnfileirados} | avisos de atraso: ${r.avisosAtrasoEnfileirados} | e-mails: ${r.emailsEnviados} enviados, ${r.emailsComFalha} com falha`,
      );
    }
    const limpos = r.retencao ? Object.values(r.retencao).reduce((soma, n) => soma + n, 0) : 0;
    if (r.retencao && limpos) {
      console.log(
        `[jobs] retenção: ${r.retencao.sessoes} sessões, ${r.retencao.tokens} links, ${r.retencao.notificacoes} e-mails e ${r.retencao.registrosAcesso} registros de acesso apagados`,
      );
    }
    if (r.backup) {
      console.log(`[jobs] backup: ${r.backup.arquivo} (${r.backup.linhas} registros, ${r.backup.arquivosCopiados} arquivo(s) novo(s))`);
    }
  } catch (error) {
    console.error("[jobs] falha na rotina agendada:", error);
  } finally {
    executando = false;
  }
}

/** Liga a rotina. Devolve a função que a desliga (usada no encerramento). */
export function iniciarScheduler(): () => void {
  if (!env.jobsEnabled) {
    console.log("[jobs] rotina desligada (JOBS_ENABLED=false).");
    return () => {};
  }

  // Primeira execução um pouco depois da subida, para não competir com o boot.
  const inicial = setTimeout(() => void tick(), 5_000);
  const timer = setInterval(() => void tick(), env.JOBS_INTERVAL_MINUTES * 60 * 1000);
  inicial.unref();
  timer.unref();
  console.log(`[jobs] rotina ligada — a cada ${env.JOBS_INTERVAL_MINUTES} min.`);

  return () => {
    clearTimeout(inicial);
    clearInterval(timer);
  };
}

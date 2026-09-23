import { env } from "../../config/env";
import { Prisma, type Perfil, type TipoNotificacao } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import type { Db } from "../../shared/auditoria";
import { FalhaEnvioEmail, entregarEmail } from "../../shared/email/mailer";
import type { ModeloEmail } from "../../shared/email/templates";

/**
 * Fila de e-mails (padrão "outbox") — RF-18, RF-19, RF-20, RNF-06.
 *
 * Toda notificação é primeiro GRAVADA em `notificacoes` (dentro da transação
 * da ação que a originou, quando houver) e só depois enviada. Assim:
 *
 *  - a tabela responde "isso já foi enviado?" — a `chave_idempotencia` é
 *    única, então o mesmo aviso nunca entra duas vezes (nota das RF-18/19);
 *  - se o servidor de e-mail estiver fora, o registro fica PENDENTE/FALHOU e o
 *    job reenvia com espera crescente (RNF-06). Falha permanente (endereço
 *    inválido, domínio não verificado na Resend) não é repetida;
 *  - cada envio leva a chave `notificacao/<id>`: a Resend descarta a
 *    repetição de um envio que ela já tinha aceitado (ex.: após um timeout);
 *  - a própria tabela é o registro de auditoria dos envios (RNF-05).
 */

export interface Destinatario {
  id: string | null;
  email: string;
  nome: string;
  /** Define para qual área do sistema apontam os links do e-mail (admin ou mentor). */
  perfil?: Perfil;
}

export interface EnfileirarInput {
  tipo: TipoNotificacao;
  destinatario: Destinatario;
  modelo: ModeloEmail;
  /** Chave única do aviso, ex.: `PRAZO_PROXIMO:lembrete:<id>:usuario:<id>`. */
  chave?: string | null;
  equipeId?: string | null;
  tarefaId?: string | null;
}

/** E-mails de segurança da conta não respeitam opt-out (RF-21). */
const SEM_OPT_OUT = new Set<TipoNotificacao>(["ATIVACAO_CONTA", "RECUPERACAO_SENHA", "CONFIRMACAO_EMAIL"]);

/**
 * O link desses e-mails leva o token em claro — o banco só guarda o hash dele
 * (`tokens_usuario`). Depois de enviado, o registro do e-mail fica sem o
 * token, para quem lê a tabela não conseguir usar o link.
 */
function semToken(html: string): string {
  return html.replace(/token=[^"&<\s]+/g, "token=[removido]");
}

/**
 * Grava a notificação. Devolve o id, ou `null` quando ela já existia (mesma
 * chave) ou o destinatário desligou esse tipo de aviso.
 */
export async function enfileirar(input: EnfileirarInput, db: Db = prisma): Promise<string | null> {
  if (input.destinatario.id && !SEM_OPT_OUT.has(input.tipo)) {
    const preferencia = await db.preferenciaNotificacao.findUnique({
      where: { usuarioId_tipo: { usuarioId: input.destinatario.id, tipo: input.tipo } },
      select: { ativo: true },
    });
    if (preferencia && !preferencia.ativo) return null;
  }

  if (input.chave) {
    const existente = await db.notificacao.findUnique({
      where: { chaveIdempotencia: input.chave },
      select: { id: true },
    });
    if (existente) return null;
  }

  try {
    const criada = await db.notificacao.create({
      data: {
        tipo: input.tipo,
        destinatarioId: input.destinatario.id,
        emailDestino: input.destinatario.email,
        assunto: input.modelo.assunto,
        corpo: input.modelo.html,
        chaveIdempotencia: input.chave ?? null,
        equipeId: input.equipeId ?? null,
        tarefaId: input.tarefaId ?? null,
      },
      select: { id: true },
    });
    return criada.id;
  } catch (error) {
    // Duas requisições simultâneas com a mesma chave: a segunda perde, e tudo bem.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return null;
    }
    throw error;
  }
}

/** Mesmo aviso para vários destinatários (uma chave por pessoa). */
export async function enfileirarParaTodos(
  destinatarios: Destinatario[],
  montar: (destinatario: Destinatario) => Omit<EnfileirarInput, "destinatario">,
  db: Db = prisma,
): Promise<number> {
  let criadas = 0;
  for (const destinatario of destinatarios) {
    const id = await enfileirar({ ...montar(destinatario), destinatario }, db);
    if (id) criadas += 1;
  }
  return criadas;
}

// ---------------------------------------------------------------------------
// Destinatários
// ---------------------------------------------------------------------------

const selecaoUsuario = { id: true, email: true, nome: true, perfil: true } as const;

/** Integrantes ativos da equipe (líder incluso). */
export async function destinatariosDaEquipe(equipeId: string, db: Db = prisma): Promise<Destinatario[]> {
  const integrantes = await db.integranteEquipe.findMany({
    where: { equipeId, saiuEm: null, usuario: { ativo: true, excluidoEm: null } },
    select: { usuario: { select: selecaoUsuario } },
  });
  return integrantes.map((i) => i.usuario);
}

/** Mentores da equipe + administradores ativos (quem acompanha a equipe). */
export async function destinatariosAcompanhamento(equipeId: string, db: Db = prisma): Promise<Destinatario[]> {
  const [mentores, admins] = await Promise.all([
    db.mentorEquipe.findMany({
      where: { equipeId, mentor: { ativo: true, excluidoEm: null } },
      select: { mentor: { select: selecaoUsuario } },
    }),
    destinatariosAdmins(db),
  ]);
  const vistos = new Set<string>();
  const todos: Destinatario[] = [];
  for (const pessoa of [...mentores.map((m) => m.mentor), ...admins]) {
    if (!vistos.has(pessoa.email)) {
      vistos.add(pessoa.email);
      todos.push(pessoa);
    }
  }
  return todos;
}

export async function destinatariosAdmins(db: Db = prisma): Promise<Destinatario[]> {
  return db.usuario.findMany({
    where: { perfil: "ADMIN", ativo: true, excluidoEm: null },
    select: selecaoUsuario,
  });
}

// ---------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------

export interface RelatorioEnvio {
  enviadas: number;
  falhas: number;
}

const CINCO_MINUTOS = 5 * 60 * 1000;
const SEIS_HORAS = 6 * 60 * 60 * 1000;

/** Espera crescente entre tentativas: 5 min, 10, 20, 40… até 6 h. */
function proximaTentativa(tentativas: number): Date {
  const espera = Math.min(CINCO_MINUTOS * 2 ** Math.max(tentativas - 1, 0), SEIS_HORAS);
  return new Date(Date.now() + espera);
}

let processando = false;

/**
 * Envia o que está na fila: PENDENTE, ou FALHOU cuja hora de reenvio chegou
 * e ainda não estourou MAIL_MAX_ATTEMPTS. Uma execução por vez no processo.
 */
export async function processarFila(limite = 50): Promise<RelatorioEnvio> {
  const relatorio: RelatorioEnvio = { enviadas: 0, falhas: 0 };
  if (processando) return relatorio;
  processando = true;

  try {
    const agora = new Date();
    const pendentes = await prisma.notificacao.findMany({
      where: {
        OR: [
          { status: "PENDENTE" },
          {
            status: "FALHOU",
            tentativas: { lt: env.MAIL_MAX_ATTEMPTS },
            proximoEnvioEm: { lte: agora },
          },
        ],
      },
      orderBy: { criadoEm: "asc" },
      take: limite,
    });

    for (const notificacao of pendentes) {
      try {
        const { idMensagem } = await entregarEmail({
          para: notificacao.emailDestino,
          assunto: notificacao.assunto,
          html: notificacao.corpo,
          chave: `notificacao/${notificacao.id}`,
          categoria: notificacao.tipo,
        });
        await prisma.notificacao.update({
          where: { id: notificacao.id },
          data: {
            status: "ENVIADA",
            enviadaEm: new Date(),
            tentativas: { increment: 1 },
            proximoEnvioEm: null,
            idMensagemProvedor: idMensagem,
            erro: null,
            ...(SEM_OPT_OUT.has(notificacao.tipo) ? { corpo: semToken(notificacao.corpo) } : {}),
          },
        });
        relatorio.enviadas += 1;
      } catch (error) {
        const tentativas = notificacao.tentativas + 1;
        const permanente = error instanceof FalhaEnvioEmail && error.permanente;
        const esgotou = permanente || tentativas >= env.MAIL_MAX_ATTEMPTS;
        await prisma.notificacao.update({
          where: { id: notificacao.id },
          data: {
            status: "FALHOU",
            tentativas,
            erro: (error instanceof Error ? error.message : String(error)).slice(0, 2000),
            proximoEnvioEm: esgotou ? null : proximaTentativa(tentativas),
            // Desistiu de reenviar: o link com o token não vai mais ser usado a partir daqui.
            ...(esgotou && SEM_OPT_OUT.has(notificacao.tipo) ? { corpo: semToken(notificacao.corpo) } : {}),
          },
        });
        relatorio.falhas += 1;
        console.error(
          `[email] falha ao enviar "${notificacao.assunto}" para ${notificacao.emailDestino} (tentativa ${tentativas}${permanente ? ", falha permanente — não será reenviado" : esgotou ? ", desistindo" : ""}):`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  } finally {
    processando = false;
  }

  return relatorio;
}

/**
 * Dispara o envio sem segurar a resposta HTTP. Falhas ficam registradas na
 * tabela e o job tenta de novo — um e-mail que não sai nunca desfaz a ação
 * que o originou.
 */
export function processarFilaEmSegundoPlano(): void {
  setImmediate(() => {
    processarFila().catch((error) => console.error("[email] erro ao processar a fila:", error));
  });
}

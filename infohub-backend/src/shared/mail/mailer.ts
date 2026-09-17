import { env } from "../../config/env.js";
import { query } from "../../config/database.js";
import type { NotificationType } from "../types/domain.js";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: NotificationType;
  recipientId?: string | null;
  teamId?: string | null;
  taskId?: string | null;
  /** RF-17: id do lembrete — garante que ele vá uma única vez por destinatário. */
  reminderId?: string | null;
}

interface DeliveryResult {
  providerId: string | null;
}

/**
 * Envio transacional (RF-18, RNF-06).
 *
 * Todo envio é registrado em `notificacao` antes de sair, e o registro é
 * atualizado com SENT ou FAILED depois. Os índices únicos parciais da tabela
 * (lembrete + destinatário; atraso + tarefa + destinatário) fazem o INSERT
 * cair no `ON CONFLICT DO NOTHING` quando o mesmo e-mail já foi registrado —
 * e aí nada é enviado. É assim que o sistema "sabe o que já notificou".
 *
 * Devolve `true` quando o e-mail foi de fato disparado e `false` quando foi
 * pulado por já existir.
 */
export async function sendMail(input: SendMailInput): Promise<boolean> {
  const logId = await createLogEntry(input);

  if (!logId) {
    return false;
  }

  try {
    await deliver(input);

    await query(
      `UPDATE notificacao
          SET status = 'SENT', enviado_em = NOW(), tentativas = tentativas + 1
        WHERE id = $1`,
      [logId],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await query(
      `UPDATE notificacao
          SET status = 'FAILED', tentativas = tentativas + 1, erro = $2
        WHERE id = $1`,
      [logId, message],
    );

    // Um e-mail que não sai não pode derrubar a operação que o disparou
    // (ex.: criar um usuário). O registro guarda a falha para reprocessamento.
    console.error(`[mail] falha ao enviar "${input.subject}" para ${input.to}:`, message);
  }

  return true;
}

async function createLogEntry(input: SendMailInput): Promise<string | null> {
  const result = await query<{ id: string }>(
    `INSERT INTO notificacao
       (destinatario_id, email_destino, tipo, assunto, equipe_id, tarefa_id, lembrete_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [
      input.recipientId ?? null,
      input.to,
      input.type,
      input.subject,
      input.teamId ?? null,
      input.taskId ?? null,
      input.reminderId ?? null,
    ],
  );

  return result.rows[0]?.id ?? null;
}

async function deliver(input: SendMailInput): Promise<DeliveryResult> {
  if (env.MAIL_DRIVER === "console") {
    console.info(
      [
        "",
        "──────────── E-MAIL (driver console) ────────────",
        `Para:     ${input.to}`,
        `Assunto:  ${input.subject}`,
        `Tipo:     ${input.type}`,
        "",
        input.text,
        "─────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { providerId: null };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend respondeu ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { id?: string };
  return { providerId: data.id ?? null };
}

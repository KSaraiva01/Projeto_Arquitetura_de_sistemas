import { env } from "../../config/env.js";
import { query } from "../../config/database.js";
import type { EmailType } from "../types/domain.js";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: EmailType;
  recipientId?: string | null;
  taskId?: string | null;
  teamId?: string | null;
}

interface DeliveryResult {
  providerId: string | null;
}

/**
 * Envio transacional (RNF-06).
 *
 * Todo envio é registrado em `email_log` antes de sair, e o log é atualizado
 * com SENT ou FAILED depois. Assim a coordenação consegue auditar o que foi
 * disparado, e uma rotina de reprocessamento pode reenviar o que falhou sem
 * precisar reconstruir o conteúdo.
 */
export async function sendMail(input: SendMailInput): Promise<void> {
  const logId = await createLogEntry(input);

  try {
    const { providerId } = await deliver(input);

    await query(
      `UPDATE email_log
          SET status = 'SENT', sent_at = NOW(), attempts = attempts + 1, provider_id = $2
        WHERE id = $1`,
      [logId, providerId],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await query(
      `UPDATE email_log
          SET status = 'FAILED', attempts = attempts + 1, error = $2
        WHERE id = $1`,
      [logId, message],
    );

    // Um e-mail que não sai não pode derrubar a operação que o disparou
    // (ex.: criar um usuário). O log guarda a falha para reprocessamento.
    console.error(`[mail] falha ao enviar "${input.subject}" para ${input.to}:`, message);
  }
}

async function createLogEntry(input: SendMailInput): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO email_log (recipient_id, recipient_email, type, subject, task_id, team_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      input.recipientId ?? null,
      input.to,
      input.type,
      input.subject,
      input.taskId ?? null,
      input.teamId ?? null,
    ],
  );

  return result.rows[0]!.id;
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

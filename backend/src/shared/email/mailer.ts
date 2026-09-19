import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env";
import { htmlParaTexto } from "./templates";

/**
 * Transporte de e-mail (RNF-06). Três drivers:
 *
 *  - console: imprime no terminal (desenvolvimento);
 *  - smtp: qualquer servidor SMTP (Google Workspace/Outlook da faculdade);
 *  - resend: API transacional (https://resend.com).
 *
 * Quem decide o que enviar e registra o resultado é o serviço de
 * notificações; aqui só se entrega a mensagem — e lança erro se falhar.
 */
export interface Mensagem {
  para: string;
  assunto: string;
  html: string;
}

let transporter: Transporter | null = null;

function smtp(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.smtpSecure,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" } : undefined,
    });
  }
  return transporter;
}

export async function entregarEmail(mensagem: Mensagem): Promise<void> {
  const texto = htmlParaTexto(mensagem.html);

  if (env.MAIL_DRIVER === "console") {
    console.info(
      [
        "",
        "──────────── E-MAIL (driver console) ────────────",
        `Para:    ${mensagem.para}`,
        `Assunto: ${mensagem.assunto}`,
        "",
        texto,
        "─────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return;
  }

  if (env.MAIL_DRIVER === "smtp") {
    await smtp().sendMail({
      from: env.MAIL_FROM,
      to: mensagem.para,
      subject: mensagem.assunto,
      html: mensagem.html,
      text: texto,
    });
    return;
  }

  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [mensagem.para],
      subject: mensagem.assunto,
      html: mensagem.html,
      text: texto,
    }),
  });

  if (!resposta.ok) {
    throw new Error(`Resend respondeu ${resposta.status}: ${await resposta.text()}`);
  }
}

import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { env } from "../../config/env";
import { htmlParaTexto } from "./templates";

/**
 * Transporte de e-mail (RNF-06). Três drivers:
 *
 *  - console: imprime no terminal (desenvolvimento);
 *  - smtp: qualquer servidor SMTP (Google Workspace/Outlook da faculdade);
 *  - resend: API transacional da Resend (https://resend.com), pelo SDK oficial.
 *
 * Quem decide o que enviar e registra o resultado é o serviço de
 * notificações; aqui só se entrega a mensagem — e, se falhar, lança
 * FalhaEnvioEmail dizendo se vale a pena tentar de novo.
 */
export interface Mensagem {
  para: string;
  assunto: string;
  html: string;
  /**
   * Chave de idempotência, a mesma em todas as tentativas do mesmo e-mail:
   * se uma tentativa cair depois de a Resend já ter aceitado o envio, a
   * seguinte recebe o envio original em vez de mandar outro (vale por 24 h).
   */
  chave?: string;
  /** Tipo do e-mail (ex.: CONFIRMACAO_EMAIL) — vira tag na Resend, para filtrar no painel. */
  categoria?: string;
}

export interface ResultadoEnvio {
  /** ID da mensagem na Resend ou Message-ID do SMTP; nulo no driver console. */
  idMensagem: string | null;
}

/**
 * `permanente` = repetir a mesma mensagem não resolve (endereço inválido,
 * domínio não verificado, API key errada). Rede fora, limite de envio e
 * instabilidade do provedor são passageiros: o e-mail volta para a fila.
 */
export class FalhaEnvioEmail extends Error {
  constructor(
    message: string,
    readonly permanente: boolean,
  ) {
    super(message);
    this.name = "FalhaEnvioEmail";
  }
}

let transporter: Transporter | null = null;
let resend: Resend | null = null;

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

function clienteResend(): Resend {
  resend ??= new Resend(env.RESEND_API_KEY);
  return resend;
}

/**
 * Sem resposta (rede), 429 (limite/cota) e 5xx são passageiros, assim como
 * o 409 de outra tentativa com a mesma chave ainda em andamento. Qualquer
 * outro 4xx é problema da mensagem ou da configuração.
 */
function falhaPermanenteResend(status: number | null, codigo: string): boolean {
  if (status === null || status === 429 || status >= 500) return false;
  return codigo !== "concurrent_idempotent_requests";
}

export async function entregarEmail(mensagem: Mensagem): Promise<ResultadoEnvio> {
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
    return { idMensagem: null };
  }

  if (env.MAIL_DRIVER === "smtp") {
    try {
      const info = await smtp().sendMail({
        from: env.MAIL_FROM,
        to: mensagem.para,
        subject: mensagem.assunto,
        html: mensagem.html,
        text: texto,
      });
      return { idMensagem: info.messageId ?? null };
    } catch (error) {
      // Resposta 5xx do servidor SMTP é recusa definitiva (RFC 5321).
      const codigo = (error as { responseCode?: number }).responseCode;
      throw new FalhaEnvioEmail(
        error instanceof Error ? error.message : String(error),
        typeof codigo === "number" && codigo >= 500,
      );
    }
  }

  const { data, error } = await clienteResend().emails.send(
    {
      from: env.MAIL_FROM,
      to: [mensagem.para],
      subject: mensagem.assunto,
      html: mensagem.html,
      text: texto,
      tags: mensagem.categoria ? [{ name: "tipo", value: mensagem.categoria }] : undefined,
    },
    mensagem.chave ? { idempotencyKey: mensagem.chave } : undefined,
  );

  if (error) {
    throw new FalhaEnvioEmail(
      `Resend respondeu ${error.statusCode ?? "sem status"} (${error.name}): ${error.message}`,
      falhaPermanenteResend(error.statusCode, error.name),
    );
  }
  return { idMensagem: data.id };
}

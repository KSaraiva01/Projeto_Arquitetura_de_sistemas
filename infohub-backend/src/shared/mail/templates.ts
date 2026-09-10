import { env } from "../../config/env.js";

interface Template {
  subject: string;
  html: string;
  text: string;
}

const BRAND = "InfoHub · Faculdade Antonio Meneghetti";

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2933;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="background:#0f3d5c;padding:20px 28px;color:#ffffff;font-size:15px;font-weight:600;">
          ${BRAND}
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:19px;color:#0f3d5c;">${title}</h1>
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:18px 28px;background:#f4f5f7;font-size:12px;color:#6b7280;">
          Este é um e-mail automático do InfoHub. Não responda esta mensagem.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(label: string, url: string): string {
  return `<p style="margin:24px 0;">
    <a href="${url}" style="display:inline-block;background:#0f3d5c;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">${label}</a>
  </p>
  <p style="margin:0;font-size:13px;color:#6b7280;">Se o botão não funcionar, copie e cole este endereço no navegador:<br><span style="word-break:break-all;">${url}</span></p>`;
}

/** RF-01 — recuperação de senha. */
export function passwordResetTemplate(
  name: string,
  token: string,
  expiresInMinutes: number,
): Template {
  const url = `${env.APP_URL}/redefinir-senha?token=${encodeURIComponent(token)}`;
  const firstName = name.split(" ")[0] ?? name;

  return {
    subject: "Redefinição de senha — InfoHub",
    html: layout(
      "Redefinição de senha",
      `<p style="margin:0 0 12px;">Olá, ${firstName}!</p>
       <p style="margin:0;">Recebemos um pedido para redefinir a senha da sua conta no InfoHub.
       O link abaixo vale por <strong>${expiresInMinutes} minutos</strong> e só pode ser usado uma vez.</p>
       ${button("Criar nova senha", url)}
       <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">Se não foi você quem pediu, ignore este e-mail — sua senha atual continua valendo.</p>`,
    ),
    text: `Olá, ${firstName}!

Recebemos um pedido para redefinir a senha da sua conta no InfoHub.
Acesse o link abaixo (válido por ${expiresInMinutes} minutos, uso único):

${url}

Se não foi você quem pediu, ignore este e-mail.`,
  };
}

/** RF-03 — conta de administrador/mentor criada pela coordenação. */
export function accountCreatedTemplate(
  name: string,
  role: "ADMIN" | "MENTOR",
  token: string,
  expiresInMinutes: number,
): Template {
  const url = `${env.APP_URL}/redefinir-senha?token=${encodeURIComponent(token)}`;
  const firstName = name.split(" ")[0] ?? name;
  const roleLabel = role === "ADMIN" ? "administrador(a)" : "mentor(a)";

  return {
    subject: "Sua conta no InfoHub foi criada",
    html: layout(
      "Bem-vindo(a) ao InfoHub",
      `<p style="margin:0 0 12px;">Olá, ${firstName}!</p>
       <p style="margin:0;">A coordenação criou uma conta de <strong>${roleLabel}</strong> para você no InfoHub.
       Defina sua senha pelo link abaixo para acessar o sistema — ele vale por <strong>${expiresInMinutes} minutos</strong>.</p>
       ${button("Definir minha senha", url)}`,
    ),
    text: `Olá, ${firstName}!

A coordenação criou uma conta de ${roleLabel} para você no InfoHub.
Defina sua senha pelo link abaixo (válido por ${expiresInMinutes} minutos):

${url}`,
  };
}

/** Confirmação enviada após a senha ser alterada com sucesso. */
export function passwordChangedTemplate(name: string): Template {
  const firstName = name.split(" ")[0] ?? name;

  return {
    subject: "Sua senha do InfoHub foi alterada",
    html: layout(
      "Senha alterada",
      `<p style="margin:0 0 12px;">Olá, ${firstName}!</p>
       <p style="margin:0;">A senha da sua conta no InfoHub acabou de ser alterada e todas as sessões
       abertas foram encerradas.</p>
       <p style="margin:16px 0 0;">Se não foi você, entre em contato com a coordenação do InfoHub imediatamente.</p>`,
    ),
    text: `Olá, ${firstName}!

A senha da sua conta no InfoHub acabou de ser alterada e todas as sessões abertas foram encerradas.
Se não foi você, entre em contato com a coordenação do InfoHub imediatamente.`,
  };
}

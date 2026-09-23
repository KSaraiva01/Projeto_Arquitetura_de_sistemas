import { env } from "../../config/env";
import { dataBr } from "../datas";

/**
 * Modelos dos e-mails do sistema (RF-18, RF-19, RF-20, RF-01, RF-02).
 * Cada função devolve assunto + HTML; a versão texto é derivada do HTML na
 * hora do envio. Links apontam para o próprio sistema (APP_URL).
 */
export interface ModeloEmail {
  assunto: string;
  html: string;
}

const MARCA = "InfoHub · Faculdade Antonio Meneghetti";

function layout(titulo: string, corpo: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2933;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#0f3d5c;padding:20px 28px;color:#ffffff;font-size:15px;font-weight:600;">${MARCA}</td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 16px;font-size:19px;color:#0f3d5c;">${titulo}</h1>
        ${corpo}
      </td></tr>
      <tr><td style="padding:18px 28px;background:#f4f5f7;font-size:12px;color:#6b7280;">
        Este é um e-mail automático do InfoHub. Não responda esta mensagem.
      </td></tr>
    </table>
  </body>
</html>`;
}

function botao(rotulo: string, url: string): string {
  return `<p style="margin:24px 0;">
    <a href="${url}" style="display:inline-block;background:#0f3d5c;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">${rotulo}</a>
  </p>
  <p style="margin:0;font-size:13px;color:#6b7280;">Se o botão não funcionar, copie e cole este endereço no navegador:<br><span style="word-break:break-all;">${url}</span></p>`;
}

function p(texto: string): string {
  return `<p style="margin:0 0 12px;">${texto}</p>`;
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function primeiroNome(nome: string): string {
  return nome.split(" ")[0] ?? nome;
}

const LINK_LOGIN = `${env.APP_URL}/`;

// ---------------------------------------------------------------------------
// Contas (RF-01, RF-02, RF-03)
// ---------------------------------------------------------------------------

/** RF-02/RF-03 — primeiro acesso: define a senha pelo token. */
export function emailAtivacaoConta(nome: string, token: string, contexto: string): ModeloEmail {
  const url = `${env.APP_URL}/definir-senha?token=${encodeURIComponent(token)}`;
  return {
    assunto: "Ative sua conta no InfoHub",
    html: layout(
      "Bem-vindo(a) ao InfoHub!",
      p(`Olá, ${escapar(primeiroNome(nome))}!`) +
        p(`${escapar(contexto)} Para acessar o sistema, crie sua senha pelo link abaixo — ele vale por <strong>${env.ACTIVATION_EXPIRES_IN_HOURS} horas</strong> e só pode ser usado uma vez.`) +
        botao("Criar minha senha", url) +
        p(`<span style="font-size:13px;color:#6b7280;">Se o link expirar, use "Esqueci minha senha" na tela de login para receber um novo.</span>`),
    ),
  };
}

/** Validação do e-mail — quem se cadastra já com senha (o líder) confirma que o endereço é seu. */
export function emailConfirmacaoEmail(nome: string, token: string, contexto: string): ModeloEmail {
  const url = `${env.APP_URL}/confirmar-email?token=${encodeURIComponent(token)}`;
  return {
    assunto: "Confirme seu e-mail — InfoHub",
    html: layout(
      "Confirme seu e-mail",
      p(`Olá, ${escapar(primeiroNome(nome))}!`) +
        p(`${escapar(contexto)} Para entrar no InfoHub, confirme que este endereço é seu pelo link abaixo — ele vale por <strong>${env.ACTIVATION_EXPIRES_IN_HOURS} horas</strong>.`) +
        botao("Confirmar meu e-mail", url) +
        p(`<span style="font-size:13px;color:#6b7280;">Se o link expirar, tente entrar no InfoHub e peça um novo. Se não foi você quem se cadastrou, ignore este e-mail.</span>`),
    ),
  };
}

/** RF-01 — recuperação de senha. */
export function emailRecuperacaoSenha(nome: string, token: string): ModeloEmail {
  const url = `${env.APP_URL}/definir-senha?token=${encodeURIComponent(token)}`;
  return {
    assunto: "Redefinição de senha — InfoHub",
    html: layout(
      "Redefinição de senha",
      p(`Olá, ${escapar(primeiroNome(nome))}!`) +
        p(`Recebemos um pedido para redefinir a senha da sua conta. O link abaixo vale por <strong>${env.PASSWORD_RESET_EXPIRES_IN_MINUTES} minutos</strong> e só pode ser usado uma vez.`) +
        botao("Criar nova senha", url) +
        p(`<span style="font-size:13px;color:#6b7280;">Se não foi você quem pediu, ignore este e-mail — sua senha atual continua valendo.</span>`),
    ),
  };
}

// ---------------------------------------------------------------------------
// Coordenação / mentores (RF-19)
// ---------------------------------------------------------------------------

/** RF-05/RF-19 — aluno enviou uma ideia. */
export function emailNovoCadastro(nome: string, equipe: string, lider: string, area: string, equipeId: string): ModeloEmail {
  return {
    assunto: `Nova ideia cadastrada: ${equipe}`,
    html: layout(
      "Nova ideia no InfoHub",
      p(`Olá, ${escapar(primeiroNome(nome))}!`) +
        p(`<strong>${escapar(lider)}</strong> cadastrou a ideia <strong>${escapar(equipe)}</strong> (área: ${escapar(area)}). A equipe já está na etapa 1 do funil, aguardando o primeiro contato.`) +
        botao("Ver a equipe", `${env.APP_URL}/admin/equipes/${equipeId}`),
    ),
  };
}

/** RF-19 — arquivo entregue. */
export function emailEntregaRecebida(nome: string, equipe: string, tarefa: string, versao: number, quem: string, equipeId: string): ModeloEmail {
  return {
    assunto: `Entrega recebida: ${tarefa} (${equipe})`,
    html: layout(
      "Nova entrega para avaliar",
      p(`Olá, ${escapar(primeiroNome(nome))}!`) +
        p(`<strong>${escapar(quem)}</strong> enviou a versão <strong>${versao}</strong> da tarefa <strong>${escapar(tarefa)}</strong> da equipe <strong>${escapar(equipe)}</strong>.`) +
        botao("Avaliar entrega", `${env.APP_URL}/admin/equipes/${equipeId}`),
    ),
  };
}

/** RF-19 — tarefa ficou atrasada (aviso ao mentor/admin). */
export function emailTarefaAtrasada(nome: string, equipe: string, tarefa: string, prazo: Date, equipeId: string): ModeloEmail {
  return {
    assunto: `Tarefa atrasada: ${tarefa} (${equipe})`,
    html: layout(
      "Tarefa atrasada",
      p(`Olá, ${escapar(primeiroNome(nome))}!`) +
        p(`A tarefa <strong>${escapar(tarefa)}</strong> da equipe <strong>${escapar(equipe)}</strong> venceu em <strong>${dataBr(prazo)}</strong> sem entrega.`) +
        botao("Ver a equipe", `${env.APP_URL}/admin/equipes/${equipeId}`),
    ),
  };
}

// ---------------------------------------------------------------------------
// Alunos (RF-18, RF-20)
// ---------------------------------------------------------------------------

/** RF-18 — nova tarefa atribuída. */
export function emailNovaTarefa(nome: string, equipe: string, tarefa: string, prazo: Date, obrigatoria: boolean): ModeloEmail {
  return {
    assunto: `Nova tarefa: ${tarefa}`,
    html: layout(
      "Você tem uma nova tarefa",
      p(`Olá, ${escapar(primeiroNome(nome))}!`) +
        p(`A equipe <strong>${escapar(equipe)}</strong> recebeu a tarefa <strong>${escapar(tarefa)}</strong>${obrigatoria ? " (obrigatória para avançar de etapa)" : ""}, com prazo até <strong>${dataBr(prazo)}</strong>.`) +
        botao("Ver minhas tarefas", LINK_LOGIN),
    ),
  };
}

/** RF-17/RF-18 — lembrete de prazo. */
export function emailPrazoProximo(nome: string, equipe: string, tarefa: string, prazo: Date, diasAntes: number | null): ModeloEmail {
  const quando =
    diasAntes === null ? "está chegando" : diasAntes === 0 ? "é <strong>hoje</strong>" : diasAntes === 1 ? "é <strong>amanhã</strong>" : `é em <strong>${diasAntes} dias</strong>`;
  return {
    assunto: `Lembrete: ${tarefa} vence em ${dataBr(prazo)}`,
    html: layout(
      "Prazo se aproximando",
      p(`Olá, ${escapar(primeiroNome(nome))}!`) +
        p(`O prazo da tarefa <strong>${escapar(tarefa)}</strong> (equipe ${escapar(equipe)}) ${quando}: <strong>${dataBr(prazo)}</strong>.`) +
        botao("Enviar entrega", LINK_LOGIN),
    ),
  };
}

/** RF-18 — prazo venceu sem entrega. */
export function emailPrazoVencido(nome: string, equipe: string, tarefa: string, prazo: Date): ModeloEmail {
  return {
    assunto: `Prazo vencido: ${tarefa}`,
    html: layout(
      "Tarefa atrasada",
      p(`Olá, ${escapar(primeiroNome(nome))}!`) +
        p(`A tarefa <strong>${escapar(tarefa)}</strong> da equipe <strong>${escapar(equipe)}</strong> venceu em <strong>${dataBr(prazo)}</strong> e ainda não recebeu entrega. Envie assim que possível para não travar o avanço da equipe.`) +
        botao("Enviar entrega", LINK_LOGIN),
    ),
  };
}

/** RF-18 — resultado da avaliação. */
export function emailEntregaAvaliada(nome: string, equipe: string, tarefa: string, aprovada: boolean, comentario: string): ModeloEmail {
  return {
    assunto: aprovada ? `Entrega aprovada: ${tarefa}` : `Ajustes solicitados: ${tarefa}`,
    html: layout(
      aprovada ? "Entrega aprovada 🎉" : "Sua entrega precisa de ajustes",
      p(`Olá, ${escapar(primeiroNome(nome))}!`) +
        p(
          aprovada
            ? `A entrega da tarefa <strong>${escapar(tarefa)}</strong> (equipe ${escapar(equipe)}) foi <strong>aprovada</strong>.`
            : `A entrega da tarefa <strong>${escapar(tarefa)}</strong> (equipe ${escapar(equipe)}) foi devolvida para ajustes. Envie uma nova versão quando corrigir.`,
        ) +
        `<blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #0f3d5c;background:#f4f5f7;">${escapar(comentario)}</blockquote>` +
        botao("Ver a tarefa", LINK_LOGIN),
    ),
  };
}

/** RF-20 — lembrete manual escrito pelo admin/mentor. */
export function emailLembreteManual(nome: string, equipe: string, remetente: string, assunto: string, mensagem: string): ModeloEmail {
  return {
    assunto: `${assunto} — ${equipe}`,
    html: layout(
      escapar(assunto),
      p(`Olá, ${escapar(primeiroNome(nome))}!`) +
        p(`Mensagem de <strong>${escapar(remetente)}</strong> para a equipe <strong>${escapar(equipe)}</strong>:`) +
        `<blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #0f3d5c;background:#f4f5f7;white-space:pre-line;">${escapar(mensagem)}</blockquote>` +
        botao("Acessar o InfoHub", LINK_LOGIN),
    ),
  };
}

/** Versão texto (para o driver console e o campo text do SMTP). */
export function htmlParaTexto(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|tr|blockquote|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

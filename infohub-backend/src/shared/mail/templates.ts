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

/** Nome curto para cumprimento. */
function first(name: string): string {
  return name.split(" ")[0] ?? name;
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * RF-02 — conta de aluno criada pelo formulário de ideia. A conta nasce sem
 * senha; este link de primeiro acesso é o que a define.
 */
export function firstAccessTemplate(
  name: string,
  teamName: string,
  token: string,
  expiresInHours: number,
): Template {
  const url = `${env.APP_URL}/redefinir-senha?token=${encodeURIComponent(token)}`;

  return {
    subject: `Bem-vindo(a) ao InfoHub — acesso da equipe ${teamName}`,
    html: layout(
      "Seu acesso ao InfoHub",
      `<p style="margin:0 0 12px;">Olá, ${first(name)}!</p>
       <p style="margin:0;">Sua ideia <strong>${teamName}</strong> foi recebida pelo InfoHub e você já tem
       uma conta para acompanhar a jornada. Defina sua senha pelo link abaixo — ele vale por
       <strong>${expiresInHours} horas</strong> e só pode ser usado uma vez.</p>
       ${button("Definir minha senha", url)}`,
    ),
    text: `Olá, ${first(name)}!

Sua ideia "${teamName}" foi recebida pelo InfoHub e você já tem uma conta.
Defina sua senha pelo link abaixo (válido por ${expiresInHours} horas, uso único):

${url}`,
  };
}

/** RF-19 — aviso à coordenação de que uma nova ideia foi cadastrada. */
export function newRegistrationTemplate(
  adminName: string,
  teamName: string,
  leaderName: string,
  area: string,
): Template {
  const url = `${env.APP_URL}/admin/equipes`;

  return {
    subject: `Nova ideia cadastrada: ${teamName}`,
    html: layout(
      "Nova ideia no InfoHub",
      `<p style="margin:0 0 12px;">Olá, ${first(adminName)}!</p>
       <p style="margin:0;">A equipe <strong>${teamName}</strong> (área: ${area}) acabou de se cadastrar,
       liderada por ${leaderName}. Ela entrou na etapa 1 e aguarda a atribuição de um mentor.</p>
       ${button("Ver equipes", url)}`,
    ),
    text: `Olá, ${first(adminName)}!

A equipe "${teamName}" (área: ${area}) acabou de se cadastrar, liderada por ${leaderName}.
Ela entrou na etapa 1 e aguarda a atribuição de um mentor.

${url}`,
  };
}

/** RF-19 — nova tarefa atribuída à equipe. */
export function newTaskTemplate(
  name: string,
  teamName: string,
  taskTitle: string,
  dueDate: string,
  isMandatory: boolean,
): Template {
  const url = `${env.APP_URL}/aluno/tarefas`;
  const mandatory = isMandatory ? " Esta tarefa é obrigatória para avançar de etapa." : "";

  return {
    subject: `Nova tarefa para a equipe ${teamName}: ${taskTitle}`,
    html: layout(
      "Nova tarefa",
      `<p style="margin:0 0 12px;">Olá, ${first(name)}!</p>
       <p style="margin:0;">A equipe <strong>${teamName}</strong> recebeu a tarefa
       <strong>${taskTitle}</strong>, com prazo até <strong>${formatDate(dueDate)}</strong>.${mandatory}</p>
       ${button("Ver minhas tarefas", url)}`,
    ),
    text: `Olá, ${first(name)}!

A equipe "${teamName}" recebeu a tarefa "${taskTitle}", com prazo até ${formatDate(dueDate)}.${mandatory}

${url}`,
  };
}

/** RF-17 — lembrete automático de prazo. */
export function deadlineReminderTemplate(
  name: string,
  teamName: string,
  taskTitle: string,
  dueDate: string,
  daysBefore: number,
): Template {
  const url = `${env.APP_URL}/aluno/tarefas`;
  const when =
    daysBefore === 0
      ? "vence hoje"
      : daysBefore === 1
        ? "vence amanhã"
        : `vence em ${daysBefore} dias`;

  return {
    subject: `Lembrete: "${taskTitle}" ${when}`,
    html: layout(
      "Lembrete de prazo",
      `<p style="margin:0 0 12px;">Olá, ${first(name)}!</p>
       <p style="margin:0;">A tarefa <strong>${taskTitle}</strong> da equipe <strong>${teamName}</strong>
       ${when} (${formatDate(dueDate)}).</p>
       ${button("Ver a tarefa", url)}`,
    ),
    text: `Olá, ${first(name)}!

A tarefa "${taskTitle}" da equipe "${teamName}" ${when} (${formatDate(dueDate)}).

${url}`,
  };
}

/** RF-20 — tarefa venceu sem entrega. */
export function overdueTemplate(
  name: string,
  teamName: string,
  taskTitle: string,
  dueDate: string,
): Template {
  const url = `${env.APP_URL}/aluno/tarefas`;

  return {
    subject: `Tarefa atrasada: ${taskTitle}`,
    html: layout(
      "Tarefa atrasada",
      `<p style="margin:0 0 12px;">Olá, ${first(name)}!</p>
       <p style="margin:0;">O prazo da tarefa <strong>${taskTitle}</strong> da equipe
       <strong>${teamName}</strong> era ${formatDate(dueDate)} e ainda não recebemos a entrega.
       Envie assim que possível ou fale com o mentor.</p>
       ${button("Enviar agora", url)}`,
    ),
    text: `Olá, ${first(name)}!

O prazo da tarefa "${taskTitle}" da equipe "${teamName}" era ${formatDate(dueDate)} e ainda não recebemos a entrega.

${url}`,
  };
}

/** RF-14 — aluno enviou uma entrega (aviso ao mentor). */
export function submissionReceivedTemplate(
  mentorName: string,
  teamName: string,
  taskTitle: string,
  version: number,
  studentName: string,
): Template {
  const url = `${env.APP_URL}/mentor/tarefas`;

  return {
    subject: `Entrega recebida: ${taskTitle} (v${version}) — ${teamName}`,
    html: layout(
      "Entrega recebida",
      `<p style="margin:0 0 12px;">Olá, ${first(mentorName)}!</p>
       <p style="margin:0;">${studentName}, da equipe <strong>${teamName}</strong>, enviou a versão
       <strong>${version}</strong> da tarefa <strong>${taskTitle}</strong>. Ela aguarda sua avaliação.</p>
       ${button("Avaliar entrega", url)}`,
    ),
    text: `Olá, ${first(mentorName)}!

${studentName}, da equipe "${teamName}", enviou a versão ${version} da tarefa "${taskTitle}".

${url}`,
  };
}

/** RF-20 — resultado da avaliação (aprovada ou devolvida para ajustes). */
export function reviewResultTemplate(
  name: string,
  teamName: string,
  taskTitle: string,
  approved: boolean,
  comment: string,
): Template {
  const url = `${env.APP_URL}/aluno/tarefas`;
  const title = approved ? "Entrega aprovada" : "Ajustes solicitados";

  return {
    subject: `${title}: ${taskTitle} — ${teamName}`,
    html: layout(
      title,
      `<p style="margin:0 0 12px;">Olá, ${first(name)}!</p>
       <p style="margin:0;">A entrega da tarefa <strong>${taskTitle}</strong> da equipe
       <strong>${teamName}</strong> foi ${approved ? "<strong>aprovada</strong>" : "devolvida para <strong>ajustes</strong>"}.</p>
       <p style="margin:16px 0 0;padding:12px 16px;background:#f4f5f7;border-radius:8px;">${comment}</p>
       ${button(approved ? "Ver a tarefa" : "Reenviar entrega", url)}`,
    ),
    text: `Olá, ${first(name)}!

A entrega da tarefa "${taskTitle}" da equipe "${teamName}" foi ${approved ? "aprovada" : "devolvida para ajustes"}.

Comentário do avaliador:
${comment}

${url}`,
  };
}

/** RF-09 — equipe mudou de etapa. */
export function stageChangedTemplate(
  name: string,
  teamName: string,
  stageName: string,
  advanced: boolean,
): Template {
  const url = `${env.APP_URL}/aluno`;

  return {
    subject: `${teamName} ${advanced ? "avançou para" : "voltou para"}: ${stageName}`,
    html: layout(
      advanced ? "Sua equipe avançou!" : "Sua equipe voltou uma etapa",
      `<p style="margin:0 0 12px;">Olá, ${first(name)}!</p>
       <p style="margin:0;">A equipe <strong>${teamName}</strong> agora está na etapa
       <strong>${stageName}</strong>.</p>
       ${button("Ver minha jornada", url)}`,
    ),
    text: `Olá, ${first(name)}!

A equipe "${teamName}" agora está na etapa "${stageName}".

${url}`,
  };
}

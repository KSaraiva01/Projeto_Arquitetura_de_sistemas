import { env } from "../config/env.js";
import * as tasksRepository from "../modules/tasks/tasks.repository.js";
import * as teamsRepository from "../modules/teams/teams.repository.js";
import { sendMail } from "../shared/mail/mailer.js";
import {
  deadlineReminderTemplate,
  overdueTemplate,
} from "../shared/mail/templates.js";

export interface JobsReport {
  overdueMarked: number;
  remindersSent: number;
  overdueNotified: number;
}

/**
 * Rotina agendada do InfoHub. Roda na subida do servidor e a cada
 * JOBS_INTERVAL_MINUTES. Três passos, nesta ordem:
 *
 *  1. RN-04: tarefas vencidas sem entrega viram OVERDUE (status GRAVADO).
 *  2. RF-17: lembretes cuja hora chegou são enviados aos integrantes e
 *     marcados com enviado_em — nunca saem duas vezes.
 *  3. RF-20: cada tarefa recém-atrasada gera UM aviso por integrante; o
 *     índice único em `notificacao` garante que não se repita.
 */
export async function runJobs(): Promise<JobsReport> {
  const report: JobsReport = { overdueMarked: 0, remindersSent: 0, overdueNotified: 0 };

  report.overdueMarked = await tasksRepository.markOverdueTasks();

  for (const reminder of await tasksRepository.findDueReminders()) {
    const recipients = await teamsRepository.findMemberRecipients(reminder.equipe_id);
    for (const person of recipients) {
      const mail = deadlineReminderTemplate(
        person.nome,
        reminder.equipe_nome,
        reminder.titulo,
        reminder.prazo,
        reminder.dias_antes,
      );
      const sent = await sendMail({
        to: person.email,
        recipientId: person.id,
        teamId: reminder.equipe_id,
        taskId: reminder.tarefa_id,
        reminderId: reminder.lembrete_id,
        type: "DEADLINE_REMINDER",
        ...mail,
      });
      if (sent) report.remindersSent += 1;
    }
    await tasksRepository.markReminderSent(reminder.lembrete_id);
  }

  for (const task of await tasksRepository.findOverdueUnnotified()) {
    const recipients = await teamsRepository.findMemberRecipients(task.equipe_id);
    for (const person of recipients) {
      const mail = overdueTemplate(person.nome, task.equipe_nome, task.titulo, task.prazo);
      const sent = await sendMail({
        to: person.email,
        recipientId: person.id,
        teamId: task.equipe_id,
        taskId: task.tarefa_id,
        type: "OVERDUE",
        ...mail,
      });
      if (sent) report.overdueNotified += 1;
    }
  }

  return report;
}

let running = false;

async function tick() {
  if (running) return; // uma execução por vez, mesmo que a anterior demore
  running = true;
  try {
    const report = await runJobs();
    if (report.overdueMarked || report.remindersSent || report.overdueNotified) {
      console.log(
        `[jobs] atrasadas: ${report.overdueMarked} | lembretes: ${report.remindersSent} | avisos de atraso: ${report.overdueNotified}`,
      );
    }
  } catch (error) {
    console.error("[jobs] falha na rotina agendada:", error);
  } finally {
    running = false;
  }
}

/** Liga a rotina. Devolve a função que a desliga (usada no shutdown). */
export function startScheduler(): () => void {
  if (!env.jobsEnabled) {
    console.log("[jobs] desligada (JOBS_ENABLED=false).");
    return () => {};
  }

  void tick();
  const timer = setInterval(() => void tick(), env.JOBS_INTERVAL_MINUTES * 60 * 1000);
  timer.unref();
  console.log(`[jobs] rotina ligada — a cada ${env.JOBS_INTERVAL_MINUTES} min.`);

  return () => clearInterval(timer);
}

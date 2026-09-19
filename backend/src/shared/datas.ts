/** Utilidades de data — o banco usa TIMESTAMPTZ; a API troca datas em ISO. */

export const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** Fim do dia (23:59:59.999) de uma data "AAAA-MM-DD" no fuso do servidor. */
export function fimDoDia(dataIso: string): Date {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(ano!, mes! - 1, dia!, 23, 59, 59, 999);
}

/** Início do dia (00:00) de uma data "AAAA-MM-DD" no fuso do servidor. */
export function inicioDoDia(dataIso: string): Date {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(ano!, mes! - 1, dia!, 0, 0, 0, 0);
}

/** "AAAA-MM-DD" de uma Date, no fuso do servidor. */
export function dataIso(data: Date): string {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "DD/MM/AAAA" para e-mails e CSV. */
export function dataBr(data: Date): string {
  return `${String(data.getDate()).padStart(2, "0")}/${String(data.getMonth() + 1).padStart(2, "0")}/${data.getFullYear()}`;
}

/**
 * RF-17: um lembrete "N dias antes" dispara às 9h da manhã do dia calculado
 * — horário em que alguém realmente lê e-mail, e não à meia-noite.
 */
export function dataDoLembrete(prazo: Date, diasAntes: number): Date {
  const d = new Date(prazo.getTime() - diasAntes * UM_DIA_MS);
  d.setHours(9, 0, 0, 0);
  return d;
}

/** Período do programa em que a equipe entra: "2026/1" ou "2026/2" (RF-24). */
export function periodoAtual(data = new Date()): string {
  return `${data.getFullYear()}/${data.getMonth() < 6 ? 1 : 2}`;
}

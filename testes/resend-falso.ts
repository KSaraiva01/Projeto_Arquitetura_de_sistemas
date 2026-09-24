/**
 * Troca o driver de e-mail pela Resend apontada para um servidor falso local.
 * Precisa ser o PRIMEIRO import do arquivo de teste: a configuração (env.ts)
 * e o SDK da Resend leem estas variáveis quando são carregados.
 */
export const PORTA_RESEND_FALSA = 40_000 + Math.floor(Math.random() * 20_000);

process.env.MAIL_DRIVER = "resend";
process.env.RESEND_API_KEY = "re_teste_local";
process.env.RESEND_BASE_URL = `http://127.0.0.1:${PORTA_RESEND_FALSA}`;

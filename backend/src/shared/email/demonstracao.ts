/**
 * Contas que o seed cria com endereço fictício: o admin padrão e o cenário de
 * demonstração da G1 (prisma/seed.ts). Os endereços dos mentores e alunos são
 * do domínio real da AMF e podem pertencer a outras pessoas, então e-mail para
 * eles nunca sai — com qualquer MAIL_DRIVER, só aparece no log. O login dessas
 * contas continua funcionando normalmente.
 *
 * Quem acrescentar uma pessoa ao cenário de demonstração precisa incluí-la
 * aqui (o seed avisa no log se esquecer).
 */
export const EMAIL_ADMIN_PADRAO = "admin@infohub.amf.edu.br";

export const EMAILS_DEMONSTRACAO: ReadonlySet<string> = new Set([
  EMAIL_ADMIN_PADRAO,
  // Mentores
  "ana@amf.edu.br",
  "ricardo@amf.edu.br",
  "paula@amf.edu.br",
  "marcos@amf.edu.br",
  // EcoTrack
  "lucas@aluno.amf.edu.br",
  "fernanda@aluno.amf.edu.br",
  "joao@aluno.amf.edu.br",
  // MedConnect
  "mariana@aluno.amf.edu.br",
  "carloseduardo@aluno.amf.edu.br",
  "beatriz@aluno.amf.edu.br",
  // AgroSense
  "pedro@aluno.amf.edu.br",
  "anaclara@aluno.amf.edu.br",
  "rafael@aluno.amf.edu.br",
  "isabela@aluno.amf.edu.br",
]);

export function ehEmailDeDemonstracao(email: string): boolean {
  return EMAILS_DEMONSTRACAO.has(email.trim().toLowerCase());
}

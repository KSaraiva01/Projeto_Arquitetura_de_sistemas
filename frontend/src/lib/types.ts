/**
 * Constantes de tela que não vêm da API: nomes curtos das 6 etapas padrão,
 * entregável esperado de cada uma e as listas fixas do formulário de cadastro.
 * Os dados em si vêm todos da API (tipos em `api-types.ts`).
 */

export type JourneyStage = 1 | 2 | 3 | 4 | 5 | 6;

export const STAGE_NAMES: Record<JourneyStage, string> = {
  1: "Envio da ideia",
  2: "Contato com a equipe",
  3: "Entendendo a ideia",
  4: "Proposta de valor",
  5: "Modelo de negócio",
  6: "Pitch e inscrição",
};

export const STAGE_DELIVERABLES: Record<JourneyStage, string> = {
  1: "Cadastro da ideia (formulário)",
  2: "Agendamento confirmado",
  3: "Problema, público-alvo e solução definidos",
  4: "Value Proposition Design",
  5: "Business Model Canvas",
  6: "Pitch Vídeo, Canvas final, VPD final, dados de todos os integrantes",
};

/** Status de tarefa no vocabulário visual (cores do StatusBadge). */
export type TaskStatus =
  | "pendente"
  | "em_andamento"
  | "entregue"
  | "atrasada"
  | "aprovada"
  | "reprovada";

export const SEMESTERS = [
  "1º semestre",
  "2º semestre",
  "3º semestre",
  "4º semestre",
  "5º semestre",
  "6º semestre",
  "7º semestre",
  "8º semestre",
  "9º semestre",
  "10º semestre",
];

export const HOW_DID_YOU_HEAR_OPTIONS = [
  "Professor(a) ou coordenação",
  "Colega de curso",
  "Redes sociais",
  "Evento da faculdade",
  "Site da AMF",
  "Outro",
];

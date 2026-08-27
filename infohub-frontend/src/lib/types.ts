export type UserRole = "admin" | "aluno" | "mentor";

export type JourneyStage = 1 | 2 | 3 | 4 | 5 | 6;

export const STAGE_NAMES: Record<JourneyStage, string> = {
  1: "Envio da ideia",
  2: "Contato com a equipe",
  3: "Entendendo a ideia",
  4: "Proposta de valor",
  5: "Modelo de negócio",
  6: "Pitch e inscrição",
};

export const STAGE_DESCRIPTIONS: Record<JourneyStage, string> = {
  1: "Aluno preenche o formulário inicial contando a ideia.",
  2: "Equipe InfoHub analisa a proposta e agenda o 1º encontro.",
  3: "Mentor e aluno definem problema, público-alvo e solução inicial.",
  4: "Construção do Value Proposition Design.",
  5: "Construção do Business Model Canvas.",
  6: "Revisão geral, gravação do Pitch Vídeo e conferência de documentos.",
};

export const STAGE_DELIVERABLES: Record<JourneyStage, string> = {
  1: "Cadastro da ideia (formulário)",
  2: "Agendamento confirmado",
  3: "Problema, público-alvo e solução definidos",
  4: "Value Proposition Design",
  5: "Business Model Canvas",
  6: "Pitch Vídeo, Canvas final, VPD final, dados de todos os integrantes",
};

export type TaskStatus =
  | "pendente"
  | "em_andamento"
  | "entregue"
  | "atrasada"
  | "aprovada"
  | "reprovada";

export type IdeaStage =
  | "apenas_ideia"
  | "prototipo"
  | "mvp_desenvolvimento"
  | "mvp_pronto";

export const IDEA_STAGE_LABELS: Record<IdeaStage, string> = {
  apenas_ideia: "Apenas ideia",
  prototipo: "Protótipo",
  mvp_desenvolvimento: "MVP em desenvolvimento",
  mvp_pronto: "MVP pronto",
};

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  course: string;
}

export interface Team {
  id: string;
  ideaName: string;
  description: string;
  area: string;
  ideaStage: IdeaStage;
  currentStage: JourneyStage;
  status: "ativa" | "pronta_inovamf" | "encaminhada" | "inativa";
  leader: {
    id: string;
    name: string;
    email: string;
    course: string;
  };
  members: TeamMember[];
  createdAt: string;
}

export interface Task {
  id: string;
  teamId: string;
  title: string;
  description: string;
  stage: JourneyStage;
  dueDate: string;
  status: TaskStatus;
  files: FileUpload[];
  adminComment?: string;
  createdAt: string;
}

export interface FileUpload {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  version: number;
}

export interface MentorNote {
  id: string;
  teamId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId?: string;
}

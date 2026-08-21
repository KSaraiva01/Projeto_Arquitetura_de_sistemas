// ── Domain types ────────────────────────────────────────────

// Etapas do funil InfoHub → InovAMF
export type StageId = 1 | 2 | 3 | 4 | 5 | 6;

export interface Stage {
  id: StageId;
  name: string;         // Nome curto para o kanban
  fullName: string;     // Nome completo
  description: string;
  deliverable: string;
  color: string;        // Tailwind bg class
  textColor: string;
}

// Status de tarefa
export type TaskStatus =
  | "pendente"
  | "em_andamento"
  | "entregue"
  | "atrasada"
  | "aprovada"
  | "ajustar";

// Arquivo entregue
export interface Submission {
  id: string;
  fileName: string;
  fileType: string;      // "pdf" | "image" | "video" | "link"
  submittedAt: string;   // ISO date string
  version: number;
}

// Tarefa atribuída a uma equipe
export interface Task {
  id: string;
  title: string;
  description: string;
  stageId: StageId;
  dueDate: string;       // ISO date string
  status: TaskStatus;
  submissions: Submission[];
  adminComment?: string; // comentário de ajuste
  reminderDates: string[];
}

// Integrante da equipe
export interface Member {
  id: string;
  name: string;
  course: string;
  email: string;
  role: "lider" | "integrante";
}

// Anotação interna do mentor (não visível ao aluno)
export interface Note {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

// Equipe/projeto no funil
export interface Team {
  id: string;
  projectName: string;
  ideaDescription: string;
  area: string;
  ideaStage: string;     // Estágio da ideia ao se inscrever
  currentStage: StageId;
  status: "ativo" | "encaminhado" | "inativo";
  mentor?: string;
  members: Member[];
  tasks: Task[];
  notes: Note[];
  createdAt: string;
  semester: string;      // ex.: "2025/1"
  source?: string;       // Como conheceu o InfoHub
}

// Perfil de usuário logado (simulação)
export type UserRole = "admin" | "student";

export interface AuthState {
  role: UserRole;
  name: string;
  email: string;
  teamId?: string; // só para alunos
}

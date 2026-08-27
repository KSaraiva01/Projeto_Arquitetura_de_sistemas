import { Team, Task, MentorNote, User, JourneyStage } from "./types";

export const AREAS = [
  "Educação",
  "Saúde",
  "Tecnologia",
  "Sustentabilidade",
  "Agronegócio",
  "Finanças",
  "Social",
];

export const mockUsers: User[] = [
  { id: "admin-1", name: "Prof. Carlos Silva", email: "carlos@amf.edu.br", role: "admin" },
  { id: "mentor-1", name: "Ana Beatriz Ramos", email: "ana@amf.edu.br", role: "mentor" },
  { id: "mentor-2", name: "Dr. Ricardo Ferreira", email: "ricardo@amf.edu.br", role: "mentor" },
  { id: "aluno-1", name: "Lucas Oliveira", email: "lucas@aluno.amf.edu.br", role: "aluno", teamId: "team-1" },
  { id: "aluno-2", name: "Mariana Santos", email: "mariana@aluno.amf.edu.br", role: "aluno", teamId: "team-2" },
  { id: "aluno-3", name: "Pedro Henrique Costa", email: "pedro@aluno.amf.edu.br", role: "aluno", teamId: "team-3" },
];

export const mockTeams: Team[] = [
  {
    id: "team-1",
    ideaName: "EcoTrack",
    description: "Aplicativo para monitoramento de pegada de carbono pessoal, com gamificação e desafios semanais para reduzir o impacto ambiental.",
    area: "Sustentabilidade",
    ideaStage: "prototipo",
    currentStage: 5,
    status: "ativa",
    leader: {
      id: "aluno-1",
      name: "Lucas Oliveira",
      email: "lucas@aluno.amf.edu.br",
      course: "Sistemas de Informação",
    },
    members: [
      { id: "m1", name: "Fernanda Lima", email: "fernanda@aluno.amf.edu.br", course: "Design" },
      { id: "m2", name: "João Pedro Martins", email: "joao@aluno.amf.edu.br", course: "Administração" },
    ],
    createdAt: "2026-03-15",
  },
  {
    id: "team-2",
    ideaName: "MedConnect",
    description: "Plataforma que conecta pacientes em áreas rurais com médicos via telemedicina, utilizando IA para triagem inicial.",
    area: "Saúde",
    ideaStage: "apenas_ideia",
    currentStage: 3,
    status: "ativa",
    leader: {
      id: "aluno-2",
      name: "Mariana Santos",
      email: "mariana@aluno.amf.edu.br",
      course: "Administração",
    },
    members: [
      { id: "m3", name: "Carlos Eduardo Pinto", email: "carloseduardo@aluno.amf.edu.br", course: "Sistemas de Informação" },
    ],
    createdAt: "2026-04-02",
  },
  {
    id: "team-3",
    ideaName: "AgroSense",
    description: "Sensores IoT de baixo custo para pequenos produtores rurais monitorarem umidade do solo e condições climáticas.",
    area: "Agronegócio",
    ideaStage: "mvp_desenvolvimento",
    currentStage: 6,
    status: "ativa",
    leader: {
      id: "aluno-3",
      name: "Pedro Henrique Costa",
      email: "pedro@aluno.amf.edu.br",
      course: "Engenharia de Software",
    },
    members: [
      { id: "m4", name: "Ana Clara Souza", email: "anaclara@aluno.amf.edu.br", course: "Agronomia" },
      { id: "m5", name: "Rafael Torres", email: "rafael@aluno.amf.edu.br", course: "Engenharia Elétrica" },
      { id: "m6", name: "Isabela Rocha", email: "isabela@aluno.amf.edu.br", course: "Design" },
    ],
    createdAt: "2026-02-20",
  },
  {
    id: "team-4",
    ideaName: "FinLit",
    description: "App de educação financeira gamificado para jovens universitários, com simulações de investimento e controle de gastos.",
    area: "Finanças",
    ideaStage: "apenas_ideia",
    currentStage: 1,
    status: "ativa",
    leader: {
      id: "aluno-4",
      name: "Gabriela Mendes",
      email: "gabriela@aluno.amf.edu.br",
      course: "Ciências Contábeis",
    },
    members: [],
    createdAt: "2026-08-10",
  },
  {
    id: "team-5",
    ideaName: "StudyBuddy",
    description: "Plataforma de estudo colaborativo com IA que sugere grupos de estudo e materiais personalizados por curso.",
    area: "Educação",
    ideaStage: "prototipo",
    currentStage: 4,
    status: "ativa",
    leader: {
      id: "aluno-5",
      name: "Thiago Nascimento",
      email: "thiago@aluno.amf.edu.br",
      course: "Sistemas de Informação",
    },
    members: [
      { id: "m7", name: "Camila Andrade", email: "camila@aluno.amf.edu.br", course: "Pedagogia" },
    ],
    createdAt: "2026-05-18",
  },
  {
    id: "team-6",
    ideaName: "ReciclAí",
    description: "Marketplace para venda de materiais recicláveis, conectando catadores a empresas de reciclagem com logística integrada.",
    area: "Sustentabilidade",
    ideaStage: "apenas_ideia",
    currentStage: 2,
    status: "ativa",
    leader: {
      id: "aluno-6",
      name: "Juliana Ferreira",
      email: "juliana@aluno.amf.edu.br",
      course: "Administração",
    },
    members: [
      { id: "m8", name: "Bruno Almeida", email: "bruno@aluno.amf.edu.br", course: "Logística" },
    ],
    createdAt: "2026-07-05",
  },
  {
    id: "team-7",
    ideaName: "CareBot",
    description: "Chatbot de saúde mental para universitários, com exercícios de mindfulness e encaminhamento para profissionais.",
    area: "Saúde",
    ideaStage: "mvp_pronto",
    currentStage: 6,
    status: "pronta_inovamf",
    leader: {
      id: "aluno-7",
      name: "Amanda Ribeiro",
      email: "amanda@aluno.amf.edu.br",
      course: "Psicologia",
    },
    members: [
      { id: "m9", name: "Diego Monteiro", email: "diego@aluno.amf.edu.br", course: "Sistemas de Informação" },
      { id: "m10", name: "Letícia Barbosa", email: "leticia@aluno.amf.edu.br", course: "Psicologia" },
    ],
    createdAt: "2026-01-10",
  },
  {
    id: "team-8",
    ideaName: "SmartCampus",
    description: "Sistema de navegação interna para o campus com acessibilidade para deficientes visuais usando beacons bluetooth.",
    area: "Tecnologia",
    ideaStage: "apenas_ideia",
    currentStage: 1,
    status: "ativa",
    leader: {
      id: "aluno-8",
      name: "Felipe Cardoso",
      email: "felipe@aluno.amf.edu.br",
      course: "Engenharia de Software",
    },
    members: [],
    createdAt: "2026-08-18",
  },
];

export const mockTasks: Task[] = [
  {
    id: "task-1",
    teamId: "team-1",
    title: "Enviar Business Model Canvas",
    description: "Preencher e enviar o Business Model Canvas conforme modelo discutido na mentoria.",
    stage: 5,
    dueDate: "2026-08-25",
    status: "pendente",
    files: [],
    createdAt: "2026-08-10",
  },
  {
    id: "task-2",
    teamId: "team-1",
    title: "Validar Value Proposition Design",
    description: "Ajustar o VPD com base no feedback do mentor e reenviar a versão final.",
    stage: 4,
    dueDate: "2026-08-15",
    status: "aprovada",
    files: [
      { id: "f1", name: "VPD_EcoTrack_v2.pdf", size: "2.4 MB", uploadedAt: "2026-08-14", version: 2 },
    ],
    createdAt: "2026-07-28",
  },
  {
    id: "task-3",
    teamId: "team-2",
    title: "Definir problema e público-alvo",
    description: "Após o primeiro encontro, documentar o problema identificado, público-alvo e proposta de solução inicial.",
    stage: 3,
    dueDate: "2026-08-20",
    status: "em_andamento",
    files: [],
    createdAt: "2026-08-05",
  },
  {
    id: "task-4",
    teamId: "team-3",
    title: "Gravar Pitch Vídeo",
    description: "Gravar vídeo de pitch de até 3 minutos apresentando o projeto AgroSense, problema, solução e modelo de negócio.",
    stage: 6,
    dueDate: "2026-08-22",
    status: "pendente",
    files: [],
    createdAt: "2026-08-12",
  },
  {
    id: "task-5",
    teamId: "team-3",
    title: "Entregar Canvas final",
    description: "Versão final do Business Model Canvas após revisões da mentoria.",
    stage: 6,
    dueDate: "2026-08-22",
    status: "entregue",
    files: [
      { id: "f2", name: "BMC_AgroSense_final.pdf", size: "1.8 MB", uploadedAt: "2026-08-19", version: 1 },
    ],
    createdAt: "2026-08-12",
  },
  {
    id: "task-6",
    teamId: "team-3",
    title: "Confirmar dados dos integrantes",
    description: "Preencher formulário com dados completos de todos os integrantes para submissão ao InovAMF.",
    stage: 6,
    dueDate: "2026-08-23",
    status: "pendente",
    files: [],
    createdAt: "2026-08-12",
  },
  {
    id: "task-7",
    teamId: "team-5",
    title: "Enviar Value Proposition Design",
    description: "Construir e enviar o Value Proposition Design do projeto StudyBuddy.",
    stage: 4,
    dueDate: "2026-08-28",
    status: "pendente",
    files: [],
    createdAt: "2026-08-15",
  },
  {
    id: "task-8",
    teamId: "team-2",
    title: "Enviar documento de solução",
    description: "Redigir documento descrevendo a solução proposta com detalhes técnicos e diagrama de fluxo.",
    stage: 3,
    dueDate: "2026-08-18",
    status: "atrasada",
    files: [],
    createdAt: "2026-08-05",
  },
  {
    id: "task-9",
    teamId: "team-7",
    title: "Entregar VPD final",
    description: "Versão final do Value Proposition Design.",
    stage: 6,
    dueDate: "2026-08-10",
    status: "aprovada",
    files: [
      { id: "f3", name: "VPD_CareBot_final.pdf", size: "3.1 MB", uploadedAt: "2026-08-09", version: 1 },
    ],
    createdAt: "2026-07-25",
  },
  {
    id: "task-10",
    teamId: "team-7",
    title: "Gravar Pitch Vídeo",
    description: "Pitch de apresentação do CareBot.",
    stage: 6,
    dueDate: "2026-08-12",
    status: "aprovada",
    files: [
      { id: "f4", name: "pitch_carebot.mp4", size: "45.2 MB", uploadedAt: "2026-08-11", version: 1 },
    ],
    createdAt: "2026-07-25",
  },
];

export const mockNotes: MentorNote[] = [
  {
    id: "note-1",
    teamId: "team-1",
    authorName: "Ana Beatriz Ramos",
    content: "Equipe demonstrou boa evolução na definição do modelo de negócio. Lucas está liderando bem, mas precisa envolver mais a Fernanda nas decisões técnicas.",
    createdAt: "2026-08-08",
  },
  {
    id: "note-2",
    teamId: "team-3",
    authorName: "Ana Beatriz Ramos",
    content: "Projeto muito sólido. Hardware já funcional. Falta apenas finalizar o pitch e organizar a documentação para submissão.",
    createdAt: "2026-08-15",
  },
  {
    id: "note-3",
    teamId: "team-2",
    authorName: "Dr. Ricardo Ferreira",
    content: "A ideia tem potencial, mas a equipe precisa pesquisar melhor a regulamentação de telemedicina. Sugeri buscar orientação no curso de Direito.",
    createdAt: "2026-08-06",
  },
];

export const mockMentorTeams: Record<string, string[]> = {
  "mentor-1": ["team-1", "team-3", "team-5", "team-7"],
  "mentor-2": ["team-2", "team-4", "team-6", "team-8"],
};

export function getTeamsByMentor(mentorId: string): Team[] {
  const teamIds = mockMentorTeams[mentorId] ?? [];
  return mockTeams.filter((t) => teamIds.includes(t.id));
}

export function getTeamsByStage(stage: JourneyStage): Team[] {
  return mockTeams.filter((t) => t.currentStage === stage);
}

export function getTasksByTeam(teamId: string): Task[] {
  return mockTasks.filter((t) => t.teamId === teamId);
}

export function getNotesByTeam(teamId: string): MentorNote[] {
  return mockNotes.filter((n) => n.teamId === teamId);
}

export function getMentors(): User[] {
  return mockUsers.filter((u) => u.role === "mentor");
}

export function getOverdueTasks(): Task[] {
  return mockTasks.filter((t) => t.status === "atrasada");
}

export function getTeamCountByStage(): Record<JourneyStage, number> {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } as Record<JourneyStage, number>;
  for (const team of mockTeams) {
    counts[team.currentStage]++;
  }
  return counts;
}

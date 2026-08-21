import type { Stage, Team } from "../types";

// ── Etapas do funil ──────────────────────────────────────────
export const STAGES: Stage[] = [
  {
    id: 1,
    name: "Envio da Ideia",
    fullName: "Etapa 1 – Envio da Ideia",
    description: "Aluno preenche o formulário inicial descrevendo a ideia.",
    deliverable: "Cadastro da ideia (formulário)",
    color: "bg-slate-100",
    textColor: "text-slate-700",
  },
  {
    id: 2,
    name: "Contato com a Equipe",
    fullName: "Etapa 2 – Contato com a Equipe",
    description: "Equipe InfoHub analisa a proposta e agenda o 1º encontro.",
    deliverable: "Agendamento confirmado",
    color: "bg-blue-100",
    textColor: "text-blue-700",
  },
  {
    id: 3,
    name: "Encontro 1",
    fullName: "Etapa 3 – Encontro 1: Entendendo a Ideia",
    description: "Mentor e aluno definem problema, público-alvo e solução inicial.",
    deliverable: "Problema, público-alvo e solução definidos",
    color: "bg-indigo-100",
    textColor: "text-indigo-700",
  },
  {
    id: 4,
    name: "Encontro 2",
    fullName: "Etapa 4 – Encontro 2: Proposta de Valor",
    description: "Construção do Value Proposition Design.",
    deliverable: "Value Proposition Design",
    color: "bg-violet-100",
    textColor: "text-violet-700",
  },
  {
    id: 5,
    name: "Encontro 3",
    fullName: "Etapa 5 – Encontro 3: Modelo de Negócio",
    description: "Construção do Business Model Canvas.",
    deliverable: "Business Model Canvas",
    color: "bg-orange-100",
    textColor: "text-orange-700",
  },
  {
    id: 6,
    name: "Pitch e Inscrição",
    fullName: "Etapa 6 – Encontro 4: Pitch e Inscrição",
    description: "Revisão geral, gravação do Pitch Vídeo e conferência de documentos.",
    deliverable: "Pitch Vídeo, Canvas final, VPD final",
    color: "bg-emerald-100",
    textColor: "text-emerald-700",
  },
];

// ── Equipes mock ──────────────────────────────────────────────
export const MOCK_TEAMS: Team[] = [
  {
    id: "t1",
    projectName: "EcoRaízes",
    ideaDescription:
      "Marketplace digital que conecta produtores orgânicos locais diretamente a consumidores da região, eliminando intermediários e reduzindo o desperdício alimentar.",
    area: "Sustentabilidade",
    ideaStage: "protótipo",
    currentStage: 3,
    status: "ativo",
    mentor: "Prof. Carlos Alves",
    semester: "2025/1",
    source: "Redes sociais",
    createdAt: "2025-03-10",
    members: [
      { id: "m1", name: "Ana Oliveira", course: "Administração", email: "ana.oliveira@amf.edu.br", role: "lider" },
      { id: "m2", name: "Breno Souza", course: "Sistemas de Informação", email: "breno.souza@amf.edu.br", role: "integrante" },
      { id: "m3", name: "Camila Ferreira", course: "Design", email: "camila.f@amf.edu.br", role: "integrante" },
    ],
    tasks: [
      {
        id: "tk1",
        title: "Definir o público-alvo",
        description: "Elaborar personas detalhadas dos principais segmentos de consumidores do marketplace.",
        stageId: 3,
        dueDate: "2025-04-15",
        status: "aprovada",
        submissions: [
          { id: "s1", fileName: "personas_ecoraizes_v2.pdf", fileType: "pdf", submittedAt: "2025-04-12", version: 2 },
        ],
        reminderDates: ["2025-04-12", "2025-04-14"],
      },
      {
        id: "tk2",
        title: "Mapa do problema",
        description: "Documentar as principais dores dos produtores e consumidores identificadas na pesquisa.",
        stageId: 3,
        dueDate: "2025-04-22",
        status: "entregue",
        submissions: [
          { id: "s2", fileName: "mapa_problema.pdf", fileType: "pdf", submittedAt: "2025-04-20", version: 1 },
        ],
        reminderDates: ["2025-04-19", "2025-04-21"],
      },
      {
        id: "tk3",
        title: "Value Proposition Design",
        description: "Preencher o canvas de proposta de valor com os dados levantados nos encontros anteriores.",
        stageId: 4,
        dueDate: "2025-05-05",
        status: "pendente",
        submissions: [],
        reminderDates: ["2025-05-02", "2025-05-04"],
      },
    ],
    notes: [
      {
        id: "n1",
        text: "Equipe muito engajada. Ana tem clareza sobre o problema. Precisam desenvolver melhor o pitch para a proposta de valor.",
        author: "Prof. Carlos Alves",
        createdAt: "2025-04-10",
      },
    ],
  },
  {
    id: "t2",
    projectName: "MedAssist",
    ideaDescription:
      "Plataforma de telemedicina voltada para comunidades rurais com baixo acesso a serviços de saúde, integrando IA para triagem inicial de sintomas.",
    area: "Saúde",
    ideaStage: "apenas ideia",
    currentStage: 4,
    status: "ativo",
    mentor: "Profa. Juliana Martins",
    semester: "2025/1",
    source: "Evento da faculdade",
    createdAt: "2025-03-08",
    members: [
      { id: "m4", name: "Diego Lima", course: "Medicina", email: "diego.lima@amf.edu.br", role: "lider" },
      { id: "m5", name: "Fernanda Costa", course: "Tecnologia da Informação", email: "fernanda.c@amf.edu.br", role: "integrante" },
    ],
    tasks: [
      {
        id: "tk4",
        title: "Value Proposition Design",
        description: "Completar o VPD focando nas dores dos pacientes rurais e nos ganhos esperados.",
        stageId: 4,
        dueDate: "2025-04-18",
        status: "atrasada",
        submissions: [],
        adminComment: undefined,
        reminderDates: ["2025-04-15", "2025-04-17"],
      },
      {
        id: "tk5",
        title: "Entrevistas com usuários",
        description: "Realizar ao menos 5 entrevistas com potenciais usuários (pacientes ou agentes de saúde rurais).",
        stageId: 4,
        dueDate: "2025-04-25",
        status: "em_andamento",
        submissions: [],
        reminderDates: ["2025-04-22"],
      },
    ],
    notes: [
      {
        id: "n2",
        text: "Ideia com grande impacto social. Diego precisa de apoio técnico para pensar a viabilidade do MVP. Sugerir parceria com lab de TI.",
        author: "Profa. Juliana Martins",
        createdAt: "2025-04-02",
      },
    ],
  },
  {
    id: "t3",
    projectName: "EduVox",
    ideaDescription:
      "App de podcasts educacionais colaborativos onde professores e alunos co-criam conteúdo em formato de episódios curtos sobre qualquer disciplina.",
    area: "Educação",
    ideaStage: "MVP em desenvolvimento",
    currentStage: 5,
    status: "ativo",
    mentor: "Prof. Carlos Alves",
    semester: "2025/1",
    source: "Indicação de professor",
    createdAt: "2025-02-20",
    members: [
      { id: "m6", name: "Giovana Ramos", course: "Pedagogia", email: "giovana.r@amf.edu.br", role: "lider" },
      { id: "m7", name: "Henrique Pinto", course: "Comunicação Social", email: "henrique.p@amf.edu.br", role: "integrante" },
      { id: "m8", name: "Isabela Neves", course: "Tecnologia da Informação", email: "isabela.n@amf.edu.br", role: "integrante" },
    ],
    tasks: [
      {
        id: "tk6",
        title: "Business Model Canvas",
        description: "Preencher o BMC completo com fontes de receita, parceiros-chave e estrutura de custos definidas.",
        stageId: 5,
        dueDate: "2025-05-02",
        status: "ajustar",
        submissions: [
          { id: "s3", fileName: "bmc_eduvox_v1.pdf", fileType: "pdf", submittedAt: "2025-04-28", version: 1 },
        ],
        adminComment:
          "Bom começo! Revisem a seção de Fontes de Receita — a proposta de monetização por assinatura precisa de validação com o público-alvo. Também detalhem mais os Parceiros-Chave.",
        reminderDates: [],
      },
    ],
    notes: [
      {
        id: "n3",
        text: "Equipe com bom entrosamento. MVP já funcional. Principal desafio é o modelo de receita — discutir freemium vs. licença institucional na próxima sessão.",
        author: "Prof. Carlos Alves",
        createdAt: "2025-04-15",
      },
    ],
  },
  {
    id: "t4",
    projectName: "AgroScan",
    ideaDescription:
      "Sistema de análise de solo via foto de smartphone, usando visão computacional para recomendar adubação ideal e aumentar a produtividade de pequenos agricultores.",
    area: "Agronegócio",
    ideaStage: "MVP pronto",
    currentStage: 6,
    status: "ativo",
    mentor: "Profa. Juliana Martins",
    semester: "2025/1",
    source: "Site da faculdade",
    createdAt: "2025-02-05",
    members: [
      { id: "m9", name: "Lucas Barbosa", course: "Agronomia", email: "lucas.b@amf.edu.br", role: "lider" },
      { id: "m10", name: "Mariana Teixeira", course: "Ciência da Computação", email: "mariana.t@amf.edu.br", role: "integrante" },
    ],
    tasks: [
      {
        id: "tk7",
        title: "Pitch Vídeo",
        description: "Gravar pitch de até 3 minutos apresentando o problema, solução, mercado e diferencial do AgroScan.",
        stageId: 6,
        dueDate: "2025-05-10",
        status: "aprovada",
        submissions: [
          { id: "s4", fileName: "pitch_agroscan_final.mp4", fileType: "video", submittedAt: "2025-05-08", version: 1 },
        ],
        reminderDates: [],
      },
      {
        id: "tk8",
        title: "Canvas Final e VPD Final",
        description: "Versões finais revisadas do Business Model Canvas e Value Proposition Design.",
        stageId: 6,
        dueDate: "2025-05-12",
        status: "aprovada",
        submissions: [
          { id: "s5", fileName: "canvas_vpd_final.pdf", fileType: "pdf", submittedAt: "2025-05-11", version: 1 },
        ],
        reminderDates: [],
      },
    ],
    notes: [
      {
        id: "n4",
        text: "Equipe excepcional. AgroScan tem potencial real de mercado. Recomendar para o InovAMF com avaliação máxima.",
        author: "Profa. Juliana Martins",
        createdAt: "2025-05-09",
      },
    ],
  },
  {
    id: "t5",
    projectName: "FitLoop",
    ideaDescription:
      "Aplicativo de treino personalizado com IA que adapta a intensidade dos exercícios em tempo real com base no desempenho e recuperação do usuário.",
    area: "Saúde",
    ideaStage: "apenas ideia",
    currentStage: 1,
    status: "ativo",
    mentor: undefined,
    semester: "2025/1",
    source: "Instagram",
    createdAt: "2025-04-30",
    members: [
      { id: "m11", name: "Nathan Almeida", course: "Educação Física", email: "nathan.a@amf.edu.br", role: "lider" },
    ],
    tasks: [],
    notes: [],
  },
  {
    id: "t6",
    projectName: "CivicMap",
    ideaDescription:
      "Plataforma de participação cidadã que geolocaliza demandas urbanas e as encaminha automaticamente à prefeitura, com rastreamento público do status de cada solicitação.",
    area: "Tecnologia",
    ideaStage: "protótipo",
    currentStage: 2,
    status: "ativo",
    mentor: undefined,
    semester: "2025/1",
    source: "Palestras e eventos",
    createdAt: "2025-04-22",
    members: [
      { id: "m12", name: "Roberta Carvalho", course: "Direito", email: "roberta.c@amf.edu.br", role: "lider" },
      { id: "m13", name: "Samuel Gomes", course: "Tecnologia da Informação", email: "samuel.g@amf.edu.br", role: "integrante" },
    ],
    tasks: [],
    notes: [],
  },
  {
    id: "t7",
    projectName: "FinJovem",
    ideaDescription:
      "Plataforma gamificada de educação financeira para jovens de 14 a 24 anos, com simulações de investimento, desafios semanais e comunidade de aprendizado.",
    area: "Educação",
    ideaStage: "MVP em desenvolvimento",
    currentStage: 6,
    status: "encaminhado",
    mentor: "Prof. Carlos Alves",
    semester: "2024/2",
    source: "Redes sociais",
    createdAt: "2024-09-15",
    members: [
      { id: "m14", name: "Thais Duarte", course: "Ciências Contábeis", email: "thais.d@amf.edu.br", role: "lider" },
    ],
    tasks: [],
    notes: [],
  },
];

// Equipe do aluno logado (simulação — Ana Oliveira do EcoRaízes)
export const STUDENT_TEAM_ID = "t1";
export const STUDENT_AUTH = {
  role: "student" as const,
  name: "Ana Oliveira",
  email: "ana.oliveira@amf.edu.br",
  teamId: "t1",
};

export const ADMIN_AUTH = {
  role: "admin" as const,
  name: "Coord. InfoHub",
  email: "infohub@amf.edu.br",
};

// Áreas disponíveis
export const AREAS = [
  "Agronegócio",
  "Educação",
  "Saúde",
  "Sustentabilidade",
  "Tecnologia",
  "Turismo",
  "Cultura e Arte",
  "Serviços",
  "Outro",
];

// Semestres disponíveis
export const SEMESTERS = [
  "1º semestre",
  "2º semestre",
  "3º semestre",
  "4º semestre",
  "5º semestre",
  "6º semestre",
  "7º semestre",
  "8º semestre",
  "Pós-graduação",
];

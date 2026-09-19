/**
 * Seed do InfoHub — executado com `npm run db:seed` (prisma db seed).
 *
 * Duas camadas, ambas idempotentes (pode rodar quantas vezes quiser):
 *
 *  1. Dados de referência (sempre): cursos, áreas da ideia, as 6 etapas
 *     padrão da jornada, os modelos de tarefa por etapa e a conta de
 *     administrador (SEED_ADMIN_* no .env).
 *
 *  2. Dados de demonstração (só com SEED_DEMO=true): mentores, equipes em
 *     diferentes etapas, tarefas, entregas, avaliações, lembretes, anotações
 *     e notificações — o suficiente para navegar no sistema inteiro.
 *     Senha de todos os usuários demo: Aluno@123 / Mentor@123.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../backend/src/lib/prisma";
import type {
  EstagioIdeia,
  StatusTarefa,
} from "../backend/src/generated/prisma/client";

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const BCRYPT_ROUNDS = 10;

function diasAtras(dias: number, hora = 9): Date {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, 0, 0, 0);
  return d;
}

function diasAFrente(dias: number, hora = 23): Date {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, 59, 0, 0);
  return d;
}

/** "2026/1" ou "2026/2" a partir da data de ingresso (RF-24). */
function periodoDe(data: Date): string {
  return `${data.getFullYear()}/${data.getMonth() < 6 ? 1 : 2}`;
}

function log(msg: string) {
  console.log(`[seed] ${msg}`);
}

// ---------------------------------------------------------------------------
// 1. Dados de referência
// ---------------------------------------------------------------------------

const CURSOS = [
  "Administração",
  "Ciências Contábeis",
  "Direito",
  "Gastronomia",
  "Hotelaria",
  "Ontopsicologia",
  "Pedagogia",
  "Sistemas de Informação",
];

const AREAS = [
  "Educação",
  "Saúde",
  "Tecnologia",
  "Sustentabilidade",
  "Agronegócio",
  "Finanças",
  "Social",
];

/** Jornada do empreendedor (documento de requisitos, seção "jornada"). */
const ETAPAS_PADRAO = [
  {
    numero: 1,
    nome: "Envio da ideia",
    descricao: "Aluno preenche o formulário inicial contando a ideia.",
    entregavel: "Cadastro da ideia (formulário)",
  },
  {
    numero: 2,
    nome: "Contato com a equipe",
    descricao: "Equipe InfoHub analisa a proposta e agenda o 1º encontro.",
    entregavel: "Agendamento confirmado",
  },
  {
    numero: 3,
    nome: "Encontro 1 – Entendendo a ideia",
    descricao: "Mentor e aluno definem problema, público-alvo e solução inicial.",
    entregavel: "Problema, público-alvo e solução definidos",
  },
  {
    numero: 4,
    nome: "Encontro 2 – Proposta de valor",
    descricao: "Construção do Value Proposition Design.",
    entregavel: "Value Proposition Design",
  },
  {
    numero: 5,
    nome: "Encontro 3 – Modelo de negócio",
    descricao: "Construção do Business Model Canvas.",
    entregavel: "Business Model Canvas",
  },
  {
    numero: 6,
    nome: "Encontro 4 – Pitch e inscrição",
    descricao:
      "Revisão geral, gravação do Pitch Vídeo e conferência de documentos.",
    entregavel:
      "Pitch Vídeo, Canvas final, VPD final e dados de todos os integrantes",
  },
];

/** Modelos de tarefa por etapa (RF-11). Etapa 6 = entregáveis da RN-02. */
const MODELOS_TAREFA = [
  { etapa: 1, ordem: 1, titulo: "Cadastro da ideia", descricao: "Preencher o formulário inicial com os dados da ideia e da equipe.", obrigatoria: true },
  { etapa: 2, ordem: 1, titulo: "Confirmar agendamento do 1º encontro", descricao: "Confirmar data e horário do primeiro encontro com o mentor.", obrigatoria: true },
  { etapa: 3, ordem: 1, titulo: "Definir problema, público-alvo e solução", descricao: "Documentar o problema identificado, o público-alvo e a proposta de solução inicial.", obrigatoria: true },
  { etapa: 4, ordem: 1, titulo: "Enviar Value Proposition Design", descricao: "Construir e enviar o Value Proposition Design da ideia.", obrigatoria: true },
  { etapa: 5, ordem: 1, titulo: "Enviar Business Model Canvas", descricao: "Construir e enviar o Business Model Canvas da ideia.", obrigatoria: true },
  { etapa: 6, ordem: 1, titulo: "Gravar Pitch Vídeo", descricao: "Gravar vídeo de pitch de até 3 minutos apresentando o projeto (upload ou link).", obrigatoria: true },
  { etapa: 6, ordem: 2, titulo: "Entregar Canvas final", descricao: "Versão final do Business Model Canvas após revisões da mentoria.", obrigatoria: true },
  { etapa: 6, ordem: 3, titulo: "Entregar VPD final", descricao: "Versão final do Value Proposition Design após revisões da mentoria.", obrigatoria: true },
  { etapa: 6, ordem: 4, titulo: "Confirmar dados dos integrantes", descricao: "Preencher formulário com dados completos de todos os integrantes para submissão ao InovAMF.", obrigatoria: true },
];

async function seedReferencia() {
  for (const nome of CURSOS) {
    await prisma.curso.upsert({ where: { nome }, update: {}, create: { nome } });
  }
  log(`cursos: ${CURSOS.length}`);

  for (const nome of AREAS) {
    await prisma.areaIdeia.upsert({ where: { nome }, update: {}, create: { nome } });
  }
  log(`áreas da ideia: ${AREAS.length}`);

  for (const etapa of ETAPAS_PADRAO) {
    await prisma.etapaPadrao.upsert({
      where: { numero: etapa.numero },
      update: { nome: etapa.nome, descricao: etapa.descricao, entregavel: etapa.entregavel },
      create: etapa,
    });
  }
  log(`etapas padrão: ${ETAPAS_PADRAO.length}`);

  const etapas = await prisma.etapaPadrao.findMany();
  const etapaPorNumero = new Map(etapas.map((e) => [e.numero, e.id]));

  for (const modelo of MODELOS_TAREFA) {
    const etapaPadraoId = etapaPorNumero.get(modelo.etapa)!;
    const existente = await prisma.modeloTarefa.findFirst({
      where: { etapaPadraoId, titulo: modelo.titulo },
    });
    const dados = {
      etapaPadraoId,
      titulo: modelo.titulo,
      descricao: modelo.descricao,
      obrigatoria: modelo.obrigatoria,
      ordem: modelo.ordem,
    };
    if (existente) {
      await prisma.modeloTarefa.update({ where: { id: existente.id }, data: dados });
    } else {
      await prisma.modeloTarefa.create({ data: dados });
    }
  }
  log(`modelos de tarefa: ${MODELOS_TAREFA.length}`);

  // Conta de administrador (RF-03). A senha só é (re)definida na criação.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@infohub.amf.edu.br";
  const adminNome = process.env.SEED_ADMIN_NOME ?? "Administrador InfoHub";
  const adminSenha = process.env.SEED_ADMIN_SENHA ?? "Admin@123";

  const admin = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: { perfil: "ADMIN", ativo: true },
    create: {
      nome: adminNome,
      email: adminEmail,
      perfil: "ADMIN",
      senhaHash: await bcrypt.hash(adminSenha, BCRYPT_ROUNDS),
      consentimentoLgpdEm: new Date(),
    },
  });
  log(`admin: ${admin.email}`);
  if (!process.env.SEED_ADMIN_SENHA) {
    console.warn(
      "[seed] AVISO: SEED_ADMIN_SENHA não definida — usando a senha padrão. Troque-a antes de expor o sistema.",
    );
  }

  return { admin, etapaPorNumero };
}

// ---------------------------------------------------------------------------
// 2. Dados de demonstração
// ---------------------------------------------------------------------------

type StatusMock =
  | "pendente"
  | "em_andamento"
  | "entregue"
  | "atrasada"
  | "aprovada"
  | "reprovada";

const STATUS_MAP: Record<StatusMock, StatusTarefa> = {
  pendente: "PENDENTE",
  em_andamento: "EM_ANDAMENTO",
  entregue: "ENTREGUE",
  atrasada: "ATRASADA",
  aprovada: "APROVADA",
  reprovada: "REPROVADA",
};

interface PessoaDemo {
  nome: string;
  email: string;
  curso: string;
  semestre?: number;
  telefone?: string;
}

interface ArquivoDemo {
  nome: string;
  tamanhoBytes: number;
  mimeType: string;
  /** dias atrás em que a versão foi enviada */
  enviadoHa: number;
}

interface TarefaDemo {
  titulo: string;
  descricao: string;
  etapa: number;
  /** prazo em dias relativos a hoje (negativo = já passou) */
  prazoEmDias: number;
  status: StatusMock;
  obrigatoria?: boolean;
  /** uma entrada por versão de entrega (RF-16) */
  entregas?: ArquivoDemo[];
  /** link como entrega (Q3) */
  link?: { titulo: string; url: string; enviadoHa: number };
  comentarioAvaliacao?: string;
}

interface EquipeDemo {
  nome: string;
  descricao: string;
  area: string;
  estagioIdeia: EstagioIdeia;
  comoConheceu: string;
  criadaHa: number;
  etapaAtual: number;
  /** dias atrás em que cada etapa concluída foi encerrada (índice 0 = etapa 1) */
  concluidasHa: number[];
  pronta?: boolean;
  lider: PessoaDemo;
  integrantes: PessoaDemo[];
  mentor: string;
  tarefas: TarefaDemo[];
  anotacoes: { autor: string; conteudo: string; ha: number }[];
}

const MENTORES: PessoaDemo[] = [
  { nome: "Ana Beatriz Ramos", email: "ana@amf.edu.br", curso: "" },
  { nome: "Ricardo Ferreira", email: "ricardo@amf.edu.br", curso: "" },
];

const EQUIPES_DEMO: EquipeDemo[] = [
  {
    nome: "EcoTrack",
    descricao:
      "Aplicativo para monitoramento de pegada de carbono pessoal, com gamificação e desafios semanais para reduzir o impacto ambiental.",
    area: "Sustentabilidade",
    estagioIdeia: "PROTOTIPO",
    comoConheceu: "Professor(a) ou coordenação",
    criadaHa: 185,
    etapaAtual: 5,
    concluidasHa: [182, 168, 130, 90],
    lider: { nome: "Lucas Oliveira", email: "lucas@aluno.amf.edu.br", curso: "Sistemas de Informação", semestre: 6, telefone: "(54) 99101-2233" },
    integrantes: [
      { nome: "Fernanda Lima", email: "fernanda@aluno.amf.edu.br", curso: "Administração", semestre: 4 },
      { nome: "João Pedro Martins", email: "joao@aluno.amf.edu.br", curso: "Administração", semestre: 4 },
    ],
    mentor: "ana@amf.edu.br",
    tarefas: [
      {
        titulo: "Validar Value Proposition Design",
        descricao: "Ajustar o VPD com base no feedback do mentor e reenviar a versão final.",
        etapa: 4,
        prazoEmDias: -30,
        status: "aprovada",
        entregas: [
          { nome: "VPD_EcoTrack_v1.pdf", tamanhoBytes: 2_100_000, mimeType: "application/pdf", enviadoHa: 40 },
          { nome: "VPD_EcoTrack_v2.pdf", tamanhoBytes: 2_400_000, mimeType: "application/pdf", enviadoHa: 32 },
        ],
        comentarioAvaliacao: "Versão 2 ficou clara e alinhada ao público-alvo. Aprovado.",
      },
      {
        titulo: "Enviar Business Model Canvas",
        descricao: "Preencher e enviar o Business Model Canvas conforme modelo discutido na mentoria.",
        etapa: 5,
        prazoEmDias: 7,
        status: "pendente",
      },
    ],
    anotacoes: [
      { autor: "ana@amf.edu.br", conteudo: "Equipe demonstrou boa evolução na definição do modelo de negócio. Lucas está liderando bem, mas precisa envolver mais a Fernanda nas decisões técnicas.", ha: 10 },
    ],
  },
  {
    nome: "MedConnect",
    descricao:
      "Plataforma que conecta pacientes em áreas rurais com médicos via telemedicina, utilizando IA para triagem inicial.",
    area: "Saúde",
    estagioIdeia: "APENAS_IDEIA",
    comoConheceu: "Colega de curso",
    criadaHa: 140,
    etapaAtual: 3,
    concluidasHa: [137, 120],
    lider: { nome: "Mariana Santos", email: "mariana@aluno.amf.edu.br", curso: "Administração", semestre: 4, telefone: "(54) 99202-3344" },
    integrantes: [
      { nome: "Carlos Eduardo Pinto", email: "carloseduardo@aluno.amf.edu.br", curso: "Sistemas de Informação", semestre: 3 },
    ],
    mentor: "ricardo@amf.edu.br",
    tarefas: [
      {
        titulo: "Definir problema e público-alvo",
        descricao: "Após o primeiro encontro, documentar o problema identificado, público-alvo e proposta de solução inicial.",
        etapa: 3,
        prazoEmDias: 5,
        status: "em_andamento",
      },
      {
        titulo: "Enviar documento de solução",
        descricao: "Redigir documento descrevendo a solução proposta com detalhes técnicos e diagrama de fluxo.",
        etapa: 3,
        prazoEmDias: -3,
        status: "atrasada",
      },
    ],
    anotacoes: [
      { autor: "ricardo@amf.edu.br", conteudo: "A ideia tem potencial, mas a equipe precisa pesquisar melhor a regulamentação de telemedicina. Sugeri buscar orientação no curso de Direito.", ha: 15 },
    ],
  },
  {
    nome: "AgroSense",
    descricao:
      "Sensores IoT de baixo custo para pequenos produtores rurais monitorarem umidade do solo e condições climáticas.",
    area: "Agronegócio",
    estagioIdeia: "MVP_EM_DESENVOLVIMENTO",
    comoConheceu: "Evento da faculdade",
    criadaHa: 210,
    etapaAtual: 6,
    concluidasHa: [207, 190, 155, 115, 75],
    lider: { nome: "Pedro Henrique Costa", email: "pedro@aluno.amf.edu.br", curso: "Sistemas de Informação", semestre: 8, telefone: "(54) 99303-4455" },
    integrantes: [
      { nome: "Ana Clara Souza", email: "anaclara@aluno.amf.edu.br", curso: "Ontopsicologia", semestre: 5 },
      { nome: "Rafael Torres", email: "rafael@aluno.amf.edu.br", curso: "Sistemas de Informação", semestre: 8 },
      { nome: "Isabela Rocha", email: "isabela@aluno.amf.edu.br", curso: "Pedagogia", semestre: 2 },
    ],
    mentor: "ana@amf.edu.br",
    tarefas: [
      {
        titulo: "Gravar Pitch Vídeo",
        descricao: "Gravar vídeo de pitch de até 3 minutos apresentando o projeto AgroSense, problema, solução e modelo de negócio.",
        etapa: 6,
        prazoEmDias: 4,
        status: "pendente",
      },
      {
        titulo: "Entregar Canvas final",
        descricao: "Versão final do Business Model Canvas após revisões da mentoria.",
        etapa: 6,
        prazoEmDias: 4,
        status: "entregue",
        entregas: [
          { nome: "BMC_AgroSense_final.pdf", tamanhoBytes: 1_800_000, mimeType: "application/pdf", enviadoHa: 1 },
        ],
      },
      {
        titulo: "Confirmar dados dos integrantes",
        descricao: "Preencher formulário com dados completos de todos os integrantes para submissão ao InovAMF.",
        etapa: 6,
        prazoEmDias: 5,
        status: "pendente",
      },
    ],
    anotacoes: [
      { autor: "ana@amf.edu.br", conteudo: "Projeto muito sólido. Hardware já funcional. Falta apenas finalizar o pitch e organizar a documentação para submissão.", ha: 3 },
    ],
  },
  {
    nome: "FinLit",
    descricao:
      "App de educação financeira gamificado para jovens universitários, com simulações de investimento e controle de gastos.",
    area: "Finanças",
    estagioIdeia: "APENAS_IDEIA",
    comoConheceu: "Redes sociais",
    criadaHa: 8,
    etapaAtual: 1,
    concluidasHa: [],
    lider: { nome: "Gabriela Mendes", email: "gabriela@aluno.amf.edu.br", curso: "Ciências Contábeis", semestre: 2, telefone: "(54) 99404-5566" },
    integrantes: [],
    mentor: "ricardo@amf.edu.br",
    tarefas: [],
    anotacoes: [],
  },
  {
    nome: "StudyBuddy",
    descricao:
      "Plataforma de estudo colaborativo com IA que sugere grupos de estudo e materiais personalizados por curso.",
    area: "Educação",
    estagioIdeia: "PROTOTIPO",
    comoConheceu: "Professor(a) ou coordenação",
    criadaHa: 120,
    etapaAtual: 4,
    concluidasHa: [117, 102, 65],
    lider: { nome: "Thiago Nascimento", email: "thiago@aluno.amf.edu.br", curso: "Sistemas de Informação", semestre: 5, telefone: "(54) 99505-6677" },
    integrantes: [
      { nome: "Camila Andrade", email: "camila@aluno.amf.edu.br", curso: "Pedagogia", semestre: 6 },
    ],
    mentor: "ana@amf.edu.br",
    tarefas: [
      {
        titulo: "Enviar Value Proposition Design",
        descricao: "Construir e enviar o Value Proposition Design do projeto StudyBuddy.",
        etapa: 4,
        prazoEmDias: 10,
        status: "reprovada",
        entregas: [
          { nome: "VPD_StudyBuddy_v1.pdf", tamanhoBytes: 1_200_000, mimeType: "application/pdf", enviadoHa: 2 },
        ],
        comentarioAvaliacao: "O segmento de clientes está genérico demais. Detalhem as dores de alunos de primeiro ano e reenviem.",
      },
    ],
    anotacoes: [],
  },
  {
    nome: "ReciclAí",
    descricao:
      "Marketplace para venda de materiais recicláveis, conectando catadores a empresas de reciclagem com logística integrada.",
    area: "Sustentabilidade",
    estagioIdeia: "APENAS_IDEIA",
    comoConheceu: "Site da AMF",
    criadaHa: 75,
    etapaAtual: 2,
    concluidasHa: [72],
    lider: { nome: "Juliana Ferreira", email: "juliana@aluno.amf.edu.br", curso: "Administração", semestre: 3, telefone: "(54) 99606-7788" },
    integrantes: [
      { nome: "Bruno Almeida", email: "bruno@aluno.amf.edu.br", curso: "Hotelaria", semestre: 3 },
    ],
    mentor: "ricardo@amf.edu.br",
    tarefas: [
      {
        titulo: "Confirmar agendamento do 1º encontro",
        descricao: "Confirmar data e horário do primeiro encontro com o mentor.",
        etapa: 2,
        prazoEmDias: 2,
        status: "pendente",
      },
    ],
    anotacoes: [],
  },
  {
    nome: "CareBot",
    descricao:
      "Chatbot de saúde mental para universitários, com exercícios de mindfulness e encaminhamento para profissionais.",
    area: "Saúde",
    estagioIdeia: "MVP_PRONTO",
    comoConheceu: "Colega de curso",
    criadaHa: 250,
    etapaAtual: 6,
    concluidasHa: [247, 232, 200, 160, 120],
    pronta: true,
    lider: { nome: "Amanda Ribeiro", email: "amanda@aluno.amf.edu.br", curso: "Ontopsicologia", semestre: 7, telefone: "(54) 99707-8899" },
    integrantes: [
      { nome: "Diego Monteiro", email: "diego@aluno.amf.edu.br", curso: "Sistemas de Informação", semestre: 7 },
      { nome: "Letícia Barbosa", email: "leticia@aluno.amf.edu.br", curso: "Ontopsicologia", semestre: 5 },
    ],
    mentor: "ana@amf.edu.br",
    tarefas: [
      {
        titulo: "Entregar VPD final",
        descricao: "Versão final do Value Proposition Design.",
        etapa: 6,
        prazoEmDias: -40,
        status: "aprovada",
        entregas: [
          { nome: "VPD_CareBot_final.pdf", tamanhoBytes: 3_100_000, mimeType: "application/pdf", enviadoHa: 41 },
        ],
        comentarioAvaliacao: "Excelente. Pronto para o InovAMF.",
      },
      {
        titulo: "Entregar Canvas final",
        descricao: "Versão final do Business Model Canvas.",
        etapa: 6,
        prazoEmDias: -40,
        status: "aprovada",
        entregas: [
          { nome: "BMC_CareBot_final.pdf", tamanhoBytes: 1_900_000, mimeType: "application/pdf", enviadoHa: 41 },
        ],
        comentarioAvaliacao: "Aprovado.",
      },
      {
        titulo: "Gravar Pitch Vídeo",
        descricao: "Pitch de apresentação do CareBot.",
        etapa: 6,
        prazoEmDias: -38,
        status: "aprovada",
        link: { titulo: "Pitch CareBot (YouTube)", url: "https://youtu.be/exemplo-carebot", enviadoHa: 39 },
        comentarioAvaliacao: "Pitch objetivo e dentro do tempo. Aprovado.",
      },
      {
        titulo: "Confirmar dados dos integrantes",
        descricao: "Dados completos de todos os integrantes para submissão ao InovAMF.",
        etapa: 6,
        prazoEmDias: -38,
        status: "aprovada",
        comentarioAvaliacao: "Conferido.",
      },
    ],
    anotacoes: [],
  },
  {
    nome: "SmartCampus",
    descricao:
      "Sistema de navegação interna para o campus com acessibilidade para deficientes visuais usando beacons bluetooth.",
    area: "Tecnologia",
    estagioIdeia: "APENAS_IDEIA",
    comoConheceu: "Outro",
    criadaHa: 2,
    etapaAtual: 1,
    concluidasHa: [],
    lider: { nome: "Felipe Cardoso", email: "felipe@aluno.amf.edu.br", curso: "Sistemas de Informação", semestre: 1, telefone: "(54) 99808-9900" },
    integrantes: [],
    mentor: "ricardo@amf.edu.br",
    tarefas: [],
    anotacoes: [],
  },
];

async function seedDemo(adminId: string, etapaPorNumero: Map<number, string>) {
  const jaExiste = await prisma.usuario.findUnique({ where: { email: EQUIPES_DEMO[0].lider.email } });
  if (jaExiste) {
    log("dados de demonstração já existem — pulando (use `npm run db:reset` para recriar)");
    return;
  }

  const cursos = new Map((await prisma.curso.findMany()).map((c) => [c.nome, c.id]));
  const areas = new Map((await prisma.areaIdeia.findMany()).map((a) => [a.nome, a.id]));
  const etapasPadrao = await prisma.etapaPadrao.findMany({ orderBy: { numero: "asc" } });
  const modelos = await prisma.modeloTarefa.findMany();

  const senhaAluno = await bcrypt.hash("Aluno@123", BCRYPT_ROUNDS);
  const senhaMentor = await bcrypt.hash("Mentor@123", BCRYPT_ROUNDS);

  // Mentores (RF-03)
  const mentorPorEmail = new Map<string, string>();
  for (const m of MENTORES) {
    const mentor = await prisma.usuario.upsert({
      where: { email: m.email },
      update: {},
      create: {
        nome: m.nome,
        email: m.email,
        perfil: "MENTOR",
        senhaHash: senhaMentor,
        consentimentoLgpdEm: diasAtras(300),
      },
    });
    mentorPorEmail.set(m.email, mentor.id);
  }
  log(`mentores: ${MENTORES.length}`);

  for (const eq of EQUIPES_DEMO) {
    const criadaEm = diasAtras(eq.criadaHa);

    const criarAluno = (p: PessoaDemo) =>
      prisma.usuario.create({
        data: {
          nome: p.nome,
          email: p.email,
          perfil: "ALUNO",
          senhaHash: senhaAluno,
          telefone: p.telefone,
          semestre: p.semestre,
          cursoId: cursos.get(p.curso),
          consentimentoLgpdEm: criadaEm,
          criadoEm: criadaEm,
        },
      });

    const lider = await criarAluno(eq.lider);
    const integrantes: Awaited<ReturnType<typeof criarAluno>>[] = [];
    for (const p of eq.integrantes) integrantes.push(await criarAluno(p));

    // Equipe + jornada (cópia das 6 etapas padrão) em uma transação, como o
    // serviço de cadastro fará (RF-05).
    const equipe = await prisma.$transaction(async (tx) => {
      const equipe = await tx.equipe.create({
        data: {
          nome: eq.nome,
          descricao: eq.descricao,
          areaId: areas.get(eq.area)!,
          estagioIdeia: eq.estagioIdeia,
          comoConheceu: eq.comoConheceu,
          periodoIngresso: periodoDe(criadaEm),
          liderId: lider.id,
          criadoEm: criadaEm,
          integrantes: {
            create: [lider, ...integrantes].map((u) => ({ usuarioId: u.id, entrouEm: criadaEm })),
          },
          mentores: { create: { mentorId: mentorPorEmail.get(eq.mentor)!, atribuidoEm: diasAtras(eq.criadaHa - 2) } },
        },
      });

      const etapas = [];
      for (const ep of etapasPadrao) {
        etapas.push(
          await tx.etapaEquipe.create({
            data: {
              equipeId: equipe.id,
              ordem: ep.numero,
              etapaPadraoId: ep.id,
              nome: ep.nome,
              descricao: ep.descricao,
              criadoEm: criadaEm,
            },
          }),
        );
      }

      // Histórico (RF-08/RF-09): início na etapa 1 e um avanço por etapa concluída.
      await tx.historicoEtapa.create({
        data: {
          equipeId: equipe.id,
          paraEtapaId: etapas[0].id,
          direcao: "INICIO",
          criadoEm: criadaEm,
        },
      });
      for (const [i, ha] of eq.concluidasHa.entries()) {
        await tx.historicoEtapa.create({
          data: {
            equipeId: equipe.id,
            deEtapaId: etapas[i].id,
            paraEtapaId: etapas[i + 1].id,
            direcao: "AVANCO",
            alteradoPorId: mentorPorEmail.get(eq.mentor),
            criadoEm: diasAtras(ha),
          },
        });
      }

      const etapaAtual = etapas[eq.etapaAtual - 1];
      return tx.equipe.update({
        where: { id: equipe.id },
        data: {
          etapaAtualId: etapaAtual.id,
          statusJornada: eq.pronta ? "PRONTA_INOVAMF" : "EM_ANDAMENTO",
          prontaEm: eq.pronta ? diasAtras(30) : null,
        },
        include: { etapas: true },
      });
    });

    const etapaEquipePorNumero = new Map(equipe.etapas.map((e) => [e.ordem, e.id]));
    const mentorId = mentorPorEmail.get(eq.mentor)!;

    // Tarefas, entregas versionadas, avaliações e lembretes
    for (const t of eq.tarefas) {
      const modelo = modelos.find(
        (m) => m.titulo === t.titulo && m.etapaPadraoId === etapaPorNumero.get(t.etapa),
      );
      const prazo = diasAFrente(t.prazoEmDias);
      const tarefa = await prisma.tarefa.create({
        data: {
          equipeId: equipe.id,
          etapaEquipeId: etapaEquipePorNumero.get(t.etapa)!,
          modeloTarefaId: modelo?.id,
          titulo: t.titulo,
          descricao: t.descricao,
          prazo,
          status: STATUS_MAP[t.status],
          obrigatoria: t.obrigatoria ?? true,
          criadoPorId: mentorId,
          criadoEm: diasAtras(Math.max(t.prazoEmDias * -1 + 14, 14)),
        },
      });

      let ultimaEntregaId: string | null = null;
      let versao = 0;
      for (const arq of t.entregas ?? []) {
        versao += 1;
        const entrega = await prisma.entrega.create({
          data: {
            tarefaId: tarefa.id,
            versao,
            enviadoPorId: lider.id,
            enviadoEm: diasAtras(arq.enviadoHa),
            anexos: {
              create: {
                tipo: "ARQUIVO",
                nomeOriginal: arq.nome,
                caminhoArmazenamento: `demo/${equipe.id}/${versao}-${arq.nome}`,
                tamanhoBytes: arq.tamanhoBytes,
                mimeType: arq.mimeType,
              },
            },
          },
        });
        ultimaEntregaId = entrega.id;
      }
      if (t.link) {
        versao += 1;
        const entrega = await prisma.entrega.create({
          data: {
            tarefaId: tarefa.id,
            versao,
            enviadoPorId: lider.id,
            enviadoEm: diasAtras(t.link.enviadoHa),
            anexos: { create: { tipo: "LINK", nomeOriginal: t.link.titulo, url: t.link.url } },
          },
        });
        ultimaEntregaId = entrega.id;
      }

      if (t.comentarioAvaliacao) {
        await prisma.comentarioTarefa.create({
          data: {
            tarefaId: tarefa.id,
            entregaId: ultimaEntregaId,
            autorId: mentorId,
            decisao: t.status === "aprovada" ? "APROVADA" : "REPROVADA",
            conteudo: t.comentarioAvaliacao,
          },
        });
      }

      // Lembrete "3 dias antes" nas tarefas ainda abertas (RF-17)
      if (["pendente", "em_andamento", "reprovada"].includes(t.status)) {
        const lembrarEm = new Date(prazo);
        lembrarEm.setDate(lembrarEm.getDate() - 3);
        lembrarEm.setHours(9, 0, 0, 0);
        await prisma.lembreteTarefa.create({
          data: { tarefaId: tarefa.id, diasAntes: 3, lembrarEm },
        });
      }
    }

    for (const a of eq.anotacoes) {
      await prisma.anotacaoMentoria.create({
        data: {
          equipeId: equipe.id,
          autorId: mentorPorEmail.get(a.autor),
          conteudo: a.conteudo,
          criadoEm: diasAtras(a.ha),
        },
      });
    }

    // Registro do e-mail que o cadastro dispara ao admin (RF-05/RF-19),
    // já com a chave de idempotência no formato que o serviço usará.
    await prisma.notificacao.create({
      data: {
        tipo: "NOVO_CADASTRO",
        destinatarioId: adminId,
        emailDestino: (await prisma.usuario.findUniqueOrThrow({ where: { id: adminId } })).email,
        assunto: `Nova ideia cadastrada: ${eq.nome}`,
        corpo: `${eq.lider.nome} cadastrou a ideia "${eq.nome}" no InfoHub.`,
        chaveIdempotencia: `NOVO_CADASTRO:equipe:${equipe.id}:usuario:${adminId}`,
        status: "ENVIADA",
        tentativas: 1,
        enviadaEm: criadaEm,
        equipeId: equipe.id,
        criadoEm: criadaEm,
      },
    });

    await prisma.registroAuditoria.create({
      data: {
        usuarioId: lider.id,
        acao: "EQUIPE_CADASTRADA",
        entidade: "equipe",
        entidadeId: equipe.id,
        detalhes: { nome: eq.nome, integrantes: eq.integrantes.length + 1 },
        criadoEm: criadaEm,
      },
    });

    log(`equipe "${eq.nome}" (etapa ${eq.etapaAtual}, ${eq.tarefas.length} tarefas)`);
  }
}

// ---------------------------------------------------------------------------

async function main() {
  const { admin, etapaPorNumero } = await seedReferencia();

  if (process.env.SEED_DEMO === "true") {
    await seedDemo(admin.id, etapaPorNumero);
  } else {
    log("SEED_DEMO != true — dados de demonstração não criados");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    log("concluído");
  })
  .catch(async (erro) => {
    console.error("[seed] falhou:", erro);
    await prisma.$disconnect();
    process.exit(1);
  });

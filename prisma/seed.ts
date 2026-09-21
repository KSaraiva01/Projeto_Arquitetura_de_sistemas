/**
 * Seed do InfoHub — roda em TODO deploy (`npm start`) e em `npm run db:seed`.
 *
 * Duas camadas, ambas idempotentes (pode rodar quantas vezes quiser):
 *
 *  1. Dados de referência (sempre): cursos, áreas da ideia, as 6 etapas
 *     padrão da jornada, os modelos de tarefa por etapa e a conta de
 *     administrador (SEED_ADMIN_* no .env).
 *
 *  2. Cenário de demonstração da G1 (a menos que SEED_DEMO=false) — exatamente
 *     o que o professor pediu para a avaliação:
 *       • 3 equipes com ao menos 3 integrantes cada, sendo 1 líder por equipe;
 *       • 1 administrador e 4 mentores — um mentor atende 2 equipes, outro
 *         atende a terceira (os outros dois ficam livres para o admin atribuir);
 *       • 2 equipes com a Etapa 1 aprovada, cursando a Etapa 2;
 *       • 1 equipe com tarefa de prazo atrasado.
 *     Tudo é gravado como se tivesse passado pelos fluxos do sistema: histórico
 *     de etapas, entregas com arquivo real, avaliações, lembretes, notificações
 *     (já ENVIADAS, com as mesmas chaves de idempotência dos serviços) e
 *     auditoria. Se a demo já existir, ela é pulada — um redeploy não desfaz o
 *     que foi mexido na apresentação (`npm run db:reset` recria do zero).
 *     Senhas: Mentor@123 (mentores) e Aluno@123 (alunos).
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { env } from "../backend/src/config/env";
import type { EstagioIdeia, Prisma, StatusTarefa, TipoNotificacao } from "../backend/src/generated/prisma/client";
import { prisma } from "../backend/src/lib/prisma";
import { dataDoLembrete } from "../backend/src/shared/datas";
import {
  emailEntregaAvaliada,
  emailEntregaRecebida,
  emailNovaTarefa,
  emailNovoCadastro,
  emailPrazoProximo,
  emailPrazoVencido,
  emailTarefaAtrasada,
  type ModeloEmail,
} from "../backend/src/shared/email/templates";

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const BCRYPT_ROUNDS = 10;

/** N dias atrás, em um horário "de expediente" (9h por padrão). */
function diasAtras(dias: number, hora = 9, minuto = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, minuto, 0, 0);
  return d;
}

/** Prazo de tarefa: fim do dia (23:59:59.999), como `fimDoDia` faz na API. Negativo = já passou. */
function prazoEm(dias: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(23, 59, 59, 999);
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

  return { admin };
}

// ---------------------------------------------------------------------------
// 2. Cenário de demonstração (G1)
// ---------------------------------------------------------------------------

interface PessoaDemo {
  nome: string;
  email: string;
  curso?: string;
  semestre?: number;
  telefone?: string;
}

interface TarefaDemo {
  /** Título de um modelo de tarefa (MODELOS_TAREFA) — a tarefa nasce dele. */
  modelo: string;
  /** Número da etapa padrão em que a tarefa fica. */
  etapa: number;
  /** Dias atrás em que o mentor criou a tarefa. */
  criadaHa: number;
  /** Prazo em dias a partir de hoje (negativo = já venceu). */
  prazoEmDias: number;
  status: StatusTarefa;
  /** Entrega do líder (RF-14): um PDF real gravado em UPLOADS_DIR + observação. */
  entrega?: { ha: number; arquivo: string; observacao: string; conteudo: string[] };
  /** Avaliação do mentor sobre a entrega (RF-15). */
  avaliacao?: { ha: number; decisao: "APROVADA" | "REPROVADA"; comentario: string };
}

interface EquipeDemo {
  nome: string;
  descricao: string;
  area: string;
  estagioIdeia: EstagioIdeia;
  comoConheceu: string;
  /** Dias atrás em que o líder cadastrou a ideia (RF-05). */
  cadastradaHa: number;
  /** E-mail do mentor responsável (RF-06). */
  mentor: string;
  lider: PessoaDemo;
  integrantes: PessoaDemo[];
  /** Quando houver, o mentor avançou a equipe da etapa 1 para a 2 há N dias (RF-09). */
  avancouParaEtapa2Ha?: number;
  tarefas: TarefaDemo[];
  anotacoes: { ha: number; conteudo: string }[];
}

/**
 * 4 mentores: Ana atende EcoTrack e MedConnect; Ricardo atende a AgroSense;
 * Paula e Marcos ficam sem equipe (o admin pode atribuí-los ao vivo — RF-06).
 */
const MENTORES: PessoaDemo[] = [
  { nome: "Ana Beatriz Ramos", email: "ana@amf.edu.br", telefone: "(55) 99101-1001" },
  { nome: "Ricardo Ferreira", email: "ricardo@amf.edu.br", telefone: "(55) 99102-1002" },
  { nome: "Paula Andrade", email: "paula@amf.edu.br", telefone: "(55) 99103-1003" },
  { nome: "Marcos Vieira", email: "marcos@amf.edu.br", telefone: "(55) 99104-1004" },
];

const EQUIPES_DEMO: EquipeDemo[] = [
  // Etapa 1 aprovada → cursando a etapa 2, com a tarefa da etapa 2 em aberto.
  {
    nome: "EcoTrack",
    descricao:
      "Aplicativo para monitoramento de pegada de carbono pessoal, com gamificação e desafios semanais para reduzir o impacto ambiental.",
    area: "Sustentabilidade",
    estagioIdeia: "PROTOTIPO",
    comoConheceu: "Professor(a) ou coordenação",
    cadastradaHa: 20,
    mentor: "ana@amf.edu.br",
    lider: { nome: "Lucas Oliveira", email: "lucas@aluno.amf.edu.br", curso: "Sistemas de Informação", semestre: 6, telefone: "(55) 99201-2001" },
    integrantes: [
      { nome: "Fernanda Lima", email: "fernanda@aluno.amf.edu.br", curso: "Administração", semestre: 4, telefone: "(55) 99201-2002" },
      { nome: "João Pedro Martins", email: "joao@aluno.amf.edu.br", curso: "Administração", semestre: 4 },
    ],
    avancouParaEtapa2Ha: 12,
    tarefas: [
      {
        modelo: "Cadastro da ideia",
        etapa: 1,
        criadaHa: 19,
        prazoEmDias: -13,
        status: "APROVADA",
        entrega: {
          ha: 14,
          arquivo: "Formulario_ideia_EcoTrack.pdf",
          observacao: "Segue o formulário da ideia preenchido conforme orientação da mentoria.",
          conteudo: [
            "Problema: as pessoas não sabem quanto CO2 as escolhas do dia a dia geram.",
            "Solução: app que registra deslocamentos, consumo e alimentação e calcula a pegada semanal.",
            "Público-alvo: universitários de 18 a 30 anos preocupados com sustentabilidade.",
            "Diferencial: gamificação com desafios semanais e ranking entre amigos.",
            "Equipe: Lucas Oliveira (líder), Fernanda Lima e João Pedro Martins.",
          ],
        },
        avaliacao: { ha: 12, decisao: "APROVADA", comentario: "Ideia bem descrita, problema e público-alvo claros. Aprovado — vamos para o contato com a equipe." },
      },
      { modelo: "Confirmar agendamento do 1º encontro", etapa: 2, criadaHa: 12, prazoEmDias: 5, status: "PENDENTE" },
    ],
    anotacoes: [
      { ha: 12, conteudo: "Equipe engajada e com protótipo navegável. Sugeri validar a proposta com 10 alunos antes do 1º encontro." },
    ],
  },
  // Etapa 1 aprovada → cursando a etapa 2, mas a tarefa da etapa 2 venceu sem entrega (ATRASADA).
  {
    nome: "MedConnect",
    descricao:
      "Plataforma que conecta pacientes em áreas rurais com médicos via telemedicina, utilizando IA para triagem inicial.",
    area: "Saúde",
    estagioIdeia: "APENAS_IDEIA",
    comoConheceu: "Colega de curso",
    cadastradaHa: 25,
    mentor: "ana@amf.edu.br",
    lider: { nome: "Mariana Santos", email: "mariana@aluno.amf.edu.br", curso: "Administração", semestre: 4, telefone: "(55) 99202-2001" },
    integrantes: [
      { nome: "Carlos Eduardo Pinto", email: "carloseduardo@aluno.amf.edu.br", curso: "Sistemas de Informação", semestre: 3 },
      { nome: "Beatriz Nunes", email: "beatriz@aluno.amf.edu.br", curso: "Direito", semestre: 5, telefone: "(55) 99202-2003" },
    ],
    avancouParaEtapa2Ha: 18,
    tarefas: [
      {
        modelo: "Cadastro da ideia",
        etapa: 1,
        criadaHa: 24,
        prazoEmDias: -19,
        status: "APROVADA",
        entrega: {
          ha: 20,
          arquivo: "Formulario_ideia_MedConnect.pdf",
          observacao: "Formulário completo. Ainda estamos pesquisando a regulamentação de telemedicina.",
          conteudo: [
            "Problema: pacientes de áreas rurais viajam horas para uma consulta simples.",
            "Solução: plataforma de telemedicina com triagem inicial por IA e agenda de médicos parceiros.",
            "Público-alvo: moradores de municípios sem atendimento especializado.",
            "Modelo: assinatura mensal para prefeituras e cooperativas de saúde.",
            "Equipe: Mariana Santos (líder), Carlos Eduardo Pinto e Beatriz Nunes.",
          ],
        },
        avaliacao: { ha: 18, decisao: "APROVADA", comentario: "Boa descrição do problema. Aprovado; tragam a pesquisa sobre regulamentação para o 1º encontro." },
      },
      { modelo: "Confirmar agendamento do 1º encontro", etapa: 2, criadaHa: 18, prazoEmDias: -4, status: "ATRASADA" },
    ],
    anotacoes: [
      { ha: 18, conteudo: "A ideia tem potencial, mas a equipe precisa entender a regulamentação de telemedicina. Sugeri orientação no curso de Direito." },
    ],
  },
  // Etapa 1: formulário entregue, aguardando a avaliação do mentor (RN-01 ao vivo: aprovar → avançar).
  {
    nome: "AgroSense",
    descricao:
      "Sensores IoT de baixo custo para pequenos produtores rurais monitorarem umidade do solo e condições climáticas.",
    area: "Agronegócio",
    estagioIdeia: "MVP_EM_DESENVOLVIMENTO",
    comoConheceu: "Evento da faculdade",
    cadastradaHa: 9,
    mentor: "ricardo@amf.edu.br",
    lider: { nome: "Pedro Henrique Costa", email: "pedro@aluno.amf.edu.br", curso: "Sistemas de Informação", semestre: 8, telefone: "(55) 99203-2001" },
    integrantes: [
      { nome: "Ana Clara Souza", email: "anaclara@aluno.amf.edu.br", curso: "Ontopsicologia", semestre: 5 },
      { nome: "Rafael Torres", email: "rafael@aluno.amf.edu.br", curso: "Sistemas de Informação", semestre: 8, telefone: "(55) 99203-2003" },
      { nome: "Isabela Rocha", email: "isabela@aluno.amf.edu.br", curso: "Pedagogia", semestre: 2 },
    ],
    tarefas: [
      {
        modelo: "Cadastro da ideia",
        etapa: 1,
        criadaHa: 8,
        prazoEmDias: 3,
        status: "ENTREGUE",
        entrega: {
          ha: 1,
          arquivo: "Formulario_ideia_AgroSense.pdf",
          observacao: "Segue o formulário completo da ideia. O protótipo do sensor já está funcionando em bancada.",
          conteudo: [
            "Problema: pequenos produtores irrigam no palpite e perdem safra por excesso ou falta de água.",
            "Solução: sensor de umidade e clima de baixo custo com alertas no celular.",
            "Público-alvo: produtores familiares da região central do RS.",
            "Estágio: MVP em desenvolvimento — 3 sensores em teste em uma propriedade parceira.",
            "Equipe: Pedro Henrique Costa (líder), Ana Clara Souza, Rafael Torres e Isabela Rocha.",
          ],
        },
      },
    ],
    anotacoes: [],
  },
];

// --- Arquivo real para as entregas ------------------------------------------

function escaparPdf(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * PDF de uma página, válido, só com texto. Assim a entrega de demonstração
 * tem um arquivo de verdade para o mentor baixar (RF-14) — sem depender de
 * binários no repositório.
 */
function pdfSimples(titulo: string, linhas: string[]): Buffer {
  const conteudo = [
    "BT",
    "/F1 18 Tf 56 780 Td",
    `(${escaparPdf(titulo)}) Tj`,
    "/F1 11 Tf 0 -30 Td 16 TL",
    ...linhas.map((linha) => `(${escaparPdf(linha)}) '`),
    "ET",
  ].join("\n");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(conteudo, "latin1")} >>\nstream\n${conteudo}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];

  let corpo = "%PDF-1.4\n";
  const offsets: number[] = [];
  objetos.forEach((objeto, i) => {
    offsets.push(Buffer.byteLength(corpo, "latin1"));
    corpo += `${i + 1} 0 obj\n${objeto}\nendobj\n`;
  });
  const inicioXref = Buffer.byteLength(corpo, "latin1");
  corpo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) corpo += `${String(offset).padStart(10, "0")} 00000 n \n`;
  corpo += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return Buffer.from(corpo, "latin1");
}

/**
 * Grava o PDF em UPLOADS_DIR/demo e devolve o caminho relativo (o que vai para
 * o banco). Se a pasta não for gravável (volume montado com outro dono, por
 * exemplo), avisa e segue: o cenário fica completo e só o download desse
 * anexo responde "arquivo não disponível" — o deploy nunca cai por isso.
 */
function gravarArquivoDemo(nome: string, titulo: string, linhas: string[]): { caminho: string; tamanhoBytes: number } {
  const pdf = pdfSimples(titulo, linhas);
  const pasta = path.join(env.uploadsDir, "demo");
  try {
    fs.mkdirSync(pasta, { recursive: true });
    fs.writeFileSync(path.join(pasta, nome), pdf);
  } catch (erro) {
    console.warn(
      `[seed] AVISO: não consegui gravar ${path.join(pasta, nome)} (${erro instanceof Error ? erro.message : erro}). ` +
        "Confira a permissão de UPLOADS_DIR; o download desse anexo vai falhar até lá.",
    );
  }
  return { caminho: `demo/${nome}`, tamanhoBytes: pdf.length };
}

// --- Registro de notificações já enviadas -------------------------------------

type Tx = Prisma.TransactionClient;
interface Pessoa {
  id: string;
  nome: string;
  email: string;
}

/**
 * Grava em `notificacoes` um e-mail que o sistema teria enviado naquela data,
 * com a MESMA chave de idempotência que o serviço usa — é assim que a tabela
 * responde "isso já foi enviado?" (RF-18/RF-19) e o job nunca duplica o aviso.
 */
async function registrarEnvio(
  tx: Tx,
  destinatarios: Pessoa[],
  tipo: TipoNotificacao,
  em: Date,
  montar: (pessoa: Pessoa) => { modelo: ModeloEmail; chave: string; equipeId?: string; tarefaId?: string },
) {
  for (const pessoa of destinatarios) {
    const { modelo, chave, equipeId, tarefaId } = montar(pessoa);
    await tx.notificacao.create({
      data: {
        tipo,
        destinatarioId: pessoa.id,
        emailDestino: pessoa.email,
        assunto: modelo.assunto,
        corpo: modelo.html,
        chaveIdempotencia: chave,
        status: "ENVIADA",
        tentativas: 1,
        enviadaEm: em,
        equipeId: equipeId ?? null,
        tarefaId: tarefaId ?? null,
        criadoEm: em,
      },
    });
  }
}

async function auditar(tx: Tx, usuarioId: string | null, acao: string, entidade: string, entidadeId: string, detalhes: Prisma.InputJsonValue, em: Date) {
  await tx.registroAuditoria.create({ data: { usuarioId, acao, entidade, entidadeId, detalhes, criadoEm: em } });
}

// --- Montagem do cenário --------------------------------------------------------

async function seedDemo(admin: Pessoa) {
  const jaExiste = await prisma.usuario.findUnique({ where: { email: EQUIPES_DEMO[0]!.lider.email } });
  if (jaExiste) {
    log("cenário de demonstração já existe — mantido como está (use `npm run db:reset` para recriar do zero)");
    return;
  }

  const cursos = new Map((await prisma.curso.findMany()).map((c) => [c.nome, c.id]));
  const areas = new Map((await prisma.areaIdeia.findMany()).map((a) => [a.nome, a.id]));
  const etapasPadrao = await prisma.etapaPadrao.findMany({ orderBy: { numero: "asc" } });
  const modelos = await prisma.modeloTarefa.findMany({ include: { etapaPadrao: { select: { numero: true } } } });

  const senhaAluno = await bcrypt.hash("Aluno@123", BCRYPT_ROUNDS);
  const senhaMentor = await bcrypt.hash("Mentor@123", BCRYPT_ROUNDS);

  // Mentores (RF-03) — cadastrados pelo admin antes das equipes chegarem.
  const mentorPorEmail = new Map<string, Pessoa>();
  for (const m of MENTORES) {
    const mentor = await prisma.usuario.upsert({
      where: { email: m.email },
      update: { perfil: "MENTOR", ativo: true },
      create: {
        nome: m.nome,
        email: m.email,
        perfil: "MENTOR",
        senhaHash: senhaMentor,
        telefone: m.telefone,
        consentimentoLgpdEm: diasAtras(40),
        criadoEm: diasAtras(40),
      },
      select: { id: true, nome: true, email: true },
    });
    mentorPorEmail.set(m.email, mentor);
  }
  log(`mentores: ${MENTORES.length} (${MENTORES.map((m) => m.nome.split(" ")[0]).join(", ")})`);

  for (const eq of EQUIPES_DEMO) {
    const cadastradaEm = diasAtras(eq.cadastradaHa, 14, 30);
    const mentor = mentorPorEmail.get(eq.mentor)!;

    // Arquivos das entregas ficam fora da transação (disco, não banco).
    const arquivos = new Map<string, { caminho: string; tamanhoBytes: number }>();
    for (const t of eq.tarefas) {
      if (t.entrega) {
        arquivos.set(t.entrega.arquivo, gravarArquivoDemo(t.entrega.arquivo, `${eq.nome} — ${t.modelo}`, t.entrega.conteudo));
      }
    }

    await prisma.$transaction(
      async (tx) => {
        // Alunos (RF-05): líder e integrantes já com senha definida (RF-02).
        const criarAluno = (p: PessoaDemo) =>
          tx.usuario.create({
            data: {
              nome: p.nome,
              email: p.email,
              perfil: "ALUNO",
              senhaHash: senhaAluno,
              telefone: p.telefone,
              semestre: p.semestre,
              cursoId: p.curso ? cursos.get(p.curso) : undefined,
              consentimentoLgpdEm: cadastradaEm,
              criadoEm: cadastradaEm,
            },
            select: { id: true, nome: true, email: true },
          });
        const lider = await criarAluno(eq.lider);
        const integrantes: Pessoa[] = [lider];
        for (const p of eq.integrantes) integrantes.push(await criarAluno(p));

        // Equipe com o líder (Q1: um só) e a jornada copiada das 6 etapas padrão.
        const equipe = await tx.equipe.create({
          data: {
            nome: eq.nome,
            descricao: eq.descricao,
            areaId: areas.get(eq.area)!,
            estagioIdeia: eq.estagioIdeia,
            comoConheceu: eq.comoConheceu,
            periodoIngresso: periodoDe(cadastradaEm),
            liderId: lider.id,
            criadoEm: cadastradaEm,
            integrantes: { create: integrantes.map((u) => ({ usuarioId: u.id, entrouEm: cadastradaEm })) },
            etapas: {
              create: etapasPadrao.map((ep) => ({
                ordem: ep.numero,
                etapaPadraoId: ep.id,
                nome: ep.nome,
                descricao: ep.descricao,
                criadoEm: cadastradaEm,
              })),
            },
          },
          include: { etapas: { include: { etapaPadrao: { select: { numero: true } } } } },
        });
        const etapaPorNumero = new Map(equipe.etapas.map((e) => [e.ordem, e]));
        const etapa1 = etapaPorNumero.get(1)!;
        const etapa2 = etapaPorNumero.get(2)!;

        await tx.historicoEtapa.create({
          data: { equipeId: equipe.id, paraEtapaId: etapa1.id, direcao: "INICIO", alteradoPorId: lider.id, criadoEm: cadastradaEm },
        });
        await registrarEnvio(tx, [admin], "NOVO_CADASTRO", cadastradaEm, (pessoa) => ({
          modelo: emailNovoCadastro(pessoa.nome, eq.nome, lider.nome, eq.area, equipe.id),
          chave: `NOVO_CADASTRO:equipe:${equipe.id}:usuario:${pessoa.id}`,
          equipeId: equipe.id,
        }));
        await auditar(tx, lider.id, "EQUIPE_CADASTRADA", "equipe", equipe.id, { nome: eq.nome, integrantes: integrantes.length }, cadastradaEm);

        // Mentor atribuído pelo admin no dia seguinte (RF-06).
        const atribuidoEm = diasAtras(eq.cadastradaHa - 1, 10);
        await tx.mentorEquipe.create({ data: { equipeId: equipe.id, mentorId: mentor.id, atribuidoEm } });
        await auditar(tx, admin.id, "EQUIPE_MENTOR_ATRIBUIDO", "equipe", equipe.id, { mentorId: mentor.id }, atribuidoEm);

        const acompanham: Pessoa[] = mentor.email === admin.email ? [admin] : [mentor, admin];

        // Tarefas (RF-12) com lembretes (RF-17), entregas (RF-14/16), avaliações (RF-15) e os e-mails de cada passo.
        for (const t of eq.tarefas) {
          const modelo = modelos.find((m) => m.titulo === t.modelo && m.etapaPadrao.numero === t.etapa);
          if (!modelo) throw new Error(`Modelo de tarefa "${t.modelo}" (etapa ${t.etapa}) não encontrado.`);
          const criadaEm = diasAtras(t.criadaHa, 10);
          const prazo = prazoEm(t.prazoEmDias);

          const tarefa = await tx.tarefa.create({
            data: {
              equipeId: equipe.id,
              etapaEquipeId: etapaPorNumero.get(t.etapa)!.id,
              modeloTarefaId: modelo.id,
              titulo: modelo.titulo,
              descricao: modelo.descricao,
              prazo,
              status: t.status,
              obrigatoria: modelo.obrigatoria,
              criadoPorId: mentor.id,
              criadoEm: criadaEm,
            },
          });
          await registrarEnvio(tx, integrantes, "NOVA_TAREFA", criadaEm, (pessoa) => ({
            modelo: emailNovaTarefa(pessoa.nome, eq.nome, tarefa.titulo, prazo, tarefa.obrigatoria),
            chave: `NOVA_TAREFA:tarefa:${tarefa.id}:usuario:${pessoa.id}`,
            equipeId: equipe.id,
            tarefaId: tarefa.id,
          }));
          await auditar(tx, mentor.id, "TAREFA_CRIADA", "tarefa", tarefa.id, { equipeId: equipe.id, titulo: tarefa.titulo, obrigatoria: tarefa.obrigatoria, lembretes: [3, 1] }, criadaEm);

          // Lembretes padrão (3 e 1 dias antes, às 9h). Os que venceram enquanto a
          // tarefa ainda estava aberta (antes da entrega) constam como enviados pelo job.
          const entregueEm = t.entrega ? diasAtras(t.entrega.ha, 16, 20) : null;
          for (const diasAntes of [3, 1]) {
            const lembrarEm = dataDoLembrete(prazo, diasAntes);
            if (lembrarEm.getTime() <= criadaEm.getTime()) continue;
            const enviado = lembrarEm.getTime() <= Date.now() && (entregueEm === null || lembrarEm.getTime() < entregueEm.getTime());
            const lembrete = await tx.lembreteTarefa.create({
              data: { tarefaId: tarefa.id, diasAntes, lembrarEm, enviadoEm: enviado ? lembrarEm : null, criadoEm: criadaEm },
            });
            if (enviado) {
              await registrarEnvio(tx, integrantes, "PRAZO_PROXIMO", lembrarEm, (pessoa) => ({
                modelo: emailPrazoProximo(pessoa.nome, eq.nome, tarefa.titulo, prazo, diasAntes),
                chave: `PRAZO_PROXIMO:lembrete:${lembrete.id}:usuario:${pessoa.id}`,
                equipeId: equipe.id,
                tarefaId: tarefa.id,
              }));
            }
          }

          if (t.entrega && entregueEm) {
            const enviadaEm = entregueEm;
            const arquivo = arquivos.get(t.entrega.arquivo)!;
            const entrega = await tx.entrega.create({
              data: {
                tarefaId: tarefa.id,
                versao: 1,
                enviadoPorId: lider.id,
                observacao: t.entrega.observacao,
                enviadoEm: enviadaEm,
                anexos: {
                  create: {
                    tipo: "ARQUIVO",
                    nomeOriginal: t.entrega.arquivo,
                    caminhoArmazenamento: arquivo.caminho,
                    tamanhoBytes: arquivo.tamanhoBytes,
                    mimeType: "application/pdf",
                    criadoEm: enviadaEm,
                  },
                },
              },
            });
            await registrarEnvio(tx, acompanham, "ENTREGA_RECEBIDA", enviadaEm, (pessoa) => ({
              modelo: emailEntregaRecebida(pessoa.nome, eq.nome, tarefa.titulo, 1, lider.nome, equipe.id),
              chave: `ENTREGA_RECEBIDA:entrega:${entrega.id}:usuario:${pessoa.id}`,
              equipeId: equipe.id,
              tarefaId: tarefa.id,
            }));
            await auditar(tx, lider.id, "TAREFA_ENTREGUE", "entrega", entrega.id, { tarefaId: tarefa.id, versao: 1, arquivos: 1, link: false }, enviadaEm);

            if (t.avaliacao) {
              const avaliadaEm = diasAtras(t.avaliacao.ha, 11);
              const aprovada = t.avaliacao.decisao === "APROVADA";
              await tx.comentarioTarefa.create({
                data: { tarefaId: tarefa.id, entregaId: entrega.id, autorId: mentor.id, decisao: t.avaliacao.decisao, conteudo: t.avaliacao.comentario, criadoEm: avaliadaEm },
              });
              await registrarEnvio(tx, integrantes, "ENTREGA_AVALIADA", avaliadaEm, (pessoa) => ({
                modelo: emailEntregaAvaliada(pessoa.nome, eq.nome, tarefa.titulo, aprovada, t.avaliacao!.comentario),
                chave: `ENTREGA_AVALIADA:entrega:${entrega.id}:decisao:${aprovada ? "APPROVED" : "REJECTED"}:usuario:${pessoa.id}`,
                equipeId: equipe.id,
                tarefaId: tarefa.id,
              }));
              await auditar(tx, mentor.id, aprovada ? "TAREFA_APROVADA" : "TAREFA_REPROVADA", "tarefa", tarefa.id, { entregaId: entrega.id, versao: 1 }, avaliadaEm);
            }
          }

          // Venceu sem entrega: o job (RN-04) marcou ATRASADA 10 min depois do prazo e avisou todo mundo.
          if (t.status === "ATRASADA") {
            const marcadaEm = new Date(prazo.getTime() + 10 * 60 * 1000);
            await registrarEnvio(tx, integrantes, "PRAZO_VENCIDO", marcadaEm, (pessoa) => ({
              modelo: emailPrazoVencido(pessoa.nome, eq.nome, tarefa.titulo, prazo),
              chave: `PRAZO_VENCIDO:tarefa:${tarefa.id}:prazo:${prazo.getTime()}:usuario:${pessoa.id}`,
              equipeId: equipe.id,
              tarefaId: tarefa.id,
            }));
            await registrarEnvio(tx, acompanham, "TAREFA_ATRASADA", marcadaEm, (pessoa) => ({
              modelo: emailTarefaAtrasada(pessoa.nome, eq.nome, tarefa.titulo, prazo, equipe.id),
              chave: `TAREFA_ATRASADA:tarefa:${tarefa.id}:prazo:${prazo.getTime()}:usuario:${pessoa.id}`,
              equipeId: equipe.id,
              tarefaId: tarefa.id,
            }));
            await auditar(tx, null, "TAREFA_MARCADA_ATRASADA", "tarefa", tarefa.id, { prazo, equipeId: equipe.id }, marcadaEm);
          }
        }

        // Etapa 1 aprovada → o mentor avançou a equipe para a etapa 2 (RF-09, RN-01).
        let etapaAtualId = etapa1.id;
        if (eq.avancouParaEtapa2Ha !== undefined) {
          const avancouEm = diasAtras(eq.avancouParaEtapa2Ha, 11, 15);
          await tx.historicoEtapa.create({
            data: { equipeId: equipe.id, deEtapaId: etapa1.id, paraEtapaId: etapa2.id, direcao: "AVANCO", alteradoPorId: mentor.id, criadoEm: avancouEm },
          });
          await auditar(
            tx,
            mentor.id,
            "EQUIPE_ETAPA_ALTERADA",
            "equipe",
            equipe.id,
            { de: `1. ${etapa1.nome}`, para: `2. ${etapa2.nome}`, direcao: "avanco", forcado: false, obrigatoriasPendentes: 0, motivo: null },
            avancouEm,
          );
          etapaAtualId = etapa2.id;
        }
        await tx.equipe.update({ where: { id: equipe.id }, data: { etapaAtualId } });

        for (const a of eq.anotacoes) {
          await tx.anotacaoMentoria.create({
            data: { equipeId: equipe.id, autorId: mentor.id, conteudo: a.conteudo, criadoEm: diasAtras(a.ha, 17) },
          });
        }
      },
      { timeout: 60_000 },
    );

    const etapa = eq.avancouParaEtapa2Ha !== undefined ? 2 : 1;
    const atrasada = eq.tarefas.some((t) => t.status === "ATRASADA") ? ", com tarefa ATRASADA" : "";
    log(`equipe "${eq.nome}": ${eq.integrantes.length + 1} integrantes, mentor ${mentor.nome}, etapa ${etapa}${atrasada}`);
  }
}

// ---------------------------------------------------------------------------

async function main() {
  const { admin } = await seedReferencia();

  if (process.env.SEED_DEMO === "false") {
    log("SEED_DEMO=false — cenário de demonstração não criado");
    return;
  }
  await seedDemo(admin);
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

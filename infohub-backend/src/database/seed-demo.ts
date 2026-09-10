import "../config/zod.js";
import type { PoolClient } from "pg";
import { closePool, withTransaction } from "../config/database.js";
import { env } from "../config/env.js";
import { hashPassword } from "../shared/utils/crypto.js";

/**
 * Dados de demonstração para desenvolvimento.
 *
 * Diferente do `seed.ts` (que é idempotente e serve para produção), este
 * script APAGA as equipes existentes e recria tudo do zero, para o kanban e
 * o calendário terem sempre o mesmo cenário previsível. Bloqueado em produção.
 *
 * Senha de todos os usuários criados aqui: a mesma do SEED_ADMIN_PASSWORD.
 */

const DEMO_PASSWORD = env.SEED_ADMIN_PASSWORD;

interface DemoTeam {
  name: string;
  description: string;
  category: string;
  ideaStage: "JUST_IDEA" | "PROTOTYPE" | "MVP_IN_DEV" | "MVP_READY";
  stage: number;
  leader: { name: string; email: string; course: string; semester: string; phone: string };
  members: Array<{ name: string; email: string; course: string }>;
  mentorEmails: string[];
}

const MENTORS = [
  { name: "Ana Beatriz Ramos", email: "ana.ramos@amf.edu.br" },
  { name: "Ricardo Ferreira", email: "ricardo.ferreira@amf.edu.br" },
];

const TEAMS: DemoTeam[] = [
  {
    name: "EcoTrack",
    description:
      "Aplicativo para monitoramento de pegada de carbono pessoal, com gamificação e desafios semanais.",
    category: "Sustentabilidade",
    ideaStage: "PROTOTYPE",
    stage: 5,
    leader: {
      name: "Lucas Oliveira",
      email: "lucas.oliveira@aluno.amf.edu.br",
      course: "Sistemas de Informação",
      semester: "6º semestre",
      phone: "(55) 99101-2233",
    },
    members: [
      { name: "Fernanda Lima", email: "fernanda.lima@aluno.amf.edu.br", course: "Administração" },
      { name: "João Pedro Martins", email: "joao.martins@aluno.amf.edu.br", course: "Administração" },
    ],
    mentorEmails: ["ana.ramos@amf.edu.br"],
  },
  {
    name: "MedConnect",
    description:
      "Plataforma que conecta pacientes de áreas rurais a médicos por telemedicina, com triagem inicial.",
    category: "Saúde",
    ideaStage: "JUST_IDEA",
    stage: 2,
    leader: {
      name: "Mariana Santos",
      email: "mariana.santos@aluno.amf.edu.br",
      course: "Administração",
      semester: "4º semestre",
      phone: "(55) 99202-3344",
    },
    members: [
      { name: "Carla Souza", email: "carla.souza@aluno.amf.edu.br", course: "Ontopsicologia" },
    ],
    mentorEmails: ["ana.ramos@amf.edu.br"],
  },
  {
    name: "AgroSmart",
    description:
      "Sensores de baixo custo para pequenos produtores acompanharem umidade do solo pelo celular.",
    category: "Agronegócio",
    ideaStage: "MVP_IN_DEV",
    stage: 6,
    leader: {
      name: "Pedro Henrique Costa",
      email: "pedro.costa@aluno.amf.edu.br",
      course: "Sistemas de Informação",
      semester: "8º semestre",
      phone: "(55) 99303-4455",
    },
    members: [
      { name: "Rafael Dias", email: "rafael.dias@aluno.amf.edu.br", course: "Ciências Contábeis" },
      { name: "Bianca Rocha", email: "bianca.rocha@aluno.amf.edu.br", course: "Administração" },
    ],
    mentorEmails: ["ana.ramos@amf.edu.br", "ricardo.ferreira@amf.edu.br"],
  },
  {
    name: "EduPlay",
    description:
      "Jogos educativos para alfabetização em escolas municipais, com acompanhamento para o professor.",
    category: "Educação",
    ideaStage: "PROTOTYPE",
    stage: 3,
    leader: {
      name: "Juliana Prado",
      email: "juliana.prado@aluno.amf.edu.br",
      course: "Pedagogia",
      semester: "5º semestre",
      phone: "(55) 99404-5566",
    },
    members: [
      { name: "Tiago Nunes", email: "tiago.nunes@aluno.amf.edu.br", course: "Sistemas de Informação" },
    ],
    mentorEmails: ["ricardo.ferreira@amf.edu.br"],
  },
  {
    name: "Sabor Local",
    description:
      "Marketplace que conecta produtores da região a restaurantes, encurtando a cadeia de fornecimento.",
    category: "Comércio",
    ideaStage: "JUST_IDEA",
    stage: 1,
    leader: {
      name: "Gabriel Almeida",
      email: "gabriel.almeida@aluno.amf.edu.br",
      course: "Gastronomia",
      semester: "3º semestre",
      phone: "(55) 99505-6677",
    },
    members: [],
    mentorEmails: [],
  },
  {
    name: "FinanceJovem",
    description:
      "Trilha de educação financeira para universitários, com simulador de orçamento mensal.",
    category: "Finanças",
    ideaStage: "MVP_READY",
    stage: 4,
    leader: {
      name: "Beatriz Moraes",
      email: "beatriz.moraes@aluno.amf.edu.br",
      course: "Ciências Contábeis",
      semester: "7º semestre",
      phone: "(55) 99606-7788",
    },
    members: [
      { name: "Henrique Vaz", email: "henrique.vaz@aluno.amf.edu.br", course: "Direito" },
    ],
    mentorEmails: ["ricardo.ferreira@amf.edu.br"],
  },
];

/**
 * Prazos relativos a hoje, para o calendário sempre ter o que mostrar no mês
 * corrente: alguns já vencidos, um hoje, e vários à frente.
 */
const DUE_OFFSETS_BY_STAGE: Record<number, number[]> = {
  1: [-18],
  2: [-11, 4],
  3: [-6, 2],
  4: [0, 9],
  5: [3, 14],
  6: [7, 12, 20, 25],
};

function isoDate(offsetDays: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function currentSemester(): string {
  const now = new Date();
  return `${now.getFullYear()}/${now.getMonth() < 6 ? 1 : 2}`;
}

async function ensureUser(
  client: PoolClient,
  data: {
    name: string;
    email: string;
    role: "ADMIN" | "MENTOR" | "STUDENT";
    course?: string;
    semester?: string;
    phone?: string;
  },
  passwordHash: string,
): Promise<string> {
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)`,
    [data.email],
  );

  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO app_user (name, email, password_hash, role, course, semester, phone, consent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING id`,
    [
      data.name,
      data.email,
      passwordHash,
      data.role,
      data.course ?? null,
      data.semester ?? null,
      data.phone ?? null,
    ],
  );

  return inserted.rows[0]!.id;
}

async function seedDemo() {
  if (env.isProduction) {
    throw new Error(
      "seed:demo apaga dados e está bloqueado quando NODE_ENV=production.",
    );
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await withTransaction(async (client) => {
    // Recomeça do zero. As FKs em cascata levam junto membros, mentores,
    // tarefas, entregas, lembretes e histórico de etapas.
    const wiped = await client.query(`DELETE FROM team`);
    if ((wiped.rowCount ?? 0) > 0) {
      console.log(`[demo] ${wiped.rowCount} equipe(s) anterior(es) removida(s).`);
    }

    const adminId = await ensureUser(
      client,
      { name: env.SEED_ADMIN_NAME, email: env.SEED_ADMIN_EMAIL, role: "ADMIN" },
      passwordHash,
    );

    const mentorIds = new Map<string, string>();
    for (const mentor of MENTORS) {
      mentorIds.set(
        mentor.email,
        await ensureUser(client, { ...mentor, role: "MENTOR" }, passwordHash),
      );
    }
    console.log(`[demo] ${MENTORS.length} mentor(es) prontos.`);

    // Modelos de tarefa criados pelo seed padrão, usados para gerar as tarefas.
    const templates = await client.query<{
      id: string;
      title: string;
      description: string | null;
      journey_stage: number;
      is_mandatory: boolean;
    }>(
      `SELECT id, title, description, journey_stage, is_mandatory
         FROM task_template WHERE is_active ORDER BY journey_stage, title`,
    );

    if (templates.rowCount === 0) {
      throw new Error(
        "Nenhum modelo de tarefa encontrado. Rode `npm run db:seed` antes.",
      );
    }

    const semester = currentSemester();
    let taskCount = 0;
    let reminderCount = 0;

    for (const demo of TEAMS) {
      const category = await client.query<{ id: string }>(
        `SELECT id FROM idea_category WHERE name = $1`,
        [demo.category],
      );

      if (!category.rows[0]) {
        throw new Error(
          `Área "${demo.category}" não existe. Rode \`npm run db:seed\` antes.`,
        );
      }

      const teamResult = await client.query<{ id: string }>(
        `INSERT INTO team (name, description, category_id, idea_stage, journey_stage, semester, how_did_you_hear)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          demo.name,
          demo.description,
          category.rows[0].id,
          demo.ideaStage,
          demo.stage,
          semester,
          "Professor(a) ou coordenação",
        ],
      );
      const teamId = teamResult.rows[0]!.id;

      const leaderId = await ensureUser(
        client,
        { ...demo.leader, role: "STUDENT" },
        passwordHash,
      );
      await client.query(
        `INSERT INTO team_member (team_id, user_id, role) VALUES ($1, $2, 'LEADER')`,
        [teamId, leaderId],
      );

      for (const member of demo.members) {
        const memberId = await ensureUser(
          client,
          { ...member, role: "STUDENT" },
          passwordHash,
        );
        await client.query(
          `INSERT INTO team_member (team_id, user_id, role) VALUES ($1, $2, 'MEMBER')`,
          [teamId, memberId],
        );
      }

      for (const mentorEmail of demo.mentorEmails) {
        await client.query(
          `INSERT INTO team_mentor (team_id, mentor_id, assigned_by) VALUES ($1, $2, $3)`,
          [teamId, mentorIds.get(mentorEmail), adminId],
        );
      }

      // Histórico das etapas já vencidas pela equipe.
      for (let stage = 1; stage < demo.stage; stage += 1) {
        await client.query(
          `INSERT INTO team_stage_history (team_id, from_stage, to_stage, changed_by, changed_at)
           VALUES ($1, $2, $3, $4, NOW() - ($5 || ' days')::interval)`,
          [teamId, stage, stage + 1, adminId, (demo.stage - stage) * 15],
        );
      }

      // Tarefas: as das etapas já concluídas entram aprovadas; as da etapa
      // atual e da seguinte ficam em aberto, com prazos ao redor de hoje.
      for (const template of templates.rows) {
        if (template.journey_stage > demo.stage + 1) continue;

        const offsets = DUE_OFFSETS_BY_STAGE[template.journey_stage] ?? [7];
        const offset = offsets[taskCount % offsets.length] ?? 7;
        const dueDate = isoDate(
          template.journey_stage < demo.stage ? offset - 30 : offset,
        );

        let status: string;
        if (template.journey_stage < demo.stage) {
          status = "APPROVED";
        } else if (Date.parse(dueDate) < Date.now() - 86_400_000) {
          status = "OVERDUE";
        } else {
          status = taskCount % 3 === 0 ? "SUBMITTED" : "PENDING";
        }

        const taskResult = await client.query<{ id: string }>(
          `INSERT INTO task (team_id, template_id, title, description, journey_stage, due_date, status, is_mandatory, created_by)
           VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9)
           RETURNING id`,
          [
            teamId,
            template.id,
            template.title,
            template.description,
            template.journey_stage,
            dueDate,
            status,
            template.is_mandatory,
            adminId,
          ],
        );
        taskCount += 1;

        // RF-17 — dois lembretes por tarefa em aberto: 3 dias e 1 dia antes.
        if (status !== "APPROVED") {
          for (const daysBefore of [3, 1]) {
            await client.query(
              `INSERT INTO task_reminder (task_id, remind_at, is_sent)
               VALUES ($1, ($2::date - ($3 || ' days')::interval) + TIME '09:00', $4)`,
              [
                taskResult.rows[0]!.id,
                dueDate,
                daysBefore,
                Date.parse(dueDate) - daysBefore * 86_400_000 < Date.now(),
              ],
            );
            reminderCount += 1;
          }
        }
      }

      console.log(
        `[demo] equipe "${demo.name}" (etapa ${demo.stage}) — ${demo.members.length + 1} integrante(s), ${demo.mentorEmails.length} mentor(es).`,
      );
    }

    console.log(
      `\n[demo] ${TEAMS.length} equipes, ${taskCount} tarefas e ${reminderCount} lembretes criados.`,
    );
  });

  console.log(`
[demo] Acesse com qualquer um destes (senha: ${DEMO_PASSWORD}):

  ADMIN    ${env.SEED_ADMIN_EMAIL}                 vê todas as equipes
  MENTOR   ana.ramos@amf.edu.br            vê EcoTrack, MedConnect e AgroSmart
  MENTOR   ricardo.ferreira@amf.edu.br     vê AgroSmart, EduPlay e FinanceJovem
  ALUNO    lucas.oliveira@aluno.amf.edu.br líder da EcoTrack
  ALUNO    fernanda.lima@aluno.amf.edu.br  integrante da EcoTrack
`);
}

seedDemo()
  .catch((error: unknown) => {
    console.error("[demo]", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closePool());

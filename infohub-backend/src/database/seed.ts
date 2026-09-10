import "../config/zod.js";
import { closePool, withTransaction } from "../config/database.js";
import { env } from "../config/env.js";
import { hashPassword } from "../shared/utils/crypto.js";

/**
 * Dados mínimos para o sistema subir utilizável.
 *
 * O seed é idempotente (ON CONFLICT DO NOTHING): rodar duas vezes não
 * duplica nada nem sobrescreve o que já foi alterado no banco.
 */

/** Áreas/setores oferecidos no formulário inicial (RF-04). */
const IDEA_CATEGORIES = [
  "Educação",
  "Saúde",
  "Tecnologia",
  "Sustentabilidade",
  "Agronegócio",
  "Finanças",
  "Serviços",
  "Indústria",
  "Comércio",
  "Social",
];

/** RF-11 — modelos de tarefa por etapa da jornada. */
const TASK_TEMPLATES: Array<{
  title: string;
  description: string;
  stage: number;
  mandatory: boolean;
}> = [
  {
    title: "Cadastro da ideia",
    description:
      "Preencher o formulário inicial com os dados da ideia e da equipe.",
    stage: 1,
    mandatory: true,
  },
  {
    title: "Confirmar agendamento do 1º encontro",
    description: "Confirmar data e horário do primeiro encontro com o mentor.",
    stage: 2,
    mandatory: true,
  },
  {
    title: "Definir problema, público-alvo e solução",
    description:
      "Documentar o problema identificado, o público-alvo e a proposta de solução inicial.",
    stage: 3,
    mandatory: true,
  },
  {
    title: "Enviar Value Proposition Design",
    description: "Construir e enviar o Value Proposition Design da ideia.",
    stage: 4,
    mandatory: true,
  },
  {
    title: "Enviar Business Model Canvas",
    description: "Construir e enviar o Business Model Canvas da ideia.",
    stage: 5,
    mandatory: true,
  },
  {
    title: "Gravar Pitch Vídeo",
    description:
      "Gravar vídeo de pitch de até 3 minutos apresentando o projeto e enviar o link do YouTube.",
    stage: 6,
    mandatory: true,
  },
  {
    title: "Entregar Canvas final",
    description:
      "Versão final do Business Model Canvas após as revisões da mentoria.",
    stage: 6,
    mandatory: true,
  },
  {
    title: "Entregar VPD final",
    description:
      "Versão final do Value Proposition Design após as revisões da mentoria.",
    stage: 6,
    mandatory: true,
  },
  {
    title: "Confirmar dados dos integrantes",
    description:
      "Preencher os dados completos de todos os integrantes para a submissão ao InovAMF.",
    stage: 6,
    mandatory: true,
  },
];

async function seed() {
  await withTransaction(async (client) => {
    // --- Áreas da ideia ------------------------------------------------
    for (const name of IDEA_CATEGORIES) {
      await client.query(
        `INSERT INTO idea_category (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [name],
      );
    }
    console.log(`[seed] ${IDEA_CATEGORIES.length} área(s) de ideia garantidas.`);

    // --- Modelos de tarefa ---------------------------------------------
    let templatesCreated = 0;
    for (const template of TASK_TEMPLATES) {
      const exists = await client.query(
        `SELECT 1 FROM task_template WHERE title = $1 AND journey_stage = $2`,
        [template.title, template.stage],
      );

      if (exists.rowCount === 0) {
        await client.query(
          `INSERT INTO task_template (title, description, journey_stage, is_mandatory)
           VALUES ($1, $2, $3, $4)`,
          [
            template.title,
            template.description,
            template.stage,
            template.mandatory,
          ],
        );
        templatesCreated += 1;
      }
    }
    console.log(
      `[seed] ${templatesCreated} modelo(s) de tarefa criado(s) (${TASK_TEMPLATES.length} no total).`,
    );

    // --- Administrador inicial -----------------------------------------
    const existingAdmin = await client.query(
      `SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)`,
      [env.SEED_ADMIN_EMAIL],
    );

    if (existingAdmin.rowCount === 0) {
      const passwordHash = await hashPassword(env.SEED_ADMIN_PASSWORD);
      await client.query(
        `INSERT INTO app_user (name, email, password_hash, role, consent_at)
         VALUES ($1, $2, $3, 'ADMIN', NOW())`,
        [env.SEED_ADMIN_NAME, env.SEED_ADMIN_EMAIL, passwordHash],
      );

      console.log(
        `[seed] administrador criado: ${env.SEED_ADMIN_EMAIL} / ${env.SEED_ADMIN_PASSWORD}`,
      );
      console.log("[seed] TROQUE ESTA SENHA no primeiro acesso.");
    } else {
      console.log(
        `[seed] administrador ${env.SEED_ADMIN_EMAIL} já existe, mantido como está.`,
      );
    }
  });

  console.log("\n[seed] concluído.\n");
}

seed()
  .catch((error: unknown) => {
    console.error("[seed]", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closePool());

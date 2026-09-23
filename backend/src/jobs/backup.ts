import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { env } from "../config/env";
import { prisma, schemaBanco } from "../lib/prisma";
import type { Db } from "../shared/auditoria";

/**
 * Backup do InfoHub (RNF-07: "backup periódico dos dados e possibilidade de
 * recuperação").
 *
 * O banco é o PostgreSQL da faculdade, compartilhado entre as duplas: não dá
 * para contar com `pg_dump` na mesma versão do servidor nem com acesso ao
 * servidor em si. Por isso a cópia é lógica e feita pela própria aplicação:
 *
 *  - cada tabela do schema da dupla vira JSON (`row_to_json`), tudo lido numa
 *    única transação REPEATABLE READ — uma foto consistente do banco;
 *  - o arquivo `infohub-<schema>-<data>.json.gz` guarda também a lista de
 *    migrations aplicadas, para a restauração conferir que o banco de destino
 *    tem a mesma estrutura;
 *  - os arquivos das entregas são espelhados em `<BACKUP_DIR>/uploads` (nunca
 *    mudam depois de gravados, então basta copiar os novos);
 *  - ficam os BACKUP_KEEP arquivos mais recentes.
 *
 * A rotina agendada chama `backupSeNecessario()` (a cada BACKUP_INTERVAL_HOURS);
 * `npm run backup` gera um na hora e `npm run backup:restaurar` volta um deles.
 */

export const PREFIXO_BACKUP = "infohub-";
export const PASTA_UPLOADS_BACKUP = "uploads";

/**
 * Ordem de restauração: quem é referenciado vem antes de quem referencia.
 * `equipes.etapa_atual_id` aponta para `etapas_equipe`, que aponta de volta
 * para `equipes` — a restauração grava a etapa atual por último.
 */
export const ORDEM_TABELAS = [
  "cursos",
  "areas_ideia",
  "etapas_padrao",
  "usuarios",
  "tokens_usuario",
  "sessoes",
  "preferencias_notificacao",
  "equipes",
  "integrantes_equipe",
  "mentores_equipe",
  "etapas_equipe",
  "historico_etapas",
  "modelos_tarefa",
  "tarefas",
  "entregas",
  "anexos_entrega",
  "comentarios_tarefa",
  "lembretes_tarefa",
  "notificacoes",
  "anotacoes_mentoria",
  "registros_auditoria",
];

export interface ConteudoBackup {
  formato: 1;
  schema: string;
  geradoEm: string;
  migrations: string[];
  tabelas: Record<string, Record<string, unknown>[]>;
}

export interface ResultadoBackup {
  arquivo: string;
  tabelas: number;
  linhas: number;
  arquivosCopiados: number;
  removidos: number;
}

const NOME_TABELA = /^[a-z_][a-z0-9_]*$/;

/** Tabelas do schema da dupla (menos a de controle do Prisma). */
export async function tabelasDoSchema(db: Db = prisma): Promise<string[]> {
  const linhas = await db.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = ${schemaBanco} AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'
    ORDER BY table_name`;
  return linhas.map((l) => l.table_name).filter((nome) => NOME_TABELA.test(nome));
}

/** Migrations aplicadas com sucesso, em ordem. */
export async function migrationsAplicadas(db: Db = prisma): Promise<string[]> {
  const linhas = await db.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM _prisma_migrations
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    ORDER BY migration_name`;
  return linhas.map((l) => l.migration_name);
}

function carimbo(data = new Date()): string {
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${data.getFullYear()}${dois(data.getMonth() + 1)}${dois(data.getDate())}-${dois(data.getHours())}${dois(data.getMinutes())}${dois(data.getSeconds())}`;
}

/** Arquivos de backup da pasta, do mais novo para o mais antigo. */
export function listarBackups(pasta = env.backupDir): string[] {
  if (!fs.existsSync(pasta)) return [];
  return fs
    .readdirSync(pasta)
    .filter((nome) => nome.startsWith(PREFIXO_BACKUP) && nome.endsWith(".json.gz"))
    .sort()
    .reverse()
    .map((nome) => path.join(pasta, nome));
}

/** Copia de `origem` para `destino` os arquivos que ainda não estão lá (recursivo). */
export function espelharArquivos(origem: string, destino: string): number {
  if (!fs.existsSync(origem)) return 0;
  let copiados = 0;
  for (const item of fs.readdirSync(origem, { withFileTypes: true })) {
    const de = path.join(origem, item.name);
    const para = path.join(destino, item.name);
    if (item.isDirectory()) {
      copiados += espelharArquivos(de, para);
    } else if (item.isFile()) {
      const existente = fs.existsSync(para) ? fs.statSync(para) : null;
      if (!existente || existente.size !== fs.statSync(de).size) {
        fs.mkdirSync(destino, { recursive: true });
        fs.copyFileSync(de, para);
        copiados += 1;
      }
    }
  }
  return copiados;
}

export async function gerarBackup(): Promise<ResultadoBackup> {
  fs.mkdirSync(env.backupDir, { recursive: true });

  const conteudo = await prisma.$transaction(
    async (tx) => {
      const tabelas = await tabelasDoSchema(tx);
      const migrations = await migrationsAplicadas(tx);
      const dados: ConteudoBackup["tabelas"] = {};
      for (const tabela of tabelas) {
        const linhas = await tx.$queryRawUnsafe<Array<{ linha: Record<string, unknown> }>>(
          `SELECT row_to_json(t) AS linha FROM "${tabela}" t`,
        );
        dados[tabela] = linhas.map((l) => l.linha);
      }
      return { migrations, tabelas: dados };
    },
    { isolationLevel: "RepeatableRead", timeout: 120_000 },
  );

  const backup: ConteudoBackup = {
    formato: 1,
    schema: schemaBanco,
    geradoEm: new Date().toISOString(),
    migrations: conteudo.migrations,
    tabelas: conteudo.tabelas,
  };

  const arquivo = path.join(env.backupDir, `${PREFIXO_BACKUP}${schemaBanco}-${carimbo()}.json.gz`);
  // Grava num temporário e renomeia: um backup pela metade nunca aparece como o mais recente.
  fs.writeFileSync(`${arquivo}.tmp`, zlib.gzipSync(JSON.stringify(backup)));
  fs.renameSync(`${arquivo}.tmp`, arquivo);

  const arquivosCopiados = espelharArquivos(env.uploadsDir, path.join(env.backupDir, PASTA_UPLOADS_BACKUP));

  const antigos = listarBackups().slice(env.BACKUP_KEEP);
  for (const antigo of antigos) fs.rmSync(antigo, { force: true });

  return {
    arquivo,
    tabelas: Object.keys(backup.tabelas).length,
    linhas: Object.values(backup.tabelas).reduce((soma, linhas) => soma + linhas.length, 0),
    arquivosCopiados,
    removidos: antigos.length,
  };
}

/** Chamado pela rotina agendada: gera um backup se o último tiver mais de BACKUP_INTERVAL_HOURS. */
export async function backupSeNecessario(): Promise<ResultadoBackup | null> {
  if (!env.backupEnabled) return null;
  const ultimo = listarBackups()[0];
  if (ultimo) {
    const idadeMs = Date.now() - fs.statSync(ultimo).mtimeMs;
    if (idadeMs < env.BACKUP_INTERVAL_HOURS * 60 * 60 * 1000) return null;
  }
  return gerarBackup();
}

export function lerBackup(arquivo: string): ConteudoBackup {
  const conteudo = JSON.parse(zlib.gunzipSync(fs.readFileSync(arquivo)).toString("utf8")) as ConteudoBackup;
  if (conteudo.formato !== 1 || !conteudo.tabelas) {
    throw new Error(`${arquivo} não é um backup do InfoHub (formato desconhecido).`);
  }
  return conteudo;
}

/**
 * Volta o schema inteiro para o conteúdo do backup: esvazia todas as tabelas
 * e regrava tudo numa transação só — ou volta tudo, ou nada muda. Os arquivos
 * das entregas que faltarem voltam do espelho.
 */
export async function restaurarBackup(conteudo: ConteudoBackup): Promise<{ linhas: number; arquivosCopiados: number }> {
  let linhas = 0;

  await prisma.$transaction(
    async (tx) => {
      const atuais = await tabelasDoSchema(tx);
      await tx.$executeRawUnsafe(`TRUNCATE ${atuais.map((t) => `"${t}"`).join(", ")}`);

      const doBackup = Object.keys(conteudo.tabelas).filter((t) => NOME_TABELA.test(t) && atuais.includes(t));
      const ordem = [...ORDEM_TABELAS.filter((t) => doBackup.includes(t)), ...doBackup.filter((t) => !ORDEM_TABELAS.includes(t))];

      for (const tabela of ordem) {
        let registros = conteudo.tabelas[tabela] ?? [];
        if (tabela === "equipes") registros = registros.map((r) => ({ ...r, etapa_atual_id: null }));
        for (let i = 0; i < registros.length; i += 500) {
          await tx.$executeRawUnsafe(
            `INSERT INTO "${tabela}" SELECT * FROM json_populate_recordset(NULL::"${tabela}", $1::json)`,
            JSON.stringify(registros.slice(i, i + 500)),
          );
        }
        linhas += registros.length;
      }

      const etapasAtuais = (conteudo.tabelas.equipes ?? [])
        .filter((e) => e.etapa_atual_id)
        .map((e) => ({ id: e.id, etapa_atual_id: e.etapa_atual_id }));
      if (etapasAtuais.length) {
        await tx.$executeRawUnsafe(
          `UPDATE "equipes" e SET etapa_atual_id = r.etapa_atual_id
           FROM json_to_recordset($1::json) AS r(id uuid, etapa_atual_id uuid) WHERE e.id = r.id`,
          JSON.stringify(etapasAtuais),
        );
      }
    },
    { timeout: 300_000 },
  );

  const arquivosCopiados = espelharArquivos(path.join(env.backupDir, PASTA_UPLOADS_BACKUP), env.uploadsDir);
  return { linhas, arquivosCopiados };
}

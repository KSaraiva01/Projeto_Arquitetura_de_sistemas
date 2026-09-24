/** RNF-07 — backup periódico e recuperação (banco + arquivos das entregas). */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { before, describe, test } from "node:test";
import { env } from "../backend/src/config/env";
import { gerarBackup, lerBackup, restaurarBackup } from "../backend/src/jobs/backup";
import { chamar, contasDoSeed, dia, equipesDoSeed, pdf, sql, usarApi } from "./apoio";

usarApi();

const TABELAS = ["usuarios", "equipes", "tarefas", "entregas", "anexos_entrega", "comentarios_tarefa", "notificacoes", "registros_auditoria"];

async function contagens() {
  const linhas = await sql<{ tabela: string; n: number }>(
    TABELAS.map((tabela) => `SELECT '${tabela}' AS tabela, count(*)::int AS n FROM ${tabela}`).join(" UNION ALL "),
  );
  return Object.fromEntries(linhas.map((l) => [l.tabela, l.n]));
}

describe("RNF-07 — backup e restauração", () => {
  let arquivoEntrega = "";

  before(async () => {
    // Uma entrega com arquivo, para o backup levar também a pasta de uploads.
    const t = await contasDoSeed();
    const { eco } = await equipesDoSeed();
    const tarefa = await chamar("POST", "/tasks", { token: t.ana, body: { teamId: eco, title: "Entrega para o backup", dueDate: dia(4) } });
    const form = new FormData();
    form.append("files", pdf("backup.pdf"));
    const entrega = await chamar("POST", `/tasks/${tarefa.json.task.id}/submissions`, { token: t.lucas, form });
    const anexo = entrega.json.task.submissions[0].attachments[0];
    const [linha] = await sql<{ caminho: string }>("SELECT caminho_armazenamento AS caminho FROM anexos_entrega WHERE id = $1::uuid", anexo.id);
    arquivoEntrega = path.join(env.uploadsDir, linha!.caminho);
  });

  let backup = "";
  let antes: Record<string, number> = {};

  test("o backup grava o schema inteiro e espelha os arquivos das entregas", async () => {
    antes = await contagens();
    const r = await gerarBackup();
    backup = r.arquivo;
    assert.ok(fs.existsSync(backup));
    assert.ok(r.arquivosCopiados >= 1);
    const conteudo = lerBackup(backup);
    assert.equal(conteudo.tabelas.equipes!.length, antes.equipes);
    assert.ok(conteudo.migrations.length >= 4);
  });

  test("depois de um estrago, a restauração volta exatamente ao que era", async () => {
    await sql("UPDATE equipes SET nome = 'ESTRAGADO'");
    await sql("DELETE FROM comentarios_tarefa");
    await sql("DELETE FROM registros_auditoria");
    fs.rmSync(arquivoEntrega);

    const r = await restaurarBackup(lerBackup(backup));
    assert.ok(r.linhas > 0);
    assert.ok(r.arquivosCopiados >= 1, "o arquivo apagado voltou");

    assert.deepEqual(await contagens(), antes);
    const [estragadas] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM equipes WHERE nome = 'ESTRAGADO'");
    assert.equal(estragadas!.n, 0);
    assert.ok(fs.existsSync(arquivoEntrega));
  });

  test("o sistema segue funcionando depois da restauração", async () => {
    const t = await contasDoSeed();
    assert.equal((await chamar("GET", "/teams/board", { token: t.admin })).json.total, 3);
  });
});

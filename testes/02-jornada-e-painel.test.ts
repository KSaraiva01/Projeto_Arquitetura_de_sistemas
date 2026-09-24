/** RF-06 a RF-10, RN-01, RN-02, encaminhamento ao InovAMF e RF-22 a RF-24. */
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { chamar, codigo, contasDoSeed, dia, equipesDoSeed, formularioIdeia, pdf, sql, usarApi, type Resposta } from "./apoio";

usarApi();

let t: Awaited<ReturnType<typeof contasDoSeed>>;
let eq: Awaited<ReturnType<typeof equipesDoSeed>>;
before(async () => {
  t = await contasDoSeed();
  eq = await equipesDoSeed();
});

const nomes = (r: Resposta) => (r.json.data as Array<{ name: string }>).map((e) => e.name).sort().join(",");

describe("RF-06 / RF-07 — kanban, busca e filtros", () => {
  test("o kanban tem as 6 colunas e só admin e mentor arrastam", async () => {
    const quadro = await chamar("GET", "/teams/board", { token: t.admin });
    assert.deepEqual(quadro.json.columns.map((c: { stage: number }) => c.stage), [1, 2, 3, 4, 5, 6]);
    assert.equal(quadro.json.canDrag, true);

    const doAluno = await chamar("GET", "/teams/board", { token: t.lucas });
    assert.equal(doAluno.json.canDrag, false);
    assert.equal(doAluno.json.total, 1, "o aluno só vê a própria equipe");
  });

  test("busca pelo nome da ideia e pelo nome do líder", async () => {
    assert.equal(nomes(await chamar("GET", "/teams?search=eco", { token: t.admin })), "EcoTrack");
    assert.equal(nomes(await chamar("GET", "/teams?search=mariana", { token: t.admin })), "MedConnect");
  });

  test("filtros por área, curso, mentor, status da tarefa e período", async () => {
    const [agro] = await sql<{ area_id: string }>("SELECT area_id::text FROM equipes WHERE id = $1::uuid", eq.agro);
    assert.match(nomes(await chamar("GET", `/teams?categoryId=${agro!.area_id}`, { token: t.admin })), /AgroSense/);
    assert.match(nomes(await chamar("GET", `/teams?course=${encodeURIComponent("Direito")}`, { token: t.admin })), /MedConnect/);
    const [ricardo] = await sql<{ id: string }>("SELECT id::text FROM usuarios WHERE email = 'ricardo@amf.edu.br'");
    assert.equal(nomes(await chamar("GET", `/teams?mentorId=${ricardo!.id}`, { token: t.admin })), "AgroSense");
    assert.equal(nomes(await chamar("GET", "/teams?taskStatus=OVERDUE", { token: t.admin })), "MedConnect");
    assert.equal((await chamar("GET", "/teams?period=2020/1", { token: t.admin })).json.total, 0);
  });
});

describe("RF-08 / RF-09 / RF-11 / RN-01 — detalhe e movimentação na jornada", () => {
  test("o detalhe traz dados, integrantes, jornada, histórico e tarefas", async () => {
    const detalhe = await chamar("GET", `/teams/${eq.eco}`, { token: t.admin });
    assert.equal(detalhe.json.team.name, "EcoTrack");
    assert.equal(detalhe.json.members.length, 3);
    assert.equal(detalhe.json.journey.length, 6);
    assert.ok(detalhe.json.stageHistory.length >= 2);
    assert.ok((await chamar("GET", `/tasks?teamId=${eq.eco}`, { token: t.admin })).json.total > 0);
  });

  test("o aluno não move a equipe de etapa (nota da RF-11)", async () => {
    assert.equal((await chamar("PATCH", `/teams/${eq.eco}/stage`, { token: t.lucas, body: { toStage: 3 } })).status, 403);
  });

  test("a mentora retrocede com motivo e avança de novo, e tudo fica registrado", async () => {
    const volta = await chamar("PATCH", `/teams/${eq.eco}/stage`, { token: t.ana, body: { toStage: 1, reason: "Revisar o problema" } });
    assert.equal(volta.status, 200, volta.texto);
    assert.equal(volta.json.isAdvancing, false);

    const vai = await chamar("PATCH", `/teams/${eq.eco}/stage`, { token: t.ana, body: { toStage: 2 } });
    assert.equal(vai.status, 200);
    assert.equal(vai.json.forced, false, "a etapa 1 está aprovada: sem bloqueio");

    const historico = await sql<{ direcao: string; motivo: string | null }>(
      "SELECT direcao, motivo FROM historico_etapas WHERE equipe_id = $1::uuid ORDER BY criado_em DESC LIMIT 2",
      eq.eco,
    );
    assert.deepEqual(historico.map((h) => h.direcao), ["AVANCO", "RETROCESSO"]);
    assert.equal(historico[1]!.motivo, "Revisar o problema");
    const [semAutor] = await sql<{ n: number }>(
      "SELECT count(*)::int AS n FROM registros_auditoria WHERE acao = 'EQUIPE_ETAPA_ALTERADA' AND usuario_id IS NULL",
    );
    assert.equal(semAutor!.n, 0, "a auditoria registra quem mudou a etapa");
  });

  test("RN-01: avançar com obrigatória sem aprovação é recusado, a não ser que o mentor force", async () => {
    const bloqueios = await chamar("GET", `/teams/${eq.med}/stage-blockers?toStage=3`, { token: t.ana });
    assert.ok(bloqueios.json.blockers.length > 0);

    const barrado = await chamar("PATCH", `/teams/${eq.med}/stage`, { token: t.ana, body: { toStage: 3 } });
    assert.equal(barrado.status, 409);
    assert.equal(codigo(barrado), "STAGE_REQUIREMENTS_PENDING");
    assert.ok(barrado.json.error.details.pendingTasks.length > 0);

    const forcado = await chamar("PATCH", `/teams/${eq.med}/stage`, { token: t.ana, body: { toStage: 3, force: true, reason: "Decisão do mentor" } });
    assert.equal(forcado.status, 200);
    assert.equal(forcado.json.forced, true);
  });

  test("etapa extra só nesta equipe: entra depois da etapa 3 e pode sair", async () => {
    const extra = await chamar("POST", `/teams/${eq.eco}/stages`, { token: t.ana, body: { name: "Validação com clientes", afterStage: 3 } });
    assert.equal(extra.status, 201, extra.texto);
    assert.equal(extra.json.journey.length, 7);
    assert.equal(extra.json.journey[3].isExtra, true);

    const removida = await chamar("DELETE", `/teams/${eq.eco}/stages/${extra.json.stageId}`, { token: t.ana });
    assert.equal(removida.json.journey.length, 6);
  });
});

describe("RF-10 — anotações internas", () => {
  test("a mentora anota; o aluno não lê, nem pelo detalhe da equipe", async () => {
    assert.equal((await chamar("POST", `/teams/${eq.eco}/notes`, { token: t.ana, body: { content: "Segredo interno do encontro 1" } })).status, 201);
    assert.equal((await chamar("GET", `/teams/${eq.eco}/notes`, { token: t.lucas })).status, 403);
    const detalhe = await chamar("GET", `/teams/${eq.eco}`, { token: t.lucas });
    assert.equal(detalhe.status, 200);
    assert.ok(!detalhe.texto.includes("Segredo interno"));
  });

  test("mentor de outra equipe não anota nela", async () => {
    assert.equal((await chamar("POST", `/teams/${eq.eco}/notes`, { token: t.ricardo, body: { content: "Não devia" } })).status, 403);
  });
});

describe("RN-02 e status final — Pronta e Encaminhada ao InovAMF", () => {
  const entregarEAprovar = async (tarefaId: string, arquivo: string) => {
    const form = new FormData();
    form.append("files", pdf(arquivo));
    assert.equal((await chamar("POST", `/tasks/${tarefaId}/submissions`, { token: t.pedro, form })).status, 201);
    assert.equal((await chamar("POST", `/tasks/${tarefaId}/review`, { token: t.ricardo, body: { decision: "APPROVED", comment: "Aprovado." } })).status, 200);
  };

  test("na etapa 6, uma obrigatória aprovada não basta: faltam os 4 entregáveis finais", async () => {
    const tarefas = (await chamar("GET", `/tasks?teamId=${eq.agro}`, { token: t.ricardo })).json.data;
    await chamar("POST", `/tasks/${tarefas[0].id}/review`, { token: t.ricardo, body: { decision: "APPROVED", comment: "Aprovado." } });
    assert.equal((await chamar("PATCH", `/teams/${eq.agro}/stage`, { token: t.ricardo, body: { toStage: 6, force: true, reason: "RN-02" } })).status, 200);

    let detalhe = (await chamar("GET", `/teams/${eq.agro}`, { token: t.ricardo })).json;
    assert.equal(detalhe.finalDeliverables.length, 4);
    assert.ok(detalhe.finalDeliverables.every((d: { taskId: string | null }) => d.taskId === null));

    const avulsa = await chamar("POST", "/tasks", { token: t.ricardo, body: { teamId: eq.agro, title: "Revisão geral", dueDate: dia(3), isMandatory: true } });
    await entregarEAprovar(avulsa.json.task.id, "revisao.pdf");
    detalhe = (await chamar("GET", `/teams/${eq.agro}`, { token: t.ricardo })).json;
    assert.equal(detalhe.team.journeyStatus, "IN_PROGRESS");
  });

  test("com Canvas, VPD, Pitch e dados dos integrantes aprovados a equipe fica pronta", async () => {
    const modelos = (await chamar("GET", "/tasks/templates", { token: t.ricardo })).json.data.filter((m: { stage: number }) => m.stage === 6);
    assert.equal(modelos.length, 4);
    for (const modelo of modelos) {
      const tarefa = await chamar("POST", "/tasks", { token: t.ricardo, body: { teamId: eq.agro, templateId: modelo.id, dueDate: dia(7) } });
      await entregarEAprovar(tarefa.json.task.id, `${modelo.title}.pdf`);
    }
    const detalhe = (await chamar("GET", `/teams/${eq.agro}`, { token: t.ricardo })).json;
    assert.equal(detalhe.team.journeyStatus, "READY_FOR_INOVAMF");
  });

  test("só a coordenação encaminha; depois disso a jornada não muda mais", async () => {
    assert.equal((await chamar("POST", `/teams/${eq.agro}/refer`, { token: t.ricardo, body: {} })).status, 403);
    const encaminhada = await chamar("POST", `/teams/${eq.agro}/refer`, { token: t.admin, body: {} });
    assert.equal(encaminhada.status, 200, encaminhada.texto);
    assert.equal(encaminhada.json.team.journeyStatus, "REFERRED");
    const mover = await chamar("PATCH", `/teams/${eq.agro}/stage`, { token: t.ricardo, body: { toStage: 5 } });
    assert.equal(codigo(mover), "TEAM_ALREADY_REFERRED");
  });
});

describe("RF-22 / RF-23 / RF-24 — dashboard, CSV e período", () => {
  test("o dashboard traz os indicadores gerais e os períodos", async () => {
    const painel = await chamar("GET", "/reports/dashboard", { token: t.admin });
    const totais = painel.json.totals;
    assert.equal(totais.teams, 3);
    assert.equal(totais.activeTeams, 2);
    assert.equal(totais.referred, 1);
    assert.ok(totais.overdueTasks >= 1);
    assert.equal(painel.json.byStage.length, 6);
    assert.match(painel.json.periods[0], /^\d{4}\/[12]$/);
    assert.equal((await chamar("GET", "/reports/dashboard?period=2020/1", { token: t.admin })).json.totals.teams, 0);
  });

  test("o mentor vê o relatório só do escopo dele; o aluno não vê", async () => {
    assert.equal((await chamar("GET", "/reports/dashboard", { token: t.ricardo })).json.totals.teams, 1);
    assert.equal((await chamar("GET", "/reports/dashboard", { token: t.lucas })).status, 403);
    assert.equal((await chamar("GET", "/reports/teams.csv")).status, 401);
  });

  test("CSV com BOM e ';' para o Excel, uma linha por equipe", async () => {
    const csv = await chamar("GET", "/reports/teams.csv", { token: t.admin });
    assert.match(csv.headers.get("content-type") ?? "", /text\/csv/);
    assert.ok(csv.texto.startsWith("﻿"), "BOM");
    const linhas = csv.texto.slice(1).split("\r\n");
    assert.match(linhas[0]!, /^Período;Ideia;/);
    assert.equal(linhas.length - 1, 3);
  });

  test("texto que viraria fórmula no Excel sai protegido por apóstrofo", async () => {
    const r = await chamar("POST", "/teams/register", {
      body: await formularioIdeia({ team: { name: '=HYPERLINK("http://x","ok")' }, leader: { email: "formula@example.com" }, members: [] }),
    });
    assert.equal(r.status, 201, r.texto);
    const csv = await chamar("GET", "/reports/teams.csv", { token: t.admin });
    assert.ok(csv.texto.includes(`"'=HYPERLINK(""http://x"",""ok"")"`), "a célula começa com apóstrofo");
    assert.ok(!/(^|;)=HYPERLINK/m.test(csv.texto));
  });
});

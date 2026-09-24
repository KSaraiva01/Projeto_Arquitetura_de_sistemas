/** RF-11 a RF-21, RN-04 e RNF-04 — tarefas, entregas, avaliação, lembretes e e-mails. */
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { chamar, codigo, contasDoSeed, dia, equipesDoSeed, esperarFila, pdf, sql, usarApi } from "./apoio";

usarApi();

let t: Awaited<ReturnType<typeof contasDoSeed>>;
let eq: Awaited<ReturnType<typeof equipesDoSeed>>;
before(async () => {
  t = await contasDoSeed();
  eq = await equipesDoSeed();
});

const STATUS_RF12 = new Set(["PENDING", "IN_PROGRESS", "SUBMITTED", "OVERDUE", "APPROVED", "REJECTED"]);

describe("RF-11 / RF-12 / RF-13 — tarefas", () => {
  test("9 modelos por etapa, com os 4 entregáveis obrigatórios da etapa 6; o aluno não vê", async () => {
    const modelos = (await chamar("GET", "/tasks/templates", { token: t.admin })).json.data;
    assert.equal(modelos.length, 9);
    assert.equal(modelos.filter((m: { stage: number; isMandatory: boolean }) => m.stage === 6 && m.isMandatory).length, 4);
    assert.equal((await chamar("GET", "/tasks/templates", { token: t.lucas })).status, 403);
  });

  test("tarefa a partir de modelo herda título e etapa, e tem os campos do RF-12", async () => {
    const modelo = (await chamar("GET", "/tasks/templates", { token: t.ana })).json.data.find((m: { stage: number }) => m.stage === 3);
    const r = await chamar("POST", "/tasks", { token: t.ana, body: { teamId: eq.eco, templateId: modelo.id, dueDate: dia(9) } });
    assert.equal(r.status, 201, r.texto);
    assert.equal(r.json.task.title, modelo.title);
    assert.equal(r.json.task.stage, 3);
    for (const campo of ["title", "description", "stage", "dueDate", "status"]) assert.ok(campo in r.json.task, campo);
  });

  test("o aluno vê só as tarefas da própria equipe, sempre com um dos 6 status", async () => {
    const minhas = (await chamar("GET", "/tasks", { token: t.lucas })).json.data;
    assert.ok(minhas.length > 0);
    assert.ok(minhas.every((x: { teamId: string }) => x.teamId === eq.eco));
    const todas = (await chamar("GET", "/tasks", { token: t.admin })).json.data;
    assert.ok(todas.every((x: { status: string }) => STATUS_RF12.has(x.status)));
  });

  test("só a mentoria cria tarefa", async () => {
    assert.equal((await chamar("POST", "/tasks", { token: t.lucas, body: { teamId: eq.eco, title: "Eu mesmo", dueDate: dia(3) } })).status, 403);
  });
});

describe("RF-14 / RF-15 / RF-16 — entrega, avaliação e versões", () => {
  let tarefaId = "";

  test("o aluno marca 'em andamento'; a coordenação não", async () => {
    const criada = await chamar("POST", "/tasks", { token: t.ana, body: { teamId: eq.eco, title: "Agendar o encontro", dueDate: dia(5), isMandatory: true } });
    tarefaId = criada.json.task.id;
    const inicio = await chamar("PATCH", `/tasks/${tarefaId}/status`, { token: t.lucas, body: { status: "IN_PROGRESS" } });
    assert.equal(inicio.json.task.status, "IN_PROGRESS");
    assert.equal((await chamar("PATCH", `/tasks/${tarefaId}/status`, { token: t.admin, body: { status: "IN_PROGRESS" } })).status, 403);
  });

  test("entrega com vários arquivos; a coordenação não entrega; link só http(s)", async () => {
    const form = new FormData();
    form.append("files", pdf("canvas.pdf"));
    form.append("files", pdf("vpd.pdf"));
    form.append("note", "Primeira versão.");
    const entrega = await chamar("POST", `/tasks/${tarefaId}/submissions`, { token: t.lucas, form });
    assert.equal(entrega.status, 201, entrega.texto);
    assert.equal(entrega.json.task.status, "SUBMITTED");
    assert.equal(entrega.json.task.submissions[0].attachments.length, 2);

    const link = new FormData();
    link.append("linkUrl", "https://example.com/x");
    assert.equal(codigo(await chamar("POST", `/tasks/${tarefaId}/submissions`, { token: t.admin, form: link })), "ONLY_TEAM_MEMBERS");

    const js = new FormData();
    js.append("linkUrl", "javascript:alert(1)");
    assert.equal((await chamar("POST", `/tasks/${tarefaId}/submissions`, { token: t.lucas, form: js })).status, 422);
  });

  test("a mentora pede ajuste com comentário; o reenvio vira a v2 e a v1 fica", async () => {
    const ajuste = await chamar("POST", `/tasks/${tarefaId}/review`, { token: t.ana, body: { decision: "REJECTED", comment: "Falta o horário." } });
    assert.equal(ajuste.json.task.status, "REJECTED");

    const form = new FormData();
    form.append("linkUrl", "https://drive.google.com/agendamento");
    form.append("linkTitle", "Convite do encontro");
    const v2 = await chamar("POST", `/tasks/${tarefaId}/submissions`, { token: t.lucas, form });
    assert.deepEqual(v2.json.task.submissions.map((s: { version: number }) => s.version), [1, 2]);

    const doAluno = await chamar("GET", `/tasks/${tarefaId}`, { token: t.lucas });
    assert.ok(doAluno.json.task.comments.some((c: { decision: string; content: string }) => c.decision === "REJECTED" && c.content === "Falta o horário."));
  });

  test("aprovada, a tarefa não aceita nova entrega", async () => {
    const aprovada = await chamar("POST", `/tasks/${tarefaId}/review`, { token: t.ana, body: { decision: "APPROVED", comment: "Ok!" } });
    assert.equal(aprovada.json.task.status, "APPROVED");
    const form = new FormData();
    form.append("linkUrl", "https://example.com/v3");
    assert.equal(codigo(await chamar("POST", `/tasks/${tarefaId}/submissions`, { token: t.lucas, form })), "TASK_ALREADY_APPROVED");
  });

  test("o e-mail de entrega leva o mentor para /mentor e o admin para /admin", async () => {
    await esperarFila();
    const avisos = await sql<{ perfil: string; corpo: string }>(
      "SELECT u.perfil, n.corpo FROM notificacoes n JOIN usuarios u ON u.id = n.destinatario_id WHERE n.tipo = 'ENTREGA_RECEBIDA' AND n.tarefa_id = $1::uuid",
      tarefaId,
    );
    assert.ok(avisos.some((a) => a.perfil === "MENTOR" && a.corpo.includes("/mentor/equipes/")));
    assert.ok(avisos.some((a) => a.perfil === "ADMIN" && a.corpo.includes("/admin/equipes/")));
  });
});

describe("RNF-04 — arquivos", () => {
  let tarefaId = "";
  let caminho = "";
  let download = "";

  before(async () => {
    const criada = await chamar("POST", "/tasks", { token: t.ana, body: { teamId: eq.eco, title: "Entregar o pitch", dueDate: dia(6) } });
    tarefaId = criada.json.task.id;
  });

  test("tipo não permitido é recusado, mesmo com extensão de PDF", async () => {
    const exe = new FormData();
    exe.append("files", new File(["MZ"], "virus.exe", { type: "application/x-msdownload" }));
    assert.equal(codigo(await chamar("POST", `/tasks/${tarefaId}/submissions`, { token: t.lucas, form: exe })), "UPLOAD_TYPE_NOT_ALLOWED");
    const disfarcado = new FormData();
    disfarcado.append("files", new File(["MZ"], "relatorio.pdf", { type: "application/x-msdownload" }));
    assert.equal((await chamar("POST", `/tasks/${tarefaId}/submissions`, { token: t.lucas, form: disfarcado })).status, 400);
  });

  test("mais de 5 arquivos → 413", async () => {
    const form = new FormData();
    for (let i = 1; i <= 6; i += 1) form.append("files", pdf(`parte${i}.pdf`));
    assert.equal((await chamar("POST", `/tasks/${tarefaId}/submissions`, { token: t.lucas, form })).status, 413);
  });

  test("o arquivo fica com nome aleatório e só sai pela API, dentro do escopo", async () => {
    const form = new FormData();
    form.append("files", pdf("pitch.pdf"));
    const entrega = await chamar("POST", `/tasks/${tarefaId}/submissions`, { token: t.lucas, form });
    const anexo = entrega.json.task.submissions[0].attachments[0];
    const [linha] = await sql<{ caminho_armazenamento: string }>("SELECT caminho_armazenamento FROM anexos_entrega WHERE id = $1::uuid", anexo.id);
    caminho = linha!.caminho_armazenamento;
    assert.match(caminho, /[0-9a-f-]{36}\.pdf$/);
    download = `/tasks/${tarefaId}/attachments/${anexo.id}/download`;

    assert.equal((await chamar("GET", download)).status, 401);
    assert.equal((await chamar("GET", download, { token: t.pedro })).status, 403);
    const ok = await chamar("GET", download, { token: t.lucas });
    assert.equal(ok.status, 200);
    assert.ok(ok.texto.startsWith("%PDF"));
  });
});

describe("RF-17 — lembretes que acompanham o prazo", () => {
  let tarefaId = "";

  test("a tarefa sai com as datas de lembrete escolhidas", async () => {
    const r = await chamar("POST", "/tasks", { token: t.ana, body: { teamId: eq.eco, title: "Tarefa com lembretes", dueDate: dia(10), reminderDaysBefore: [3, 1] } });
    tarefaId = r.json.task.id;
    assert.equal(r.json.task.reminders.length, 2);
    const fixo = await chamar("POST", `/tasks/${tarefaId}/reminders`, { token: t.ana, body: { remindAt: dia(5) } });
    assert.equal(fixo.json.task.reminders.length, 3);
  });

  test("prazo adiado: o lembrete já enviado volta a valer e acompanha a nova data", async () => {
    await sql("UPDATE lembretes_tarefa SET enviado_em = now() WHERE tarefa_id = $1::uuid AND dias_antes = 3", tarefaId);
    const adiada = await chamar("PATCH", `/tasks/${tarefaId}`, { token: t.ana, body: { dueDate: dia(20) } });
    const tres = adiada.json.task.reminders.find((r: { daysBefore: number | null }) => r.daysBefore === 3);
    assert.equal(tres.sentAt, null);
    assert.equal(new Date(tres.remindAt).toLocaleDateString("sv-SE"), dia(17));
    const fixo = adiada.json.task.reminders.find((r: { daysBefore: number | null }) => r.daysBefore === null);
    assert.equal(new Date(fixo.remindAt).toLocaleDateString("sv-SE"), dia(5), "a data fixa não muda");
  });

  test("prazo antecipado: os lembretes vencidos juntos viram UM e-mail por integrante", async () => {
    await chamar("PATCH", `/tasks/${tarefaId}`, { token: t.ana, body: { dueDate: dia(1) } });
    assert.equal((await chamar("POST", "/jobs/run", { token: t.admin })).status, 200);
    const [avisos] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM notificacoes WHERE tipo = 'PRAZO_PROXIMO' AND tarefa_id = $1::uuid", tarefaId);
    assert.equal(avisos!.n, 3, "3 integrantes na EcoTrack");
  });
});

describe("RN-04 — atraso automático", () => {
  let tarefaId = "";
  const avisos = async () =>
    (
      await sql<{ tipo: string; n: number }>(
        "SELECT tipo::text, count(*)::int AS n FROM notificacoes WHERE tarefa_id = $1::uuid AND tipo IN ('PRAZO_VENCIDO', 'TAREFA_ATRASADA') GROUP BY tipo ORDER BY tipo",
        tarefaId,
      )
    ).map(({ tipo, n }) => ({ tipo, n }));

  test("vencida sem entrega vira atrasada e avisa alunos e quem acompanha", async () => {
    const r = await chamar("POST", "/tasks", { token: t.ana, body: { teamId: eq.eco, title: "Tarefa que vai vencer", dueDate: dia(2), isMandatory: true } });
    tarefaId = r.json.task.id;
    await sql("UPDATE tarefas SET prazo = now() - interval '1 hour' WHERE id = $1::uuid", tarefaId);

    const job = await chamar("POST", "/jobs/run", { token: t.admin });
    assert.ok(job.json.tarefasAtrasadas >= 1);
    assert.equal((await chamar("GET", `/tasks/${tarefaId}`, { token: t.admin })).json.task.status, "OVERDUE");
    assert.deepEqual(await avisos(), [
      { tipo: "PRAZO_VENCIDO", n: 3 },
      { tipo: "TAREFA_ATRASADA", n: 2 },
    ]);
  });

  test("rodar a rotina de novo não repete os e-mails, e o painel sinaliza a equipe", async () => {
    const antes = await avisos();
    await chamar("POST", "/jobs/run", { token: t.admin });
    assert.deepEqual(await avisos(), antes);
    const card = (await chamar("GET", "/teams?search=eco", { token: t.admin })).json.data[0];
    assert.ok(card.overdueTasks >= 1);
  });
});

describe("RF-20 / RF-21 — lembrete manual e preferências", () => {
  test("lembrete manual chega aos 3 integrantes; o aluno não dispara", async () => {
    const r = await chamar("POST", `/teams/${eq.eco}/reminders`, { token: t.ana, body: { subject: "Encontro amanhã", message: "Tragam o canvas." } });
    assert.equal(r.json.recipients, 3);
    assert.equal((await chamar("POST", `/teams/${eq.eco}/reminders`, { token: t.lucas, body: { subject: "Oi oi", message: "Teste" } })).status, 403);
  });

  test("quem desliga o aviso de nova tarefa não recebe; os colegas recebem", async () => {
    await chamar("PUT", "/auth/me/notification-preferences", { token: t.lucas, body: { preferences: [{ type: "NOVA_TAREFA", enabled: false }] } });
    const r = await chamar("POST", "/tasks", { token: t.ana, body: { teamId: eq.eco, title: "Tarefa com opt-out", dueDate: dia(12) } });
    const destinos = await sql<{ email_destino: string }>("SELECT email_destino FROM notificacoes WHERE tarefa_id = $1::uuid AND tipo = 'NOVA_TAREFA'", r.json.task.id);
    assert.equal(destinos.length, 2);
    assert.ok(!destinos.some((d) => d.email_destino === "lucas@aluno.amf.edu.br"));
  });
});

describe("RF-18 / RF-19 — e-mails automáticos e a tabela de envios", () => {
  test("aluno: nova tarefa, prazo próximo, prazo vencido e entrega avaliada; coordenação e mentoria: cadastro, entrega e atraso", async () => {
    await esperarFila();
    const tipos = await sql<{ tipo: string; perfil: string }>(
      "SELECT DISTINCT n.tipo::text, u.perfil::text FROM notificacoes n JOIN usuarios u ON u.id = n.destinatario_id",
    );
    const tem = (tipo: string, perfil: string) => tipos.some((x) => x.tipo === tipo && x.perfil === perfil);
    for (const tipo of ["NOVA_TAREFA", "PRAZO_PROXIMO", "PRAZO_VENCIDO", "ENTREGA_AVALIADA"]) assert.ok(tem(tipo, "ALUNO"), tipo);
    for (const tipo of ["NOVO_CADASTRO", "ENTREGA_RECEBIDA", "TAREFA_ATRASADA"]) assert.ok(tem(tipo, "ADMIN"), tipo);
    assert.ok(tem("ENTREGA_RECEBIDA", "MENTOR") && tem("TAREFA_ATRASADA", "MENTOR"));
  });

  test("nenhum aviso repetido, e tudo o que saiu tem data de envio", async () => {
    const repetidas = await sql("SELECT chave_idempotencia FROM notificacoes WHERE chave_idempotencia IS NOT NULL GROUP BY 1 HAVING count(*) > 1");
    assert.equal(repetidas.length, 0);
    const [semData] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM notificacoes WHERE status = 'ENVIADA' AND enviada_em IS NULL");
    assert.equal(semData!.n, 0);
  });

  test("a auditoria tem as mudanças de etapa, as avaliações e os atrasos (RNF-05)", async () => {
    const acoes = (await sql<{ acao: string }>("SELECT DISTINCT acao FROM registros_auditoria")).map((a) => a.acao);
    for (const acao of ["TAREFA_CRIADA", "TAREFA_ENTREGUE", "TAREFA_APROVADA", "TAREFA_REPROVADA", "TAREFA_MARCADA_ATRASADA", "LEMBRETE_MANUAL_ENVIADO"]) {
      assert.ok(acoes.includes(acao), acao);
    }
  });
});

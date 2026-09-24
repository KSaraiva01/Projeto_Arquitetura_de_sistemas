/** RF-01, RF-02, RF-04, RF-05, RN-03, Q5 e a validação do e-mail. */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  EMAIL_ADMIN,
  SENHA,
  chamar,
  codigo,
  contasDoSeed,
  equipesDoSeed,
  esperarFila,
  formularioIdeia,
  login,
  sql,
  tokenDoUltimoEmail,
  usarApi,
} from "./apoio";

usarApi();

describe("RF-01 — login e recuperação de senha", () => {
  test("senha errada e e-mail inexistente recebem a mesma resposta", async () => {
    const errada = await login("lucas@aluno.amf.edu.br", "senha-errada1");
    const inexistente = await login("ninguem@example.com", "senha-errada1");
    assert.equal(errada.status, 401);
    assert.equal(codigo(errada), "INVALID_CREDENTIALS");
    assert.deepEqual(inexistente.json, errada.json);
  });

  test("cada perfil recebe a sua role, e líder e integrante se distinguem", async () => {
    const [admin, mentor, lider, integrante] = await Promise.all([
      login(EMAIL_ADMIN, SENHA.admin),
      login("ana@amf.edu.br", SENHA.mentor),
      login("lucas@aluno.amf.edu.br", SENHA.aluno),
      login("joao@aluno.amf.edu.br", SENHA.aluno),
    ]);
    assert.equal(admin.json.user.role, "ADMIN");
    assert.equal(mentor.json.user.role, "MENTOR");
    assert.equal(lider.json.user.role, "STUDENT");
    assert.equal(lider.json.user.teams[0].memberRole, "LEADER");
    assert.equal(integrante.json.user.teams[0].memberRole, "MEMBER");
  });

  test("esqueci a senha: mesma resposta exista a conta ou não, e o link vale uma vez", async () => {
    const inexistente = await chamar("POST", "/auth/forgot-password", { body: { email: "ninguem@example.com" } });
    const existente = await chamar("POST", "/auth/forgot-password", { body: { email: "joao@aluno.amf.edu.br" } });
    assert.equal(existente.status, 202);
    assert.equal(existente.texto, inexistente.texto);

    await esperarFila();
    const token = tokenDoUltimoEmail("joao@aluno.amf.edu.br", "/definir-senha");
    assert.ok(token, "o e-mail de recuperação traz o link /definir-senha?token=");

    assert.equal((await chamar("POST", "/auth/reset-password", { body: { token, password: "NovaSenha123" } })).status, 200);
    assert.equal((await login("joao@aluno.amf.edu.br", "NovaSenha123")).status, 200);
    assert.equal((await login("joao@aluno.amf.edu.br", SENHA.aluno)).status, 401, "a senha antiga deixa de valer");

    const reuso = await chamar("POST", "/auth/reset-password", { body: { token, password: "OutraSenha123" } });
    assert.equal(codigo(reuso), "INVALID_RESET_TOKEN");
  });

  test("sem 'Lembrar-me' o cookie é de sessão, e a renovação mantém isso", async () => {
    const sem = await login("fernanda@aluno.amf.edu.br", SENHA.aluno, { rememberMe: false });
    const cookies = sem.headers.getSetCookie();
    const refresh = cookies.find((c) => c.startsWith("infohub_refresh_token="));
    assert.ok(refresh && !/Max-Age|Expires/i.test(refresh), "cookie sem validade");
    assert.ok(cookies.some((c) => c.startsWith("infohub_sessao_temporaria=1")));

    const renovada = await chamar("POST", "/auth/refresh", { body: {}, cookie: cookies.map((c) => c.split(";")[0]).join("; ") });
    assert.equal(renovada.status, 200);
    const refreshRenovado = renovada.headers.getSetCookie().find((c) => c.startsWith("infohub_refresh_token="));
    assert.ok(refreshRenovado && !/Max-Age|Expires/i.test(refreshRenovado));
  });

  test("com 'Lembrar-me' o cookie tem validade, e o logout fica na auditoria", async () => {
    const com = await login("fernanda@aluno.amf.edu.br", SENHA.aluno);
    assert.match(com.headers.getSetCookie().find((c) => c.startsWith("infohub_refresh_token=")) ?? "", /Max-Age/i);

    const sair = await chamar("POST", "/auth/logout", { body: { refreshToken: com.json.refreshToken } });
    assert.equal(sair.status, 204);
    const [auditoria] = await sql<{ n: number }>(
      "SELECT count(*)::int AS n FROM registros_auditoria a JOIN usuarios u ON u.id = a.usuario_id WHERE a.acao = 'LOGOUT' AND u.email = 'fernanda@aluno.amf.edu.br'",
    );
    assert.equal(auditoria!.n, 1);
  });
});

describe("RF-02 / RF-04 / RF-05 — formulário inicial da ideia", () => {
  test("campos obrigatórios são validados (422 apontando o campo)", async () => {
    assert.equal((await chamar("POST", "/teams/register", { body: {} })).status, 422);

    const curta = await chamar("POST", "/teams/register", { body: await formularioIdeia({ team: { description: "curta" } }) });
    assert.equal(curta.status, 422);
    assert.ok(curta.json.error.fields.some((f: { field: string }) => f.field === "team.description"), curta.texto);

    const semAceite = await chamar("POST", "/teams/register", { body: await formularioIdeia({ lgpdConsent: false }) });
    assert.equal(semAceite.status, 422);
  });

  let equipeId = "";

  test("o cadastro cria a equipe na Etapa 1, com o histórico e o período de ingresso", async () => {
    const r = await chamar("POST", "/teams/register", {
      body: await formularioIdeia({ team: { name: "Ideia Solar", howDidYouHear: "Professor" } }),
    });
    assert.equal(r.status, 201, r.texto);
    equipeId = r.json.teamId;

    const [equipe] = await sql<{ ordem: number; status_jornada: string; periodo_ingresso: string }>(
      "SELECT ee.ordem, e.status_jornada, e.periodo_ingresso FROM equipes e JOIN etapas_equipe ee ON ee.id = e.etapa_atual_id WHERE e.id = $1::uuid",
      equipeId,
    );
    assert.equal(equipe!.ordem, 1);
    assert.equal(equipe!.status_jornada, "EM_ANDAMENTO");
    assert.match(equipe!.periodo_ingresso, /^\d{4}\/[12]$/);

    const historico = await sql<{ direcao: string }>("SELECT direcao FROM historico_etapas WHERE equipe_id = $1::uuid", equipeId);
    assert.deepEqual(historico.map((h) => h.direcao), ["INICIO"]);
  });

  test("a coordenação é avisada, o colega recebe o token e o líder, a confirmação", async () => {
    const avisos = await sql<{ tipo: string; perfil: string; email_destino: string }>(
      `SELECT n.tipo, u.perfil, n.email_destino FROM notificacoes n JOIN usuarios u ON u.id = n.destinatario_id
        WHERE n.equipe_id = $1::uuid OR n.email_destino IN ('lider.teste@example.com', 'colega.teste@example.com')`,
      equipeId,
    );
    assert.ok(avisos.some((a) => a.tipo === "NOVO_CADASTRO" && a.perfil === "ADMIN"), "NOVO_CADASTRO para o admin");
    assert.ok(avisos.some((a) => a.tipo === "ATIVACAO_CONTA" && a.email_destino === "colega.teste@example.com"));
    assert.ok(avisos.some((a) => a.tipo === "CONFIRMACAO_EMAIL" && a.email_destino === "lider.teste@example.com"));
  });

  test("o líder só entra depois de abrir o link de confirmação", async () => {
    assert.equal(codigo(await login("lider.teste@example.com", "Senha123")), "EMAIL_NOT_CONFIRMED");
    await esperarFila();
    const token = tokenDoUltimoEmail("lider.teste@example.com", "/confirmar-email");
    assert.ok(token);
    assert.equal((await chamar("POST", "/auth/confirm-email", { body: { token } })).status, 200);
    assert.equal((await login("lider.teste@example.com", "Senha123")).status, 200);
  });

  test("o colega só entra pelo link de ativação, e aceita a LGPD nessa hora", async () => {
    assert.equal(codigo(await login("colega.teste@example.com", "qualquer123")), "PASSWORD_NOT_SET");
    const token = tokenDoUltimoEmail("colega.teste@example.com", "/definir-senha");
    assert.ok(token);

    const semAceite = await chamar("POST", "/auth/reset-password", { body: { token, password: "Colega123" } });
    assert.equal(codigo(semAceite), "LGPD_CONSENT_REQUIRED");
    const ativada = await chamar("POST", "/auth/reset-password", { body: { token, password: "Colega123", lgpdConsent: true } });
    assert.equal(ativada.status, 200, ativada.texto);

    const [colega] = await sql<{ aceitou: boolean }>(
      "SELECT consentimento_lgpd_em IS NOT NULL AS aceitou FROM usuarios WHERE email = 'colega.teste@example.com'",
    );
    assert.equal(colega!.aceitou, true);
    assert.equal((await login("colega.teste@example.com", "Colega123")).status, 200);
  });

  test("depois de enviados, os e-mails de ativação e confirmação ficam sem o token", async () => {
    await esperarFila();
    const [comToken] = await sql<{ n: number }>(
      "SELECT count(*)::int AS n FROM notificacoes WHERE tipo IN ('CONFIRMACAO_EMAIL', 'ATIVACAO_CONTA', 'RECUPERACAO_SENHA') AND status = 'ENVIADA' AND corpo ~ 'token=[A-Za-z0-9_-]{20,}'",
    );
    assert.equal(comToken!.n, 0);
  });
});

describe("RN-03 — uma equipe ativa por aluno", () => {
  test("colega que já está em outra equipe → 409, e nada é gravado", async () => {
    const r = await chamar("POST", "/teams/register", {
      body: await formularioIdeia({
        leader: { email: "eva.teste@example.com" },
        members: [{ name: "Lucas Oliveira", email: "lucas@aluno.amf.edu.br", course: "Sistemas de Informação" }],
      }),
    });
    assert.equal(r.status, 409);
    assert.equal(codigo(r), "STUDENT_ALREADY_IN_TEAM");
    const [gravado] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM usuarios WHERE email = 'eva.teste@example.com'");
    assert.equal(gravado!.n, 0);
  });

  test("incluir na equipe um aluno de outra equipe → 409", async () => {
    const { admin } = await contasDoSeed();
    const { eco } = await equipesDoSeed();
    const r = await chamar("POST", `/teams/${eco}/members`, {
      token: admin,
      body: { name: "Pedro Henrique Costa", email: "pedro@aluno.amf.edu.br", course: "Sistemas de Informação" },
    });
    assert.equal(codigo(r), "STUDENT_ALREADY_IN_TEAM");
  });
});

describe("Q5 — no máximo 11 integrantes (o líder e 10 colegas)", () => {
  const colegas = (n: number, prefixo: string) =>
    Array.from({ length: n }, (_, i) => ({ name: `Colega ${prefixo} ${i + 1}`, email: `${prefixo}${i + 1}@example.com`, course: "Administração" }));

  test("o formulário recusa 11 colegas", async () => {
    const r = await chamar("POST", "/teams/register", {
      body: await formularioIdeia({ leader: { email: "grande.demais@example.com" }, members: colegas(11, "excesso") }),
    });
    assert.equal(r.status, 422);
  });

  test("com 10 colegas a equipe fica cheia e não aceita mais ninguém", async () => {
    const r = await chamar("POST", "/teams/register", {
      body: await formularioIdeia({ team: { name: "Equipe Cheia" }, leader: { email: "lider.cheia@example.com" }, members: colegas(10, "cheia") }),
    });
    assert.equal(r.status, 201, r.texto);
    const { admin } = await contasDoSeed();
    const mais = await chamar("POST", `/teams/${r.json.teamId}/members`, {
      token: admin,
      body: { name: "Mais Um Colega", email: "mais.um@example.com", course: "Administração" },
    });
    assert.equal(mais.status, 409);
    assert.equal(codigo(mais), "TEAM_FULL");
  });
});

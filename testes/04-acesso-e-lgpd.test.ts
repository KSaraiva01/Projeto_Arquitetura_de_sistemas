/** RNF-03 (controle de acesso), RF-03 (contas), Q4 (exclusão lógica) e RNF-02 (LGPD). */
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { aplicarRetencao } from "../backend/src/jobs/retencao";
import {
  EMAIL_ADMIN,
  SENHA,
  chamar,
  codigo,
  contasDoSeed,
  dia,
  equipesDoSeed,
  esperarFila,
  formularioIdeia,
  login,
  sql,
  tokenDoUltimoEmail,
  usarApi,
} from "./apoio";

usarApi();

let t: Awaited<ReturnType<typeof contasDoSeed>>;
let eq: Awaited<ReturnType<typeof equipesDoSeed>>;
before(async () => {
  t = await contasDoSeed();
  eq = await equipesDoSeed();
});

const idDe = async (email: string) => (await sql<{ id: string }>("SELECT id::text FROM usuarios WHERE email = $1", email))[0]!.id;

/** Cadastra uma ideia e confirma o e-mail do líder pela coordenação; devolve o token do líder. */
async function novaEquipe(liderEmail: string, sobre: Parameters<typeof formularioIdeia>[0] = {}) {
  const r = await chamar("POST", "/teams/register", { body: await formularioIdeia({ ...sobre, leader: { email: liderEmail, ...sobre.leader } }) });
  assert.equal(r.status, 201, r.texto);
  assert.equal((await chamar("POST", `/users/${await idDe(liderEmail)}/confirm-email`, { token: t.admin })).status, 200);
  const entrada = await login(liderEmail, "Senha123");
  assert.equal(entrada.status, 200);
  return { equipeId: r.json.teamId as string, token: entrada.json.accessToken as string };
}

describe("RNF-03 — cada perfil vê só o seu escopo", () => {
  test("sem login → 401", async () => {
    assert.equal((await chamar("GET", "/teams")).status, 401);
  });

  test("mentor só enxerga e mexe nas equipes dele", async () => {
    assert.equal((await chamar("GET", `/teams/${eq.eco}`, { token: t.ricardo })).status, 403);
    assert.deepEqual((await chamar("GET", "/teams", { token: t.ricardo })).json.data.map((e: { name: string }) => e.name), ["AgroSense"]);
    assert.equal((await chamar("PATCH", `/teams/${eq.eco}/stage`, { token: t.ricardo, body: { toStage: 3 } })).status, 403);
  });

  test("aluno não abre equipe nem tarefa de outra equipe", async () => {
    assert.equal((await chamar("GET", `/teams/${eq.agro}`, { token: t.lucas })).status, 403);
    const tarefaEco = (await chamar("GET", `/tasks?teamId=${eq.eco}`, { token: t.admin })).json.data[0];
    assert.equal((await chamar("GET", `/tasks/${tarefaEco.id}`, { token: t.pedro })).status, 403);
  });

  test("gestão de usuários, exclusão de equipe e atribuição de mentor são só da coordenação", async () => {
    assert.equal((await chamar("GET", "/users", { token: t.lucas })).status, 403);
    assert.equal((await chamar("GET", "/users", { token: t.ana })).status, 403);
    assert.equal((await chamar("DELETE", `/teams/${eq.eco}`, { token: t.ana })).status, 403);
    assert.equal((await chamar("POST", `/teams/${eq.eco}/mentors`, { token: t.ana, body: { mentorId: await idDe("paula@amf.edu.br") } })).status, 403);
  });

  test("conta desativada perde o acesso na hora, mesmo com o token ainda válido", async () => {
    const fernanda = await login("fernanda@aluno.amf.edu.br", SENHA.aluno);
    const id = await idDe("fernanda@aluno.amf.edu.br");
    assert.equal((await chamar("PATCH", `/users/${id}/status`, { token: t.admin, body: { isActive: false } })).status, 200);
    assert.equal(codigo(await chamar("GET", "/auth/me", { token: fernanda.json.accessToken })), "ACCOUNT_DISABLED");
    assert.equal(codigo(await login("fernanda@aluno.amf.edu.br", SENHA.aluno)), "ACCOUNT_DISABLED");
    await chamar("PATCH", `/users/${id}/status`, { token: t.admin, body: { isActive: true } });
    assert.equal((await login("fernanda@aluno.amf.edu.br", SENHA.aluno)).status, 200);
  });
});

describe("RF-03 — contas de administrador e mentor", () => {
  let mentoraId = "";

  test("a coordenação cria a mentora; ela ativa pelo link e aceita a LGPD", async () => {
    const criada = await chamar("POST", "/users", { token: t.admin, body: { name: "Mentora Nova", email: "mentora.nova@example.com", role: "MENTOR" } });
    assert.equal(criada.status, 201, criada.texto);
    assert.equal(criada.json.user.hasPassword, false);
    mentoraId = criada.json.user.id;

    const reenvio = await chamar("POST", `/users/${mentoraId}/resend-access`, { token: t.admin });
    assert.match(reenvio.json.message, /ativação/);

    await esperarFila();
    const token = tokenDoUltimoEmail("mentora.nova@example.com", "/definir-senha");
    assert.equal(codigo(await chamar("POST", "/auth/reset-password", { body: { token, password: "Mentora123" } })), "LGPD_CONSENT_REQUIRED");
    assert.equal((await chamar("POST", "/auth/reset-password", { body: { token, password: "Mentora123", lgpdConsent: true } })).status, 200);
    assert.equal((await login("mentora.nova@example.com", "Mentora123")).json.user.role, "MENTOR");
  });

  test("editar a conta e atribuir a mentora a uma equipe", async () => {
    const editada = await chamar("PATCH", `/users/${mentoraId}`, { token: t.admin, body: { name: "Mentora Renomeada" } });
    assert.equal(editada.json.user.name, "Mentora Renomeada");
    const atribuida = await chamar("POST", `/teams/${eq.agro}/mentors`, { token: t.admin, body: { mentorId: mentoraId } });
    assert.equal(atribuida.json.added, true);
    const token = (await login("mentora.nova@example.com", "Mentora123")).json.accessToken;
    assert.deepEqual((await chamar("GET", "/teams", { token })).json.data.map((e: { name: string }) => e.name), ["AgroSense"]);
  });

  test("o último administrador não se desativa nem vira mentor", async () => {
    const adminId = await idDe(EMAIL_ADMIN);
    assert.equal(codigo(await chamar("PATCH", `/users/${adminId}`, { token: t.admin, body: { role: "MENTOR" } })), "LAST_ACTIVE_ADMIN");
    assert.equal(codigo(await chamar("PATCH", `/users/${adminId}/status`, { token: t.admin, body: { isActive: false } })), "CANNOT_DISABLE_SELF");
  });

  test("desativar a mentora a tira do sistema", async () => {
    await chamar("PATCH", `/users/${mentoraId}/status`, { token: t.admin, body: { isActive: false } });
    assert.equal(codigo(await login("mentora.nova@example.com", "Mentora123")), "ACCOUNT_DISABLED");
  });
});

describe("Q4 — exclusão lógica da equipe", () => {
  let equipeId = "";
  let tokenLider = "";
  let tarefaId = "";

  before(async () => {
    ({ equipeId, token: tokenLider } = await novaEquipe("lider.q4@example.com", { members: [] }));
    tarefaId = (await chamar("POST", "/tasks", { token: t.admin, body: { teamId: equipeId, title: "Tarefa da equipe a excluir", dueDate: dia(5) } })).json.task.id;
  });

  test("só a coordenação exclui, e a equipe some das listas", async () => {
    assert.equal((await chamar("DELETE", `/teams/${equipeId}`, { token: t.admin })).status, 204);
    const lista = (await chamar("GET", "/teams", { token: t.admin })).json.data.map((e: { id: string }) => e.id);
    assert.ok(!lista.includes(equipeId));
    const comExcluidas = (await chamar("GET", "/teams?includeInactive=true", { token: t.admin })).json.data.map((e: { id: string }) => e.id);
    assert.ok(comExcluidas.includes(equipeId));
  });

  test("o aluno não abre mais a equipe, a tarefa nem entrega (404)", async () => {
    assert.equal((await chamar("GET", `/teams/${equipeId}`, { token: tokenLider })).status, 404);
    assert.equal((await chamar("GET", `/tasks/${tarefaId}`, { token: tokenLider })).status, 404);
    const form = new FormData();
    form.append("linkUrl", "https://example.com/entrega");
    assert.equal((await chamar("POST", `/tasks/${tarefaId}/submissions`, { token: tokenLider, form })).status, 404);
    assert.deepEqual((await chamar("GET", "/auth/me", { token: tokenLider })).json.user.teams, []);
  });

  test("a coordenação ainda consulta, mas não altera (TEAM_INACTIVE)", async () => {
    const detalhe = await chamar("GET", `/teams/${equipeId}`, { token: t.admin });
    assert.equal(detalhe.json.team.isActive, false);
    assert.equal(codigo(await chamar("PATCH", `/tasks/${tarefaId}`, { token: t.admin, body: { title: "Não pode" } })), "TEAM_INACTIVE");
    const [linhas] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM tarefas WHERE equipe_id = $1::uuid", equipeId);
    assert.equal(linhas!.n, 1, "nada foi apagado de verdade");
  });
});

describe("RNF-02 — exclusão dos dados pessoais e novo líder", () => {
  let titularId = "";
  let equipeId = "";

  test("o líder exclui a própria conta com a senha, e o integrante mais antigo assume", async () => {
    const equipe = await novaEquipe("titular@example.com", {
      leader: { name: "Titular dos Dados" },
      members: [{ name: "Sucessor do Lider", email: "sucessor@example.com", course: "Administração" }],
    });
    equipeId = equipe.equipeId;
    titularId = await idDe("titular@example.com");
    await login("titular@example.com", "senha-errada1");
    await esperarFila();

    const [antes] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM notificacoes WHERE corpo LIKE '%Titular dos Dados%'");
    assert.ok(antes!.n >= 1, "o nome aparecia no aviso de nova ideia à coordenação");

    assert.equal((await chamar("DELETE", "/auth/me", { token: equipe.token, body: { password: "errada123" } })).status, 401);
    const excluida = await chamar("DELETE", "/auth/me", { token: equipe.token, body: { password: "Senha123" } });
    assert.equal(excluida.status, 200, excluida.texto);
    assert.equal(excluida.json.promotedLeaders[0].newLeaderName, "Sucessor do Lider");

    const [lider] = await sql<{ email: string }>("SELECT u.email FROM equipes e JOIN usuarios u ON u.id = e.lider_id WHERE e.id = $1::uuid", equipeId);
    assert.equal(lider!.email, "sucessor@example.com");
  });

  test("a conta fica anonimizada", async () => {
    const [u] = await sql<{ nome: string; email: string; telefone: string | null; senha_hash: string | null; ativo: boolean }>(
      "SELECT nome, email, telefone, senha_hash, ativo FROM usuarios WHERE id = $1::uuid",
      titularId,
    );
    assert.equal(u!.nome, "Usuário removido");
    assert.match(u!.email, /@anonimizado\.local$/);
    assert.equal(u!.telefone, null);
    assert.equal(u!.senha_hash, null);
    assert.equal(u!.ativo, false);
  });

  test("o nome, o e-mail e o IP somem dos e-mails, da auditoria e das sessões", async () => {
    const contar = async (texto: string, ...p: unknown[]) => (await sql<{ n: number }>(texto, ...p))[0]!.n;
    assert.equal(await contar("SELECT count(*)::int AS n FROM notificacoes WHERE corpo LIKE '%Titular dos Dados%'"), 0);
    assert.equal(await contar("SELECT count(*)::int AS n FROM notificacoes WHERE destinatario_id = $1::uuid AND email_destino NOT LIKE '%@anonimizado.local'", titularId), 0);
    assert.equal(await contar("SELECT count(*)::int AS n FROM registros_auditoria WHERE detalhes::text LIKE '%titular@example.com%'"), 0);
    assert.equal(await contar("SELECT count(*)::int AS n FROM registros_auditoria WHERE usuario_id = $1::uuid AND ip IS NOT NULL", titularId), 0);
    assert.equal(await contar("SELECT count(*)::int AS n FROM sessoes WHERE usuario_id = $1::uuid", titularId), 0);
  });

  test("a conta excluída não entra mais", async () => {
    // Por último: a tentativa gera um registro de acesso novo com o e-mail digitado
    // (normal num login falho; a retenção de registros de acesso apaga depois).
    assert.equal((await login("titular@example.com", "Senha123")).status, 401);
  });

  test("sem outro integrante, a equipe do líder excluído é excluída (logicamente)", async () => {
    const sozinho = await novaEquipe("sozinho@example.com", { members: [] });
    const r = await chamar("DELETE", "/auth/me", { token: sozinho.token, body: { password: "Senha123" } });
    assert.equal(r.json.deletedTeams[0].teamId, sozinho.equipeId);
  });

  test("a coordenação atende o pedido de um aluno pela tela de usuários", async () => {
    const r = await chamar("DELETE", `/users/${await idDe("isabela@aluno.amf.edu.br")}`, { token: t.admin });
    assert.equal(r.status, 200);
    const [membros] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM integrantes_equipe WHERE equipe_id = $1::uuid AND saiu_em IS NULL", eq.agro);
    assert.equal(membros!.n, 3);
  });

  test("a retenção apaga sessões e links vencidos, e mantém os recentes", async () => {
    const lucas = await idDe("lucas@aluno.amf.edu.br");
    await sql(
      `INSERT INTO sessoes (id, usuario_id, refresh_token_hash, expira_em, revogada_em, criado_em)
       VALUES (gen_random_uuid(), $1::uuid, 'hash-antigo', now() - interval '40 days', now() - interval '40 days', now() - interval '47 days')`,
      lucas,
    );
    await sql(
      `INSERT INTO tokens_usuario (id, usuario_id, tipo, token_hash, expira_em, usado_em, criado_em)
       VALUES (gen_random_uuid(), $1::uuid, 'RECUPERACAO_SENHA', 'token-antigo', now() - interval '40 days', now() - interval '40 days', now() - interval '41 days')`,
      lucas,
    );
    const limpeza = await aplicarRetencao();
    assert.ok(limpeza.sessoes >= 1 && limpeza.tokens >= 1, JSON.stringify(limpeza));
    const [sobrou] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM sessoes WHERE refresh_token_hash = 'hash-antigo'");
    assert.equal(sobrou!.n, 0);
    assert.equal((await chamar("GET", "/auth/me", { token: t.lucas })).status, 200, "a sessão atual continua valendo");
  });
});

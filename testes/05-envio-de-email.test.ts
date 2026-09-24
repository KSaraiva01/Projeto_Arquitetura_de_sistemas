/** RNF-06 (envio confiável, com reenvio) e as contas de demonstração, com a Resend simulada. */
import { PORTA_RESEND_FALSA } from "./resend-falso";

import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import { after, before, describe, test } from "node:test";
import { EMAILS_DEMONSTRACAO } from "../backend/src/shared/email/demonstracao";
import { entregarEmail } from "../backend/src/shared/email/mailer";
import { enfileirar, processarFila } from "../backend/src/modules/notificacoes/notificacoes.service";
import { chamar, esperarFila, formularioIdeia, prisma, sql, usarApi } from "./apoio";

usarApi();

interface Pedido {
  para: string;
  chave: string;
  tags: Array<{ name: string; value: string }>;
}

const pedidos: Pedido[] = [];
const provedor = http.createServer((req, res) => {
  let corpo = "";
  req.on("data", (parte) => (corpo += parte));
  req.on("end", () => {
    const json = JSON.parse(corpo || "{}") as { to?: string[]; tags?: Pedido["tags"] };
    const para = json.to?.[0] ?? "";
    pedidos.push({ para, chave: String(req.headers["idempotency-key"] ?? ""), tags: json.tags ?? [] });
    res.setHeader("content-type", "application/json");
    if (para.startsWith("invalido")) {
      res.writeHead(422).end(JSON.stringify({ name: "validation_error", message: "Invalid `to` field.", statusCode: 422 }));
    } else if (para.startsWith("instavel") && pedidos.filter((p) => p.para === para).length === 1) {
      res.writeHead(500).end(JSON.stringify({ name: "internal_server_error", message: "Falha temporária", statusCode: 500 }));
    } else {
      res.writeHead(200).end(JSON.stringify({ id: `mock-${pedidos.length}` }));
    }
  });
});

before(async () => {
  provedor.listen(PORTA_RESEND_FALSA, "127.0.0.1");
  await once(provedor, "listening");
  await esperarFila(); // os e-mails do seed (todos de contas de demonstração)
});
after(() => {
  provedor.closeAllConnections();
  provedor.close();
});

describe("Contas de demonstração do seed", () => {
  test("todas as contas do seed estão na lista de demonstração", async () => {
    const contas = await sql<{ email: string }>("SELECT email FROM usuarios");
    assert.equal(contas.length, 15);
    assert.deepEqual(contas.filter((c) => !EMAILS_DEMONSTRACAO.has(c.email)), []);
  });

  test("e-mail para conta de demonstração só vai para o log, com qualquer driver", async () => {
    const antes = pedidos.length;
    for (const para of ["ana@amf.edu.br", "Lucas@Aluno.AMF.edu.br", "admin@infohub.amf.edu.br"]) {
      const r = await entregarEmail({ para, assunto: "Teste", html: "<p>Olá</p>", chave: `teste/${para}` });
      assert.equal(r.idMensagem, null, para);
    }
    assert.equal(pedidos.length, antes, "nada chegou ao provedor");
  });

  test("e-mail para outra pessoa chega ao provedor", async () => {
    const r = await entregarEmail({ para: "alguem.real@example.com", assunto: "Teste", html: "<p>Olá</p>", chave: "teste/real" });
    assert.match(r.idMensagem ?? "", /^mock-/);
    assert.equal(pedidos.at(-1)!.para, "alguem.real@example.com");
  });
});

describe("RNF-06 — envio confiável, com reenvio", () => {
  test("pela API: a confirmação do cadastro sai pela Resend, com a chave e o id do provedor gravados", async () => {
    const r = await chamar("POST", "/teams/register", { body: await formularioIdeia({ leader: { email: "lider.real@example.com" }, members: [] }) });
    assert.equal(r.status, 201, r.texto);
    await esperarFila();
    const [n] = await sql<{ id: string; status: string; id_mensagem_provedor: string | null }>(
      "SELECT id::text, status::text, id_mensagem_provedor FROM notificacoes WHERE email_destino = 'lider.real@example.com'",
    );
    assert.equal(n!.status, "ENVIADA");
    assert.match(n!.id_mensagem_provedor ?? "", /^mock-/);
    const pedido = pedidos.find((p) => p.para === "lider.real@example.com")!;
    assert.equal(pedido.chave, `notificacao/${n!.id}`);
    assert.ok(pedido.tags.some((tag) => tag.name === "tipo" && tag.value === "CONFIRMACAO_EMAIL"));
  });

  let instavel = "";
  let invalido = "";
  const ler = (id: string) => prisma.notificacao.findUniqueOrThrow({ where: { id } });

  test("erro 500 do provedor: FALHOU, com reenvio agendado para 5 min", async () => {
    const modelo = { assunto: "Teste de reenvio", html: "<p>Olá</p>" };
    instavel = (await enfileirar({ tipo: "LEMBRETE_MANUAL", destinatario: { id: null, email: "instavel@example.com", nome: "Instável" }, modelo }))!;
    invalido = (await enfileirar({ tipo: "LEMBRETE_MANUAL", destinatario: { id: null, email: "invalido@example.com", nome: "Inválido" }, modelo }))!;
    await processarFila();

    const n = await ler(instavel);
    assert.equal(n.status, "FALHOU");
    assert.equal(n.tentativas, 1);
    assert.equal(Math.round((n.proximoEnvioEm!.getTime() - Date.now()) / 60_000), 5);
  });

  test("erro 422 (endereço inválido): falha permanente, sem reenvio e com o motivo", async () => {
    const n = await ler(invalido);
    assert.equal(n.status, "FALHOU");
    assert.equal(n.proximoEnvioEm, null);
    assert.match(n.erro ?? "", /422/);
  });

  test("na hora do reenvio sai, com a mesma chave de idempotência", async () => {
    await prisma.notificacao.update({ where: { id: instavel }, data: { proximoEnvioEm: new Date(Date.now() - 1000) } });
    await processarFila();
    const n = await ler(instavel);
    assert.equal(n.status, "ENVIADA");
    assert.equal(n.tentativas, 2);
    assert.match(n.idMensagemProvedor ?? "", /^mock-/);
    const chaves = pedidos.filter((p) => p.para === "instavel@example.com").map((p) => p.chave);
    assert.deepEqual(chaves, [`notificacao/${instavel}`, `notificacao/${instavel}`]);
    assert.equal((await ler(invalido)).tentativas, 1, "a falha permanente não foi tentada de novo");
  });
});

/**
 * Apoio dos testes de ponta a ponta (`npm test`, ver testes/rodar.ts).
 *
 * Cada arquivo *.test.ts começa de um banco recém-criado com o seed da G1 e
 * sobe a própria API (o Express, sem o Next) numa porta livre. Os e-mails
 * saem pelo driver console e ficam guardados aqui, para os testes lerem os
 * links de ativação e de redefinição de senha.
 */
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after } from "node:test";
import { criarApp } from "../backend/src/app";
import { prisma } from "../backend/src/lib/prisma";
import { processarFila } from "../backend/src/modules/notificacoes/notificacoes.service";

// Os imports acima não abrem conexão; antes de qualquer consulta, a trava:
// só um schema *_teste (nunca o banco da faculdade, nem rodando um arquivo direto).
const schemaTeste = new URL((process.env.DATABASE_URL ?? "").replace(/^postgres(ql)?:/, "http:")).searchParams.get("schema") ?? "";
if (!schemaTeste.endsWith("_teste")) {
  throw new Error("Os testes só rodam num schema terminado em _teste. Use `npm test` (ver testes/rodar.ts).");
}

/** Senhas do seed (o admin vem de SEED_ADMIN_SENHA, definida pelo rodar.ts). */
export const SENHA = { admin: "Admin@123", mentor: "Mentor@123", aluno: "Aluno@123" } as const;
export const EMAIL_ADMIN = "admin@infohub.amf.edu.br";

// ---------------------------------------------------------------------------
// E-mails do driver console
// ---------------------------------------------------------------------------

const emails: string[] = [];
const infoOriginal = console.info.bind(console);
console.info = (...partes: unknown[]) => {
  const texto = partes.map(String).join(" ");
  if (texto.includes("──── E-MAIL")) emails.push(texto);
  else infoOriginal(...partes);
};

/** Token do link mais recente enviado para `para` (ex.: caminho "/definir-senha"). */
export function tokenDoUltimoEmail(para: string, caminho: string): string | undefined {
  const padrao = new RegExp(`${caminho}\\?token=([A-Za-z0-9_-]{20,})`);
  for (let i = emails.length - 1; i >= 0; i -= 1) {
    if (!emails[i]!.includes(`Para:    ${para}\n`)) continue;
    const achado = padrao.exec(emails[i]!);
    if (achado) return achado[1];
  }
  return undefined;
}

/** Espera a fila de e-mails esvaziar (o envio roda em segundo plano depois de cada ação). */
export async function esperarFila() {
  for (let i = 0; i < 100; i += 1) {
    await processarFila(500);
    if ((await prisma.notificacao.count({ where: { status: "PENDENTE" } })) === 0) return;
    await new Promise((pronto) => setTimeout(pronto, 20));
  }
  throw new Error("A fila de e-mails não esvaziou.");
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

let servidor: Server | undefined;
let subindo: Promise<string> | undefined;

/** A API sobe na primeira chamada (assim os `before` dos arquivos já podem chamá-la). */
function enderecoDaApi(): Promise<string> {
  subindo ??= (async () => {
    servidor = criarApp().listen(0, "127.0.0.1");
    await once(servidor, "listening");
    return `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api`;
  })();
  return subindo;
}

/** Derruba a API e fecha o banco quando os testes do arquivo terminam. */
export function usarApi() {
  after(async () => {
    servidor?.closeAllConnections();
    await new Promise((pronto) => servidor?.close(pronto));
    await prisma.$disconnect();
  });
}

export interface Resposta {
  status: number;
  /** Corpo livre da API: cada teste confere o que precisa. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
  texto: string;
  headers: Headers;
}

interface OpcoesChamada {
  token?: string;
  body?: unknown;
  form?: FormData;
  cookie?: string;
}

export async function chamar(metodo: string, caminho: string, { token, body, form, cookie }: OpcoesChamada = {}): Promise<Resposta> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  let corpo: RequestInit["body"];
  if (form) corpo = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    corpo = JSON.stringify(body);
  }
  const res = await fetch((await enderecoDaApi()) + caminho, { method: metodo, headers, body: corpo });
  const bytes = Buffer.from(await res.arrayBuffer());
  const texto = bytes.toString("utf8");
  let json: unknown = null;
  try {
    json = JSON.parse(texto);
  } catch {
    // não é JSON (CSV, arquivo, 204)
  }
  return { status: res.status, json, texto, headers: res.headers };
}

/** Código do erro no envelope `{ error: { code } }`. */
export const codigo = (r: Resposta): string | undefined => r.json?.error?.code;

export const login = (email: string, senha: string, extra: Record<string, unknown> = {}) =>
  chamar("POST", "/auth/login", { body: { email, password: senha, ...extra } });

/** Access token de uma conta (falha o teste se o login não passar). */
export async function entrar(email: string, senha: string): Promise<string> {
  const r = await login(email, senha);
  if (r.status !== 200) throw new Error(`login de ${email}: ${r.status} ${r.texto}`);
  return r.json.accessToken as string;
}

/** Tokens das contas do seed mais usadas. */
export async function contasDoSeed() {
  const [admin, ana, ricardo, lucas, pedro] = await Promise.all([
    entrar(EMAIL_ADMIN, SENHA.admin),
    entrar("ana@amf.edu.br", SENHA.mentor),
    entrar("ricardo@amf.edu.br", SENHA.mentor),
    entrar("lucas@aluno.amf.edu.br", SENHA.aluno),
    entrar("pedro@aluno.amf.edu.br", SENHA.aluno),
  ]);
  return { admin, ana, ricardo, lucas, pedro };
}

/** Ids das equipes do seed, pelo nome. */
export async function equipesDoSeed() {
  const linhas = await prisma.equipe.findMany({ select: { id: true, nome: true } });
  const id = (nome: string) => {
    const equipe = linhas.find((l) => l.nome === nome);
    if (!equipe) throw new Error(`Equipe ${nome} não está no seed.`);
    return equipe.id;
  };
  return { eco: id("EcoTrack"), med: id("MedConnect"), agro: id("AgroSense") };
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Consulta direta ao banco de teste (contagens precisam de `::int`). */
export function sql<T = Record<string, unknown>>(texto: string, ...parametros: unknown[]): Promise<T[]> {
  return prisma.$queryRawUnsafe<T[]>(texto, ...parametros);
}

/** Data AAAA-MM-DD daqui a `n` dias (fuso local). */
export const dia = (n: number) => new Date(Date.now() + n * 86_400_000).toLocaleDateString("sv-SE");

export const pdf = (nome: string) => new File([`%PDF-1.4\n% ${nome}\n%%EOF\n`], nome, { type: "application/pdf" });

/** Corpo válido do formulário inicial (RF-02/RF-04), com as partes sobrescritas. */
export async function formularioIdeia(sobre: {
  team?: Record<string, unknown>;
  leader?: Record<string, unknown>;
  members?: Array<Record<string, unknown>>;
  lgpdConsent?: boolean;
} = {}) {
  const [areas, cursos] = await Promise.all([chamar("GET", "/areas"), chamar("GET", "/courses")]);
  return {
    team: { name: "Ideia de Teste", description: "Uma ideia de teste com descrição suficiente para passar.", areaId: areas.json.data[0].id, ideaStage: "JUST_IDEA", ...sobre.team },
    leader: { name: "Líder de Teste", email: "lider.teste@example.com", phone: "(55) 99999-0000", course: cursos.json.data[0].name, semester: "3º semestre", password: "Senha123", ...sobre.leader },
    members: sobre.members ?? [{ name: "Colega de Teste", email: "colega.teste@example.com", course: cursos.json.data[1].name }],
    lgpdConsent: sobre.lgpdConsent ?? true,
  };
}

export { prisma };

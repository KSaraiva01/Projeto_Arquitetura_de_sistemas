import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { autenticar, autorizar } from "../../shared/middlewares/autenticar";
import { getBody, validarBody } from "../../shared/middlewares/validar";

/**
 * Cadastros de apoio. Áreas e cursos são públicos porque alimentam o
 * formulário de ideia (RF-04), que qualquer aluno acessa sem login.
 * Prefixos: /api/areas, /api/courses, /api/stages
 */
export const areasRouter = Router();
export const coursesRouter = Router();
export const stagesRouter = Router();

const nomeSchema = z.object({ name: z.string().trim().min(2).max(120) });

areasRouter.get("/", async (_req, res) => {
  const areas = await prisma.areaIdeia.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
  res.json({ data: areas.map((a) => ({ id: a.id, name: a.nome })) });
});

areasRouter.post("/", autenticar, autorizar("ADMIN"), validarBody(nomeSchema), async (req, res) => {
  const area = await prisma.areaIdeia.upsert({
    where: { nome: getBody<{ name: string }>(req).name },
    update: { ativo: true },
    create: { nome: getBody<{ name: string }>(req).name },
  });
  res.status(201).json({ id: area.id, name: area.nome });
});

coursesRouter.get("/", async (_req, res) => {
  const cursos = await prisma.curso.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
  res.json({ data: cursos.map((c) => ({ id: c.id, name: c.nome })) });
});

coursesRouter.post("/", autenticar, autorizar("ADMIN"), validarBody(nomeSchema), async (req, res) => {
  const curso = await prisma.curso.upsert({
    where: { nome: getBody<{ name: string }>(req).name },
    update: { ativo: true },
    create: { nome: getBody<{ name: string }>(req).name },
  });
  res.status(201).json({ id: curso.id, name: curso.nome });
});

/** Catálogo das 6 etapas padrão (colunas do kanban, RF-06). */
stagesRouter.get("/", autenticar, async (_req, res) => {
  const etapas = await prisma.etapaPadrao.findMany({ orderBy: { numero: "asc" } });
  res.json({
    data: etapas.map((e) => ({ id: e.id, number: e.numero, name: e.nome, description: e.descricao, deliverable: e.entregavel })),
  });
});

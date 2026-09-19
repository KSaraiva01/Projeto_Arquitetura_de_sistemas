import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { dataBr } from "../../shared/datas";
import {
  API_JOURNEY_STATUSES,
  ROTULO_ESTAGIO_IDEIA,
  ROTULO_STATUS_JORNADA,
  STATUS_JORNADA_DA_API,
} from "../../shared/dto";
import { escopoEquipe } from "../../shared/escopo";
import { autenticar, autorizar } from "../../shared/middlewares/autenticar";
import { getQuery, validarQuery } from "../../shared/middlewares/validar";
import { incluirCard, paraCard } from "../equipes/equipes.dto";

/**
 * RF-22 (dashboard), RF-23 (exportação CSV) e RF-24 (filtro por período).
 * Prefixo: /api/reports — ADMIN e MENTOR (o mentor vê só o próprio escopo).
 */
export const reportsRouter = Router();

reportsRouter.use(autenticar, autorizar("ADMIN", "MENTOR"));

const filtrosSchema = z.object({
  period: z.string().trim().regex(/^\d{4}\/[12]$/, "Use o formato AAAA/1 ou AAAA/2.").optional(),
  status: z.enum(API_JOURNEY_STATUSES).optional(),
  includeInactive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .default(false),
});
type Filtros = z.infer<typeof filtrosSchema>;

function whereRelatorio(usuario: NonNullable<Express.Request["usuario"]>, filtros: Filtros): Prisma.EquipeWhereInput {
  return {
    AND: [
      escopoEquipe(usuario),
      filtros.includeInactive ? {} : { excluidaEm: null },
      filtros.period ? { periodoIngresso: filtros.period } : {},
      filtros.status ? { statusJornada: STATUS_JORNADA_DA_API[filtros.status] } : {},
    ],
  };
}

/** RF-22 — indicadores gerais do funil. */
reportsRouter.get("/dashboard", validarQuery(filtrosSchema), async (req, res) => {
  const filtros = getQuery<Filtros>(res);
  const where = whereRelatorio(req.usuario!, filtros);

  const [equipes, catalogo, tarefasAtrasadas, tarefasAbertas, periodos] = await Promise.all([
    prisma.equipe.findMany({ where, include: incluirCard }),
    prisma.etapaPadrao.findMany({ orderBy: { numero: "asc" } }),
    prisma.tarefa.count({ where: { status: "ATRASADA", equipe: where } }),
    prisma.tarefa.count({ where: { status: { in: ["PENDENTE", "EM_ANDAMENTO", "ENTREGUE", "REPROVADA", "ATRASADA"] }, equipe: where } }),
    prisma.equipe.findMany({ where: escopoEquipe(req.usuario!), distinct: ["periodoIngresso"], select: { periodoIngresso: true }, orderBy: { periodoIngresso: "desc" } }),
  ]);

  const cards = equipes.map(paraCard);
  const porEtapa = catalogo.map((etapa) => ({
    stage: etapa.numero,
    name: etapa.nome,
    teams: cards.filter((c) => c.journeyStage === etapa.numero && c.journeyStatus === "IN_PROGRESS").length,
  }));

  const porArea = new Map<string, number>();
  for (const c of cards) porArea.set(c.category.name, (porArea.get(c.category.name) ?? 0) + 1);

  const trintaDias = new Date(Date.now() - 30 * 86_400_000);

  res.json({
    filters: filtros,
    periods: periodos.map((p) => p.periodoIngresso),
    totals: {
      teams: cards.length,
      activeTeams: cards.filter((c) => c.journeyStatus === "IN_PROGRESS").length,
      readyForInovamf: cards.filter((c) => c.journeyStatus === "READY_FOR_INOVAMF").length,
      referred: cards.filter((c) => c.journeyStatus === "REFERRED").length,
      openTasks: tarefasAbertas,
      overdueTasks: tarefasAtrasadas,
      teamsWithOverdueTasks: cards.filter((c) => c.overdueTasks > 0).length,
      newTeamsLast30Days: cards.filter((c) => c.createdAt >= trintaDias).length,
    },
    byStage: porEtapa,
    byArea: [...porArea.entries()].map(([name, teams]) => ({ name, teams })).sort((a, b) => b.teams - a.teams),
    byStatus: (["IN_PROGRESS", "READY_FOR_INOVAMF", "REFERRED"] as const).map((status) => ({
      status,
      teams: cards.filter((c) => c.journeyStatus === status).length,
    })),
  });
});

function celulaCsv(valor: unknown): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** RF-23 — lista de equipes/ideias e status em CSV (separador ";" e BOM, para o Excel em português abrir direto). */
reportsRouter.get("/teams.csv", validarQuery(filtrosSchema), async (req, res) => {
  const filtros = getQuery<Filtros>(res);
  const equipes = await prisma.equipe.findMany({
    where: whereRelatorio(req.usuario!, filtros),
    include: { ...incluirCard, lider: { select: { id: true, nome: true, email: true, telefone: true, semestre: true, curso: { select: { nome: true } } } } },
    orderBy: [{ periodoIngresso: "desc" }, { criadoEm: "asc" }],
  });

  const cabecalho = [
    "Período", "Ideia", "Área", "Estágio da ideia", "Etapa atual", "Coluna", "Status", "Líder", "E-mail do líder",
    "Telefone", "Curso do líder", "Integrantes", "Mentores", "Tarefas abertas", "Tarefas atrasadas", "Cadastro", "Pronta em", "Encaminhada em",
  ];

  const linhas = equipes.map((e) => {
    const card = paraCard(e);
    return [
      e.periodoIngresso,
      e.nome,
      e.area.nome,
      ROTULO_ESTAGIO_IDEIA[e.estagioIdeia],
      card.journeyStageName,
      card.journeyStage,
      ROTULO_STATUS_JORNADA[e.statusJornada],
      e.lider.nome,
      e.lider.email,
      e.lider.telefone ?? "",
      e.lider.curso?.nome ?? "",
      card.memberCount,
      card.mentors.map((m) => m.name).join(", "),
      card.openTasks,
      card.overdueTasks,
      dataBr(e.criadoEm),
      e.prontaEm ? dataBr(e.prontaEm) : "",
      e.encaminhadaEm ? dataBr(e.encaminhadaEm) : "",
    ].map(celulaCsv).join(";");
  });

  const csv = "\uFEFF" + [cabecalho.map(celulaCsv).join(";"), ...linhas].join("\r\n");
  const nome = `equipes-infohub${filtros.period ? `-${filtros.period.replace("/", "-")}` : ""}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${nome}"`);
  res.send(csv);
});


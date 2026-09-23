import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { registrarAuditoria, type Db } from "../../shared/auditoria";
import { gerarHashSenha } from "../../shared/crypto";
import { periodoAtual } from "../../shared/datas";
import { ESTAGIO_IDEIA_DA_API, STATUS_JORNADA_DA_API, STATUS_TAREFA_DA_API, STATUS_TAREFA_PARA_API, semestreDaApi } from "../../shared/dto";
import { emailLembreteManual, emailNovoCadastro } from "../../shared/email/templates";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../shared/errors";
import { escopoEquipe, podeMentorar } from "../../shared/escopo";
import type { UsuarioAutenticado } from "../../types/express";
import { enviarAtivacaoConta, enviarConfirmacaoEmail } from "../auth/auth.service";
import {
  destinatariosAdmins,
  destinatariosDaEquipe,
  enfileirar,
  enfileirarParaTodos,
  processarFilaEmSegundoPlano,
} from "../notificacoes/notificacoes.service";
import { incluirCard, incluirIntegrante, paraCard, paraIntegrante, type EquipeCardRow } from "./equipes.dto";
import type {
  AddMemberInput,
  AddStageInput,
  ChangeStageInput,
  ListTeamsQuery,
  ManualReminderInput,
  NoteInput,
  RegisterTeamInput,
  StageBlockersQuery,
  UpdateTeamInput,
} from "./equipes.schemas";
import { carregarJornada, criarJornada, etapaParaApi, numeroColuna, recalcularStatusJornada, type EtapaDaJornada } from "./jornada";

// ---------------------------------------------------------------------------
// Consultas (RF-06, RF-07, RF-08)
// ---------------------------------------------------------------------------

function whereDosFiltros(usuario: UsuarioAutenticado, filtros: ListTeamsQuery): Prisma.EquipeWhereInput {
  const periodo = filtros.period ?? filtros.semester;
  return {
    AND: [
      escopoEquipe(usuario),
      filtros.includeInactive && usuario.perfil === "ADMIN" ? {} : { excluidaEm: null },
      filtros.search
        ? {
            OR: [
              { nome: { contains: filtros.search, mode: "insensitive" } },
              { lider: { nome: { contains: filtros.search, mode: "insensitive" } } },
            ],
          }
        : {},
      filtros.status ? { statusJornada: STATUS_JORNADA_DA_API[filtros.status] } : {},
      filtros.categoryId ? { areaId: filtros.categoryId } : {},
      filtros.mentorId ? { mentores: { some: { mentorId: filtros.mentorId } } } : {},
      filtros.course
        ? { integrantes: { some: { saiuEm: null, usuario: { curso: { nome: { equals: filtros.course, mode: "insensitive" } } } } } }
        : {},
      periodo ? { periodoIngresso: periodo } : {},
      filtros.taskStatus ? { tarefas: { some: { status: STATUS_TAREFA_DA_API[filtros.taskStatus] } } } : {},
    ],
  };
}

async function buscarCards(usuario: UsuarioAutenticado, filtros: ListTeamsQuery) {
  const linhas = await prisma.equipe.findMany({
    where: whereDosFiltros(usuario, filtros),
    include: incluirCard,
    orderBy: { criadoEm: "desc" },
  });
  const cards = linhas.map(paraCard);
  // A coluna de uma etapa extra depende da jornada, então o filtro por etapa é aplicado aqui.
  return filtros.stage ? cards.filter((c) => c.journeyStage === filtros.stage) : cards;
}

export async function listarEquipes(usuario: UsuarioAutenticado, filtros: ListTeamsQuery) {
  const data = await buscarCards(usuario, filtros);
  return { data, total: data.length };
}

/**
 * RF-06 — equipes agrupadas pelas 6 etapas padrão, como o kanban consome.
 * Todas as colunas vêm na resposta, mesmo vazias: o front precisa renderizar
 * a coluna para ela poder receber um cartão arrastado.
 */
export async function board(usuario: UsuarioAutenticado, filtros: ListTeamsQuery) {
  const [cards, catalogo] = await Promise.all([
    buscarCards(usuario, filtros),
    prisma.etapaPadrao.findMany({ orderBy: { numero: "asc" } }),
  ]);

  return {
    columns: catalogo.map((etapa) => ({
      stage: etapa.numero,
      name: etapa.nome,
      teams: cards.filter((c) => c.journeyStage === etapa.numero),
    })),
    total: cards.length,
    canDrag: podeMentorar(usuario),
  };
}

/**
 * Carrega a equipe garantindo o escopo. Fora do escopo = 403 (o usuário
 * precisa saber que é permissão, não id errado); inexistente = 404.
 */
export async function carregarEquipeNoEscopo(usuario: UsuarioAutenticado, equipeId: string): Promise<EquipeCardRow> {
  const equipe = await prisma.equipe.findFirst({
    where: { AND: [{ id: equipeId }, escopoEquipe(usuario)] },
    include: incluirCard,
  });
  if (equipe) return equipe;

  const existe = await prisma.equipe.count({ where: { id: equipeId } });
  if (existe) throw new ForbiddenError("Você não tem acesso a esta equipe.", "TEAM_OUT_OF_SCOPE");
  throw new NotFoundError("Equipe não encontrada.", "TEAM_NOT_FOUND");
}

function exigirEquipeAtiva(equipe: EquipeCardRow) {
  if (equipe.excluidaEm) {
    throw new BadRequestError("Esta equipe foi excluída.", "TEAM_INACTIVE");
  }
}

/** Quem pode mexer nos dados/integrantes da equipe: admin, mentor da equipe ou o líder. */
function exigirGestorOuLider(usuario: UsuarioAutenticado, equipe: EquipeCardRow) {
  if (podeMentorar(usuario) || equipe.liderId === usuario.id) return;
  throw new ForbiddenError("Apenas o líder da equipe, o mentor ou a coordenação podem fazer isso.", "NOT_TEAM_MANAGER");
}

/** RF-08 — detalhe com integrantes, jornada e histórico. */
export async function detalheEquipe(usuario: UsuarioAutenticado, equipeId: string) {
  const equipe = await carregarEquipeNoEscopo(usuario, equipeId);

  const [integrantes, historico] = await Promise.all([
    prisma.integranteEquipe.findMany({
      where: { equipeId, saiuEm: null },
      include: incluirIntegrante,
      orderBy: { entrouEm: "asc" },
    }),
    prisma.historicoEtapa.findMany({
      where: { equipeId },
      include: {
        deEtapa: { select: { nome: true } },
        paraEtapa: { select: { nome: true } },
        alteradoPor: { select: { nome: true } },
      },
      orderBy: { criadoEm: "asc" },
    }),
  ]);

  const jornada: EtapaDaJornada[] = equipe.etapas;
  const colunaDa = (etapaId: string | null) => {
    const etapa = etapaId ? jornada.find((e) => e.id === etapaId) : undefined;
    return etapa ? numeroColuna(etapa, jornada) : null;
  };

  return {
    team: paraCard(equipe),
    members: integrantes.map((i) => paraIntegrante(i, equipe.liderId)),
    journey: jornada.map((etapa) => etapaParaApi(etapa, equipe.etapaAtualId)),
    stageHistory: historico.map((h) => ({
      id: h.id,
      fromStage: colunaDa(h.deEtapaId),
      fromStageName: h.deEtapa?.nome ?? null,
      toStage: colunaDa(h.paraEtapaId),
      toStageName: h.paraEtapa.nome,
      direction: h.direcao === "INICIO" ? "start" : h.direcao === "AVANCO" ? "advance" : "rollback",
      reason: h.motivo,
      forced: h.forcado,
      changedAt: h.criadoEm,
      changedByName: h.alteradoPor?.nome ?? null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Jornada (RF-09, RN-01) — só ADMIN/MENTOR (nota da RF-11)
// ---------------------------------------------------------------------------

function resolverEtapa(jornada: EtapaDaJornada[], alvo: { toStage?: number; toStageId?: string }) {
  const etapa = alvo.toStageId
    ? jornada.find((e) => e.id === alvo.toStageId)
    : jornada.find((e) => e.etapaPadrao?.numero === alvo.toStage);
  if (!etapa) {
    throw new BadRequestError("A etapa de destino não existe na jornada desta equipe.", "STAGE_NOT_FOUND");
  }
  return etapa;
}

function rotuloEtapa(etapa: EtapaDaJornada) {
  return etapa.etapaPadrao ? `${etapa.etapaPadrao.numero}. ${etapa.nome}` : etapa.nome;
}

/** Tarefas obrigatórias sem aprovação entre a etapa atual (inclusive) e a de destino (exclusive). */
async function obrigatoriasPendentes(equipeId: string, deOrdem: number, ateOrdem: number) {
  const tarefas = await prisma.tarefa.findMany({
    where: {
      equipeId,
      obrigatoria: true,
      status: { not: "APROVADA" },
      etapaEquipe: { ordem: { gte: deOrdem, lt: ateOrdem } },
    },
    include: { etapaEquipe: { select: selecaoOrdemNome } },
    orderBy: [{ etapaEquipe: { ordem: "asc" } }, { prazo: "asc" }],
  });
  return tarefas;
}

const selecaoOrdemNome = { ordem: true, nome: true, etapaPadrao: { select: { numero: true } }, id: true, etapaPadraoId: true, descricao: true } as const;

function bloqueioParaApi(t: Awaited<ReturnType<typeof obrigatoriasPendentes>>[number], jornada: EtapaDaJornada[]) {
  return {
    id: t.id,
    title: t.titulo,
    stage: numeroColuna(t.etapaEquipe, jornada),
    stageName: t.etapaEquipe.nome,
    status: STATUS_TAREFA_PARA_API[t.status],
    dueDate: t.prazo,
  };
}

/** RN-01 — o que impede a equipe de chegar até a etapa de destino (consulta prévia do front). */
export async function bloqueiosDeEtapa(usuario: UsuarioAutenticado, equipeId: string, alvo: StageBlockersQuery) {
  const equipe = await carregarEquipeNoEscopo(usuario, equipeId);
  const jornada: EtapaDaJornada[] = equipe.etapas;
  const de = jornada.find((e) => e.id === equipe.etapaAtualId) ?? jornada[0]!;
  const para = resolverEtapa(jornada, alvo);

  if (para.ordem <= de.ordem) return { isAdvancing: false, blockers: [] };

  const pendentes = await obrigatoriasPendentes(equipeId, de.ordem, para.ordem);
  return { isAdvancing: true, blockers: pendentes.map((t) => bloqueioParaApi(t, jornada)) };
}

/**
 * RF-09 — move a equipe entre etapas (o arrastar do kanban). É AQUI que mora
 * a RN-01: avançar com obrigatórias pendentes é recusado com 409 e a lista
 * do que falta; o mentor pode repetir com `force: true`, e o histórico
 * registra que foi forçado. Retroceder nunca é bloqueado.
 */
export async function mudarEtapa(usuario: UsuarioAutenticado, equipeId: string, input: ChangeStageInput, ip: string | null) {
  if (!podeMentorar(usuario)) {
    throw new ForbiddenError("Apenas administradores e mentores podem mover equipes entre etapas.", "CANNOT_MANAGE_JOURNEY");
  }

  const equipe = await carregarEquipeNoEscopo(usuario, equipeId);
  exigirEquipeAtiva(equipe);
  if (equipe.statusJornada === "ENCAMINHADA") {
    throw new ConflictError("Esta equipe já foi encaminhada ao InovAMF.", "TEAM_ALREADY_REFERRED");
  }

  const jornada: EtapaDaJornada[] = equipe.etapas;
  const de = jornada.find((e) => e.id === equipe.etapaAtualId) ?? jornada[0]!;
  const para = resolverEtapa(jornada, input);

  if (para.id === de.id) {
    throw new BadRequestError("A equipe já está nesta etapa.", "STAGE_UNCHANGED");
  }

  const avancando = para.ordem > de.ordem;
  const pendentes = avancando ? await obrigatoriasPendentes(equipeId, de.ordem, para.ordem) : [];

  if (pendentes.length > 0 && !input.force) {
    throw new ConflictError(
      `Esta equipe tem ${pendentes.length} tarefa(s) obrigatória(s) sem aprovação nas etapas anteriores.`,
      "STAGE_REQUIREMENTS_PENDING",
      { pendingTasks: pendentes.map((t) => bloqueioParaApi(t, jornada)) },
    );
  }

  const forcado = avancando && pendentes.length > 0;

  const statusJornada = await prisma.$transaction(async (tx) => {
    await tx.equipe.update({ where: { id: equipeId }, data: { etapaAtualId: para.id } });
    await tx.historicoEtapa.create({
      data: {
        equipeId,
        deEtapaId: de.id,
        paraEtapaId: para.id,
        direcao: avancando ? "AVANCO" : "RETROCESSO",
        motivo: input.reason ?? null,
        forcado,
        alteradoPorId: usuario.id,
      },
    });
    const status = await recalcularStatusJornada(equipeId, tx);
    await registrarAuditoria(
      {
        usuarioId: usuario.id,
        acao: "EQUIPE_ETAPA_ALTERADA",
        entidade: "equipe",
        entidadeId: equipeId,
        detalhes: {
          de: rotuloEtapa(de),
          para: rotuloEtapa(para),
          direcao: avancando ? "avanco" : "retrocesso",
          forcado,
          obrigatoriasPendentes: pendentes.length,
          motivo: input.reason ?? null,
        },
        ip,
      },
      tx,
    );
    return status;
  });

  const atualizada = await carregarEquipeNoEscopo(usuario, equipeId);
  const card = paraCard(atualizada);

  return {
    team: card,
    fromStage: numeroColuna(de, jornada),
    fromStageId: de.id,
    fromStageName: de.nome,
    toStage: numeroColuna(para, jornada),
    toStageId: para.id,
    toStageName: para.nome,
    isAdvancing: avancando,
    journeyStatus: card.journeyStatus,
    forced: forcado,
    skippedTasks: pendentes.map((t) => ({ id: t.id, title: t.titulo, stage: numeroColuna(t.etapaEquipe, jornada) })),
    message: statusJornada === "PRONTA_INOVAMF"
      ? "Equipe movida. Todos os entregáveis estão aprovados: a equipe está pronta para o InovAMF."
      : forcado
        ? "Equipe movida (avanço forçado registrado no histórico)."
        : "Equipe movida.",
  };
}

/** Etapa extra na jornada de UMA equipe (padrão 6, ajustável por equipe). */
export async function adicionarEtapaExtra(usuario: UsuarioAutenticado, equipeId: string, input: AddStageInput, ip: string | null) {
  if (!podeMentorar(usuario)) {
    throw new ForbiddenError("Apenas administradores e mentores podem alterar a jornada da equipe.", "CANNOT_MANAGE_JOURNEY");
  }
  const equipe = await carregarEquipeNoEscopo(usuario, equipeId);
  exigirEquipeAtiva(equipe);

  const jornada: EtapaDaJornada[] = equipe.etapas;
  let aposOrdem = jornada[jornada.length - 1]!.ordem;
  if (input.afterStage !== undefined || input.afterStageId !== undefined) {
    aposOrdem = resolverEtapa(jornada, { toStage: input.afterStage, toStageId: input.afterStageId }).ordem;
  }

  const novaId = await prisma.$transaction(async (tx) => {
    // Abre espaço: quem vem depois desce uma posição. Em duas passadas para não
    // colidir com o UNIQUE (equipe_id, ordem).
    const posteriores = jornada.filter((e) => e.ordem > aposOrdem).sort((a, b) => b.ordem - a.ordem);
    for (const etapa of posteriores) {
      await tx.etapaEquipe.update({ where: { id: etapa.id }, data: { ordem: etapa.ordem + 1000 } });
    }
    for (const etapa of posteriores) {
      await tx.etapaEquipe.update({ where: { id: etapa.id }, data: { ordem: etapa.ordem + 1 } });
    }
    const nova = await tx.etapaEquipe.create({
      data: { equipeId, ordem: aposOrdem + 1, nome: input.name, descricao: input.description ?? null },
      select: { id: true },
    });
    // Uma etapa a mais depois da atual pode tirar a equipe do "pronta".
    await recalcularStatusJornada(equipeId, tx);
    await registrarAuditoria(
      { usuarioId: usuario.id, acao: "EQUIPE_ETAPA_ADICIONADA", entidade: "equipe", entidadeId: equipeId, detalhes: { etapaId: nova.id, nome: input.name, aposOrdem }, ip },
      tx,
    );
    return nova.id;
  });

  const atualizada = await carregarJornada(equipeId);
  return { stageId: novaId, journey: atualizada.map((e) => etapaParaApi(e, equipe.etapaAtualId)) };
}

/** Remove uma etapa extra (nunca uma padrão) que não tenha tarefas nem histórico. */
export async function removerEtapaExtra(usuario: UsuarioAutenticado, equipeId: string, etapaId: string, ip: string | null) {
  if (!podeMentorar(usuario)) {
    throw new ForbiddenError("Apenas administradores e mentores podem alterar a jornada da equipe.", "CANNOT_MANAGE_JOURNEY");
  }
  const equipe = await carregarEquipeNoEscopo(usuario, equipeId);
  const etapa = equipe.etapas.find((e) => e.id === etapaId);
  if (!etapa) throw new NotFoundError("Etapa não encontrada nesta equipe.", "STAGE_NOT_FOUND");
  if (etapa.etapaPadraoId) throw new ConflictError("As etapas padrão da jornada não podem ser removidas.", "STAGE_IS_DEFAULT");
  if (equipe.etapaAtualId === etapaId) throw new ConflictError("A equipe está nesta etapa; mova-a antes de remover.", "STAGE_IS_CURRENT");

  const [tarefas, historico] = await Promise.all([
    prisma.tarefa.count({ where: { etapaEquipeId: etapaId } }),
    prisma.historicoEtapa.count({ where: { OR: [{ deEtapaId: etapaId }, { paraEtapaId: etapaId }] } }),
  ]);
  if (tarefas || historico) {
    throw new ConflictError("Esta etapa já tem tarefas ou histórico e não pode ser removida.", "STAGE_IN_USE");
  }

  await prisma.$transaction(async (tx) => {
    await tx.etapaEquipe.delete({ where: { id: etapaId } });
    const posteriores = equipe.etapas.filter((e) => e.ordem > etapa.ordem);
    for (const e of posteriores) {
      await tx.etapaEquipe.update({ where: { id: e.id }, data: { ordem: e.ordem - 1 } });
    }
    await recalcularStatusJornada(equipeId, tx);
    await registrarAuditoria(
      { usuarioId: usuario.id, acao: "EQUIPE_ETAPA_REMOVIDA", entidade: "equipe", entidadeId: equipeId, detalhes: { etapaId, nome: etapa.nome }, ip },
      tx,
    );
  });

  const atualizada = await carregarJornada(equipeId);
  return { journey: atualizada.map((e) => etapaParaApi(e, equipe.etapaAtualId)) };
}

/** "Depois das 6 etapas a gente encaminha para o InovAMF" — só a coordenação (ADMIN). */
export async function encaminharAoInovamf(usuario: UsuarioAutenticado, equipeId: string, force: boolean, ip: string | null) {
  const equipe = await carregarEquipeNoEscopo(usuario, equipeId);
  exigirEquipeAtiva(equipe);
  if (equipe.statusJornada === "ENCAMINHADA") {
    throw new ConflictError("Esta equipe já foi encaminhada.", "TEAM_ALREADY_REFERRED");
  }
  if (equipe.statusJornada !== "PRONTA_INOVAMF" && !force) {
    throw new ConflictError(
      "A equipe ainda não está pronta para o InovAMF (última etapa com todos os entregáveis aprovados). Use force para encaminhar mesmo assim.",
      "TEAM_NOT_READY",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.equipe.update({
      where: { id: equipeId },
      data: { statusJornada: "ENCAMINHADA", encaminhadaEm: new Date(), prontaEm: equipe.prontaEm ?? new Date() },
    });
    await registrarAuditoria(
      { usuarioId: usuario.id, acao: "EQUIPE_ENCAMINHADA_INOVAMF", entidade: "equipe", entidadeId: equipeId, detalhes: { forcado: force && equipe.statusJornada !== "PRONTA_INOVAMF" }, ip },
      tx,
    );
  });

  return { team: paraCard(await carregarEquipeNoEscopo(usuario, equipeId)), message: "Equipe encaminhada ao InovAMF." };
}

// ---------------------------------------------------------------------------
// Exclusão lógica (Q4) e dados básicos
// ---------------------------------------------------------------------------

export async function excluirEquipe(usuario: UsuarioAutenticado, equipeId: string, ip: string | null) {
  const equipe = await carregarEquipeNoEscopo(usuario, equipeId);
  if (equipe.excluidaEm) throw new ConflictError("Esta equipe já foi excluída.", "TEAM_ALREADY_DELETED");

  await prisma.$transaction(async (tx) => {
    await tx.equipe.update({ where: { id: equipeId }, data: { excluidaEm: new Date() } });
    await registrarAuditoria(
      { usuarioId: usuario.id, acao: "EQUIPE_EXCLUIDA", entidade: "equipe", entidadeId: equipeId, detalhes: { nome: equipe.nome }, ip },
      tx,
    );
  });
}

export async function atualizarEquipe(usuario: UsuarioAutenticado, equipeId: string, input: UpdateTeamInput, ip: string | null) {
  const equipe = await carregarEquipeNoEscopo(usuario, equipeId);
  exigirEquipeAtiva(equipe);
  exigirGestorOuLider(usuario, equipe);

  if (input.areaId) {
    const area = await prisma.areaIdeia.findFirst({ where: { id: input.areaId, ativo: true }, select: { id: true } });
    if (!area) throw new BadRequestError("Área da ideia inválida.", "INVALID_AREA");
  }

  await prisma.$transaction(async (tx) => {
    await tx.equipe.update({
      where: { id: equipeId },
      data: {
        ...(input.name !== undefined ? { nome: input.name } : {}),
        ...(input.description !== undefined ? { descricao: input.description } : {}),
        ...(input.areaId !== undefined ? { areaId: input.areaId } : {}),
        ...(input.ideaStage !== undefined ? { estagioIdeia: ESTAGIO_IDEIA_DA_API[input.ideaStage] } : {}),
      },
    });
    await registrarAuditoria(
      { usuarioId: usuario.id, acao: "EQUIPE_ATUALIZADA", entidade: "equipe", entidadeId: equipeId, detalhes: { campos: Object.keys(input) }, ip },
      tx,
    );
  });

  return { team: paraCard(await carregarEquipeNoEscopo(usuario, equipeId)) };
}

// ---------------------------------------------------------------------------
// Mentores (Q2) — só ADMIN
// ---------------------------------------------------------------------------

export async function atribuirMentor(usuario: UsuarioAutenticado, equipeId: string, mentorId: string, ip: string | null) {
  const equipe = await carregarEquipeNoEscopo(usuario, equipeId);
  const mentor = await prisma.usuario.findFirst({
    where: { id: mentorId, perfil: "MENTOR", ativo: true, excluidoEm: null },
    select: { id: true, nome: true },
  });
  if (!mentor) {
    throw new NotFoundError("Mentor não encontrado (a conta precisa ser de perfil MENTOR e estar ativa).", "MENTOR_NOT_FOUND");
  }

  const jaAtribuido = await prisma.mentorEquipe.findUnique({ where: { equipeId_mentorId: { equipeId, mentorId } } });
  if (!jaAtribuido) {
    await prisma.$transaction(async (tx) => {
      await tx.mentorEquipe.create({ data: { equipeId, mentorId } });
      await registrarAuditoria(
        { usuarioId: usuario.id, acao: "EQUIPE_MENTOR_ATRIBUIDO", entidade: "equipe", entidadeId: equipeId, detalhes: { mentorId }, ip },
        tx,
      );
    });
  }

  return {
    added: !jaAtribuido,
    mentor: { id: mentor.id, name: mentor.nome },
    team: { id: equipe.id, name: equipe.nome },
    message: jaAtribuido ? "Este mentor já acompanha a equipe." : `${mentor.nome} agora acompanha a equipe ${equipe.nome}.`,
  };
}

export async function removerMentor(usuario: UsuarioAutenticado, equipeId: string, mentorId: string, ip: string | null) {
  await carregarEquipeNoEscopo(usuario, equipeId);
  const removidos = await prisma.mentorEquipe.deleteMany({ where: { equipeId, mentorId } });
  if (removidos.count === 0) {
    throw new NotFoundError("Este mentor não acompanha esta equipe.", "MENTOR_NOT_ASSIGNED");
  }
  await registrarAuditoria({ usuarioId: usuario.id, acao: "EQUIPE_MENTOR_REMOVIDO", entidade: "equipe", entidadeId: equipeId, detalhes: { mentorId }, ip });
  return { message: "Mentor desvinculado da equipe." };
}

// ---------------------------------------------------------------------------
// Anotações internas (RF-10) — ADMIN/MENTOR; nunca chegam ao aluno
// ---------------------------------------------------------------------------

function anotacaoParaApi(a: { id: string; conteudo: string; criadoEm: Date; atualizadoEm: Date; autor: { id: string; nome: string } | null }) {
  return {
    id: a.id,
    author: a.autor ? { id: a.autor.id, name: a.autor.nome } : null,
    content: a.conteudo,
    createdAt: a.criadoEm,
    updatedAt: a.atualizadoEm,
  };
}

const incluirAutor = { autor: { select: { id: true, nome: true } } } as const;

export async function listarAnotacoes(usuario: UsuarioAutenticado, equipeId: string) {
  await carregarEquipeNoEscopo(usuario, equipeId);
  const anotacoes = await prisma.anotacaoMentoria.findMany({
    where: { equipeId },
    include: incluirAutor,
    orderBy: { criadoEm: "desc" },
  });
  return { data: anotacoes.map(anotacaoParaApi) };
}

export async function criarAnotacao(usuario: UsuarioAutenticado, equipeId: string, input: NoteInput) {
  await carregarEquipeNoEscopo(usuario, equipeId);
  const anotacao = await prisma.anotacaoMentoria.create({
    data: { equipeId, autorId: usuario.id, conteudo: input.content },
    include: incluirAutor,
  });
  return { id: anotacao.id, note: anotacaoParaApi(anotacao) };
}

export async function atualizarAnotacao(usuario: UsuarioAutenticado, equipeId: string, anotacaoId: string, input: NoteInput) {
  await carregarEquipeNoEscopo(usuario, equipeId);
  const atual = await prisma.anotacaoMentoria.findFirst({ where: { id: anotacaoId, equipeId } });
  if (!atual) throw new NotFoundError("Anotação não encontrada.", "NOTE_NOT_FOUND");
  if (atual.autorId !== usuario.id && usuario.perfil !== "ADMIN") {
    throw new ForbiddenError("Só o autor (ou um administrador) pode editar esta anotação.", "NOT_NOTE_AUTHOR");
  }
  const anotacao = await prisma.anotacaoMentoria.update({
    where: { id: anotacaoId },
    data: { conteudo: input.content },
    include: incluirAutor,
  });
  return { note: anotacaoParaApi(anotacao) };
}

export async function excluirAnotacao(usuario: UsuarioAutenticado, equipeId: string, anotacaoId: string) {
  await carregarEquipeNoEscopo(usuario, equipeId);
  const atual = await prisma.anotacaoMentoria.findFirst({ where: { id: anotacaoId, equipeId } });
  if (!atual) throw new NotFoundError("Anotação não encontrada.", "NOTE_NOT_FOUND");
  if (atual.autorId !== usuario.id && usuario.perfil !== "ADMIN") {
    throw new ForbiddenError("Só o autor (ou um administrador) pode excluir esta anotação.", "NOT_NOTE_AUTHOR");
  }
  await prisma.anotacaoMentoria.delete({ where: { id: anotacaoId } });
}

// ---------------------------------------------------------------------------
// Cadastro (RF-02, RF-04, RF-05) e integrantes (RN-03)
// ---------------------------------------------------------------------------

interface Pessoa {
  name: string;
  email: string;
  course: string;
  semester?: string | number;
  phone?: string;
}

/**
 * RN-03 — um aluno só integra uma equipe ativa por vez. Equipes excluídas
 * ou já encaminhadas ao InovAMF não contam.
 */
async function garantirSemEquipeAtiva(usuarioId: string, db: Db) {
  const ativa = await db.integranteEquipe.findFirst({
    where: {
      usuarioId,
      saiuEm: null,
      equipe: { excluidaEm: null, statusJornada: { not: "ENCAMINHADA" } },
    },
    select: { equipe: { select: { nome: true } }, usuario: { select: { email: true } } },
  });
  if (ativa) {
    throw new ConflictError(
      `${ativa.usuario.email} já participa da equipe "${ativa.equipe.nome}". Um aluno só pode integrar uma equipe ativa por vez.`,
      "STUDENT_ALREADY_IN_TEAM",
    );
  }
}

async function cursoPorNome(nome: string, db: Db) {
  const curso = await db.curso.findFirst({ where: { nome: { equals: nome, mode: "insensitive" }, ativo: true } });
  if (!curso) throw new BadRequestError(`Curso não encontrado: ${nome}.`, "COURSE_NOT_FOUND");
  return curso;
}

/**
 * Garante a conta de um aluno: reaproveita a existente (perfil ALUNO) ou
 * cria uma nova sem senha, que recebe o token de ativação por e-mail (RF-02).
 * Com `senhaHash` (o líder, senha do formulário) não há ativação: quem chama
 * envia o link de confirmação do e-mail.
 */
async function garantirAluno(pessoa: Pessoa, equipeNome: string, db: Db, senhaHash: string | null = null) {
  const existente = await db.usuario.findUnique({ where: { email: pessoa.email } });

  if (existente && existente.perfil !== "ALUNO") {
    throw new ConflictError(`O e-mail ${pessoa.email} pertence a uma conta de mentor ou administrador.`, "EMAIL_NOT_STUDENT");
  }
  if (existente && (existente.excluidoEm || !existente.ativo)) {
    throw new ConflictError(`A conta ${pessoa.email} está desativada. Procure a coordenação.`, "ACCOUNT_DISABLED");
  }

  const curso = await cursoPorNome(pessoa.course, db);

  if (existente) {
    await garantirSemEquipeAtiva(existente.id, db);
    if (existente.senhaHash === null && senhaHash === null) {
      await enviarAtivacaoConta(existente, `Você foi incluído(a) na equipe "${equipeNome}" no InfoHub.`, db);
    }
    return { usuario: existente, criado: false };
  }

  const usuario = await db.usuario.create({
    data: {
      nome: pessoa.name,
      email: pessoa.email,
      perfil: "ALUNO",
      senhaHash,
      telefone: pessoa.phone ?? null,
      cursoId: curso.id,
      semestre: semestreDaApi(pessoa.semester),
      consentimentoLgpdEm: new Date(),
    },
  });
  if (senhaHash === null) {
    await enviarAtivacaoConta(usuario, `Você foi incluído(a) na equipe "${equipeNome}" no InfoHub.`, db);
  }
  return { usuario, criado: true };
}

/**
 * RF-02/RF-05 — o formulário inicial cria, em uma transação: a conta do
 * líder (com a senha do formulário + link de confirmação do e-mail), as
 * contas dos colegas (sem senha + token de ativação), a equipe na etapa 1
 * com a jornada copiada, o histórico e o e-mail à coordenação. Os e-mails só
 * saem depois do COMMIT.
 */
export async function cadastrarEquipe(input: RegisterTeamInput, ip: string | null) {
  const area = await prisma.areaIdeia.findFirst({ where: { id: input.team.areaId, ativo: true } });
  if (!area) throw new BadRequestError("Área da ideia inválida.", "INVALID_AREA");

  const liderEmail = input.leader.email;
  const colegas = input.members.filter(
    (m, i, todos) => m.email !== liderEmail && todos.findIndex((o) => o.email === m.email) === i,
  );

  const liderExistente = await prisma.usuario.findUnique({ where: { email: liderEmail }, select: { id: true, senhaHash: true } });
  if (liderExistente?.senhaHash) {
    throw new ConflictError(
      "Já existe uma conta com este e-mail. Faça login e, se precisar, peça à coordenação para criar a nova equipe.",
      "EMAIL_IN_USE",
    );
  }

  const senhaHash = await gerarHashSenha(input.leader.password);

  const { equipeId, liderId } = await prisma.$transaction(async (tx) => {
    const nomeEquipe = input.team.name;

    const { usuario: lider } = await garantirAluno(input.leader, nomeEquipe, tx, senhaHash);
    if (liderExistente) {
      // Conta criada por outro líder e nunca ativada: a senha do formulário passa a valer.
      await tx.usuario.update({ where: { id: lider.id }, data: { senhaHash, nome: input.leader.name, telefone: input.leader.phone } });
    }
    // Validação do e-mail: a senha já vale, mas o login só abre depois do link de confirmação.
    await enviarConfirmacaoEmail(
      { id: lider.id, nome: input.leader.name, email: liderEmail },
      `Recebemos o cadastro da ideia "${nomeEquipe}".`,
      tx,
    );

    const equipe = await tx.equipe.create({
      data: {
        nome: nomeEquipe,
        descricao: input.team.description,
        areaId: area.id,
        estagioIdeia: ESTAGIO_IDEIA_DA_API[input.team.ideaStage],
        comoConheceu: input.team.howDidYouHear ?? null,
        periodoIngresso: periodoAtual(),
        liderId: lider.id,
        integrantes: { create: { usuarioId: lider.id } },
      },
    });

    const jornada = await criarJornada(equipe.id, tx);
    await tx.equipe.update({ where: { id: equipe.id }, data: { etapaAtualId: jornada[0]!.id } });
    await tx.historicoEtapa.create({
      data: { equipeId: equipe.id, paraEtapaId: jornada[0]!.id, direcao: "INICIO", alteradoPorId: lider.id },
    });

    for (const colega of colegas) {
      const { usuario } = await garantirAluno(colega, nomeEquipe, tx);
      await tx.integranteEquipe.create({ data: { equipeId: equipe.id, usuarioId: usuario.id } });
    }

    // RF-05/RF-19 — a coordenação fica sabendo da nova ideia.
    await enfileirarParaTodos(
      await destinatariosAdmins(tx),
      (admin) => ({
        tipo: "NOVO_CADASTRO",
        modelo: emailNovoCadastro(admin.nome, nomeEquipe, input.leader.name, area.nome, equipe.id),
        chave: `NOVO_CADASTRO:equipe:${equipe.id}:usuario:${admin.id}`,
        equipeId: equipe.id,
      }),
      tx,
    );

    await registrarAuditoria(
      {
        usuarioId: lider.id,
        acao: "EQUIPE_CADASTRADA",
        entidade: "equipe",
        entidadeId: equipe.id,
        detalhes: { nome: nomeEquipe, area: area.nome, liderEmail, integrantes: colegas.length },
        ip,
      },
      tx,
    );

    return { equipeId: equipe.id, liderId: lider.id };
  });

  processarFilaEmSegundoPlano();

  return {
    teamId: equipeId,
    leaderId: liderId,
    memberCount: colegas.length + 1,
    message: `Ideia cadastrada! Confirme seu e-mail pelo link que enviamos para ${liderEmail} para conseguir entrar. A equipe do InfoHub vai analisar sua proposta e entrar em contato.`,
  };
}

/** Líder, mentor ou admin inclui um colega depois do cadastro (RF-02). */
export async function adicionarIntegrante(usuario: UsuarioAutenticado, equipeId: string, input: AddMemberInput, ip: string | null) {
  const equipe = await carregarEquipeNoEscopo(usuario, equipeId);
  exigirEquipeAtiva(equipe);
  exigirGestorOuLider(usuario, equipe);

  const integrante = await prisma.$transaction(async (tx) => {
    const { usuario: aluno } = await garantirAluno(input, equipe.nome, tx);
    const anterior = await tx.integranteEquipe.findUnique({ where: { equipeId_usuarioId: { equipeId, usuarioId: aluno.id } } });
    if (anterior && anterior.saiuEm === null) {
      throw new ConflictError("Esta pessoa já faz parte da equipe.", "ALREADY_MEMBER");
    }
    const linha = anterior
      ? await tx.integranteEquipe.update({ where: { id: anterior.id }, data: { saiuEm: null, entrouEm: new Date() }, include: incluirIntegrante })
      : await tx.integranteEquipe.create({ data: { equipeId, usuarioId: aluno.id }, include: incluirIntegrante });
    await registrarAuditoria(
      { usuarioId: usuario.id, acao: "EQUIPE_INTEGRANTE_ADICIONADO", entidade: "equipe", entidadeId: equipeId, detalhes: { usuarioId: aluno.id, email: aluno.email }, ip },
      tx,
    );
    return linha;
  });

  processarFilaEmSegundoPlano();
  return { member: paraIntegrante(integrante, equipe.liderId), message: "Integrante incluído. Se for a primeira conta dele, enviamos o link de ativação." };
}

export async function removerIntegrante(usuario: UsuarioAutenticado, equipeId: string, usuarioId: string, ip: string | null) {
  const equipe = await carregarEquipeNoEscopo(usuario, equipeId);
  exigirEquipeAtiva(equipe);
  exigirGestorOuLider(usuario, equipe);
  if (usuarioId === equipe.liderId) {
    throw new ConflictError("O líder não pode ser removido da equipe. Promova outro integrante antes.", "CANNOT_REMOVE_LEADER");
  }

  const removidos = await prisma.integranteEquipe.updateMany({
    where: { equipeId, usuarioId, saiuEm: null },
    data: { saiuEm: new Date() },
  });
  if (removidos.count === 0) throw new NotFoundError("Esta pessoa não faz parte da equipe.", "MEMBER_NOT_FOUND");

  await registrarAuditoria({ usuarioId: usuario.id, acao: "EQUIPE_INTEGRANTE_REMOVIDO", entidade: "equipe", entidadeId: equipeId, detalhes: { usuarioId }, ip });
}

/** Troca de líder (RNF-02 e gestão): admin, mentor ou o líder atual. */
export async function promoverLider(usuario: UsuarioAutenticado, equipeId: string, novoLiderId: string, ip: string | null) {
  const equipe = await carregarEquipeNoEscopo(usuario, equipeId);
  exigirEquipeAtiva(equipe);
  exigirGestorOuLider(usuario, equipe);

  const integrante = await prisma.integranteEquipe.findFirst({
    where: { equipeId, usuarioId: novoLiderId, saiuEm: null, usuario: { ativo: true, excluidoEm: null } },
  });
  if (!integrante) throw new NotFoundError("O novo líder precisa ser um integrante ativo da equipe.", "MEMBER_NOT_FOUND");

  await prisma.$transaction(async (tx) => {
    await tx.equipe.update({ where: { id: equipeId }, data: { liderId: novoLiderId } });
    await registrarAuditoria(
      { usuarioId: usuario.id, acao: "EQUIPE_LIDER_PROMOVIDO", entidade: "equipe", entidadeId: equipeId, detalhes: { de: equipe.liderId, para: novoLiderId }, ip },
      tx,
    );
  });

  return { message: "Novo líder definido." };
}

// ---------------------------------------------------------------------------
// RF-20 — lembrete manual
// ---------------------------------------------------------------------------

export async function lembreteManual(usuario: UsuarioAutenticado, equipeId: string, input: ManualReminderInput, ip: string | null) {
  const equipe = await carregarEquipeNoEscopo(usuario, equipeId);
  exigirEquipeAtiva(equipe);

  const destinatarios = await destinatariosDaEquipe(equipeId);
  let enviados = 0;
  await prisma.$transaction(async (tx) => {
    for (const pessoa of destinatarios) {
      const id = await enfileirar(
        {
          tipo: "LEMBRETE_MANUAL",
          destinatario: pessoa,
          modelo: emailLembreteManual(pessoa.nome, equipe.nome, usuario.nome, input.subject, input.message),
          equipeId,
        },
        tx,
      );
      if (id) enviados += 1;
    }
    await registrarAuditoria(
      { usuarioId: usuario.id, acao: "LEMBRETE_MANUAL_ENVIADO", entidade: "equipe", entidadeId: equipeId, detalhes: { assunto: input.subject, destinatarios: enviados }, ip },
      tx,
    );
  });

  processarFilaEmSegundoPlano();
  return { recipients: enviados, message: `Lembrete enviado para ${enviados} integrante(s).` };
}

import fs from "node:fs";
import type { Prisma, StatusTarefa } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { caminhoAbsoluto, caminhoRelativo, descartarArquivos } from "../../shared/armazenamento";
import { registrarAuditoria } from "../../shared/auditoria";
import { dataDoLembrete, dataIso, fimDoDia, inicioDoDia } from "../../shared/datas";
import { STATUS_TAREFA_DA_API, STATUS_TAREFA_PARA_API, type ApiTaskStatus } from "../../shared/dto";
import { emailEntregaAvaliada, emailEntregaRecebida, emailNovaTarefa } from "../../shared/email/templates";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../shared/errors";
import { escopoTarefa, podeMentorar } from "../../shared/escopo";
import type { UsuarioAutenticado } from "../../types/express";
import { carregarEquipeNoEscopo } from "../equipes/equipes.service";
import { recalcularStatusJornada, type EtapaDaJornada } from "../equipes/jornada";
import {
  destinatariosAcompanhamento,
  destinatariosDaEquipe,
  enfileirarParaTodos,
  processarFilaEmSegundoPlano,
} from "../notificacoes/notificacoes.service";
import { incluirEntrega, incluirTarefa, paraEntrega, paraTarefa, type TarefaRow } from "./tarefas.dto";
import type {
  CalendarQuery,
  CommentInput,
  CreateTaskInput,
  ListTasksQuery,
  ReminderInput,
  ReviewTaskInput,
  SubmissionInput,
  UpdateTaskInput,
} from "./tarefas.schemas";

// ---------------------------------------------------------------------------
// Consultas (RF-13)
// ---------------------------------------------------------------------------

/**
 * Carrega a tarefa garantindo o escopo. Fora do escopo = 403; inexistente
 * ou de equipe excluída (para quem não é admin) = 404.
 */
async function carregarTarefaNoEscopo(usuario: UsuarioAutenticado, tarefaId: string): Promise<TarefaRow> {
  const tarefa = await prisma.tarefa.findFirst({
    where: { AND: [{ id: tarefaId }, escopoTarefa(usuario)] },
    include: incluirTarefa,
  });
  if (tarefa) return tarefa;

  const existe = await prisma.tarefa.findUnique({ where: { id: tarefaId }, select: { equipe: { select: { excluidaEm: true } } } });
  if (existe && !existe.equipe.excluidaEm) {
    throw new ForbiddenError("Você não tem acesso a esta tarefa.", "TASK_OUT_OF_SCOPE");
  }
  throw new NotFoundError("Tarefa não encontrada.", "TASK_NOT_FOUND");
}

function exigirMentor(usuario: UsuarioAutenticado) {
  if (!podeMentorar(usuario)) {
    throw new ForbiddenError("Apenas administradores e mentores podem fazer isso.", "INSUFFICIENT_ROLE");
  }
}

/** Q4 — tarefa de equipe excluída fica só para consulta (o admin ainda a enxerga). */
function exigirEquipeAtiva(tarefa: TarefaRow) {
  if (tarefa.equipe.excluidaEm) {
    throw new BadRequestError("A equipe desta tarefa foi excluída; a tarefa fica só para consulta.", "TEAM_INACTIVE");
  }
}

/** Entregar e marcar "em andamento" são coisas dos integrantes da equipe, não da coordenação. */
function exigirAluno(usuario: UsuarioAutenticado) {
  if (usuario.perfil !== "ALUNO") {
    throw new ForbiddenError("Só os integrantes da equipe fazem isso.", "ONLY_TEAM_MEMBERS");
  }
}

export async function listarTarefas(usuario: UsuarioAutenticado, filtros: ListTasksQuery) {
  const where: Prisma.TarefaWhereInput = {
    AND: [
      escopoTarefa(usuario),
      { equipe: { excluidaEm: null } },
      filtros.teamId ? { equipeId: filtros.teamId } : {},
      filtros.status ? { status: STATUS_TAREFA_DA_API[filtros.status] } : {},
      filtros.dueFrom ? { prazo: { gte: inicioDoDia(filtros.dueFrom) } } : {},
      filtros.dueTo ? { prazo: { lte: fimDoDia(filtros.dueTo) } } : {},
      filtros.search
        ? { OR: [{ titulo: { contains: filtros.search, mode: "insensitive" } }, { equipe: { nome: { contains: filtros.search, mode: "insensitive" } } }] }
        : {},
    ],
  };

  const linhas = await prisma.tarefa.findMany({ where, include: incluirTarefa, orderBy: [{ prazo: "asc" }, { criadoEm: "asc" }] });
  let data = linhas.map(paraTarefa);
  if (filtros.stage) data = data.filter((t) => t.stage === filtros.stage);
  return { data, total: data.length };
}

/** RF-13 — detalhe com todas as versões de entrega (RF-16), comentários (RF-15) e lembretes (RF-17). */
export async function obterTarefa(usuario: UsuarioAutenticado, tarefaId: string) {
  const tarefa = await carregarTarefaNoEscopo(usuario, tarefaId);

  const [entregas, comentarios, lembretes] = await Promise.all([
    prisma.entrega.findMany({ where: { tarefaId }, include: incluirEntrega, orderBy: { versao: "asc" } }),
    prisma.comentarioTarefa.findMany({
      where: { tarefaId },
      include: { autor: { select: { id: true, nome: true } }, entrega: { select: { versao: true } } },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.lembreteTarefa.findMany({ where: { tarefaId }, orderBy: { lembrarEm: "asc" } }),
  ]);

  return {
    task: {
      ...paraTarefa(tarefa),
      submissions: entregas.map((e) => paraEntrega(tarefaId, e)),
      comments: comentarios.map((c) => ({
        id: c.id,
        submissionId: c.entregaId,
        submissionVersion: c.entrega?.versao ?? null,
        author: c.autor ? { id: c.autor.id, name: c.autor.nome } : null,
        decision: c.decisao ? (c.decisao === "APROVADA" ? "APPROVED" : "REJECTED") : null,
        content: c.conteudo,
        createdAt: c.criadoEm,
      })),
      reminders: lembretes.map((l) => ({ id: l.id, daysBefore: l.diasAntes, remindAt: l.lembrarEm, sentAt: l.enviadoEm })),
    },
  };
}

/** RF-11 — modelos de tarefa ativos, por etapa. */
export async function listarModelos() {
  const modelos = await prisma.modeloTarefa.findMany({
    where: { ativo: true },
    include: { etapaPadrao: { select: { numero: true, nome: true } } },
    orderBy: [{ etapaPadrao: { numero: "asc" } }, { ordem: "asc" }],
  });
  return {
    data: modelos.map((m) => ({
      id: m.id,
      stage: m.etapaPadrao.numero,
      stageName: m.etapaPadrao.nome,
      title: m.titulo,
      description: m.descricao,
      isMandatory: m.obrigatoria,
    })),
  };
}

// ---------------------------------------------------------------------------
// Calendário
// ---------------------------------------------------------------------------

export async function calendario(usuario: UsuarioAutenticado, filtros: CalendarQuery) {
  const de = inicioDoDia(filtros.from);
  const ate = fimDoDia(filtros.to);
  const base: Prisma.TarefaWhereInput = {
    AND: [escopoTarefa(usuario), { equipe: { excluidaEm: null } }, filtros.teamId ? { equipeId: filtros.teamId } : {}],
  };

  const [prazos, lembretes] = await Promise.all([
    prisma.tarefa.findMany({ where: { AND: [base, { prazo: { gte: de, lte: ate } }] }, include: incluirTarefa, orderBy: { prazo: "asc" } }),
    filtros.includeReminders
      ? prisma.lembreteTarefa.findMany({
          where: { lembrarEm: { gte: de, lte: ate }, tarefa: base },
          include: { tarefa: { include: incluirTarefa } },
          orderBy: { lembrarEm: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const eventoDe = (t: TarefaRow, kind: "DUE" | "REMINDER", data: Date, reminderSent: boolean | null) => {
    const api = paraTarefa(t);
    return {
      kind,
      date: dataIso(data),
      taskId: api.id,
      title: api.title,
      stage: api.stage,
      stageName: api.stageName,
      status: api.status,
      isMandatory: api.isMandatory,
      teamId: api.teamId,
      teamName: api.teamName,
      dueDate: api.dueDate,
      reminderSent,
    };
  };

  const eventos = [
    ...prazos.map((t) => eventoDe(t, "DUE", t.prazo, null)),
    ...lembretes.map((l) => eventoDe(l.tarefa, "REMINDER", l.lembrarEm, l.enviadoEm !== null)),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));

  const porDia = new Map<string, typeof eventos>();
  for (const evento of eventos) {
    const lista = porDia.get(evento.date);
    if (lista) lista.push(evento);
    else porDia.set(evento.date, [evento]);
  }

  const status = (s: ApiTaskStatus) => prazos.filter((t) => STATUS_TAREFA_PARA_API[t.status] === s).length;

  return {
    range: { from: filtros.from, to: filtros.to },
    summary: {
      total: prazos.length,
      overdue: status("OVERDUE"),
      pending: prazos.length - status("OVERDUE") - status("APPROVED"),
      approved: status("APPROVED"),
    },
    days: [...porDia.entries()].map(([date, events]) => ({ date, events })),
    events: eventos,
  };
}

// ---------------------------------------------------------------------------
// Criação e edição (RF-11, RF-12, RF-17)
// ---------------------------------------------------------------------------

/**
 * RF-12 — cria a tarefa (avulsa ou de modelo), agenda os lembretes (RF-17) e
 * avisa os integrantes (RF-18). Uma obrigatória nova pode tirar a equipe do
 * "pronta para o InovAMF", por isso o status da jornada é recalculado.
 */
export async function criarTarefa(usuario: UsuarioAutenticado, input: CreateTaskInput, ip: string | null) {
  exigirMentor(usuario);

  const equipe = await carregarEquipeNoEscopo(usuario, input.teamId);
  if (equipe.excluidaEm) throw new BadRequestError("Esta equipe foi excluída.", "TEAM_INACTIVE");

  const modelo = input.templateId ? await prisma.modeloTarefa.findFirst({ where: { id: input.templateId, ativo: true } }) : null;
  if (input.templateId && !modelo) throw new NotFoundError("Modelo de tarefa não encontrado.", "TEMPLATE_NOT_FOUND");

  const jornada: EtapaDaJornada[] = equipe.etapas;
  // Etapa da tarefa: stageId informado > etapa do modelo > etapa atual da equipe.
  let etapa: EtapaDaJornada | undefined;
  if (input.stageId) {
    etapa = jornada.find((e) => e.id === input.stageId);
    if (!etapa) throw new BadRequestError("A etapa informada não pertence à jornada desta equipe.", "STAGE_NOT_FOUND");
  } else if (modelo) {
    etapa = jornada.find((e) => e.etapaPadraoId === modelo.etapaPadraoId);
  }
  etapa ??= jornada.find((e) => e.id === equipe.etapaAtualId) ?? jornada[0];
  if (!etapa) throw new BadRequestError("A equipe não tem jornada configurada.", "JOURNEY_MISSING");

  const titulo = input.title ?? modelo!.titulo;
  const descricao = input.description ?? modelo?.descricao ?? null;
  const obrigatoria = input.isMandatory ?? modelo?.obrigatoria ?? false;
  const prazo = fimDoDia(input.dueDate);
  const diasLembrete = [...new Set(input.reminderDaysBefore)].filter((dias) => dataDoLembrete(prazo, dias).getTime() > Date.now());

  const tarefaId = await prisma.$transaction(async (tx) => {
    const tarefa = await tx.tarefa.create({
      data: {
        equipeId: equipe.id,
        etapaEquipeId: etapa.id,
        modeloTarefaId: modelo?.id ?? null,
        titulo,
        descricao,
        prazo,
        obrigatoria,
        criadoPorId: usuario.id,
      },
    });

    if (diasLembrete.length) {
      await tx.lembreteTarefa.createMany({
        data: diasLembrete.map((dias) => ({ tarefaId: tarefa.id, diasAntes: dias, lembrarEm: dataDoLembrete(prazo, dias) })),
      });
    }

    await recalcularStatusJornada(equipe.id, tx);

    await enfileirarParaTodos(
      await destinatariosDaEquipe(equipe.id, tx),
      (pessoa) => ({
        tipo: "NOVA_TAREFA",
        modelo: emailNovaTarefa(pessoa.nome, equipe.nome, titulo, prazo, obrigatoria),
        chave: `NOVA_TAREFA:tarefa:${tarefa.id}:usuario:${pessoa.id}`,
        equipeId: equipe.id,
        tarefaId: tarefa.id,
      }),
      tx,
    );

    await registrarAuditoria(
      { usuarioId: usuario.id, acao: "TAREFA_CRIADA", entidade: "tarefa", entidadeId: tarefa.id, detalhes: { equipeId: equipe.id, titulo, prazo: input.dueDate, obrigatoria, lembretes: diasLembrete }, ip },
      tx,
    );
    return tarefa.id;
  });

  processarFilaEmSegundoPlano();
  return { ...(await obterTarefa(usuario, tarefaId)), message: "Tarefa criada e integrantes avisados por e-mail." };
}

/**
 * RF-12/RF-17 — edita a tarefa. Mudou o prazo (nota da RF-17: "verificar
 * lembretes caso o mentor atualize os prazos")? Os lembretes "X dias antes"
 * acompanham o novo prazo: os que ainda estão por vir voltam a valer, mesmo
 * que já tenham saído para o prazo antigo; os de data fixa ficam como estão.
 * Uma tarefa "atrasada" cujo novo prazo é futuro volta a ficar pendente.
 */
export async function atualizarTarefa(usuario: UsuarioAutenticado, tarefaId: string, input: UpdateTaskInput, ip: string | null) {
  exigirMentor(usuario);
  const tarefa = await carregarTarefaNoEscopo(usuario, tarefaId);
  exigirEquipeAtiva(tarefa);

  const novoPrazo = input.dueDate ? fimDoDia(input.dueDate) : null;
  const prazoMudou = novoPrazo !== null && novoPrazo.getTime() !== tarefa.prazo.getTime();

  await prisma.$transaction(async (tx) => {
    let status: StatusTarefa | undefined;
    if (prazoMudou && tarefa.status === "ATRASADA" && novoPrazo!.getTime() > Date.now()) status = "PENDENTE";

    await tx.tarefa.update({
      where: { id: tarefaId },
      data: {
        ...(input.title !== undefined ? { titulo: input.title } : {}),
        ...(input.description !== undefined ? { descricao: input.description } : {}),
        ...(novoPrazo ? { prazo: novoPrazo } : {}),
        ...(input.isMandatory !== undefined ? { obrigatoria: input.isMandatory } : {}),
        ...(status ? { status } : {}),
      },
    });

    let lembretesReativados = 0;
    if (prazoMudou) {
      const agora = Date.now();
      const relativos = await tx.lembreteTarefa.findMany({ where: { tarefaId, diasAntes: { not: null } } });
      for (const lembrete of relativos) {
        const lembrarEm = dataDoLembrete(novoPrazo!, lembrete.diasAntes!);
        const reativar = lembrete.enviadoEm !== null && lembrarEm.getTime() > agora;
        if (reativar) lembretesReativados += 1;
        await tx.lembreteTarefa.update({
          where: { id: lembrete.id },
          data: { lembrarEm, ...(reativar ? { enviadoEm: null } : {}) },
        });
      }
    }

    if (input.isMandatory !== undefined) await recalcularStatusJornada(tarefa.equipeId, tx);

    await registrarAuditoria(
      {
        usuarioId: usuario.id,
        acao: "TAREFA_ATUALIZADA",
        entidade: "tarefa",
        entidadeId: tarefaId,
        detalhes: { campos: Object.keys(input), prazoAnterior: tarefa.prazo, prazoMudou, lembretesReativados },
        ip,
      },
      tx,
    );
  });

  return obterTarefa(usuario, tarefaId);
}

/** O aluno marca que começou (PENDING → IN_PROGRESS). */
export async function iniciarTarefa(usuario: UsuarioAutenticado, tarefaId: string) {
  exigirAluno(usuario);
  const tarefa = await carregarTarefaNoEscopo(usuario, tarefaId);
  exigirEquipeAtiva(tarefa);
  if (tarefa.status !== "PENDENTE") {
    throw new ConflictError("Só uma tarefa pendente pode ser marcada como em andamento.", "TASK_NOT_PENDING");
  }
  await prisma.tarefa.update({ where: { id: tarefaId }, data: { status: "EM_ANDAMENTO" } });
  return obterTarefa(usuario, tarefaId);
}

/** Exclusão só de tarefa sem entregas (para corrigir um cadastro errado). */
export async function excluirTarefa(usuario: UsuarioAutenticado, tarefaId: string, ip: string | null) {
  exigirMentor(usuario);
  const tarefa = await carregarTarefaNoEscopo(usuario, tarefaId);
  exigirEquipeAtiva(tarefa);
  if (tarefa._count.entregas > 0) {
    throw new ConflictError("Esta tarefa já recebeu entregas e não pode ser excluída.", "TASK_HAS_SUBMISSIONS");
  }
  await prisma.$transaction(async (tx) => {
    await tx.tarefa.delete({ where: { id: tarefaId } });
    await recalcularStatusJornada(tarefa.equipeId, tx);
    await registrarAuditoria(
      { usuarioId: usuario.id, acao: "TAREFA_EXCLUIDA", entidade: "tarefa", entidadeId: tarefaId, detalhes: { titulo: tarefa.titulo, equipeId: tarefa.equipeId }, ip },
      tx,
    );
  });
}

// ---------------------------------------------------------------------------
// Entregas (RF-14, RF-16) e avaliação (RF-15)
// ---------------------------------------------------------------------------

/**
 * RF-14/RF-16 — entrega: cada envio vira uma nova versão com N anexos
 * (arquivos e/ou link). A tarefa passa a ENTREGUE e quem acompanha a equipe é
 * avisado. Se a transação falhar, os arquivos já gravados são apagados.
 */
export async function entregar(
  usuario: UsuarioAutenticado,
  tarefaId: string,
  arquivos: Express.Multer.File[],
  input: SubmissionInput,
  ip: string | null,
) {
  try {
    exigirAluno(usuario);
    const tarefa = await carregarTarefaNoEscopo(usuario, tarefaId);
    exigirEquipeAtiva(tarefa);

    if (tarefa.status === "APROVADA") {
      throw new ConflictError("Esta tarefa já foi aprovada e não aceita novas entregas.", "TASK_ALREADY_APPROVED");
    }
    if (arquivos.length === 0 && !input.linkUrl) {
      throw new BadRequestError("Envie ao menos um arquivo ou informe um link.", "SUBMISSION_EMPTY");
    }

    const entregaId = await prisma.$transaction(async (tx) => {
      const ultima = await tx.entrega.findFirst({ where: { tarefaId }, orderBy: { versao: "desc" }, select: { versao: true } });
      const versao = (ultima?.versao ?? 0) + 1;

      const entrega = await tx.entrega.create({
        data: {
          tarefaId,
          versao,
          enviadoPorId: usuario.id,
          observacao: input.note ?? null,
          anexos: {
            create: [
              ...arquivos.map((a) => ({
                tipo: "ARQUIVO" as const,
                nomeOriginal: a.originalname,
                caminhoArmazenamento: caminhoRelativo(a.path),
                tamanhoBytes: a.size,
                mimeType: a.mimetype,
              })),
              ...(input.linkUrl
                ? [{ tipo: "LINK" as const, nomeOriginal: input.linkTitle || input.linkUrl, url: input.linkUrl }]
                : []),
            ],
          },
        },
      });

      await tx.tarefa.update({ where: { id: tarefaId }, data: { status: "ENTREGUE" } });

      await enfileirarParaTodos(
        await destinatariosAcompanhamento(tarefa.equipeId, tx),
        (pessoa) => ({
          tipo: "ENTREGA_RECEBIDA",
          modelo: emailEntregaRecebida(pessoa.nome, tarefa.equipe.nome, tarefa.titulo, versao, usuario.nome, tarefa.equipeId, pessoa.perfil),
          chave: `ENTREGA_RECEBIDA:entrega:${entrega.id}:usuario:${pessoa.id}`,
          equipeId: tarefa.equipeId,
          tarefaId,
        }),
        tx,
      );

      await registrarAuditoria(
        { usuarioId: usuario.id, acao: "TAREFA_ENTREGUE", entidade: "entrega", entidadeId: entrega.id, detalhes: { tarefaId, versao, arquivos: arquivos.length, link: Boolean(input.linkUrl) }, ip },
        tx,
      );
      return entrega.id;
    });

    processarFilaEmSegundoPlano();
    return { ...(await obterTarefa(usuario, tarefaId)), submissionId: entregaId, message: "Entrega enviada. O mentor foi avisado." };
  } catch (error) {
    await descartarArquivos(arquivos);
    throw error;
  }
}

/**
 * RF-15 — aprovar ou pedir ajustes na última entrega. O comentário fica
 * ligado à versão avaliada; a tarefa muda de status, o funil é recalculado e
 * os integrantes recebem o resultado (RF-18).
 */
export async function avaliar(usuario: UsuarioAutenticado, tarefaId: string, input: ReviewTaskInput, ip: string | null) {
  exigirMentor(usuario);
  const tarefa = await carregarTarefaNoEscopo(usuario, tarefaId);
  exigirEquipeAtiva(tarefa);

  const ultima = await prisma.entrega.findFirst({ where: { tarefaId }, orderBy: { versao: "desc" } });
  if (!ultima) throw new ConflictError("Esta tarefa ainda não tem nenhuma entrega para avaliar.", "NO_SUBMISSION");

  const aprovada = input.decision === "APPROVED";

  await prisma.$transaction(async (tx) => {
    await tx.comentarioTarefa.create({
      data: { tarefaId, entregaId: ultima.id, autorId: usuario.id, decisao: aprovada ? "APROVADA" : "REPROVADA", conteudo: input.comment },
    });
    await tx.tarefa.update({ where: { id: tarefaId }, data: { status: aprovada ? "APROVADA" : "REPROVADA" } });
    const statusJornada = await recalcularStatusJornada(tarefa.equipeId, tx);

    await enfileirarParaTodos(
      await destinatariosDaEquipe(tarefa.equipeId, tx),
      (pessoa) => ({
        tipo: "ENTREGA_AVALIADA",
        modelo: emailEntregaAvaliada(pessoa.nome, tarefa.equipe.nome, tarefa.titulo, aprovada, input.comment),
        chave: `ENTREGA_AVALIADA:entrega:${ultima.id}:decisao:${input.decision}:usuario:${pessoa.id}`,
        equipeId: tarefa.equipeId,
        tarefaId,
      }),
      tx,
    );

    await registrarAuditoria(
      { usuarioId: usuario.id, acao: aprovada ? "TAREFA_APROVADA" : "TAREFA_REPROVADA", entidade: "tarefa", entidadeId: tarefaId, detalhes: { entregaId: ultima.id, versao: ultima.versao, statusJornada }, ip },
      tx,
    );
  });

  processarFilaEmSegundoPlano();
  return { ...(await obterTarefa(usuario, tarefaId)), message: aprovada ? "Entrega aprovada." : "Ajustes solicitados ao aluno." };
}

/** Comentário livre (sem decisão) de qualquer pessoa no escopo da tarefa. */
export async function comentar(usuario: UsuarioAutenticado, tarefaId: string, input: CommentInput) {
  exigirEquipeAtiva(await carregarTarefaNoEscopo(usuario, tarefaId));
  await prisma.comentarioTarefa.create({ data: { tarefaId, autorId: usuario.id, conteudo: input.content } });
  return obterTarefa(usuario, tarefaId);
}

// ---------------------------------------------------------------------------
// Lembretes (RF-17)
// ---------------------------------------------------------------------------

export async function adicionarLembrete(usuario: UsuarioAutenticado, tarefaId: string, input: ReminderInput) {
  exigirMentor(usuario);
  const tarefa = await carregarTarefaNoEscopo(usuario, tarefaId);
  exigirEquipeAtiva(tarefa);

  const lembrarEm = input.daysBefore !== undefined ? dataDoLembrete(tarefa.prazo, input.daysBefore) : (() => {
    const d = inicioDoDia(input.remindAt!);
    d.setHours(9, 0, 0, 0);
    return d;
  })();
  if (lembrarEm.getTime() <= Date.now()) {
    throw new BadRequestError("A data do lembrete já passou.", "REMINDER_IN_PAST");
  }

  await prisma.lembreteTarefa.create({ data: { tarefaId, diasAntes: input.daysBefore ?? null, lembrarEm } });
  return obterTarefa(usuario, tarefaId);
}

export async function removerLembrete(usuario: UsuarioAutenticado, tarefaId: string, lembreteId: string) {
  exigirMentor(usuario);
  exigirEquipeAtiva(await carregarTarefaNoEscopo(usuario, tarefaId));
  const removidos = await prisma.lembreteTarefa.deleteMany({ where: { id: lembreteId, tarefaId, enviadoEm: null } });
  if (removidos.count === 0) throw new NotFoundError("Lembrete não encontrado (ou já enviado).", "REMINDER_NOT_FOUND");
}

// ---------------------------------------------------------------------------
// Download de anexo (RNF-04: sempre pela API, com escopo)
// ---------------------------------------------------------------------------

export async function localizarAnexo(usuario: UsuarioAutenticado, tarefaId: string, anexoId: string) {
  await carregarTarefaNoEscopo(usuario, tarefaId);
  const anexo = await prisma.anexoEntrega.findFirst({ where: { id: anexoId, entrega: { tarefaId } } });
  if (!anexo || anexo.tipo !== "ARQUIVO" || !anexo.caminhoArmazenamento) {
    throw new NotFoundError("Arquivo não encontrado.", "ATTACHMENT_NOT_FOUND");
  }
  const caminho = caminhoAbsoluto(anexo.caminhoArmazenamento);
  if (!fs.existsSync(caminho)) {
    throw new NotFoundError("O arquivo não está mais disponível no servidor.", "ATTACHMENT_FILE_MISSING");
  }
  return { caminho, nome: anexo.nomeOriginal, mimeType: anexo.mimeType ?? "application/octet-stream" };
}

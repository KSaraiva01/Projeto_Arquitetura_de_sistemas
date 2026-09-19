import { Router } from "express";
import { uploadEntrega } from "../../shared/armazenamento";
import { autenticar, autorizar } from "../../shared/middlewares/autenticar";
import { getBody, getParams, getQuery, validarBody, validarParams, validarQuery } from "../../shared/middlewares/validar";
import * as service from "./tarefas.service";
import {
  attachmentParamSchema,
  calendarQuerySchema,
  commentSchema,
  createTaskSchema,
  listTasksQuerySchema,
  reminderParamSchema,
  reminderSchema,
  reviewTaskSchema,
  submissionSchema,
  taskIdParamSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  type AttachmentParam,
  type CalendarQuery,
  type CommentInput,
  type CreateTaskInput,
  type ListTasksQuery,
  type ReminderInput,
  type ReminderParam,
  type ReviewTaskInput,
  type SubmissionInput,
  type TaskIdParam,
  type UpdateTaskInput,
} from "./tarefas.schemas";

/**
 * RF-11 a RF-17 — tarefas, entregas, avaliação, lembretes e calendário.
 * Prefixo: /api/tasks
 *
 * Leitura para todos os perfis (o escopo restringe o que cada um enxerga).
 * Criar, editar, avaliar e configurar lembretes é de ADMIN/MENTOR; entregar é
 * de quem está na equipe.
 */
export const tasksRouter = Router();

const ip = (req: { ip?: string }) => req.ip ?? null;

tasksRouter.use(autenticar);

tasksRouter.get("/calendar", validarQuery(calendarQuerySchema), async (req, res) => {
  res.json(await service.calendario(req.usuario!, getQuery<CalendarQuery>(res)));
});

tasksRouter.get("/templates", autorizar("ADMIN", "MENTOR"), async (_req, res) => {
  res.json(await service.listarModelos());
});

tasksRouter.get("/", validarQuery(listTasksQuerySchema), async (req, res) => {
  res.json(await service.listarTarefas(req.usuario!, getQuery<ListTasksQuery>(res)));
});

tasksRouter.post("/", autorizar("ADMIN", "MENTOR"), validarBody(createTaskSchema), async (req, res) => {
  res.status(201).json(await service.criarTarefa(req.usuario!, getBody<CreateTaskInput>(req), ip(req)));
});

tasksRouter.get("/:id", validarParams(taskIdParamSchema), async (req, res) => {
  res.json(await service.obterTarefa(req.usuario!, getParams<TaskIdParam>(res).id));
});

tasksRouter.patch("/:id", autorizar("ADMIN", "MENTOR"), validarParams(taskIdParamSchema), validarBody(updateTaskSchema), async (req, res) => {
  res.json(await service.atualizarTarefa(req.usuario!, getParams<TaskIdParam>(res).id, getBody<UpdateTaskInput>(req), ip(req)));
});

tasksRouter.patch("/:id/status", validarParams(taskIdParamSchema), validarBody(updateTaskStatusSchema), async (req, res) => {
  res.json(await service.iniciarTarefa(req.usuario!, getParams<TaskIdParam>(res).id));
});

tasksRouter.delete("/:id", autorizar("ADMIN", "MENTOR"), validarParams(taskIdParamSchema), async (req, res) => {
  await service.excluirTarefa(req.usuario!, getParams<TaskIdParam>(res).id, ip(req));
  res.status(204).send();
});

// RF-14 — multipart/form-data: files[] (até UPLOAD_MAX_FILES) + linkUrl/linkTitle/note.
tasksRouter.post(
  "/:id/submissions",
  validarParams(taskIdParamSchema),
  uploadEntrega.array("files"),
  validarBody(submissionSchema),
  async (req, res) => {
    const arquivos = (req.files as Express.Multer.File[] | undefined) ?? [];
    res.status(201).json(await service.entregar(req.usuario!, getParams<TaskIdParam>(res).id, arquivos, getBody<SubmissionInput>(req), ip(req)));
  },
);

tasksRouter.post("/:id/review", autorizar("ADMIN", "MENTOR"), validarParams(taskIdParamSchema), validarBody(reviewTaskSchema), async (req, res) => {
  res.json(await service.avaliar(req.usuario!, getParams<TaskIdParam>(res).id, getBody<ReviewTaskInput>(req), ip(req)));
});

tasksRouter.post("/:id/comments", validarParams(taskIdParamSchema), validarBody(commentSchema), async (req, res) => {
  res.status(201).json(await service.comentar(req.usuario!, getParams<TaskIdParam>(res).id, getBody<CommentInput>(req)));
});

// RF-17 — lembretes
tasksRouter.post("/:id/reminders", autorizar("ADMIN", "MENTOR"), validarParams(taskIdParamSchema), validarBody(reminderSchema), async (req, res) => {
  res.status(201).json(await service.adicionarLembrete(req.usuario!, getParams<TaskIdParam>(res).id, getBody<ReminderInput>(req)));
});

tasksRouter.delete("/:id/reminders/:reminderId", autorizar("ADMIN", "MENTOR"), validarParams(reminderParamSchema), async (req, res) => {
  const { id, reminderId } = getParams<ReminderParam>(res);
  await service.removerLembrete(req.usuario!, id, reminderId);
  res.status(204).send();
});

// RNF-04 — download sempre pela API, com escopo
tasksRouter.get("/:id/attachments/:attachmentId/download", validarParams(attachmentParamSchema), async (req, res) => {
  const { id, attachmentId } = getParams<AttachmentParam>(res);
  const anexo = await service.localizarAnexo(req.usuario!, id, attachmentId);
  res.type(anexo.mimeType);
  res.download(anexo.caminho, anexo.nome);
});

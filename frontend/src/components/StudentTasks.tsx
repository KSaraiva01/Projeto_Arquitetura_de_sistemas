"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Clock,
  Hourglass,
  Loader2,
  Paperclip,
  Play,
  Send,
  Upload,
  Users,
} from "lucide-react";
import DueChip from "./DueChip";
import Header from "./Header";
import { CardSkeleton } from "./Skeleton";
import { TaskStatusBadge } from "./StatusBadge";
import { SubmissionVersions, TaskComments } from "./Submissions";
import Toast, { type ToastMessage } from "./Toast";
import UploadDropzone from "./UploadDropzone";
import { api, describeError } from "@/lib/api";
import { currentTeamOf, type ApiTask, type ApiTaskDetail, type ApiTaskStatus } from "@/lib/api-types";
import { useRequireSession } from "@/lib/session";
import { uploadProblem } from "@/lib/uploads";

type ShowToast = (kind: ToastMessage["kind"], text: string) => void;

const TO_DO: ApiTaskStatus[] = ["OVERDUE", "REJECTED", "PENDING", "IN_PROGRESS"];

const inputClass =
  "w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

/**
 * RF-13 e RF-14 — tarefas da equipe para o líder e os integrantes: o que
 * falta fazer (com prazo e instruções), o que está em avaliação e o que já
 * foi aprovado. Cada tarefa abre o histórico de versões (RF-16), o retorno
 * do mentor (RF-15) e o envio de uma nova entrega — arquivos e/ou link.
 */
export default function StudentTasks() {
  const { user, loading } = useRequireSession(["STUDENT"]);
  const team = user ? currentTeamOf(user) : null;
  const teamId = team?.id ?? null;

  const [tasks, setTasks] = useState<ApiTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const load = useCallback(() => {
    if (!teamId) return Promise.resolve();
    return api.tasks({ teamId }).then(
      (result) => {
        setTasks(result.data);
        setError(null);
      },
      (err: unknown) => setError(describeError(err, "Não foi possível carregar as tarefas. A API está no ar?")),
    );
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const showToast: ShowToast = useCallback((kind, text) => setToast({ kind, text }), []);

  if (loading || !user) {
    return (
      <div className="p-6 space-y-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!team) {
    return (
      <div>
        <Header title="Minhas Tarefas" userName={user.name} />
        <NoTeam />
      </div>
    );
  }

  const byDue = (a: ApiTask, b: ApiTask) => a.dueDate.localeCompare(b.dueDate);
  const toDo = (tasks ?? []).filter((task) => TO_DO.includes(task.status)).sort(byDue);
  const inReview = (tasks ?? []).filter((task) => task.status === "SUBMITTED").sort(byDue);
  const done = (tasks ?? []).filter((task) => task.status === "APPROVED").sort(byDue);

  return (
    <div>
      <Header title="Minhas Tarefas" userName={user.name} subtitle={`Equipe ${team.name}`} />

      <div className="p-6 space-y-8">
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            <span>{error}</span>
            <button type="button" onClick={() => void load()} className="font-medium underline">
              Tentar novamente
            </button>
          </div>
        )}

        {!tasks && !error && (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {tasks && (
          <>
            <TaskGroup
              icon={<Clock className="w-5 h-5 text-amber-500" />}
              title="A fazer"
              tasks={toDo}
              empty="Nenhuma tarefa pendente — tudo em dia!"
              onChanged={load}
              onToast={showToast}
            />
            {inReview.length > 0 && (
              <TaskGroup
                icon={<Hourglass className="w-5 h-5 text-purple-500" />}
                title="Em avaliação"
                tasks={inReview}
                onChanged={load}
                onToast={showToast}
              />
            )}
            {done.length > 0 && (
              <TaskGroup
                icon={<CheckCircle className="w-5 h-5 text-success" />}
                title="Concluídas"
                tasks={done}
                onChanged={load}
                onToast={showToast}
              />
            )}
          </>
        )}
      </div>

      {toast && <Toast key={toast.text} kind={toast.kind} text={toast.text} onClose={() => setToast(null)} />}
    </div>
  );
}

export function NoTeam() {
  return (
    <div className="p-6">
      <div className="animate-rise bg-card rounded-xl border border-card-border p-8 text-center max-w-lg mx-auto">
        <Users className="w-10 h-10 text-muted-light mx-auto mb-3" />
        <p className="text-foreground font-medium">Você não está em nenhuma equipe no momento.</p>
        <p className="text-sm text-muted mt-1">
          Se a sua equipe foi excluída ou você saiu dela, procure a coordenação do InfoHub para entrar em outra.
        </p>
      </div>
    </div>
  );
}

function TaskGroup({
  icon,
  title,
  tasks,
  empty,
  onChanged,
  onToast,
}: {
  icon: React.ReactNode;
  title: string;
  tasks: ApiTask[];
  empty?: string;
  onChanged: () => Promise<void>;
  onToast: ShowToast;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        {icon}
        {title} ({tasks.length})
      </h2>
      {tasks.length === 0 ? (
        <div className="animate-rise bg-card rounded-xl border border-card-border p-8 text-center">
          <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
          <p className="text-muted">{empty}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <StudentTaskCard key={task.id} task={task} index={index} onChanged={onChanged} onToast={onToast} />
          ))}
        </div>
      )}
    </section>
  );
}

function StudentTaskCard({
  task,
  index,
  onChanged,
  onToast,
}: {
  task: ApiTask;
  index: number;
  onChanged: () => Promise<void>;
  onToast: ShowToast;
}) {
  // Tarefa devolvida para ajustes já abre mostrando o que o mentor pediu.
  const [open, setOpen] = useState(task.status === "REJECTED");
  const [detail, setDetail] = useState<ApiTaskDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);

  // Recarrega o detalhe quando a tarefa muda (nova versão, avaliação).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api.task(task.id).then(
      (result) => {
        if (!cancelled) {
          setDetail(result.task);
          setDetailError(null);
        }
      },
      (err: unknown) => {
        if (!cancelled) setDetailError(describeError(err, "Não foi possível carregar a tarefa."));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, task.id, task.updatedAt]);

  async function start() {
    setStarting(true);
    try {
      await api.startTask(task.id);
      onToast("ok", "Tarefa marcada como em andamento.");
      await onChanged();
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível atualizar a tarefa."));
    } finally {
      setStarting(false);
    }
  }

  const canSubmit = task.status !== "APPROVED";
  const lastFeedback = detail?.comments.filter((comment) => comment.decision).at(-1);

  return (
    <div
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className="animate-rise bg-card rounded-xl border border-card-border p-5 transition-[border-color,box-shadow] duration-150 hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-foreground">{task.title}</h3>
          {task.description && <p className="text-sm text-muted mt-0.5 whitespace-pre-line">{task.description}</p>}
        </div>
        <TaskStatusBadge status={task.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-light mb-4">
        <DueChip dueDate={task.dueDate} done={task.status === "APPROVED" || task.status === "SUBMITTED"} />
        <span>
          {task.stage ? `Etapa ${task.stage}` : "Etapa"} — {task.stageName}
        </span>
        {task.isMandatory && <span className="font-medium text-muted">Obrigatória para avançar</span>}
        {task.submissionCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <Paperclip className="w-3 h-3" /> {task.submissionCount} {task.submissionCount === 1 ? "versão enviada" : "versões enviadas"}
          </span>
        )}
      </div>

      {task.status === "REJECTED" && lastFeedback && (
        <div className="bg-orange-500/10 rounded-lg p-3 mb-4">
          <p className="text-sm text-orange-700 dark:text-orange-400">
            <span className="font-medium">Ajustes pedidos pelo mentor:</span> {lastFeedback.content}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {canSubmit && !submitting && (
          <button
            type="button"
            onClick={() => {
              setSubmitting(true);
              setOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg transition-[background-color,transform] duration-150 hover:bg-primary-dark active:scale-[0.98]"
          >
            <Upload className="w-4 h-4" /> {task.submissionCount > 0 ? "Enviar nova versão" : "Enviar entrega"}
          </button>
        )}
        {task.status === "PENDING" && (
          <button
            type="button"
            onClick={() => void start()}
            disabled={starting}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-input-border text-sm text-foreground rounded-lg hover:bg-hover-bg disabled:opacity-50"
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Comecei esta tarefa
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 px-2 py-2 text-sm text-muted hover:text-foreground"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
          {open ? "Ocultar detalhes" : "Versões e comentários"}
        </button>
      </div>

      {submitting && (
        <div className="mt-4">
          <SubmissionForm
            taskId={task.id}
            onCancel={() => setSubmitting(false)}
            onDone={async (updated, message) => {
              setSubmitting(false);
              setDetail(updated);
              onToast("ok", message);
              await onChanged();
            }}
          />
        </div>
      )}

      {open && (
        <div className="mt-4 grid gap-4 border-t border-divider pt-4 md:grid-cols-2">
          {detailError && <p className="text-sm text-danger md:col-span-2">{detailError}</p>}
          {!detail && !detailError && (
            <p className="flex items-center gap-2 text-sm text-muted-light md:col-span-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </p>
          )}
          {detail && (
            <>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Versões enviadas</h4>
                <SubmissionVersions submissions={detail.submissions} onError={(message) => onToast("erro", message)} />
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Retorno do mentor e comentários</h4>
                <TaskComments comments={detail.comments} />
                <CommentBox taskId={task.id} onSent={setDetail} onToast={onToast} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** RF-14 — uma entrega: arquivos (upload) e/ou um link (ex.: pitch no YouTube/Drive) e uma observação. */
function SubmissionForm({
  taskId,
  onCancel,
  onDone,
}: {
  taskId: string;
  onCancel: () => void;
  onDone: (task: ApiTaskDetail, message: string) => Promise<void>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const link = linkUrl.trim();
    const problem = uploadProblem(files);
    if (problem) return setError(problem);
    if (files.length === 0 && !link) return setError("Anexe ao menos um arquivo ou informe um link.");
    if (link && !/^https?:\/\/\S+$/i.test(link)) return setError("O link precisa começar com http:// ou https://.");

    setBusy(true);
    try {
      const result = await api.submitTask(taskId, {
        files,
        linkUrl: link || undefined,
        linkTitle: linkTitle.trim() || undefined,
        note: note.trim() || undefined,
      });
      await onDone(result.task, result.message);
    } catch (err) {
      setError(describeError(err, "Não foi possível enviar a entrega."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <UploadDropzone files={files} onFilesChange={setFiles} onCancel={onCancel} title="Nova entrega" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`link-${taskId}`} className="mb-1 block text-xs text-muted">
            Link (opcional) — ex.: vídeo do pitch no YouTube ou pasta no Drive
          </label>
          <input
            id={`link-${taskId}`}
            type="url"
            inputMode="url"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`link-title-${taskId}`} className="mb-1 block text-xs text-muted">
            Título do link (opcional)
          </label>
          <input
            id={`link-title-${taskId}`}
            type="text"
            value={linkTitle}
            maxLength={255}
            onChange={(event) => setLinkTitle(event.target.value)}
            placeholder="Ex.: Pitch em vídeo"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`note-${taskId}`} className="mb-1 block text-xs text-muted">
          Observação para o mentor (opcional)
        </label>
        <textarea
          id={`note-${taskId}`}
          value={note}
          maxLength={2000}
          rows={2}
          onChange={(event) => setNote(event.target.value)}
          className={`${inputClass} resize-none`}
        />
      </div>
      {error && (
        <p key={error} role="alert" className="animate-shake flex items-start gap-1.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted hover:text-foreground">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {busy ? "Enviando..." : "Enviar entrega"}
        </button>
      </div>
    </form>
  );
}

function CommentBox({
  taskId,
  onSent,
  onToast,
}: {
  taskId: string;
  onSent: (task: ApiTaskDetail) => void;
  onToast: ShowToast;
}) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!content.trim() || busy) return;
    setBusy(true);
    try {
      const result = await api.commentTask(taskId, content.trim());
      onSent(result.task);
      setContent("");
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível enviar o comentário."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex gap-2">
      <input
        type="text"
        value={content}
        maxLength={5000}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void send();
          }
        }}
        placeholder="Escreva um comentário para o mentor..."
        aria-label="Novo comentário"
        className={inputClass}
      />
      <button
        type="button"
        onClick={() => void send()}
        disabled={!content.trim() || busy}
        aria-label="Enviar comentário"
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-white hover:bg-primary-dark disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </button>
    </div>
  );
}

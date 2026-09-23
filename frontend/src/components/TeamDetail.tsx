"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Flag,
  History,
  Link2,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  Phone,
  Plus,
  Rocket,
  Send,
  Undo2,
  Users,
} from "lucide-react";
import DueChip from "./DueChip";
import Header from "./Header";
import JourneyCard from "./JourneyCard";
import { TeamDetailSkeleton } from "./Skeleton";
import { TaskStatusBadge } from "./StatusBadge";
import Toast, { type ToastMessage } from "./Toast";
import { api, describeError } from "@/lib/api";
import {
  IDEA_STAGE_LABELS,
  journeyStageLabel,
  type ApiAttachment,
  type ApiJourneyStage,
  type ApiNote,
  type ApiSessionUser,
  type ApiTask,
  type ApiTaskDetail,
  type ApiTaskTemplate,
  type ApiTeamCard,
  type ApiTeamDetail,
  type ApiTeamMember,
} from "@/lib/api-types";

interface TeamDetailProps {
  teamId: string;
  /** Página exclusiva de ADMIN e MENTOR; o escopo do mentor é aplicado pelo backend. */
  user: ApiSessionUser;
  backHref: string;
}

type Tab = "tarefas" | "entregas" | "historico" | "anotacoes";
type ShowToast = (kind: ToastMessage["kind"], text: string) => void;

const inputClass =
  "w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Hoje em AAAA-MM-DD no fuso do navegador (mínimo do campo de prazo). */
function todayIso() {
  return new Date().toLocaleDateString("sv-SE");
}

/**
 * RF-08 — detalhe da equipe para administrador e mentor: jornada (com as
 * etapas extras), tarefas, entregas, histórico e anotações internas, tudo
 * da API. Qualquer ação que mexa em etapa ou tarefa recarrega a equipe,
 * porque o status do funil é recalculado no backend.
 */
export default function TeamDetail({ teamId, user, backHref }: TeamDetailProps) {
  const [detail, setDetail] = useState<ApiTeamDetail | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("tarefas");
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Os setState ficam nos callbacks da promessa: nada muda antes de os três
  // dados chegarem, e a tela não pisca um estado intermediário.
  const load = useCallback(
    () =>
      Promise.all([api.team(teamId), api.tasks({ teamId }), api.notes(teamId)]).then(
        ([teamData, taskData, noteData]) => {
          setDetail(teamData);
          setTasks(taskData.data);
          setNotes(noteData.data);
          setError(null);
        },
        (err: unknown) => {
          setError(describeError(err, "Não foi possível carregar a equipe. A API está no ar?"));
        },
      ),
    [teamId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const showToast: ShowToast = useCallback((kind, text) => setToast({ kind, text }), []);

  if (!detail) {
    if (!error) return <TeamDetailSkeleton />;
    return (
      <div>
        <Header title="Equipe" userName={user.name} />
        <div className="p-6">
          <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <div className="animate-rise bg-card border border-card-border rounded-xl p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-3" />
            <p className="text-sm text-foreground">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { team, members, journey } = detail;
  const leader = members.find((member) => member.role === "LEADER");
  const others = members.filter((member) => member.role !== "LEADER");
  const canManage = user.role === "ADMIN" || user.role === "MENTOR";
  const submissionCount = tasks.reduce((sum, task) => sum + task.submissionCount, 0);

  const tabs = [
    { key: "tarefas", label: "Tarefas", icon: FileText, count: tasks.length },
    { key: "entregas", label: "Entregas", icon: Paperclip, count: submissionCount },
    { key: "historico", label: "Histórico", icon: History, count: detail.stageHistory.length },
    { key: "anotacoes", label: "Anotações", icon: MessageSquare, count: notes.length },
  ] as const;

  return (
    <div>
      <Header
        title={team.name}
        userName={user.name}
        subtitle={`${team.category.name} — ${team.leader?.name ?? "sem líder"}`}
      />

      <div className="p-6">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        {error && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            <span>{error}</span>
            <button type="button" onClick={() => void load()} className="font-medium underline">
              Tentar novamente
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <JourneyCard detail={detail} canManage={canManage} onChanged={load} onToast={showToast} />

            <div className="bg-card rounded-xl border border-card-border">
              <div role="tablist" className="flex border-b border-card-border overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      activeTab === tab.key
                        ? "border-primary text-primary"
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    <span className="text-xs bg-badge-muted-bg text-muted px-1.5 py-0.5 rounded-full">{tab.count}</span>
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeTab === "tarefas" && (
                  <TasksTab
                    team={team}
                    journey={journey}
                    tasks={tasks}
                    canManage={canManage}
                    onChanged={load}
                    onToast={showToast}
                  />
                )}
                {activeTab === "entregas" && <SubmissionsTab tasks={tasks} onToast={showToast} />}
                {activeTab === "historico" && <HistoryTab detail={detail} />}
                {activeTab === "anotacoes" && (
                  <NotesTab
                    teamId={team.id}
                    notes={notes}
                    onAdded={(note) => setNotes((prev) => [note, ...prev])}
                    onToast={showToast}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {leader && <LeaderCard leader={leader} />}

            {others.length > 0 && (
              <div className="bg-card rounded-xl border border-card-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Integrantes ({others.length})
                </h3>
                <div className="space-y-2">
                  {others.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-badge-muted-bg rounded-full flex items-center justify-center text-muted text-xs font-medium">
                        {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{member.name}</p>
                        <p className="text-xs text-muted-light truncate">{member.course ?? member.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <IdeaInfoCard team={team} />

            <ActionsCard
              team={team}
              journey={journey}
              isAdmin={user.role === "ADMIN"}
              onChanged={load}
              onToast={showToast}
            />
          </div>
        </div>
      </div>

      {toast && <Toast key={toast.text} kind={toast.kind} text={toast.text} onClose={() => setToast(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarefas (RF-11, RF-12, RF-15)
// ---------------------------------------------------------------------------

function TasksTab({
  team,
  journey,
  tasks,
  canManage,
  onChanged,
  onToast,
}: {
  team: ApiTeamCard;
  journey: ApiJourneyStage[];
  tasks: ApiTask[];
  canManage: boolean;
  onChanged: () => Promise<void>;
  onToast: ShowToast;
}) {
  const [showForm, setShowForm] = useState(false);
  const [reviewing, setReviewing] = useState<{ taskId: string; decision: "APPROVED" | "REJECTED" } | null>(null);
  const [comment, setComment] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const stageById = useMemo(() => new Map(journey.map((stage) => [stage.id, stage])), [journey]);

  // Na ordem da jornada (extras no lugar certo) e, dentro da etapa, pelo prazo.
  const sorted = useMemo(
    () =>
      [...tasks].sort(
        (a, b) =>
          (stageById.get(a.stageId)?.order ?? 0) - (stageById.get(b.stageId)?.order ?? 0) ||
          a.dueDate.localeCompare(b.dueDate),
      ),
    [tasks, stageById],
  );

  const currentStageId = (journey.find((stage) => stage.isCurrent) ?? journey[0])?.id ?? "";

  function startReview(taskId: string, decision: "APPROVED" | "REJECTED") {
    setReviewing({ taskId, decision });
    setComment(decision === "APPROVED" ? "Entrega aprovada." : "");
  }

  async function submitReview(task: ApiTask) {
    if (!reviewing || !comment.trim()) return;
    setBusyId(task.id);
    try {
      const result = await api.reviewTask(task.id, { decision: reviewing.decision, comment: comment.trim() });
      setReviewing(null);
      setComment("");
      onToast("ok", result.message);
      await onChanged();
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível registrar a avaliação."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {canManage && team.isActive && team.journeyStatus !== "REFERRED" && (
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setShowForm((open) => !open)}
            aria-expanded={showForm}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium"
          >
            <Plus className="w-4 h-4" /> Nova tarefa
          </button>
        </div>
      )}

      {showForm && (
        <NewTaskForm
          teamId={team.id}
          journey={journey}
          defaultStageId={currentStageId}
          onCancel={() => setShowForm(false)}
          onCreated={async (message) => {
            setShowForm(false);
            onToast("ok", message);
            await onChanged();
          }}
          onToast={onToast}
        />
      )}

      {sorted.length === 0 && <p className="text-sm text-muted-light text-center py-8">Nenhuma tarefa atribuída</p>}

      {sorted.map((task) => {
        const stage = stageById.get(task.stageId);
        const review = reviewing?.taskId === task.id ? reviewing : null;
        return (
          <div key={task.id} className="border border-card-border rounded-lg p-4 hover:bg-card-hover">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
                {task.description && <p className="text-xs text-muted mt-0.5">{task.description}</p>}
              </div>
              <TaskStatusBadge status={task.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-muted-light">
              <DueChip dueDate={task.dueDate} done={task.status === "APPROVED" || task.status === "SUBMITTED"} />
              <span className="inline-flex items-center gap-1">
                {stage?.isExtra && <Flag className="w-3 h-3 text-secondary-dark" />}
                {stage ? journeyStageLabel(stage) : `Etapa ${task.stage}`} — {task.stageName}
              </span>
              {task.isMandatory && <span className="font-medium text-muted">Obrigatória</span>}
              {task.submissionCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> {task.submissionCount}{" "}
                  {task.submissionCount === 1 ? "entrega" : "entregas"}
                </span>
              )}
            </div>

            {canManage && task.status === "SUBMITTED" && (
              <div className="mt-3">
                {review ? (
                  <div className="space-y-2">
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder={
                        review.decision === "APPROVED"
                          ? "Comentário para a equipe"
                          : "Descreva os ajustes necessários..."
                      }
                      rows={2}
                      className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void submitReview(task)}
                        disabled={!comment.trim() || busyId === task.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-white text-xs rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed ${
                          review.decision === "APPROVED" ? "bg-success" : "bg-accent"
                        }`}
                      >
                        {busyId === task.id && <Loader2 className="w-3 h-3 animate-spin" />}
                        {review.decision === "APPROVED" ? "Confirmar aprovação" : "Enviar solicitação"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReviewing(null);
                          setComment("");
                        }}
                        className="px-3 py-1 text-xs text-muted hover:text-foreground"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startReview(task.id, "APPROVED")}
                      className="px-3 py-1 bg-success text-white text-xs rounded-md hover:opacity-90"
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      onClick={() => startReview(task.id, "REJECTED")}
                      className="px-3 py-1 bg-accent text-white text-xs rounded-md hover:opacity-90"
                    >
                      Solicitar ajustes
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** RF-12 — a etapa pode ser qualquer uma da jornada da equipe, inclusive extra. */
function NewTaskForm({
  teamId,
  journey,
  defaultStageId,
  onCancel,
  onCreated,
  onToast,
}: {
  teamId: string;
  journey: ApiJourneyStage[];
  defaultStageId: string;
  onCancel: () => void;
  onCreated: (message: string) => Promise<void>;
  onToast: ShowToast;
}) {
  const [templates, setTemplates] = useState<ApiTaskTemplate[]>([]);
  const [form, setForm] = useState({
    templateId: "",
    title: "",
    description: "",
    stageId: defaultStageId,
    dueDate: "",
    isMandatory: true,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .taskTemplates()
      .then((result) => {
        if (!cancelled) setTemplates(result.data);
      })
      .catch(() => {
        // Sem modelos a tarefa ainda pode ser criada em branco.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const templatesByStage = useMemo(() => {
    const groups = new Map<string, ApiTaskTemplate[]>();
    for (const template of templates) {
      const key = `Etapa ${template.stage} — ${template.stageName}`;
      groups.set(key, [...(groups.get(key) ?? []), template]);
    }
    return [...groups];
  }, [templates]);

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      setForm((prev) => ({ ...prev, templateId: "" }));
      return;
    }
    const stage = journey.find((item) => item.number === template.stage);
    setForm((prev) => ({
      ...prev,
      templateId,
      title: template.title,
      description: template.description ?? "",
      stageId: stage?.id ?? prev.stageId,
      isMandatory: template.isMandatory,
    }));
  }

  const invalid = form.title.trim().length < 3 || !form.dueDate;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (invalid || busy) return;
    setBusy(true);
    try {
      const result = await api.createTask({
        teamId,
        templateId: form.templateId || undefined,
        stageId: form.stageId || undefined,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        dueDate: form.dueDate,
        isMandatory: form.isMandatory,
      });
      await onCreated(result.message);
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível criar a tarefa."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border-2 border-dashed border-primary/30 rounded-lg p-4 bg-highlight-bg mb-4">
      <h4 className="text-sm font-semibold text-foreground mb-3">Criar nova tarefa</h4>
      <div className="space-y-3">
        <div>
          <label htmlFor="task-template" className="text-xs text-muted mb-1 block">
            Usar modelo pré-configurado (opcional)
          </label>
          <select
            id="task-template"
            value={form.templateId}
            onChange={(event) => applyTemplate(event.target.value)}
            className={inputClass}
          >
            <option value="">Nenhum — criar em branco</option>
            {templatesByStage.map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                    {template.isMandatory ? " (obrigatória)" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <input
          type="text"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="Título da tarefa"
          maxLength={160}
          aria-label="Título da tarefa"
          className={inputClass}
        />
        <textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="Descrição e instruções..."
          rows={3}
          aria-label="Descrição da tarefa"
          className={`${inputClass} resize-none`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="task-stage" className="text-xs text-muted mb-1 block">
              Etapa relacionada
            </label>
            <select
              id="task-stage"
              value={form.stageId}
              onChange={(event) => setForm({ ...form, stageId: event.target.value })}
              className={inputClass}
            >
              {journey.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {journeyStageLabel(stage)} — {stage.name}
                  {stage.isCurrent ? " (atual)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="task-due" className="text-xs text-muted mb-1 block">
              Prazo de entrega
            </label>
            <input
              id="task-due"
              type="date"
              min={todayIso()}
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={form.isMandatory}
            onChange={(event) => setForm({ ...form, isMandatory: event.target.checked })}
            className="h-4 w-4 accent-primary"
          />
          Obrigatória — precisa estar aprovada para a equipe avançar de etapa
        </label>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted hover:text-foreground">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={invalid || busy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar tarefa
          </button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Entregas (RF-14, RF-16) — versões com os anexos de cada uma
// ---------------------------------------------------------------------------

function SubmissionsTab({ tasks, onToast }: { tasks: ApiTask[]; onToast: ShowToast }) {
  const withSubmissions = useMemo(() => tasks.filter((task) => task.submissionCount > 0), [tasks]);
  // `source` diz de qual lista de tarefas os detalhes vieram; `details` nulo = falhou.
  const [loaded, setLoaded] = useState<{ source: ApiTask[]; details: ApiTaskDetail[] | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(withSubmissions.map((task) => api.task(task.id).then((result) => result.task)))
      .then((details) => {
        if (!cancelled) setLoaded({ source: withSubmissions, details });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ source: withSubmissions, details: null });
      });
    return () => {
      cancelled = true;
    };
  }, [withSubmissions]);

  async function download(attachment: ApiAttachment) {
    try {
      await api.downloadAttachment(attachment.url, attachment.name);
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível baixar o arquivo."));
    }
  }

  if (withSubmissions.length === 0) {
    return <p className="text-sm text-muted-light text-center py-8">Nenhuma entrega recebida ainda</p>;
  }
  if (!loaded || loaded.source !== withSubmissions) {
    return (
      <p className="flex items-center justify-center gap-2 text-sm text-muted-light py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando entregas...
      </p>
    );
  }
  if (!loaded.details) {
    return <p className="text-sm text-danger text-center py-8">Não foi possível carregar as entregas.</p>;
  }

  return (
    <div>
      {loaded.details.map((task) => {
        const versions = [...task.submissions].sort((a, b) => b.version - a.version);
        return (
          <div key={task.id} className="mb-5 last:mb-0">
            <p className="text-xs font-medium text-muted mb-1">
              {task.title} <span className="font-normal text-muted-light">· {task.stageName}</span>
            </p>
            {versions.map((submission, index) => (
              <div key={submission.id} className="border-b border-divider py-3 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    Versão {submission.version}
                    {index === 0 && versions.length > 1 && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">atual</span>
                    )}
                  </span>
                  <span className="text-muted-light">
                    {formatDateTime(submission.submittedAt)}
                    {submission.submittedBy && ` · ${submission.submittedBy.name}`}
                  </span>
                </div>
                {submission.note && <p className="mt-1 text-xs text-muted">“{submission.note}”</p>}
                <ul className="mt-2 space-y-1.5">
                  {submission.attachments.map((attachment) => (
                    <li key={attachment.id}>
                      {attachment.type === "FILE" ? (
                        <button
                          type="button"
                          onClick={() => void download(attachment)}
                          className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary"
                        >
                          <FileText className="w-4 h-4 text-blue-500" />
                          {attachment.name}
                          <span className="text-xs text-muted-light">{formatSize(attachment.size)}</span>
                        </button>
                      ) : /^https?:\/\//i.test(attachment.url) ? (
                        // Link externo vindo do aluno: só http(s) vira link clicável.
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Link2 className="w-4 h-4" />
                          {attachment.name}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-sm text-muted">
                          <Link2 className="w-4 h-4" /> {attachment.name}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Histórico de etapas (RF-08, RF-09)
// ---------------------------------------------------------------------------

function HistoryTab({ detail }: { detail: ApiTeamDetail }) {
  const current = detail.journey.find((stage) => stage.isCurrent);

  if (detail.stageHistory.length === 0) {
    return <p className="text-sm text-muted-light text-center py-8">Nenhuma mudança de etapa registrada</p>;
  }

  return (
    <ol className="space-y-4">
      {detail.stageHistory.map((entry) => {
        const { Icon, tone, title } =
          entry.direction === "start"
            ? { Icon: Flag, tone: "bg-primary", title: `Início da jornada — ${entry.toStageName}` }
            : entry.direction === "advance"
              ? { Icon: ArrowRight, tone: "bg-success", title: `Avançou para ${entry.toStageName}` }
              : { Icon: Undo2, tone: "bg-accent", title: `Voltou para ${entry.toStageName}` };
        return (
          <li key={entry.id} className="flex items-start gap-3">
            <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center shrink-0 mt-0.5 ${tone}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {title}
                {entry.forced && (
                  <span className="ml-2 align-middle text-[10px] font-medium uppercase tracking-wide bg-warning/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                    avanço forçado
                  </span>
                )}
              </p>
              {entry.direction !== "start" && entry.fromStageName && (
                <p className="text-xs text-muted">de {entry.fromStageName}</p>
              )}
              {entry.reason && <p className="text-xs text-muted italic mt-0.5">“{entry.reason}”</p>}
              <p className="text-xs text-muted-light mt-0.5">
                {formatDateTime(entry.changedAt)}
                {entry.changedByName && ` · ${entry.changedByName}`}
              </p>
            </div>
          </li>
        );
      })}
      {current && detail.team.journeyStatus !== "REFERRED" && (
        <li className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full border-2 border-dashed border-primary text-primary flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {journeyStageLabel(current)} — {current.name}
            </p>
            <p className="text-xs text-muted-light">Em andamento</p>
          </div>
        </li>
      )}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Anotações internas (RF-10)
// ---------------------------------------------------------------------------

function NotesTab({
  teamId,
  notes,
  onAdded,
  onToast,
}: {
  teamId: string;
  notes: ApiNote[];
  onAdded: (note: ApiNote) => void;
  onToast: ShowToast;
}) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!content.trim() || busy) return;
    setBusy(true);
    try {
      const result = await api.addNote(teamId, content.trim());
      onAdded(result.note);
      setContent("");
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível salvar a anotação."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={3}
          placeholder="Escreva uma anotação interna (não visível ao aluno)..."
          aria-label="Nova anotação interna"
          className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={() => void add()}
            disabled={!content.trim() || busy}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Salvar anotação
          </button>
        </div>
      </div>
      {notes.length === 0 && <p className="text-sm text-muted-light text-center py-4">Nenhuma anotação</p>}
      {notes.map((note) => (
        <div key={note.id} className="border-l-2 border-primary/30 pl-4 py-3 mb-3">
          <p className="text-sm text-foreground whitespace-pre-line">{note.content}</p>
          <p className="text-xs text-muted-light mt-1">
            {note.author?.name ?? "Autor removido"} &middot; {formatDateTime(note.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coluna lateral
// ---------------------------------------------------------------------------

function LeaderCard({ leader }: { leader: ApiTeamMember }) {
  return (
    <div className="bg-card rounded-xl border border-card-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Líder da equipe</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
            {leader.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{leader.name}</p>
            <p className="text-xs text-muted">
              {[leader.course, leader.semester].filter(Boolean).join(" · ") || "Curso não informado"}
            </p>
          </div>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted break-all">
          <Mail className="w-3.5 h-3.5 shrink-0 text-muted-light" /> {leader.email}
        </p>
        {leader.phone && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Phone className="w-3.5 h-3.5 text-muted-light" /> {leader.phone}
          </p>
        )}
      </div>
    </div>
  );
}

function IdeaInfoCard({ team }: { team: ApiTeamCard }) {
  const rows = [
    { label: "Área", value: team.category.name },
    { label: "Estágio", value: IDEA_STAGE_LABELS[team.ideaStage] },
    { label: "Inscrito em", value: `${formatDate(team.createdAt)} (período ${team.period})` },
    {
      label: "Mentoria",
      value: team.mentors.length ? team.mentors.map((mentor) => mentor.name).join(", ") : "Sem mentor atribuído",
    },
    ...(team.howDidYouHear ? [{ label: "Como conheceu o InfoHub", value: team.howDidYouHear }] : []),
  ];

  return (
    <div className="bg-card rounded-xl border border-card-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">Informações da ideia</h3>
      <div className="space-y-3 text-sm">
        {rows.map((row) => (
          <div key={row.label}>
            <p className="text-xs text-muted-light mb-0.5">{row.label}</p>
            <p className="text-foreground">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Lembrete manual (RF-20) e encaminhamento ao InovAMF — este só a
 * coordenação faz, "depois das 6 etapas" (ou da última extra).
 */
function ActionsCard({
  team,
  journey,
  isAdmin,
  onChanged,
  onToast,
}: {
  team: ApiTeamCard;
  journey: ApiJourneyStage[];
  isAdmin: boolean;
  onChanged: () => Promise<void>;
  onToast: ShowToast;
}) {
  const [reminderOpen, setReminderOpen] = useState(false);
  const [subject, setSubject] = useState(`Lembrete — ${team.name}`);
  const [message, setMessage] = useState("");
  const [confirmRefer, setConfirmRefer] = useState(false);
  const [busy, setBusy] = useState(false);

  const ready = team.journeyStatus === "READY_FOR_INOVAMF";
  const referred = team.journeyStatus === "REFERRED";
  const last = journey[journey.length - 1];

  async function sendReminder(event: React.FormEvent) {
    event.preventDefault();
    if (subject.trim().length < 3 || message.trim().length < 3 || busy) return;
    setBusy(true);
    try {
      const result = await api.sendTeamReminder(team.id, { subject: subject.trim(), message: message.trim() });
      onToast("ok", result.message);
      setReminderOpen(false);
      setMessage("");
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível enviar o lembrete."));
    } finally {
      setBusy(false);
    }
  }

  async function refer() {
    setBusy(true);
    try {
      const result = await api.referTeam(team.id, !ready);
      onToast("ok", result.message);
      setConfirmRefer(false);
      await onChanged();
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível encaminhar a equipe."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-card rounded-xl border border-card-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">Ações</h3>
      <div className="space-y-2">
        {team.isActive &&
          (reminderOpen ? (
            <form onSubmit={sendReminder} className="space-y-2">
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={120}
                aria-label="Assunto do lembrete"
                className={inputClass}
              />
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={3}
                maxLength={5000}
                placeholder="Mensagem para todos os integrantes..."
                aria-label="Mensagem do lembrete"
                className={`${inputClass} resize-none`}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReminderOpen(false)}
                  className="px-3 py-1.5 text-sm text-muted hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={subject.trim().length < 3 || message.trim().length < 3 || busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark disabled:opacity-40"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Enviar
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setReminderOpen(true)}
              className="w-full px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors"
            >
              Enviar lembrete
            </button>
          ))}

        {referred ? (
          <p className="flex items-center gap-2 text-xs text-muted pt-1">
            <Rocket className="w-4 h-4 text-success" />
            Encaminhada ao InovAMF{team.referredAt ? ` em ${formatDate(team.referredAt)}` : ""}.
          </p>
        ) : isAdmin && team.isActive ? (
          confirmRefer ? (
            <div className="animate-fade-in rounded-lg border border-card-border p-3 text-xs">
              <p className="text-foreground">
                {ready
                  ? `Encaminhar a equipe ${team.name} ao InovAMF? A jornada no InfoHub fica encerrada.`
                  : `A equipe ainda não concluiu a última etapa (${last?.name ?? "—"}) com todos os entregáveis aprovados. Encaminhar mesmo assim?`}
              </p>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmRefer(false)}
                  className="px-2.5 py-1 text-muted hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void refer()}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-md bg-success px-2.5 py-1 font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                  Encaminhar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRefer(true)}
              className={`w-full px-4 py-2 text-sm rounded-lg transition-colors ${
                ready
                  ? "bg-success text-white hover:opacity-90"
                  : "border border-input-border text-muted hover:bg-hover-bg hover:text-foreground"
              }`}
            >
              Encaminhar ao InovAMF
            </button>
          )
        ) : ready ? (
          <p className="text-xs text-success pt-1">Equipe pronta para o InovAMF — a coordenação faz o encaminhamento.</p>
        ) : null}
      </div>
    </div>
  );
}

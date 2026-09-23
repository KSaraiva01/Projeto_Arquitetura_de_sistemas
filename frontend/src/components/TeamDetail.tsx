"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Flag,
  History,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Rocket,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import DueChip from "./DueChip";
import FinalDeliverablesCard from "./FinalDeliverablesCard";
import Header from "./Header";
import JourneyCard from "./JourneyCard";
import { TeamDetailSkeleton } from "./Skeleton";
import { TaskStatusBadge } from "./StatusBadge";
import { SubmissionVersions } from "./Submissions";
import TaskEditor from "./TaskEditor";
import TeamPeopleCard from "./TeamPeopleCard";
import Toast, { type ToastMessage } from "./Toast";
import { api, describeError } from "@/lib/api";
import {
  IDEA_STAGE_LABELS,
  journeyStageLabel,
  type ApiJourneyStage,
  type ApiNote,
  type ApiSessionUser,
  type ApiTask,
  type ApiTaskDetail,
  type ApiTaskTemplate,
  type ApiTeamCard,
  type ApiTeamDetail,
} from "@/lib/api-types";
import { formatDate, formatDateTime, todayIso } from "@/lib/format";

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

/** Lembretes que o mentor pode marcar ao criar a tarefa (RF-17); 3 e 1 dia antes vêm marcados. */
const REMINDER_CHOICES = [
  { days: 7, label: "7 dias antes" },
  { days: 3, label: "3 dias antes" },
  { days: 1, label: "1 dia antes" },
  { days: 0, label: "No dia" },
];

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
  const canManage = user.role === "ADMIN" || user.role === "MENTOR";
  const submissionCount = tasks.reduce((sum, task) => sum + task.submissionCount, 0);

  /** RN-02 — cria de uma vez as tarefas dos entregáveis finais que ainda não existem. */
  async function createMissingDeliverables(dueDate: string, templateIds: string[]) {
    let created = 0;
    try {
      for (const templateId of templateIds) {
        await api.createTask({ teamId: team.id, templateId, dueDate, reminderDaysBefore: [3, 1] });
        created += 1;
      }
      showToast("ok", `${created} ${created === 1 ? "tarefa criada" : "tarefas criadas"} e integrantes avisados por e-mail.`);
    } catch (err) {
      showToast("erro", describeError(err, "Não foi possível criar todas as tarefas."));
    } finally {
      await load();
    }
  }

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
                    canEdit={(note) => user.role === "ADMIN" || note.author?.id === user.id}
                    onAdded={(note) => setNotes((prev) => [note, ...prev])}
                    onUpdated={(note) => setNotes((prev) => prev.map((item) => (item.id === note.id ? note : item)))}
                    onDeleted={(noteId) => setNotes((prev) => prev.filter((item) => item.id !== noteId))}
                    onToast={showToast}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <TeamPeopleCard
              team={team}
              members={members}
              isAdmin={user.role === "ADMIN"}
              editable={canManage && team.isActive}
              onChanged={load}
              onToast={showToast}
            />

            <IdeaInfoCard team={team} />

            <FinalDeliverablesCard
              deliverables={detail.finalDeliverables}
              onCreateMissing={
                canManage && team.isActive && team.journeyStatus !== "REFERRED" ? createMissingDeliverables : undefined
              }
            />

            <ActionsCard
              team={team}
              journey={journey}
              isAdmin={user.role === "ADMIN"}
              backHref={backHref}
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const editable = canManage && team.isActive && team.journeyStatus !== "REFERRED";

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
      {editable && (
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
                {task.description && <p className="text-xs text-muted mt-0.5 whitespace-pre-line">{task.description}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <TaskStatusBadge status={task.status} />
                {editable && editingId !== task.id && (
                  <button
                    type="button"
                    onClick={() => setEditingId(task.id)}
                    title="Editar tarefa, prazo e lembretes"
                    aria-label={`Editar a tarefa ${task.title}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-light hover:bg-hover-bg hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            {editingId === task.id && (
              <TaskEditor task={task} onClose={() => setEditingId(null)} onChanged={onChanged} onToast={onToast} />
            )}
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

            {canManage && team.isActive && task.status === "SUBMITTED" && (
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
  const [reminderDays, setReminderDays] = useState<number[]>([3, 1]);
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
        reminderDaysBefore: reminderDays,
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
        <fieldset>
          <legend className="text-xs text-muted mb-1.5">Lembretes por e-mail aos integrantes (às 9h)</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {REMINDER_CHOICES.map((choice) => (
              <label key={choice.days} className="flex items-center gap-1.5 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={reminderDays.includes(choice.days)}
                  onChange={(event) =>
                    setReminderDays((current) =>
                      event.target.checked ? [...current, choice.days] : current.filter((days) => days !== choice.days),
                    )
                  }
                  className="h-4 w-4 accent-primary"
                />
                {choice.label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-light">
            Dá para ajustar depois, editando a tarefa. Lembretes cuja data já passou são ignorados.
          </p>
        </fieldset>
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
      {loaded.details.map((task) => (
        <div key={task.id} className="mb-5 last:mb-0">
          <p className="text-xs font-medium text-muted mb-2">
            {task.title} <span className="font-normal text-muted-light">· {task.stageName}</span>
          </p>
          <SubmissionVersions submissions={task.submissions} onError={(message) => onToast("erro", message)} />
        </div>
      ))}
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
  canEdit,
  onAdded,
  onUpdated,
  onDeleted,
  onToast,
}: {
  teamId: string;
  notes: ApiNote[];
  /** Só o autor (ou um admin) edita e exclui — a API confere de novo. */
  canEdit: (note: ApiNote) => boolean;
  onAdded: (note: ApiNote) => void;
  onUpdated: (note: ApiNote) => void;
  onDeleted: (noteId: string) => void;
  onToast: ShowToast;
}) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const [busyNoteId, setBusyNoteId] = useState<string | null>(null);

  async function saveEdit() {
    if (!editing || !editing.content.trim()) return;
    setBusyNoteId(editing.id);
    try {
      const result = await api.updateNote(teamId, editing.id, editing.content.trim());
      onUpdated(result.note);
      setEditing(null);
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível salvar a anotação."));
    } finally {
      setBusyNoteId(null);
    }
  }

  async function remove(noteId: string) {
    setBusyNoteId(noteId);
    try {
      await api.deleteNote(teamId, noteId);
      onDeleted(noteId);
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível excluir a anotação."));
    } finally {
      setBusyNoteId(null);
    }
  }

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
        <div key={note.id} className="group border-l-2 border-primary/30 pl-4 py-3 mb-3">
          {editing?.id === note.id ? (
            <div className="space-y-2">
              <textarea
                value={editing.content}
                onChange={(event) => setEditing({ id: note.id, content: event.target.value })}
                rows={3}
                aria-label="Editar anotação"
                className={`${inputClass} resize-none`}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className="px-3 py-1 text-xs text-muted hover:text-foreground">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  disabled={!editing.content.trim() || busyNoteId === note.id}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs text-white hover:bg-primary-dark disabled:opacity-40"
                >
                  {busyNoteId === note.id && <Loader2 className="h-3 w-3 animate-spin" />}
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-foreground whitespace-pre-line">{note.content}</p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-light">
                  {note.author?.name ?? "Autor removido"} &middot; {formatDateTime(note.createdAt)}
                  {note.updatedAt !== note.createdAt && " · editada"}
                </p>
                {canEdit(note) && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing({ id: note.id, content: note.content })}
                      aria-label="Editar anotação"
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-light hover:bg-hover-bg hover:text-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(note.id)}
                      disabled={busyNoteId === note.id}
                      aria-label="Excluir anotação"
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-light hover:bg-hover-bg hover:text-danger disabled:opacity-40"
                    >
                      {busyNoteId === note.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coluna lateral
// ---------------------------------------------------------------------------

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
 * Lembrete manual (RF-20), encaminhamento ao InovAMF — este só a
 * coordenação faz, "depois das 6 etapas" (ou da última extra) — e a
 * exclusão lógica da equipe (Q4, só admin).
 */
function ActionsCard({
  team,
  journey,
  isAdmin,
  backHref,
  onChanged,
  onToast,
}: {
  team: ApiTeamCard;
  journey: ApiJourneyStage[];
  isAdmin: boolean;
  backHref: string;
  onChanged: () => Promise<void>;
  onToast: ShowToast;
}) {
  const router = useRouter();
  const [reminderOpen, setReminderOpen] = useState(false);
  const [subject, setSubject] = useState(`Lembrete — ${team.name}`);
  const [message, setMessage] = useState("");
  const [confirmRefer, setConfirmRefer] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function deleteTeam() {
    setBusy(true);
    try {
      await api.deleteTeam(team.id);
      setConfirmDelete(false);
      router.push(backHref);
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível excluir a equipe."));
      setBusy(false);
    }
  }

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

        {!team.isActive && (
          <p className="text-xs text-muted pt-1">Equipe excluída: fica só para consulta da coordenação.</p>
        )}

        {isAdmin && team.isActive && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm text-danger transition-colors hover:bg-danger/5"
          >
            <Trash2 className="h-4 w-4" /> Excluir equipe
          </button>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={`Excluir a equipe ${team.name}?`}
          description={
            <>
              A equipe sai das listas, do quadro e dos relatórios, e os integrantes ficam livres para entrar em outra
              equipe. O histórico (tarefas, entregas, avaliações) é mantido para a coordenação — é uma exclusão lógica.
            </>
          }
          confirmLabel="Excluir equipe"
          busy={busy}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void deleteTeam()}
        />
      )}
    </div>
  );
}

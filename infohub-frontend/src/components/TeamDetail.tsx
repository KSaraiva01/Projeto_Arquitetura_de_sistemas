"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import StatusBadge, { TeamStatusBadge } from "@/components/StatusBadge";
import StagePipeline from "@/components/StagePipeline";
import { mockTaskTemplates } from "@/lib/mock-data";
import {
  STAGE_NAMES,
  STAGE_DESCRIPTIONS,
  IDEA_STAGE_LABELS,
  JourneyStage,
  Task,
  MentorNote,
  Team,
  StageHistoryEntry,
} from "@/lib/types";
import {
  ArrowLeft,
  Mail,
  Phone,
  Users,
  FileText,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Calendar,
  Paperclip,
  Plus,
  Send,
  History,
  CheckCircle2,
} from "lucide-react";

interface TeamDetailProps {
  team: Team;
  initialTasks: Task[];
  initialNotes: MentorNote[];
  authorName: string;
  backHref: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function TeamDetail({ team, initialTasks, initialNotes, authorName, backHref }: TeamDetailProps) {
  const [activeTab, setActiveTab] = useState<"tarefas" | "arquivos" | "historico" | "anotacoes">("tarefas");
  const [currentStage, setCurrentStage] = useState<JourneyStage>(team.currentStage);
  const [stageHistory, setStageHistory] = useState<StageHistoryEntry[]>(team.stageHistory);
  const [teamStatus, setTeamStatus] = useState(team.status);

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [notes, setNotes] = useState<MentorNote[]>(initialNotes);
  const [newNote, setNewNote] = useState("");

  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", stage: currentStage, dueDate: "", templateId: "" });

  const [adjustingTaskId, setAdjustingTaskId] = useState<string | null>(null);
  const [adjustComment, setAdjustComment] = useState("");

  const allFiles = tasks.flatMap((t) => t.files);

  function advanceStage() {
    if (currentStage >= 6) return;
    setStageHistory((prev) => [...prev, { stage: currentStage, completedAt: todayStr() }]);
    setCurrentStage((prev) => (prev + 1) as JourneyStage);
  }

  function retreatStage() {
    if (currentStage <= 1) return;
    const prevStage = (currentStage - 1) as JourneyStage;
    setStageHistory((prev) => prev.filter((h) => h.stage !== prevStage));
    setCurrentStage(prevStage);
  }

  function handleTemplateSelect(templateId: string) {
    const template = mockTaskTemplates.find((t) => t.id === templateId);
    if (!template) {
      setNewTask((prev) => ({ ...prev, templateId: "" }));
      return;
    }
    setNewTask((prev) => ({
      ...prev,
      templateId,
      title: template.title,
      description: template.description,
      stage: template.stage,
    }));
  }

  function handleCreateTask() {
    if (!newTask.title || !newTask.dueDate) return;
    const task: Task = {
      id: `task-${Date.now()}`,
      teamId: team.id,
      title: newTask.title,
      description: newTask.description,
      stage: newTask.stage,
      dueDate: newTask.dueDate,
      status: "pendente",
      files: [],
      createdAt: todayStr(),
      templateId: newTask.templateId || undefined,
    };
    setTasks((prev) => [task, ...prev]);
    setNewTask({ title: "", description: "", stage: currentStage, dueDate: "", templateId: "" });
    setShowNewTask(false);
  }

  function handleApprove(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "aprovada" } : t)));
  }

  function handleRequestChanges(taskId: string) {
    if (!adjustComment.trim()) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "reprovada", adminComment: adjustComment } : t))
    );
    setAdjustingTaskId(null);
    setAdjustComment("");
  }

  function handleAddNote() {
    if (!newNote.trim()) return;
    setNotes((prev) => [
      { id: `note-${Date.now()}`, teamId: team.id, authorName, content: newNote, createdAt: todayStr() },
      ...prev,
    ]);
    setNewNote("");
  }

  const filesByTask = tasks
    .filter((t) => t.files.length > 0)
    .map((t) => ({
      taskId: t.id,
      taskTitle: t.title,
      versions: [...t.files].sort((a, b) => b.version - a.version),
    }));

  return (
    <div>
      <Header title={team.ideaName} userName={authorName} subtitle={`${team.area} — ${team.leader.name}`} />

      <div className="p-6">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-xl border border-card-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">Progresso da jornada</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={retreatStage}
                    disabled={currentStage === 1}
                    title="Retroceder etapa"
                    className="p-1.5 border border-input-border rounded-lg text-muted hover:bg-hover-bg disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={advanceStage}
                    disabled={currentStage === 6}
                    title="Avançar etapa"
                    className="p-1.5 border border-input-border rounded-lg text-muted hover:bg-hover-bg disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <TeamStatusBadge status={teamStatus} />
                </div>
              </div>
              <StagePipeline currentStage={currentStage} />
              <div className="mt-4 bg-highlight-bg rounded-lg p-3">
                <p className="text-xs text-muted">
                  <span className="font-semibold text-foreground">
                    Etapa {currentStage} — {STAGE_NAMES[currentStage]}:
                  </span>{" "}
                  {STAGE_DESCRIPTIONS[currentStage]}
                </p>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-card-border">
              <div className="flex border-b border-card-border overflow-x-auto">
                {(
                  [
                    { key: "tarefas", label: "Tarefas", icon: FileText, count: tasks.length },
                    { key: "arquivos", label: "Arquivos", icon: Paperclip, count: allFiles.length },
                    { key: "historico", label: "Histórico", icon: History, count: stageHistory.length },
                    { key: "anotacoes", label: "Anotações", icon: MessageSquare, count: notes.length },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
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
                  <div className="space-y-3">
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => setShowNewTask((v) => !v)}
                        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium"
                      >
                        <Plus className="w-4 h-4" /> Nova tarefa
                      </button>
                    </div>

                    {showNewTask && (
                      <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 bg-highlight-bg mb-4">
                        <h4 className="text-sm font-semibold text-foreground mb-3">Criar nova tarefa</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-muted mb-1 block">Usar modelo pré-configurado (opcional)</label>
                            <select
                              value={newTask.templateId}
                              onChange={(e) => handleTemplateSelect(e.target.value)}
                              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                              <option value="">Nenhum — criar em branco</option>
                              {mockTaskTemplates.map((tpl) => (
                                <option key={tpl.id} value={tpl.id}>
                                  Etapa {tpl.stage} — {tpl.title}
                                  {tpl.mandatory ? " (obrigatória)" : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          <input
                            type="text"
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            placeholder="Título da tarefa"
                            className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <textarea
                            value={newTask.description}
                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                            placeholder="Descrição e instruções..."
                            rows={3}
                            className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted mb-1 block">Etapa relacionada</label>
                              <select
                                value={newTask.stage}
                                onChange={(e) => setNewTask({ ...newTask, stage: Number(e.target.value) as JourneyStage })}
                                className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                              >
                                {([1, 2, 3, 4, 5, 6] as JourneyStage[]).map((s) => (
                                  <option key={s} value={s}>
                                    Etapa {s} — {STAGE_NAMES[s]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-muted mb-1 block">Prazo de entrega</label>
                              <input
                                type="date"
                                value={newTask.dueDate}
                                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                                className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowNewTask(false)} className="px-4 py-2 text-sm text-muted hover:text-foreground">
                              Cancelar
                            </button>
                            <button
                              onClick={handleCreateTask}
                              disabled={!newTask.title || !newTask.dueDate}
                              className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Criar tarefa
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {tasks.length === 0 && <p className="text-sm text-muted-light text-center py-8">Nenhuma tarefa atribuída</p>}
                    {tasks.map((task) => (
                      <div key={task.id} className="border border-card-border rounded-lg p-4 hover:bg-card-hover">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
                            <p className="text-xs text-muted mt-0.5">{task.description}</p>
                          </div>
                          <StatusBadge status={task.status} />
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-light">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Prazo: {task.dueDate}
                          </span>
                          <span>Etapa {task.stage}</span>
                          {task.files.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Paperclip className="w-3 h-3" /> {task.files.length} arquivo(s)
                            </span>
                          )}
                        </div>

                        {task.adminComment && task.status === "reprovada" && (
                          <div className="bg-orange-500/10 rounded-lg p-3 mt-3">
                            <p className="text-xs text-orange-700 dark:text-orange-400">
                              <span className="font-medium">Ajustes solicitados:</span> {task.adminComment}
                            </p>
                          </div>
                        )}

                        {task.status === "entregue" && (
                          <div className="mt-3">
                            {adjustingTaskId === task.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={adjustComment}
                                  onChange={(e) => setAdjustComment(e.target.value)}
                                  placeholder="Descreva os ajustes necessários..."
                                  rows={2}
                                  className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleRequestChanges(task.id)}
                                    disabled={!adjustComment.trim()}
                                    className="px-3 py-1 bg-accent text-white text-xs rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    Enviar solicitação
                                  </button>
                                  <button
                                    onClick={() => {
                                      setAdjustingTaskId(null);
                                      setAdjustComment("");
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
                                  onClick={() => handleApprove(task.id)}
                                  className="px-3 py-1 bg-success text-white text-xs rounded-md hover:opacity-90"
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => setAdjustingTaskId(task.id)}
                                  className="px-3 py-1 bg-accent text-white text-xs rounded-md hover:opacity-90"
                                >
                                  Solicitar ajustes
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "arquivos" && (
                  <div>
                    {filesByTask.length === 0 && <p className="text-sm text-muted-light text-center py-8">Nenhum arquivo enviado</p>}
                    {filesByTask.map((group) => (
                      <div key={group.taskId} className="mb-4 last:mb-0">
                        <p className="text-xs font-medium text-muted mb-2">{group.taskTitle}</p>
                        {group.versions.map((file, idx) => (
                          <div key={file.id} className="flex items-center justify-between border-b border-divider py-3 last:border-0">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                <FileText className="w-4 h-4 text-blue-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                                  {file.name}
                                  {idx === 0 && group.versions.length > 1 && (
                                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">atual</span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-light">
                                  v{file.version} &middot; {file.size}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-muted-light">{file.uploadedAt}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "historico" && (
                  <div>
                    {stageHistory.length === 0 && (
                      <p className="text-sm text-muted-light text-center py-8">Nenhuma etapa concluída ainda</p>
                    )}
                    <div className="space-y-4">
                      {[...stageHistory]
                        .sort((a, b) => a.stage - b.stage)
                        .map((entry) => (
                          <div key={entry.stage} className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-success text-white flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                Etapa {entry.stage} — {STAGE_NAMES[entry.stage]}
                              </p>
                              <p className="text-xs text-muted-light">Concluída em {entry.completedAt}</p>
                            </div>
                          </div>
                        ))}
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                          {currentStage}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Etapa {currentStage} — {STAGE_NAMES[currentStage]}
                          </p>
                          <p className="text-xs text-muted-light">Em andamento</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "anotacoes" && (
                  <div>
                    <div className="mb-4">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={3}
                        placeholder="Escreva uma anotação interna (não visível ao aluno)..."
                        className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={handleAddNote}
                          disabled={!newNote.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Send className="w-3.5 h-3.5" /> Salvar anotação
                        </button>
                      </div>
                    </div>
                    {notes.length === 0 && <p className="text-sm text-muted-light text-center py-4">Nenhuma anotação</p>}
                    {notes.map((note) => (
                      <div key={note.id} className="border-l-2 border-primary/30 pl-4 py-3 mb-3">
                        <p className="text-sm text-foreground">{note.content}</p>
                        <p className="text-xs text-muted-light mt-1">
                          {note.authorName} &middot; {note.createdAt}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-card-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Líder da equipe</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                    {team.leader.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{team.leader.name}</p>
                    <p className="text-xs text-muted">
                      {team.leader.course} &middot; {team.leader.semester}
                    </p>
                  </div>
                </div>
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Mail className="w-3.5 h-3.5 text-muted-light" /> {team.leader.email}
                </p>
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Phone className="w-3.5 h-3.5 text-muted-light" /> {team.leader.phone}
                </p>
              </div>
            </div>

            {team.members.length > 0 && (
              <div className="bg-card rounded-xl border border-card-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Integrantes ({team.members.length})
                </h3>
                <div className="space-y-2">
                  {team.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-badge-muted-bg rounded-full flex items-center justify-center text-muted text-xs font-medium">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-light">{m.course}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card rounded-xl border border-card-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Informações da ideia</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-light mb-0.5">Área</p>
                  <p className="text-foreground">{team.area}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-light mb-0.5">Estágio</p>
                  <p className="text-foreground">{IDEA_STAGE_LABELS[team.ideaStage]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-light mb-0.5">Inscrito em</p>
                  <p className="text-foreground">{team.createdAt}</p>
                </div>
                {team.howDidYouHear && (
                  <div>
                    <p className="text-xs text-muted-light mb-0.5">Como conheceu o InfoHub</p>
                    <p className="text-foreground">{team.howDidYouHear}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-card-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Ações</h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors">
                  Enviar lembrete
                </button>
                {currentStage === 6 && teamStatus === "ativa" && (
                  <button
                    onClick={() => setTeamStatus("pronta_inovamf")}
                    className="w-full px-4 py-2 bg-success text-white text-sm rounded-lg hover:opacity-90 transition-colors"
                  >
                    Marcar como pronta para InovAMF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

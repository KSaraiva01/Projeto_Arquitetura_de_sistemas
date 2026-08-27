"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import StatusBadge, { TeamStatusBadge } from "@/components/StatusBadge";
import StagePipeline from "@/components/StagePipeline";
import { mockTeams, getTasksByTeam, getNotesByTeam } from "@/lib/mock-data";
import { STAGE_NAMES, STAGE_DESCRIPTIONS, IDEA_STAGE_LABELS } from "@/lib/types";
import {
  ArrowLeft,
  Mail,
  Users,
  FileText,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Calendar,
  Paperclip,
  Plus,
  Send,
} from "lucide-react";

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const team = mockTeams.find((t) => t.id === id);
  const tasks = team ? getTasksByTeam(team.id) : [];
  const notes = team ? getNotesByTeam(team.id) : [];

  const [activeTab, setActiveTab] = useState<"tarefas" | "arquivos" | "anotacoes">("tarefas");
  const [newNote, setNewNote] = useState("");

  if (!team) {
    return (
      <div>
        <Header title="Equipe não encontrada" userName="Prof. Carlos Silva" />
        <div className="p-6">
          <p className="text-muted">A equipe solicitada não foi encontrada.</p>
          <Link href="/admin" className="text-primary text-sm mt-2 inline-block">Voltar ao dashboard</Link>
        </div>
      </div>
    );
  }

  const allFiles = tasks.flatMap((t) => t.files.map((f) => ({ ...f, taskTitle: t.title })));

  return (
    <div>
      <Header title={team.ideaName} userName="Prof. Carlos Silva" subtitle={`${team.area} — ${team.leader.name}`} />

      <div className="p-6">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-xl border border-card-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">Progresso da jornada</h2>
                <div className="flex items-center gap-2">
                  <button className="p-1.5 border border-input-border rounded-lg text-muted hover:bg-hover-bg disabled:opacity-30" disabled={team.currentStage === 1}>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 border border-input-border rounded-lg text-muted hover:bg-hover-bg disabled:opacity-30" disabled={team.currentStage === 6}>
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <TeamStatusBadge status={team.status} />
                </div>
              </div>
              <StagePipeline currentStage={team.currentStage} />
              <div className="mt-4 bg-highlight-bg rounded-lg p-3">
                <p className="text-xs text-muted">
                  <span className="font-semibold text-foreground">Etapa {team.currentStage} — {STAGE_NAMES[team.currentStage]}:</span>{" "}
                  {STAGE_DESCRIPTIONS[team.currentStage]}
                </p>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-card-border">
              <div className="flex border-b border-card-border">
                {([
                  { key: "tarefas", label: "Tarefas", icon: FileText, count: tasks.length },
                  { key: "arquivos", label: "Arquivos", icon: Paperclip, count: allFiles.length },
                  { key: "anotacoes", label: "Anotações", icon: MessageSquare, count: notes.length },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
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
                      <button className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium">
                        <Plus className="w-4 h-4" /> Nova tarefa
                      </button>
                    </div>
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
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Prazo: {task.dueDate}</span>
                          <span>Etapa {task.stage}</span>
                          {task.files.length > 0 && (
                            <span className="flex items-center gap-1"><Paperclip className="w-3 h-3" /> {task.files.length} arquivo(s)</span>
                          )}
                        </div>
                        {task.status === "entregue" && (
                          <div className="flex gap-2 mt-3">
                            <button className="px-3 py-1 bg-success text-white text-xs rounded-md hover:opacity-90">Aprovar</button>
                            <button className="px-3 py-1 bg-accent text-white text-xs rounded-md hover:opacity-90">Solicitar ajustes</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "arquivos" && (
                  <div>
                    {allFiles.length === 0 && <p className="text-sm text-muted-light text-center py-8">Nenhum arquivo enviado</p>}
                    {allFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between border-b border-divider py-3 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-light">{file.taskTitle} &middot; v{file.version} &middot; {file.size}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-light">{file.uploadedAt}</span>
                      </div>
                    ))}
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
                        <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark">
                          <Send className="w-3.5 h-3.5" /> Salvar anotação
                        </button>
                      </div>
                    </div>
                    {notes.length === 0 && <p className="text-sm text-muted-light text-center py-4">Nenhuma anotação</p>}
                    {notes.map((note) => (
                      <div key={note.id} className="border-l-2 border-primary/30 pl-4 py-3 mb-3">
                        <p className="text-sm text-foreground">{note.content}</p>
                        <p className="text-xs text-muted-light mt-1">{note.authorName} &middot; {note.createdAt}</p>
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
                    <p className="text-xs text-muted">{team.leader.course}</p>
                  </div>
                </div>
                <p className="flex items-center gap-2 text-sm text-muted"><Mail className="w-3.5 h-3.5 text-muted-light" /> {team.leader.email}</p>
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
                <div><p className="text-xs text-muted-light mb-0.5">Área</p><p className="text-foreground">{team.area}</p></div>
                <div><p className="text-xs text-muted-light mb-0.5">Estágio</p><p className="text-foreground">{IDEA_STAGE_LABELS[team.ideaStage]}</p></div>
                <div><p className="text-xs text-muted-light mb-0.5">Inscrito em</p><p className="text-foreground">{team.createdAt}</p></div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-card-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Ações</h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors">
                  Enviar lembrete
                </button>
                {team.currentStage === 6 && team.status === "ativa" && (
                  <button className="w-full px-4 py-2 bg-success text-white text-sm rounded-lg hover:opacity-90 transition-colors">
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

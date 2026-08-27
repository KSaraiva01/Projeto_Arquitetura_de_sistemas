"use client";

import Header from "@/components/Header";
import StagePipeline from "@/components/StagePipeline";
import StatusBadge from "@/components/StatusBadge";
import { mockTeams, getTasksByTeam } from "@/lib/mock-data";
import { STAGE_NAMES, STAGE_DESCRIPTIONS, STAGE_DELIVERABLES, IDEA_STAGE_LABELS } from "@/lib/types";
import { Calendar, FileText, Users, Lightbulb, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function AlunoDashboard() {
  const team = mockTeams[0];
  const tasks = getTasksByTeam(team.id);
  const pendingTasks = tasks.filter((t) => t.status === "pendente" || t.status === "em_andamento" || t.status === "atrasada");
  const completedTasks = tasks.filter((t) => t.status === "aprovada");

  return (
    <div>
      <Header title="Minha Jornada" userName={team.leader.name} subtitle={`Equipe ${team.ideaName}`} />

      <div className="p-6">
        <div className="bg-card rounded-xl border border-card-border p-6 mb-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Progresso da jornada</h2>
          <StagePipeline currentStage={team.currentStage} />
          <div className="mt-4 bg-highlight-bg rounded-lg p-4">
            <p className="text-sm font-semibold text-primary mb-1">
              Etapa {team.currentStage} — {STAGE_NAMES[team.currentStage]}
            </p>
            <p className="text-sm text-muted">{STAGE_DESCRIPTIONS[team.currentStage]}</p>
            <p className="text-xs text-muted-light mt-2">
              Entregável esperado: {STAGE_DELIVERABLES[team.currentStage]}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-xl border border-card-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Tarefas pendentes ({pendingTasks.length})
                </h3>
                <Link href="/aluno/tarefas" className="text-sm text-primary hover:text-primary-dark">
                  Ver todas
                </Link>
              </div>
              {pendingTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
                  <p className="text-sm text-muted">Todas as tarefas estão em dia!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingTasks.map((task) => (
                    <div key={task.id} className="border border-card-border rounded-lg p-4 hover:bg-card-hover transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
                          <p className="text-xs text-muted mt-0.5">{task.description}</p>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="flex items-center gap-1 text-xs text-muted-light">
                          <Calendar className="w-3 h-3" /> Prazo: {task.dueDate}
                        </span>
                      </div>
                      <div className="mt-3">
                        <Link
                          href="/aluno/tarefas"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs rounded-md hover:bg-primary-dark"
                        >
                          <FileText className="w-3 h-3" /> Enviar entrega
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {completedTasks.length > 0 && (
              <div className="bg-card rounded-xl border border-card-border p-6">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-success" />
                  Tarefas concluídas ({completedTasks.length})
                </h3>
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between py-2 border-b border-divider last:border-0">
                      <div>
                        <p className="text-sm text-foreground">{task.title}</p>
                        <p className="text-xs text-muted-light">Entregue em {task.files[0]?.uploadedAt ?? task.dueDate}</p>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-card-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" /> Sobre o projeto
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-light mb-0.5">Nome</p>
                  <p className="text-foreground font-medium">{team.ideaName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-light mb-0.5">Descrição</p>
                  <p className="text-muted text-xs">{team.description}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-light mb-0.5">Área</p>
                  <p className="text-foreground">{team.area}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-light mb-0.5">Estágio</p>
                  <p className="text-foreground">{IDEA_STAGE_LABELS[team.ideaStage]}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-card-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Equipe
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {team.leader.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{team.leader.name} <span className="text-xs text-primary">(líder)</span></p>
                    <p className="text-xs text-muted-light">{team.leader.course}</p>
                  </div>
                </div>
                {team.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-badge-muted-bg rounded-full flex items-center justify-center text-muted text-xs font-medium">
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
          </div>
        </div>
      </div>
    </div>
  );
}

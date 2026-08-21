"use client";

import Header from "@/components/Header";
import StagePipeline from "@/components/StagePipeline";
import StatusBadge from "@/components/StatusBadge";
import { mockTeams, getTasksByTeam, getMentorName } from "@/lib/mock-data";
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
        {/* Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Progresso da jornada</h2>
          <StagePipeline currentStage={team.currentStage} />
          <div className="mt-4 bg-primary-light rounded-lg p-4">
            <p className="text-sm font-semibold text-primary mb-1">
              Etapa {team.currentStage} — {STAGE_NAMES[team.currentStage]}
            </p>
            <p className="text-sm text-gray-600">{STAGE_DESCRIPTIONS[team.currentStage]}</p>
            <p className="text-xs text-gray-400 mt-2">
              Entregável esperado: {STAGE_DELIVERABLES[team.currentStage]}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending tasks */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-accent" />
                  Tarefas pendentes ({pendingTasks.length})
                </h3>
                <Link href="/aluno/tarefas" className="text-sm text-primary hover:text-primary-dark">
                  Ver todas
                </Link>
              </div>
              {pendingTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Todas as tarefas estão em dia!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingTasks.map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-800">{task.title}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
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

            {/* Completed tasks */}
            {completedTasks.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-success" />
                  Tarefas concluídas ({completedTasks.length})
                </h3>
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm text-gray-700">{task.title}</p>
                        <p className="text-xs text-gray-400">Entregue em {task.files[0]?.uploadedAt ?? task.dueDate}</p>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar info */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-accent" /> Sobre o projeto
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Nome</p>
                  <p className="text-gray-700 font-medium">{team.ideaName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Descrição</p>
                  <p className="text-gray-600 text-xs">{team.description}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Área</p>
                  <p className="text-gray-700">{team.area}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Estágio</p>
                  <p className="text-gray-700">{IDEA_STAGE_LABELS[team.ideaStage]}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Equipe
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {team.leader.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{team.leader.name} <span className="text-xs text-primary">(líder)</span></p>
                    <p className="text-xs text-gray-400">{team.leader.course}</p>
                  </div>
                </div>
                {team.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-medium">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.course}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Mentor</h3>
              <p className="text-sm text-gray-700">{getMentorName(team.mentorId)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

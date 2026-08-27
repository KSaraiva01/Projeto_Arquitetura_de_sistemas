"use client";

import Link from "next/link";
import Header from "@/components/Header";
import StatusBadge, { TeamStatusBadge } from "@/components/StatusBadge";
import { getTeamsByMentor, mockTasks } from "@/lib/mock-data";
import { JourneyStage, STAGE_NAMES, Team } from "@/lib/types";
import { Users, AlertTriangle, Clock, ChevronRight, ClipboardList } from "lucide-react";

const CURRENT_MENTOR_ID = "mentor-1";

export default function MentorDashboard() {
  const mentorTeams = getTeamsByMentor(CURRENT_MENTOR_ID);
  const mentorTeamIds = new Set(mentorTeams.map((t) => t.id));
  const mentorTasks = mockTasks.filter((t) => mentorTeamIds.has(t.teamId));

  const overdueTasks = mentorTasks.filter((t) => t.status === "atrasada");
  const pendingTasks = mentorTasks.filter((t) => t.status === "pendente" || t.status === "em_andamento");
  const submittedTasks = mentorTasks.filter((t) => t.status === "entregue");

  const stages: JourneyStage[] = [1, 2, 3, 4, 5, 6];

  return (
    <div>
      <Header title="Dashboard" userName="Ana Beatriz Ramos" subtitle="Visão geral das minhas equipes" />

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard icon={<Users className="w-5 h-5 text-blue-500" />} label="Minhas equipes" value={mentorTeams.length} bg="bg-blue-500/10" />
          <KpiCard icon={<ClipboardList className="w-5 h-5 text-purple-500" />} label="Entregas para avaliar" value={submittedTasks.length} bg="bg-purple-500/10" />
          <KpiCard icon={<AlertTriangle className="w-5 h-5 text-red-500" />} label="Tarefas atrasadas" value={overdueTasks.length} bg="bg-red-500/10" />
          <KpiCard icon={<Clock className="w-5 h-5 text-amber-500" />} label="Tarefas pendentes" value={pendingTasks.length} bg="bg-amber-500/10" />
        </div>

        {submittedTasks.length > 0 && (
          <div className="bg-card rounded-xl border border-card-border p-5 mb-6">
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-500" />
              Entregas aguardando avaliação ({submittedTasks.length})
            </h2>
            <div className="space-y-3">
              {submittedTasks.map((task) => {
                const team = mentorTeams.find((t) => t.id === task.teamId);
                return (
                  <Link
                    key={task.id}
                    href={`/mentor/equipes/${task.teamId}`}
                    className="flex items-center justify-between border border-card-border rounded-lg p-4 hover:bg-card-hover transition-colors"
                  >
                    <div>
                      <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
                      <p className="text-xs text-muted mt-0.5">
                        {team?.ideaName} &middot; Etapa {task.stage} &middot; Prazo: {task.dueDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={task.status} />
                      <ChevronRight className="w-4 h-4 text-muted-light" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <h2 className="text-base font-semibold text-foreground mb-4">Minhas equipes por etapa</h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const teams = mentorTeams.filter((t) => t.currentStage === stage);
            return (
              <div key={stage} className="min-w-[280px] flex-1">
                <div className="bg-kanban-col-bg rounded-t-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                      {stage}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">{STAGE_NAMES[stage]}</h3>
                  </div>
                  <span className="text-xs text-muted bg-card px-2 py-0.5 rounded-full">{teams.length}</span>
                </div>
                <div className="bg-kanban-col-bg/50 rounded-b-xl p-3 space-y-3 min-h-[200px] border border-kanban-col-border">
                  {teams.length === 0 && (
                    <p className="text-xs text-muted-light text-center py-8">Nenhuma equipe</p>
                  )}
                  {teams.map((team) => (
                    <TeamCard key={team.id} team={team} mentorTasks={mentorTasks} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className="bg-card rounded-xl border border-card-border p-4 flex items-center gap-4">
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function TeamCard({ team, mentorTasks }: { team: Team; mentorTasks: typeof mockTasks }) {
  const teamTasks = mentorTasks.filter((t) => t.teamId === team.id);
  const overdue = teamTasks.filter((t) => t.status === "atrasada").length;
  const submitted = teamTasks.filter((t) => t.status === "entregue").length;

  return (
    <Link href={`/mentor/equipes/${team.id}`} className="block bg-card rounded-lg border border-card-border p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-foreground">{team.ideaName}</h4>
        <TeamStatusBadge status={team.status} />
      </div>
      <p className="text-xs text-muted mb-3 line-clamp-2">{team.description}</p>
      <div className="flex items-center justify-between text-xs text-muted-light">
        <span>{team.leader.name}</span>
        <span>{team.area}</span>
      </div>
      {(overdue > 0 || submitted > 0) && (
        <div className="mt-2 flex items-center gap-3">
          {submitted > 0 && (
            <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
              <ClipboardList className="w-3 h-3" />
              {submitted} entrega(s)
            </span>
          )}
          {overdue > 0 && (
            <span className="flex items-center gap-1 text-xs text-danger">
              <AlertTriangle className="w-3 h-3" />
              {overdue} atrasada(s)
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

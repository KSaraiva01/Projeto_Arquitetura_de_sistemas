"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import KanbanBoard from "@/components/KanbanBoard";
import { AlertTriangle, CheckCircle, Clock, Users } from "lucide-react";
import type { ApiBoard } from "@/lib/api-types";
import { useRequireSession } from "@/lib/session";

/**
 * Painel do mentor.
 *
 * Usa exatamente o mesmo quadro do administrador. A diferença não está aqui,
 * e sim no backend: `GET /teams/board` já devolve só as equipes que este
 * mentor acompanha (decisão Q10).
 */
export default function MentorDashboard() {
  const { user, loading } = useRequireSession(["MENTOR"]);
  const [board, setBoard] = useState<ApiBoard | null>(null);

  const teams = useMemo(
    () => board?.columns.flatMap((column) => column.teams) ?? [],
    [board],
  );

  const totals = useMemo(
    () => ({
      teams: teams.length,
      openTasks: teams.reduce((sum, team) => sum + team.openTasks, 0),
      overdueTasks: teams.reduce((sum, team) => sum + team.overdueTasks, 0),
      ready: teams.filter((team) => team.journeyStatus !== "IN_PROGRESS").length,
    }),
    [teams],
  );

  if (loading || !user) {
    return <div className="p-6 text-sm text-muted">Carregando...</div>;
  }

  return (
    <div>
      <Header
        title="Dashboard"
        userName={user.name}
        subtitle="Visão geral das equipes sob sua mentoria"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            icon={<Users className="w-5 h-5 text-blue-500" />}
            label="Minhas equipes"
            value={totals.teams}
            bg="bg-blue-500/10"
          />
          <KpiCard
            icon={<Clock className="w-5 h-5 text-amber-500" />}
            label="Tarefas em aberto"
            value={totals.openTasks}
            bg="bg-amber-500/10"
          />
          <KpiCard
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            label="Tarefas atrasadas"
            value={totals.overdueTasks}
            bg="bg-red-500/10"
          />
          <KpiCard
            icon={<CheckCircle className="w-5 h-5 text-green-500" />}
            label="Prontas para InovAMF"
            value={totals.ready}
            bg="bg-green-500/10"
          />
        </div>

        <h2 className="text-base font-semibold text-foreground mb-3">
          Minhas equipes por etapa
        </h2>

        <KanbanBoard
          detailBasePath="/mentor/equipes"
          onBoardChange={setBoard}
        />
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-card-border p-4 flex items-center gap-4">
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

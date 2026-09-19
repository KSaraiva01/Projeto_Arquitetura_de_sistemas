"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import KanbanBoard from "@/components/KanbanBoard";
import KpiCard from "@/components/KpiCard";
import { DashboardSkeleton } from "@/components/Skeleton";
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
    return <DashboardSkeleton />;
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
            index={0}
            icon={<Users className="w-5 h-5 text-blue-500" />}
            label="Minhas equipes"
            value={totals.teams}
            bg="bg-blue-500/10"
          />
          <KpiCard
            index={1}
            icon={<Clock className="w-5 h-5 text-amber-500" />}
            label="Tarefas em aberto"
            value={totals.openTasks}
            bg="bg-amber-500/10"
          />
          <KpiCard
            index={2}
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            label="Tarefas atrasadas"
            value={totals.overdueTasks}
            bg="bg-red-500/10"
          />
          <KpiCard
            index={3}
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

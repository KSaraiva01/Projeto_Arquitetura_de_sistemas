"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import KanbanBoard from "@/components/KanbanBoard";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  Filter,
  Users,
} from "lucide-react";
import { JOURNEY_STATUS_LABELS, type ApiBoard } from "@/lib/api-types";
import { useRequireSession } from "@/lib/session";

/**
 * Painel do administrador (RF-06, RF-07).
 *
 * Os cartões, os indicadores e as opções dos filtros vêm todos do mesmo
 * `GET /teams/board`: uma requisição só, e nenhum número da tela pode
 * divergir do quadro que está logo abaixo dele.
 */
export default function AdminDashboard() {
  const { user, loading } = useRequireSession(["ADMIN"]);

  const [board, setBoard] = useState<ApiBoard | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMentor, setFilterMentor] = useState("");

  const filters = useMemo(
    () => ({
      search: search.trim(),
      categoryId: filterCategory,
      status: filterStatus,
      mentorId: filterMentor,
    }),
    [search, filterCategory, filterStatus, filterMentor],
  );

  const teams = useMemo(
    () => board?.columns.flatMap((column) => column.teams) ?? [],
    [board],
  );

  // Opções dos filtros derivadas do próprio quadro — evita endpoints extras
  // só para preencher dois selects.
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of teams) map.set(team.category.id, team.category.name);
    return [...map].sort((a, b) => a[1].localeCompare(b[1]));
  }, [teams]);

  const mentors = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of teams) {
      for (const mentor of team.mentors) map.set(mentor.id, mentor.name);
    }
    return [...map].sort((a, b) => a[1].localeCompare(b[1]));
  }, [teams]);

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
    return (
      <div className="p-6 text-sm text-muted">Carregando...</div>
    );
  }

  return (
    <div>
      <Header
        title="Dashboard"
        userName={user.name}
        subtitle="Visão geral do programa InfoHub"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            icon={<Users className="w-5 h-5 text-blue-500" />}
            label="Equipes"
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

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-light shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar equipe, líder ou área..."
              className="px-3 py-1.5 border border-input-border rounded-lg text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-56"
            />
            <select
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
              className="px-3 py-1.5 border border-input-border rounded-lg text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todas as áreas</option>
              {categories.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="px-3 py-1.5 border border-input-border rounded-lg text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todos os status</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="READY_FOR_INOVAMF">Pronta para InovAMF</option>
              <option value="REFERRED">Encaminhada</option>
            </select>
            <select
              value={filterMentor}
              onChange={(event) => setFilterMentor(event.target.value)}
              className="px-3 py-1.5 border border-input-border rounded-lg text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todos os mentores</option>
              {mentors.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex bg-hover-bg rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === "kanban"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === "list"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted"
              }`}
            >
              Lista
            </button>
          </div>
        </div>

        {/* O quadro fica sempre montado: desmontá-lo ao alternar para a lista
            jogaria fora os dados e faria uma nova requisição na volta. */}
        <div className={viewMode === "kanban" ? "" : "hidden"}>
          <KanbanBoard
            detailBasePath="/admin/equipes"
            filters={filters}
            onBoardChange={setBoard}
          />
        </div>

        {viewMode === "list" && (
          <div className="bg-card rounded-xl border border-card-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-table-header border-b border-card-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">
                      Equipe
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">
                      Área
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">
                      Etapa
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr
                      key={team.id}
                      className="border-b border-divider hover:bg-card-hover"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">
                          {team.name}
                        </p>
                        <p className="text-xs text-muted">
                          {team.leader?.name ?? "Sem líder"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {team.category.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">
                        Etapa {team.journeyStage} – {team.journeyStageName}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {JOURNEY_STATUS_LABELS[team.journeyStatus]}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/equipes/${team.id}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {teams.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-sm text-muted"
                      >
                        Nenhuma equipe encontrada com estes filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
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

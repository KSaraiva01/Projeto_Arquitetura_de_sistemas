"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import KanbanBoard from "@/components/KanbanBoard";
import KpiCard from "@/components/KpiCard";
import { DashboardSkeleton } from "@/components/Skeleton";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  Filter,
  Users,
  X,
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

  const hasFilters = Boolean(search || filterCategory || filterStatus || filterMentor);

  function clearFilters() {
    setSearch("");
    setFilterCategory("");
    setFilterStatus("");
    setFilterMentor("");
  }

  if (loading || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <div>
      <Header
        title="Dashboard"
        userName={user.name}
        subtitle="Visão geral do programa InfoHub"
      />

      <div className="p-6">
        {/* Os dois cartões que correspondem a um filtro do quadro viram
            botões: "Equipes" limpa tudo, "Prontas" filtra pelo status. Os
            de tarefas ficam só informativos, porque o quadro não filtra
            por tarefa. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            index={0}
            icon={<Users className="w-5 h-5 text-blue-500" />}
            label="Equipes"
            value={totals.teams}
            bg="bg-blue-500/10"
            onClick={clearFilters}
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
            onClick={() =>
              setFilterStatus((current) =>
                current === "READY_FOR_INOVAMF" ? "" : "READY_FOR_INOVAMF",
              )
            }
            active={filterStatus === "READY_FOR_INOVAMF"}
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
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="animate-fade-in inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
              >
                Limpar filtros
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Alternância com a pílula branca deslizando (200ms) entre as
              duas opções, em vez de trocar de fundo de repente. */}
          <div
            role="tablist"
            aria-label="Modo de visualização"
            className="relative flex bg-hover-bg rounded-lg p-0.5"
          >
            <span
              aria-hidden="true"
              className={`absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-card shadow-sm transition-transform duration-200 ease-enter ${
                viewMode === "list" ? "translate-x-full" : ""
              }`}
            />
            <button
              role="tab"
              aria-selected={viewMode === "kanban"}
              onClick={() => setViewMode("kanban")}
              className={`relative w-[68px] py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === "kanban" ? "text-foreground" : "text-muted"
              }`}
            >
              Kanban
            </button>
            <button
              role="tab"
              aria-selected={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={`relative w-[68px] py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === "list" ? "text-foreground" : "text-muted"
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
            onClearFilters={hasFilters ? clearFilters : undefined}
          />
        </div>

        {viewMode === "list" && (
          <div className="animate-rise bg-card rounded-xl border border-card-border overflow-hidden">
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
                  {teams.map((team, index) => (
                    <tr
                      key={team.id}
                      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                      className="animate-row-in border-b border-divider transition-colors hover:bg-card-hover"
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

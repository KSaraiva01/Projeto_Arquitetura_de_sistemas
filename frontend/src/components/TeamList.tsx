"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, Search } from "lucide-react";
import StagePipeline from "./StagePipeline";
import { CardSkeleton } from "./Skeleton";
import { JourneyStatusBadge } from "./StatusBadge";
import { api, describeError } from "@/lib/api";
import { journeyStageLabel, type ApiTeamCard } from "@/lib/api-types";

interface TeamListProps {
  /** Base das rotas de detalhe: "/admin/equipes" ou "/mentor/equipes". */
  detailBasePath: string;
  /** Filtros aplicados no servidor (curso, mentor, status de tarefa). */
  filters?: { course?: string; mentorId?: string; taskStatus?: string };
  /** Recebe o total devolvido pela API (antes da busca por texto). */
  onLoaded?: (total: number) => void;
  /** Filtros extras, ao lado da busca. */
  children?: React.ReactNode;
}

/**
 * RF-07 — equipes em lista, cada uma com a própria jornada (padrão + extras).
 * O escopo vem do backend: o mentor só recebe as equipes que acompanha. A
 * busca por nome, líder ou área filtra aqui, sem uma requisição por tecla.
 */
export default function TeamList({ detailBasePath, filters, onLoaded, children }: TeamListProps) {
  const [teams, setTeams] = useState<ApiTeamCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [attempt, setAttempt] = useState(0);

  const filterKey = JSON.stringify(filters ?? {});

  useEffect(() => {
    let cancelled = false;
    api
      .teams(JSON.parse(filterKey))
      .then((result) => {
        if (cancelled) return;
        setTeams(result.data);
        setError(null);
        onLoaded?.(result.total);
      })
      .catch((err) => {
        if (!cancelled) setError(describeError(err, "Não foi possível carregar as equipes. A API está no ar?"));
      });
    return () => {
      cancelled = true;
    };
  }, [filterKey, onLoaded, attempt]);

  const term = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      (teams ?? []).filter(
        (team) =>
          !term ||
          team.name.toLowerCase().includes(term) ||
          (team.leader?.name ?? "").toLowerCase().includes(term) ||
          team.category.name.toLowerCase().includes(term),
      ),
    [teams, term],
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-light" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar equipe, líder ou área..."
            aria-label="Buscar equipe, líder ou área"
            className="w-full pl-9 pr-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        {children}
      </div>

      {error && (
        <div className="animate-rise bg-card border border-card-border rounded-xl p-8 text-center mb-4">
          <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-3" />
          <p className="text-sm text-foreground">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="mt-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!teams && !error && (
        <div role="status" aria-label="Carregando equipes" className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {teams && (
        <div className="space-y-3">
          {visible.map((team, index) => {
            const currentIndex = Math.max(0, team.journey.findIndex((stage) => stage.isCurrent));
            const current = team.journey[currentIndex];
            return (
              <Link
                key={team.id}
                href={`${detailBasePath}/${team.id}`}
                style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
                className="animate-rise block bg-card rounded-xl border border-card-border p-5 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="text-base font-semibold text-foreground">{team.name}</h3>
                      <JourneyStatusBadge status={team.journeyStatus} isActive={team.isActive} />
                    </div>
                    <p className="text-sm text-muted mt-0.5">
                      Líder: {team.leader?.name ?? "—"} &middot; {team.category.name}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 shrink-0 text-muted-light mt-1" />
                </div>
                <p className="text-sm text-muted mb-3 line-clamp-1">{team.description}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-[220px] max-w-lg flex-1">
                    <StagePipeline stages={team.journey} currentStage={currentIndex + 1} compact />
                  </div>
                  <div className="text-xs text-muted-light">
                    {current && (
                      <p>
                        {journeyStageLabel(current)} — {current.name}
                      </p>
                    )}
                    {team.overdueTasks > 0 && (
                      <p className="mt-0.5 inline-flex items-center gap-1 font-medium text-danger">
                        <AlertTriangle className="w-3 h-3" />
                        {team.overdueTasks} {team.overdueTasks === 1 ? "tarefa atrasada" : "tarefas atrasadas"}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
          {visible.length === 0 && (
            <p className="text-sm text-muted-light text-center py-8">Nenhuma equipe encontrada</p>
          )}
        </div>
      )}
    </>
  );
}

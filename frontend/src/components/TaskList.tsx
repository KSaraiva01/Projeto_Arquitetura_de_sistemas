"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Filter, Paperclip, Search } from "lucide-react";
import DueChip from "./DueChip";
import Header from "./Header";
import { CardSkeleton } from "./Skeleton";
import { TaskStatusBadge } from "./StatusBadge";
import { api, describeError } from "@/lib/api";
import { TASK_STATUS_LABELS, type ApiTask, type ApiTaskStatus } from "@/lib/api-types";
import { useRequireSession } from "@/lib/session";

const selectClass =
  "px-3 py-2 border border-input-border rounded-lg text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Atalhos para o que costuma pedir ação do mentor. */
const QUICK_FILTERS: Array<{ status: ApiTaskStatus; label: string }> = [
  { status: "SUBMITTED", label: "Aguardando avaliação" },
  { status: "OVERDUE", label: "Atrasadas" },
  { status: "REJECTED", label: "Em ajuste" },
];

/**
 * Tarefas de todas as equipes do escopo — o admin vê todas, o mentor só as
 * das equipes que acompanha (o backend filtra). Status filtra no servidor;
 * a busca por tarefa/equipe também.
 */
export default function TaskList({ role, detailBasePath }: { role: "ADMIN" | "MENTOR"; detailBasePath: string }) {
  const { user, loading } = useRequireSession([role]);
  const [tasks, setTasks] = useState<ApiTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<ApiTaskStatus | "">("");
  const [attempt, setAttempt] = useState(0);

  // Busca no servidor só depois de a pessoa parar de digitar.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.tasks({ status: status || undefined, search: debouncedSearch || undefined }).then(
      (result) => {
        if (cancelled) return;
        setTasks(result.data);
        setError(null);
      },
      (err: unknown) => {
        if (!cancelled) setError(describeError(err, "Não foi possível carregar as tarefas. A API está no ar?"));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [user, status, debouncedSearch, attempt]);

  const counts = useMemo(() => {
    const map = new Map<ApiTaskStatus, number>();
    for (const task of tasks ?? []) map.set(task.status, (map.get(task.status) ?? 0) + 1);
    return map;
  }, [tasks]);

  if (loading || !user) {
    return (
      <div className="p-6 space-y-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Tarefas"
        userName={user.name}
        subtitle={role === "ADMIN" ? "Tarefas de todas as equipes" : "Tarefas das equipes que você acompanha"}
      />
      <div className="p-6">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-light" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar tarefa ou equipe..."
              aria-label="Buscar tarefa ou equipe"
              className="w-full pl-9 pr-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-light" />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ApiTaskStatus | "")}
              aria-label="Status da tarefa"
              className={selectClass}
            >
              <option value="">Todos os status</option>
              {(Object.keys(TASK_STATUS_LABELS) as ApiTaskStatus[]).map((value) => (
                <option key={value} value={value}>
                  {TASK_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {QUICK_FILTERS.map((quick) => (
            <button
              key={quick.status}
              type="button"
              onClick={() => setStatus((current) => (current === quick.status ? "" : quick.status))}
              aria-pressed={status === quick.status}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                status === quick.status
                  ? "bg-primary text-white"
                  : "bg-badge-muted-bg text-badge-muted-text hover:bg-hover-bg"
              }`}
            >
              {quick.label}
              {!status && counts.get(quick.status) ? ` (${counts.get(quick.status)})` : ""}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            <span>{error}</span>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-medium underline">
              Tentar novamente
            </button>
          </div>
        )}

        {!tasks && !error ? (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-card-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-table-header border-b border-card-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Tarefa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Equipe</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Etapa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Prazo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(tasks ?? []).map((task, index) => (
                    <tr
                      key={task.id}
                      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
                      className="animate-row-in border-b border-divider hover:bg-card-hover"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">
                          {task.title}
                          {task.isMandatory && <span className="ml-2 text-[10px] font-medium uppercase text-muted-light">obrigatória</span>}
                        </p>
                        {task.description && <p className="text-xs text-muted line-clamp-1">{task.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`${detailBasePath}/${task.teamId}`} className="text-sm text-primary hover:text-primary-dark">
                          {task.teamName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">
                        Etapa {task.stage} <span className="text-muted-light">· {task.stageName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <DueChip dueDate={task.dueDate} done={task.status === "APPROVED" || task.status === "SUBMITTED"} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TaskStatusBadge status={task.status} />
                          {task.submissionCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-muted-light" title="Versões entregues">
                              <Paperclip className="w-3 h-3" />
                              {task.submissionCount}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`${detailBasePath}/${task.teamId}`}
                          aria-label={`Abrir a equipe ${task.teamName}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tasks?.length === 0 && <p className="text-sm text-muted-light text-center py-8">Nenhuma tarefa encontrada</p>}
          </div>
        )}
      </div>
    </div>
  );
}

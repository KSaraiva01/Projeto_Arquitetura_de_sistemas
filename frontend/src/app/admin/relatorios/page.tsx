"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ClipboardList,
  Download,
  Filter,
  Loader2,
  PieChart,
  Rocket,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import Header from "@/components/Header";
import KpiCard from "@/components/KpiCard";
import { DashboardSkeleton, KpiSkeleton } from "@/components/Skeleton";
import { api, describeError } from "@/lib/api";
import { JOURNEY_STATUS_LABELS, type ApiJourneyStatus, type ApiReportDashboard } from "@/lib/api-types";
import { useRequireSession } from "@/lib/session";

const selectClass =
  "px-3 py-2 border border-input-border rounded-lg text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

interface BarRow {
  key: string;
  label: React.ReactNode;
  value: number;
  /** Texto do tooltip da barra. */
  title: string;
}

/**
 * RF-22 (painel), RF-23 (exportação) e RF-24 (filtro por período) — a visão
 * consolidada do funil InfoHub → InovAMF para a coordenação. Tudo vem de
 * `GET /reports/dashboard`; o CSV sai de `/reports/teams.csv` com os mesmos
 * filtros, pronto para abrir no Excel.
 */
export default function RelatoriosPage() {
  const { user, loading } = useRequireSession(["ADMIN"]);
  const [report, setReport] = useState<ApiReportDashboard | null>(null);
  const [periods, setPeriods] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState<ApiJourneyStatus | "">("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .reportDashboard({ period: period || undefined, status: status || undefined, includeInactive: includeInactive || undefined })
      .then(
        (result) => {
          if (cancelled) return;
          setReport(result);
          // Os períodos disponíveis não dependem do filtro aplicado.
          setPeriods((current) => (current.length ? current : result.periods));
          setError(null);
        },
        (err: unknown) => {
          if (!cancelled) setError(describeError(err, "Não foi possível carregar os relatórios. A API está no ar?"));
        },
      );
    return () => {
      cancelled = true;
    };
  }, [user, period, status, includeInactive, attempt]);

  async function exportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      await api.downloadTeamsCsv({ period: period || undefined, status: status || undefined, includeInactive: includeInactive || undefined });
    } catch (err) {
      setExportError(describeError(err, "Não foi possível gerar o CSV."));
    } finally {
      setExporting(false);
    }
  }

  if (loading || !user) return <DashboardSkeleton />;

  const totals = report?.totals;
  const inProgressTotal = report?.byStage.reduce((sum, row) => sum + row.teams, 0) ?? 0;
  const areaTotal = report?.byArea.reduce((sum, row) => sum + row.teams, 0) ?? 0;
  const pct = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);

  return (
    <div>
      <Header title="Relatórios" userName={user.name} subtitle="Visão consolidada do funil InfoHub → InovAMF" />
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-light shrink-0" />
            <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Período de ingresso" className={selectClass}>
              <option value="">Todos os períodos</option>
              {periods.map((value) => (
                <option key={value} value={value}>
                  Turma {value}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ApiJourneyStatus | "")}
              aria-label="Situação no funil"
              className={selectClass}
            >
              <option value="">Todas as situações</option>
              {(Object.keys(JOURNEY_STATUS_LABELS) as ApiJourneyStatus[]).map((value) => (
                <option key={value} value={value}>
                  {JOURNEY_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Incluir equipes excluídas
            </label>
          </div>
          <div className="flex flex-col items-start gap-1 lg:items-end">
            <button
              type="button"
              onClick={() => void exportCsv()}
              disabled={exporting}
              className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exportar CSV (Excel)
            </button>
            {exportError && <p className="text-xs text-danger">{exportError}</p>}
          </div>
        </div>

        {error && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            <span>{error}</span>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-medium underline">
              Tentar novamente
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {!totals ? (
            Array.from({ length: 8 }).map((_, index) => <KpiSkeleton key={index} />)
          ) : (
            <>
              <KpiCard index={0} icon={<Users className="w-5 h-5 text-blue-500" />} label="Equipes no filtro" value={totals.teams} bg="bg-blue-500/10" />
              <KpiCard index={1} icon={<TrendingUp className="w-5 h-5 text-blue-500" />} label="Em andamento (ativas)" value={totals.activeTeams} bg="bg-blue-500/10" />
              <KpiCard index={2} icon={<CheckCircle className="w-5 h-5 text-green-500" />} label="Prontas para o InovAMF" value={totals.readyForInovamf} bg="bg-green-500/10" />
              <KpiCard index={3} icon={<Rocket className="w-5 h-5 text-emerald-500" />} label="Encaminhadas ao InovAMF" value={totals.referred} bg="bg-emerald-500/10" />
              <KpiCard index={4} icon={<ClipboardList className="w-5 h-5 text-amber-500" />} label="Tarefas em aberto" value={totals.openTasks} bg="bg-amber-500/10" />
              <KpiCard index={5} icon={<AlertTriangle className="w-5 h-5 text-red-500" />} label="Tarefas atrasadas" value={totals.overdueTasks} bg="bg-red-500/10" />
              <KpiCard index={6} icon={<AlertTriangle className="w-5 h-5 text-red-500" />} label="Equipes com atraso" value={totals.teamsWithOverdueTasks} bg="bg-red-500/10" />
              <KpiCard index={7} icon={<Sparkles className="w-5 h-5 text-purple-500" />} label="Novas nos últimos 30 dias" value={totals.newTeamsLast30Days} bg="bg-purple-500/10" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel
            icon={<BarChart3 className="w-5 h-5 text-muted-light" />}
            title="Funil da jornada"
            subtitle="Equipes em andamento em cada etapa. As prontas e as encaminhadas estão nos indicadores acima."
          >
            {report && (
              <BarList
                rows={report.byStage.map((row) => ({
                  key: String(row.stage),
                  label: (
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                        {row.stage}
                      </span>
                      <span className="leading-tight">{row.name}</span>
                    </span>
                  ),
                  value: row.teams,
                  title: `Etapa ${row.stage} — ${row.name}: ${row.teams} ${row.teams === 1 ? "equipe" : "equipes"} (${pct(row.teams, inProgressTotal)}% das em andamento)`,
                }))}
                empty="Nenhuma equipe em andamento neste filtro."
              />
            )}
          </Panel>

          <Panel icon={<PieChart className="w-5 h-5 text-muted-light" />} title="Equipes por área da ideia">
            {report && (
              <BarList
                rows={report.byArea.map((row) => ({
                  key: row.name,
                  label: <span className="truncate">{row.name}</span>,
                  value: row.teams,
                  title: `${row.name}: ${row.teams} ${row.teams === 1 ? "equipe" : "equipes"} (${pct(row.teams, areaTotal)}%)`,
                }))}
                empty="Nenhuma equipe neste filtro."
              />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-xl border border-card-border p-6">
      <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Barras horizontais de uma série só (uma cor, sem legenda — o título diz o
 * que é): barra fina com a ponta arredondada, valor na ponta e o detalhe no
 * tooltip. Como cada linha já traz rótulo e número, a lista funciona também
 * como a tabela dos dados.
 */
function BarList({ rows, empty }: { rows: BarRow[]; empty: string }) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  if (rows.every((row) => row.value === 0)) {
    return <p className="py-6 text-center text-sm text-muted-light">{empty}</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key} title={row.title} className="group grid grid-cols-[minmax(0,13rem)_1fr_2.5rem] items-center gap-3">
          <span className="text-sm text-foreground">{row.label}</span>
          <span className="relative h-3 rounded-r bg-badge-muted-bg">
            <span
              className="animate-fill-x absolute inset-y-0 left-0 origin-left rounded-r bg-blue-500 transition-opacity group-hover:opacity-80"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </span>
          <span className="text-right text-sm font-medium tabular-nums text-foreground">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}

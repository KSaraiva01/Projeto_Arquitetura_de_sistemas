// Painel com indicadores gerais e lista rápida de equipes
import type { Team } from "../../types";
import { STAGES } from "../../data/mockData";

interface Props {
  teams: Team[];
  onSelectTeam: (t: Team) => void;
  onViewKanban: () => void;
}

export default function AdminDashboard({ teams, onSelectTeam, onViewKanban }: Props) {
  const active = teams.filter((t) => t.status === "ativo");
  const forwarded = teams.filter((t) => t.status === "encaminhado");
  const allTasks = teams.flatMap((t) => t.tasks);
  const delayed = allTasks.filter((tk) => tk.status === "atrasada");
  const submitted = allTasks.filter((tk) => tk.status === "entregue");
  const stageDistribution = STAGES.map((s) => ({
    ...s,
    count: teams.filter((t) => t.currentStage === s.id).length,
  }));

  // KPIs
  const kpis = [
    { label: "Equipes ativas", value: active.length, sub: `+${forwarded.length} encaminhadas`, accent: "var(--primary)" },
    { label: "Tarefas atrasadas", value: delayed.length, sub: "aguardando ação", accent: "var(--danger)" },
    { label: "Entregas para revisar", value: submitted.length, sub: "arquivos enviados", accent: "var(--warning)" },
    { label: "Prontas para InovAMF", value: forwarded.length, sub: "etapa 6 concluída", accent: "var(--success)" },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl p-5 border"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div
              className="text-3xl font-display font-semibold mb-1"
              style={{ color: kpi.accent }}
            >
              {kpi.value}
            </div>
            <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              {kpi.label}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Distribuição por etapa + lista de equipes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Funil */}
        <div
          className="rounded-xl p-6 border"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-base" style={{ color: "var(--foreground)" }}>
              Distribuição por etapa
            </h2>
            <button
              onClick={onViewKanban}
              className="text-xs hover:underline"
              style={{ color: "var(--primary)" }}
            >
              Ver funil →
            </button>
          </div>
          <div className="space-y-3">
            {stageDistribution.map((s) => {
              const pct = active.length > 0 ? Math.round((s.count / active.length) * 100) : 0;
              return (
                <div key={s.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                      {s.name}
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {s.count}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--muted)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background:
                          s.id === 1 ? "#94a3b8"
                          : s.id === 2 ? "#60a5fa"
                          : s.id === 3 ? "#818cf8"
                          : s.id === 4 ? "#a78bfa"
                          : s.id === 5 ? "var(--accent)"
                          : "var(--success)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista de equipes recentes */}
        <div
          className="lg:col-span-2 rounded-xl border"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-display font-semibold text-base" style={{ color: "var(--foreground)" }}>
              Equipes ativas
            </h2>
            <button
              onClick={onViewKanban}
              className="text-xs hover:underline"
              style={{ color: "var(--primary)" }}
            >
              Ver todas →
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {active.slice(0, 6).map((team) => {
              const stage = STAGES.find((s) => s.id === team.currentStage);
              const pendingCount = team.tasks.filter((tk) => ["pendente", "em_andamento", "atrasada"].includes(tk.status)).length;
              const delayedCount = team.tasks.filter((tk) => tk.status === "atrasada").length;
              return (
                <button
                  key={team.id}
                  onClick={() => onSelectTeam(team)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "var(--secondary)", color: "var(--primary)" }}
                  >
                    {team.projectName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>
                        {team.projectName}
                      </span>
                      {delayedCount > 0 && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0"
                          style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
                        >
                          {delayedCount} atrasada{delayedCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {stage && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${stage.color} ${stage.textColor}`}>
                          {stage.name}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {team.area}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
                    </div>
                    {team.mentor && (
                      <div className="text-xs mt-0.5 truncate max-w-28" style={{ color: "var(--muted-foreground)" }}>
                        {team.mentor.replace("Prof. ", "").replace("Profa. ", "")}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

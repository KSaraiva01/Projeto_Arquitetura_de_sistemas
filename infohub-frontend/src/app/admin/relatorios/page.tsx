"use client";

import Header from "@/components/Header";
import { mockTeams, mockTasks } from "@/lib/mock-data";
import { JourneyStage, STAGE_NAMES } from "@/lib/types";
import { Download, Users, TrendingUp, AlertTriangle, CheckCircle, BarChart3, PieChart } from "lucide-react";

export default function RelatoriosPage() {
  const stages: JourneyStage[] = [1, 2, 3, 4, 5, 6];
  const teamsByStage = stages.map((s) => ({
    stage: s,
    name: STAGE_NAMES[s],
    count: mockTeams.filter((t) => t.currentStage === s).length,
  }));

  const totalTeams = mockTeams.length;
  const activeTeams = mockTeams.filter((t) => t.status === "ativa").length;
  const readyTeams = mockTeams.filter((t) => t.status === "pronta_inovamf" || t.status === "encaminhada").length;
  const overdueTasks = mockTasks.filter((t) => t.status === "atrasada").length;
  const completedTasks = mockTasks.filter((t) => t.status === "aprovada").length;
  const totalTasks = mockTasks.length;

  const areaDistribution = [...new Set(mockTeams.map((t) => t.area))].map((area) => ({
    area,
    count: mockTeams.filter((t) => t.area === area).length,
  })).sort((a, b) => b.count - a.count);

  const maxStageCount = Math.max(...teamsByStage.map((s) => s.count), 1);
  const maxAreaCount = Math.max(...areaDistribution.map((a) => a.count), 1);

  const areaColors = [
    "bg-blue-500", "bg-green-500", "bg-amber-500", "bg-purple-500",
    "bg-pink-500", "bg-teal-500", "bg-red-500",
  ];

  return (
    <div>
      <Header title="Relatórios" userName="Prof. Carlos Silva" subtitle="Visão consolidada do programa" />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard icon={<Users className="w-5 h-5 text-blue-500" />} label="Total de equipes" value={totalTeams} />
          <StatCard icon={<TrendingUp className="w-5 h-5 text-green-500" />} label="Equipes ativas" value={activeTeams} />
          <StatCard icon={<CheckCircle className="w-5 h-5 text-emerald-500" />} label="Prontas InovAMF" value={readyTeams} />
          <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-500" />} label="Tarefas atrasadas" value={overdueTasks} />
          <StatCard icon={<BarChart3 className="w-5 h-5 text-purple-500" />} label="Taxa de conclusão" value={`${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-card rounded-xl border border-card-border p-6">
            <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-light" />
              Funil da jornada
            </h3>
            <div className="space-y-3">
              {teamsByStage.map((s) => (
                <div key={s.stage} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {s.stage}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{s.name}</span>
                      <span className="text-sm font-semibold text-foreground">{s.count}</span>
                    </div>
                    <div className="w-full bg-hover-bg rounded-full h-2.5">
                      <div
                        className="bg-primary h-2.5 rounded-full transition-all"
                        style={{ width: `${(s.count / maxStageCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-card-border p-6">
            <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-muted-light" />
              Distribuição por área
            </h3>
            <div className="space-y-3">
              {areaDistribution.map((item, idx) => (
                <div key={item.area} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${areaColors[idx % areaColors.length]} shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{item.area}</span>
                      <span className="text-sm font-semibold text-foreground">{item.count}</span>
                    </div>
                    <div className="w-full bg-hover-bg rounded-full h-2">
                      <div
                        className={`${areaColors[idx % areaColors.length]} h-2 rounded-full transition-all`}
                        style={{ width: `${(item.count / maxAreaCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-card-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Resumo por equipe</h3>
            <button className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-table-header border-b border-card-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Equipe</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Líder</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Área</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase">Etapa</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase">Tarefas</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Inscrito em</th>
                </tr>
              </thead>
              <tbody>
                {mockTeams.map((team) => {
                  const teamTasks = mockTasks.filter((t) => t.teamId === team.id);
                  const approved = teamTasks.filter((t) => t.status === "aprovada").length;
                  return (
                    <tr key={team.id} className="border-b border-divider hover:bg-card-hover">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{team.ideaName}</td>
                      <td className="px-4 py-3 text-sm text-muted">{team.leader.name}</td>
                      <td className="px-4 py-3 text-sm text-muted">{team.area}</td>
                      <td className="px-4 py-3 text-sm text-muted text-center">{team.currentStage}/6</td>
                      <td className="px-4 py-3 text-sm text-muted text-center">{approved}/{teamTasks.length}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${team.status === "pronta_inovamf" ? "text-green-600 dark:text-green-400" : team.status === "ativa" ? "text-blue-600 dark:text-blue-400" : "text-muted"}`}>
                          {team.status === "pronta_inovamf" ? "Pronta" : team.status === "ativa" ? "Ativa" : team.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{team.createdAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="bg-card rounded-xl border border-card-border p-4">
      <div className="flex items-center gap-3 mb-2">{icon}<span className="text-xs text-muted">{label}</span></div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { TeamStatusBadge } from "@/components/StatusBadge";
import StagePipeline from "@/components/StagePipeline";
import { mockTeams, mockTasks, getMentorName } from "@/lib/mock-data";
import { JourneyStage, STAGE_NAMES, Team } from "@/lib/types";
import { Users, AlertTriangle, CheckCircle, Clock, ChevronRight, Filter } from "lucide-react";

export default function AdminDashboard() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filterArea, setFilterArea] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const stages: JourneyStage[] = [1, 2, 3, 4, 5, 6];

  const filteredTeams = mockTeams.filter((t) => {
    if (filterArea && t.area !== filterArea) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    return true;
  });

  const overdueTasks = mockTasks.filter((t) => t.status === "atrasada");
  const activeTeams = mockTeams.filter((t) => t.status === "ativa");
  const readyTeams = mockTeams.filter((t) => t.status === "pronta_inovamf" || t.status === "encaminhada");

  const areas = [...new Set(mockTeams.map((t) => t.area))];

  return (
    <div>
      <Header title="Dashboard" userName="Prof. Carlos Silva" subtitle="Visão geral do programa InfoHub" />

      <div className="p-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard icon={<Users className="w-5 h-5 text-secondary" />} label="Equipes ativas" value={activeTeams.length} bg="bg-blue-50" />
          <KpiCard icon={<Clock className="w-5 h-5 text-accent" />} label="Tarefas pendentes" value={mockTasks.filter(t => t.status === "pendente").length} bg="bg-orange-50" />
          <KpiCard icon={<AlertTriangle className="w-5 h-5 text-danger" />} label="Tarefas atrasadas" value={overdueTasks.length} bg="bg-red-50" />
          <KpiCard icon={<CheckCircle className="w-5 h-5 text-success" />} label="Prontas para InovAMF" value={readyTeams.length} bg="bg-green-50" />
        </div>

        {/* Filters & View Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todas as áreas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todos os status</option>
              <option value="ativa">Ativa</option>
              <option value="pronta_inovamf">Pronta para InovAMF</option>
              <option value="encaminhada">Encaminhada</option>
              <option value="inativa">Inativa</option>
            </select>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === "kanban" ? "bg-white shadow-sm text-gray-800" : "text-gray-500"}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-gray-800" : "text-gray-500"}`}
            >
              Lista
            </button>
          </div>
        </div>

        {/* Kanban View */}
        {viewMode === "kanban" ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => {
              const teams = filteredTeams.filter((t) => t.currentStage === stage);
              return (
                <div key={stage} className="min-w-[280px] flex-1">
                  <div className="bg-gray-100 rounded-t-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                        {stage}
                      </span>
                      <h3 className="text-sm font-semibold text-gray-700">{STAGE_NAMES[stage]}</h3>
                    </div>
                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">{teams.length}</span>
                  </div>
                  <div className="bg-gray-50 rounded-b-xl p-3 space-y-3 min-h-[200px] border border-gray-100">
                    {teams.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-8">Nenhuma equipe</p>
                    )}
                    {teams.map((team) => (
                      <TeamCard key={team.id} team={team} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Equipe</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Área</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Etapa</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mentor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team) => (
                  <tr key={team.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{team.ideaName}</p>
                        <p className="text-xs text-gray-500">{team.leader.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{team.area}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">Etapa {team.currentStage} – {STAGE_NAMES[team.currentStage]}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{getMentorName(team.mentorId)}</td>
                    <td className="px-4 py-3"><TeamStatusBadge status={team.status} /></td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/equipes/${team.id}`} className="text-primary hover:text-primary-dark">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  const teamTasks = mockTasks.filter((t) => t.teamId === team.id);
  const overdue = teamTasks.filter((t) => t.status === "atrasada").length;

  return (
    <Link href={`/admin/equipes/${team.id}`} className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-800">{team.ideaName}</h4>
        <TeamStatusBadge status={team.status} />
      </div>
      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{team.description}</p>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{team.leader.name}</span>
        <span>{team.area}</span>
      </div>
      {overdue > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-danger">
          <AlertTriangle className="w-3 h-3" />
          {overdue} tarefa(s) atrasada(s)
        </div>
      )}
    </Link>
  );
}

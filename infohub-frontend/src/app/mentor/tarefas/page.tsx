"use client";

import { useState } from "react";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { getTeamsByMentor, mockTasks } from "@/lib/mock-data";
import { TaskStatus, STAGE_NAMES } from "@/lib/types";
import { Calendar, Filter, Search } from "lucide-react";
import Link from "next/link";

const CURRENT_MENTOR_ID = "mentor-1";

export default function MentorTarefasPage() {
  const mentorTeams = getTeamsByMentor(CURRENT_MENTOR_ID);
  const mentorTeamIds = new Set(mentorTeams.map((t) => t.id));

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "">("");

  const tasks = mockTasks
    .filter((t) => mentorTeamIds.has(t.teamId))
    .map((task) => {
      const team = mentorTeams.find((t) => t.id === task.teamId);
      return { ...task, teamName: team?.ideaName ?? "—" };
    })
    .filter((t) => {
      if (filterStatus && t.status !== filterStatus) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.teamName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

  return (
    <div>
      <Header title="Tarefas" userName="Ana Beatriz Ramos" subtitle="Tarefas das minhas equipes" />
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-light" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarefa ou equipe..."
              className="w-full pl-9 pr-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-light" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TaskStatus | "")}
              className="px-3 py-2 border border-input-border rounded-lg text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="entregue">Entregue</option>
              <option value="atrasada">Atrasada</option>
              <option value="aprovada">Aprovada</option>
              <option value="reprovada">Reprovada</option>
            </select>
          </div>
        </div>

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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Arquivos</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-divider hover:bg-card-hover">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <p className="text-xs text-muted line-clamp-1">{task.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/mentor/equipes/${task.teamId}`} className="text-sm text-primary hover:text-primary-dark">
                        {task.teamName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{STAGE_NAMES[task.stage]}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-sm text-muted">
                        <Calendar className="w-3.5 h-3.5 text-muted-light" />
                        {task.dueDate}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                    <td className="px-4 py-3 text-sm text-muted">{task.files.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tasks.length === 0 && (
            <p className="text-sm text-muted-light text-center py-8">Nenhuma tarefa encontrada</p>
          )}
        </div>
      </div>
    </div>
  );
}

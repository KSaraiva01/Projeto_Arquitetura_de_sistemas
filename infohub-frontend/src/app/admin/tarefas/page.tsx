"use client";

import { useState } from "react";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { mockTasks, mockTeams } from "@/lib/mock-data";
import { TaskStatus, STAGE_NAMES } from "@/lib/types";
import { Calendar, Filter, Search } from "lucide-react";
import Link from "next/link";

export default function TarefasAdminPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "">("");

  const tasks = mockTasks
    .map((task) => {
      const team = mockTeams.find((t) => t.id === task.teamId);
      return { ...task, teamName: team?.ideaName ?? "—" };
    })
    .filter((t) => {
      if (filterStatus && t.status !== filterStatus) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.teamName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

  return (
    <div>
      <Header title="Tarefas" userName="Prof. Carlos Silva" subtitle="Gerenciamento de tarefas de todas as equipes" />
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tarefa ou equipe..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TaskStatus | "")}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
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

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tarefa</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Equipe</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Etapa</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Prazo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Arquivos</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">{task.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{task.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/equipes/${task.teamId}`} className="text-sm text-primary hover:text-primary-dark">
                        {task.teamName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{STAGE_NAMES[task.stage]}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {task.dueDate}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{task.files.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tasks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma tarefa encontrada</p>
          )}
        </div>
      </div>
    </div>
  );
}

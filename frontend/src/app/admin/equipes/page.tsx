"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { TeamStatusBadge } from "@/components/StatusBadge";
import StagePipeline from "@/components/StagePipeline";
import { mockTeams, mockTasks, COURSES, getMentors, getMentorIdForTeam } from "@/lib/mock-data";
import { TaskStatus } from "@/lib/types";
import { Search, ChevronRight, Filter } from "lucide-react";

export default function EquipesPage() {
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterMentor, setFilterMentor] = useState("");
  const [filterTaskStatus, setFilterTaskStatus] = useState<TaskStatus | "">("");

  const mentors = getMentors();

  const filtered = mockTeams.filter((t) => {
    const matchesSearch =
      t.ideaName.toLowerCase().includes(search.toLowerCase()) ||
      t.leader.name.toLowerCase().includes(search.toLowerCase()) ||
      t.area.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filterCourse && t.leader.course !== filterCourse) return false;
    if (filterMentor && getMentorIdForTeam(t.id) !== filterMentor) return false;
    if (filterTaskStatus && !mockTasks.some((task) => task.teamId === t.id && task.status === filterTaskStatus)) return false;
    return true;
  });

  return (
    <div>
      <Header title="Equipes" userName="Prof. Carlos Silva" subtitle={`${mockTeams.length} equipes cadastradas`} />
      <div className="p-6">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-light" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar equipe, líder ou área..."
              className="w-full pl-9 pr-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-light shrink-0" />
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="px-3 py-2 border border-input-border rounded-lg text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todos os cursos</option>
              {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filterMentor}
              onChange={(e) => setFilterMentor(e.target.value)}
              className="px-3 py-2 border border-input-border rounded-lg text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Todos os mentores</option>
              {mentors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select
              value={filterTaskStatus}
              onChange={(e) => setFilterTaskStatus(e.target.value as TaskStatus | "")}
              className="px-3 py-2 border border-input-border rounded-lg text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Qualquer status de tarefa</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="entregue">Entregue</option>
              <option value="atrasada">Atrasada</option>
              <option value="aprovada">Aprovada</option>
              <option value="reprovada">Ajustar</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((team) => (
            <Link
              key={team.id}
              href={`/admin/equipes/${team.id}`}
              className="block bg-card rounded-xl border border-card-border p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-foreground">{team.ideaName}</h3>
                    <TeamStatusBadge status={team.status} />
                  </div>
                  <p className="text-sm text-muted mt-0.5">
                    Líder: {team.leader.name} &middot; {team.area}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-light mt-1" />
              </div>
              <p className="text-sm text-muted mb-3 line-clamp-1">{team.description}</p>
              <div className="max-w-lg">
                <StagePipeline currentStage={team.currentStage} compact />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

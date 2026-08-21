"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { TeamStatusBadge } from "@/components/StatusBadge";
import StagePipeline from "@/components/StagePipeline";
import { mockTeams, getMentorName } from "@/lib/mock-data";
import { STAGE_NAMES } from "@/lib/types";
import { Search, ChevronRight } from "lucide-react";

export default function EquipesPage() {
  const [search, setSearch] = useState("");

  const filtered = mockTeams.filter((t) =>
    t.ideaName.toLowerCase().includes(search.toLowerCase()) ||
    t.leader.name.toLowerCase().includes(search.toLowerCase()) ||
    t.area.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Equipes" userName="Prof. Carlos Silva" subtitle={`${mockTeams.length} equipes cadastradas`} />
      <div className="p-6">
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar equipe, líder ou área..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((team) => (
            <Link
              key={team.id}
              href={`/admin/equipes/${team.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-gray-800">{team.ideaName}</h3>
                    <TeamStatusBadge status={team.status} />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Líder: {team.leader.name} &middot; {team.area} &middot; Mentor: {getMentorName(team.mentorId)}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 mt-1" />
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-1">{team.description}</p>
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

"use client";

import { use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import TeamDetail from "@/components/TeamDetail";
import { mockTeams, getTasksByTeam, getNotesByTeam } from "@/lib/mock-data";

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const team = mockTeams.find((t) => t.id === id);

  if (!team) {
    return (
      <div>
        <Header title="Equipe não encontrada" userName="Prof. Carlos Silva" />
        <div className="p-6">
          <p className="text-muted">A equipe solicitada não foi encontrada.</p>
          <Link href="/admin" className="text-primary text-sm mt-2 inline-block">Voltar ao dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <TeamDetail
      team={team}
      initialTasks={getTasksByTeam(team.id)}
      initialNotes={getNotesByTeam(team.id)}
      authorName="Prof. Carlos Silva"
      backHref="/admin"
    />
  );
}

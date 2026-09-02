"use client";

import { use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import TeamDetail from "@/components/TeamDetail";
import { getTasksByTeam, getNotesByTeam, getTeamsByMentor } from "@/lib/mock-data";

const CURRENT_MENTOR_ID = "mentor-1";

export default function MentorTeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const mentorTeams = getTeamsByMentor(CURRENT_MENTOR_ID);
  const team = mentorTeams.find((t) => t.id === id);

  if (!team) {
    return (
      <div>
        <Header title="Equipe não encontrada" userName="Ana Beatriz Ramos" />
        <div className="p-6">
          <p className="text-muted">A equipe solicitada não foi encontrada ou não está sob sua mentoria.</p>
          <Link href="/mentor" className="text-primary text-sm mt-2 inline-block">Voltar ao dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <TeamDetail
      team={team}
      initialTasks={getTasksByTeam(team.id)}
      initialNotes={getNotesByTeam(team.id)}
      authorName="Ana Beatriz Ramos"
      backHref="/mentor/equipes"
    />
  );
}

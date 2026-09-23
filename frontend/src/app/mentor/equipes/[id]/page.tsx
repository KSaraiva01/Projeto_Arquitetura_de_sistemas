"use client";

import { use } from "react";
import TeamDetail from "@/components/TeamDetail";
import { TeamDetailSkeleton } from "@/components/Skeleton";
import { useRequireSession } from "@/lib/session";

/** Mesmo detalhe do admin; equipe fora da mentoria volta 403 do backend (RNF-03). */
export default function MentorTeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useRequireSession(["MENTOR"]);

  if (loading || !user) {
    return <TeamDetailSkeleton />;
  }

  return <TeamDetail teamId={id} user={user} backHref="/mentor/equipes" />;
}

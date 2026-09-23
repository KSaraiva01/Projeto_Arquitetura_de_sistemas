"use client";

import { use } from "react";
import TeamDetail from "@/components/TeamDetail";
import { TeamDetailSkeleton } from "@/components/Skeleton";
import { useRequireSession } from "@/lib/session";

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useRequireSession(["ADMIN"]);

  if (loading || !user) {
    return <TeamDetailSkeleton />;
  }

  return <TeamDetail teamId={id} user={user} backHref="/admin" />;
}

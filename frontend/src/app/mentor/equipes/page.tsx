"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { DashboardSkeleton } from "@/components/Skeleton";
import TeamList from "@/components/TeamList";
import { useRequireSession } from "@/lib/session";

/** O backend já devolve só as equipes que este mentor acompanha (RNF-03). */
export default function MentorEquipesPage() {
  const { user, loading } = useRequireSession(["MENTOR"]);
  const [total, setTotal] = useState<number | null>(null);

  if (loading || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <div>
      <Header
        title="Minhas Equipes"
        userName={user.name}
        subtitle={total === null ? "Carregando..." : `${total} ${total === 1 ? "equipe" : "equipes"} sob minha mentoria`}
      />
      <div className="p-6">
        <TeamList detailBasePath="/mentor/equipes" onLoaded={setTotal} />
      </div>
    </div>
  );
}

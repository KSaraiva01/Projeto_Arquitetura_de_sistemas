"use client";

import CalendarView from "@/components/CalendarView";
import Header from "@/components/Header";
import { useRequireSession } from "@/lib/session";

/** Calendário de atividades e prazos — mentor. */
export default function CalendarioMentorPage() {
  const { user, loading } = useRequireSession(["MENTOR"]);

  if (loading || !user) {
    return <div className="p-6 text-sm text-muted">Carregando...</div>;
  }

  return (
    <div>
      <Header
        title="Calendário"
        userName={user.name}
        subtitle="Prazos e lembretes das equipes sob sua mentoria"
      />
      <div className="p-6">
        <CalendarView showTeamName={true} />
      </div>
    </div>
  );
}

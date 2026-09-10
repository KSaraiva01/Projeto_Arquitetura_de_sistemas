"use client";

import CalendarView from "@/components/CalendarView";
import Header from "@/components/Header";
import { useRequireSession } from "@/lib/session";

/** Calendário de atividades e prazos — administrador. */
export default function CalendarioAdminPage() {
  const { user, loading } = useRequireSession(["ADMIN"]);

  if (loading || !user) {
    return <div className="p-6 text-sm text-muted">Carregando...</div>;
  }

  return (
    <div>
      <Header
        title="Calendário"
        userName={user.name}
        subtitle="Prazos e lembretes de todas as equipes"
      />
      <div className="p-6">
        <CalendarView showTeamName={true} />
      </div>
    </div>
  );
}

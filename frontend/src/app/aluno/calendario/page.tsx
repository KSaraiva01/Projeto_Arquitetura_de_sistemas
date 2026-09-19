"use client";

import CalendarView from "@/components/CalendarView";
import Header from "@/components/Header";
import { useRequireSession } from "@/lib/session";

/** Calendário de atividades e prazos — aluno líder. */
export default function CalendarioAlunoPage() {
  const { user, loading } = useRequireSession(["STUDENT"]);

  if (loading || !user) {
    return <div className="p-6 text-sm text-muted">Carregando...</div>;
  }

  return (
    <div>
      <Header
        title="Calendário"
        userName={user.name}
        subtitle="Prazos e lembretes das suas tarefas"
      />
      <div className="p-6">
        <CalendarView showTeamName={false} />
      </div>
    </div>
  );
}

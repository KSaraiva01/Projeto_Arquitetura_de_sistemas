"use client";

import TaskList from "@/components/TaskList";

/** Tarefas das equipes que o mentor acompanha (o backend aplica o escopo). */
export default function MentorTarefasPage() {
  return <TaskList role="MENTOR" detailBasePath="/mentor/equipes" />;
}

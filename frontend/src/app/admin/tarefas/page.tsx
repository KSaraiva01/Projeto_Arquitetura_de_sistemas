"use client";

import TaskList from "@/components/TaskList";

/** Tarefas de todas as equipes — administrador. */
export default function TarefasAdminPage() {
  return <TaskList role="ADMIN" detailBasePath="/admin/equipes" />;
}

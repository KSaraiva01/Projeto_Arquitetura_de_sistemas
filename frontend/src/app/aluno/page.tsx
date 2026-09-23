"use client";

import StudentHome from "@/components/StudentHome";

/** Minha Jornada — aluno líder (o AppShell manda o integrante para /integrante). */
export default function AlunoDashboard() {
  return <StudentHome tasksHref="/aluno/tarefas" />;
}

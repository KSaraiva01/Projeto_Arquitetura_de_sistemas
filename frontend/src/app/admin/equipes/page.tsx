"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { DashboardSkeleton } from "@/components/Skeleton";
import TeamList from "@/components/TeamList";
import { api } from "@/lib/api";
import { TASK_STATUS_LABELS, type ApiTaskStatus } from "@/lib/api-types";
import { useRequireSession } from "@/lib/session";
import { Filter } from "lucide-react";

const selectClass =
  "px-3 py-2 border border-input-border rounded-lg text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function EquipesPage() {
  const { user, loading } = useRequireSession(["ADMIN"]);
  const [total, setTotal] = useState<number | null>(null);
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [mentors, setMentors] = useState<Array<{ id: string; name: string }>>([]);
  const [filterCourse, setFilterCourse] = useState("");
  const [filterMentor, setFilterMentor] = useState("");
  const [filterTaskStatus, setFilterTaskStatus] = useState<ApiTaskStatus | "">("");

  // Opções dos filtros. Se falharem, os selects só ficam com "Todos".
  useEffect(() => {
    if (!user) return;
    api.courses().then((result) => setCourses(result.data)).catch(() => {});
    api.mentors().then((result) => setMentors(result.data)).catch(() => {});
  }, [user]);

  if (loading || !user) {
    return <DashboardSkeleton />;
  }

  const filtered = Boolean(filterCourse || filterMentor || filterTaskStatus);

  return (
    <div>
      <Header
        title="Equipes"
        userName={user.name}
        subtitle={
          total === null
            ? "Carregando..."
            : filtered
              ? `${total} ${total === 1 ? "equipe encontrada" : "equipes encontradas"} com estes filtros`
              : `${total} ${total === 1 ? "equipe cadastrada" : "equipes cadastradas"}`
        }
      />
      <div className="p-6">
        <TeamList
          detailBasePath="/admin/equipes"
          filters={{
            course: filterCourse || undefined,
            mentorId: filterMentor || undefined,
            taskStatus: filterTaskStatus || undefined,
          }}
          onLoaded={setTotal}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-light shrink-0" />
            <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className={selectClass}>
              <option value="">Todos os cursos</option>
              {courses.map((course) => (
                <option key={course.id} value={course.name}>
                  {course.name}
                </option>
              ))}
            </select>
            <select value={filterMentor} onChange={(e) => setFilterMentor(e.target.value)} className={selectClass}>
              <option value="">Todos os mentores</option>
              {mentors.map((mentor) => (
                <option key={mentor.id} value={mentor.id}>
                  {mentor.name}
                </option>
              ))}
            </select>
            <select
              value={filterTaskStatus}
              onChange={(e) => setFilterTaskStatus(e.target.value as ApiTaskStatus | "")}
              className={selectClass}
            >
              <option value="">Qualquer status de tarefa</option>
              {(Object.keys(TASK_STATUS_LABELS) as ApiTaskStatus[]).map((status) => (
                <option key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </TeamList>
      </div>
    </div>
  );
}

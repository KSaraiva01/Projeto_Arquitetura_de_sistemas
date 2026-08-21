// Shell do administrador: barra lateral + rotas internas de verdade
// (/admin/dashboard, /admin/kanban, /admin/tasks), então dá pra
// compartilhar link direto de cada tela e usar voltar/avançar do navegador.
import { useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import type { AuthState, Team } from "../../types";
import { MOCK_TEAMS, STAGES } from "../../data/mockData";
import AdminDashboard from "./AdminDashboard";
import KanbanBoard from "./KanbanBoard";
import TeamDetailModal from "./TeamDetailModal";

type AdminView = "dashboard" | "kanban" | "tasks";

interface Props {
  auth: AuthState;
  onLogout: () => void;
}

// ── Ícones SVG inline ─────────────────────────────────────────
function IconDashboard() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  );
}
function IconKanban() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h4v14zm6 0h-4V3h4v14zm4-14h-2v8h2a2 2 0 002-2V5a2 2 0 00-2-2z" />
    </svg>
  );
}
function IconTasks() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

export default function AdminApp({ auth, onLogout }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  // Deriva a view ativa da URL (/admin/dashboard, /admin/kanban, /admin/tasks)
  const view = (location.pathname.split("/")[2] ?? "dashboard") as AdminView;
  const setView = (v: AdminView) => navigate(`/admin/${v}`);
  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Avança ou retrocede a etapa de uma equipe
  function changeStage(teamId: string, delta: 1 | -1) {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const next = Math.min(6, Math.max(1, t.currentStage + delta)) as Team["currentStage"];
        const updated = { ...t, currentStage: next };
        if (selectedTeam?.id === teamId) setSelectedTeam(updated);
        return updated;
      })
    );
  }

  // Aprova ou rejeita uma tarefa
  function updateTaskStatus(teamId: string, taskId: string, status: string, comment?: string) {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const updated = {
          ...t,
          tasks: t.tasks.map((tk) =>
            tk.id === taskId ? { ...tk, status: status as any, adminComment: comment } : tk
          ),
        };
        if (selectedTeam?.id === teamId) setSelectedTeam(updated);
        return updated;
      })
    );
  }

  // Adiciona nota interna
  function addNote(teamId: string, text: string) {
    const note = { id: Date.now().toString(), text, author: auth.name, createdAt: new Date().toISOString().split("T")[0] };
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const updated = { ...t, notes: [...t.notes, note] };
        if (selectedTeam?.id === teamId) setSelectedTeam(updated);
        return updated;
      })
    );
  }

  const navItems: { id: AdminView; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <IconDashboard /> },
    { id: "kanban", label: "Funil de equipes", icon: <IconKanban /> },
    { id: "tasks", label: "Tarefas pendentes", icon: <IconTasks /> },
  ];

  // Contagem de tarefas atrasadas para badge
  const delayedCount = teams.flatMap((t) => t.tasks).filter((tk) => tk.status === "atrasada").length;

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "var(--background)" }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`flex flex-col shrink-0 transition-all duration-300 ${sidebarOpen ? "w-60" : "w-16"}`}
        style={{ background: "var(--sidebar)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            IH
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="font-display font-semibold text-sm leading-tight" style={{ color: "var(--sidebar-foreground)" }}>
                InfoHub
              </div>
              <div className="text-xs opacity-50" style={{ color: "var(--sidebar-foreground)" }}>
                Administração
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`ml-auto p-1 rounded opacity-50 hover:opacity-100 ${!sidebarOpen && "hidden"}`}
            style={{ color: "var(--sidebar-foreground)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute left-3 p-1 rounded opacity-50 hover:opacity-100"
              style={{ color: "var(--sidebar-foreground)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all`}
                style={{
                  color: active ? "#fff" : "rgba(232,237,245,0.65)",
                  background: active ? "rgba(255,255,255,0.12)" : "transparent",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span className="shrink-0">{item.icon}</span>
                {sidebarOpen && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
                {sidebarOpen && item.id === "tasks" && delayedCount > 0 && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "var(--danger)", color: "#fff" }}
                  >
                    {delayedCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Rodapé do sidebar */}
        <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "rgba(255,255,255,0.15)", color: "var(--sidebar-foreground)" }}
              >
                {auth.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="text-xs font-semibold truncate" style={{ color: "var(--sidebar-foreground)" }}>
                  {auth.name}
                </div>
                <div className="text-xs opacity-50 truncate" style={{ color: "var(--sidebar-foreground)" }}>
                  {auth.email}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-1 rounded opacity-50 hover:opacity-100"
                style={{ color: "var(--sidebar-foreground)" }}
                title="Sair"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={onLogout}
              className="w-full flex justify-center p-1.5 rounded opacity-50 hover:opacity-100"
              style={{ color: "var(--sidebar-foreground)" }}
              title="Sair"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </aside>

      {/* ── Conteúdo principal ──────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Topbar */}
        <header
          className="px-8 py-4 flex items-center justify-between border-b shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <div>
            <h1 className="font-display text-xl font-semibold" style={{ color: "var(--foreground)" }}>
              {view === "dashboard" && "Dashboard"}
              {view === "kanban" && "Funil de Equipes"}
              {view === "tasks" && "Tarefas Pendentes"}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {teams.filter((t) => t.status === "ativo").length} equipes ativas · semestre 2025/1
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notificação rápida */}
            {delayedCount > 0 && (
              <button
                onClick={() => setView("tasks")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {delayedCount} tarefa{delayedCount > 1 ? "s" : ""} atrasada{delayedCount > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </header>

        {/* Views: cada uma é uma rota real dentro de /admin/* */}
        <div className="flex-1 overflow-auto p-8">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route
              path="dashboard"
              element={<AdminDashboard teams={teams} onSelectTeam={setSelectedTeam} onViewKanban={() => setView("kanban")} />}
            />
            <Route path="kanban" element={<KanbanBoard teams={teams} onSelectTeam={setSelectedTeam} />} />
            <Route
              path="tasks"
              element={<TasksView teams={teams} onSelectTeam={setSelectedTeam} onUpdateTask={updateTaskStatus} />}
            />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </main>

      {/* ── Modal de detalhe da equipe ──────────────────────── */}
      {selectedTeam && (
        <TeamDetailModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
          onChangeStage={changeStage}
          onUpdateTask={updateTaskStatus}
          onAddNote={addNote}
        />
      )}
    </div>
  );
}

// ── View de tarefas pendentes ────────────────────────────────
function TasksView({
  teams,
  onSelectTeam,
  onUpdateTask,
}: {
  teams: Team[];
  onSelectTeam: (t: Team) => void;
  onUpdateTask: (teamId: string, taskId: string, status: string, comment?: string) => void;
}) {
  const pendingTasks = teams.flatMap((team) =>
    team.tasks
      .filter((tk) => ["pendente", "em_andamento", "atrasada", "entregue", "ajustar"].includes(tk.status))
      .map((tk) => ({ ...tk, team }))
  );

  const statusMeta: Record<string, { label: string; bg: string; color: string }> = {
    pendente:     { label: "Pendente",     bg: "var(--secondary)",  color: "var(--secondary-foreground)" },
    em_andamento: { label: "Em andamento", bg: "#eff6ff",           color: "var(--primary)" },
    atrasada:     { label: "Atrasada",     bg: "var(--danger-bg)",  color: "var(--danger)" },
    entregue:     { label: "Entregue",     bg: "#ecfdf5",           color: "var(--success)" },
    ajustar:      { label: "Ajustar",      bg: "var(--warning-bg)", color: "var(--warning)" },
  };

  if (pendingTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--success)", opacity: 0.5 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-3 text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
          Nenhuma tarefa pendente. Tudo em dia!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-4xl">
      {pendingTasks.map(({ team, ...task }) => {
        const meta = statusMeta[task.status] ?? statusMeta.pendente;
        const stage = STAGES.find((s) => s.id === task.stageId);
        return (
          <div
            key={task.id}
            className="flex items-start gap-4 p-5 rounded-xl border"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                  {task.title}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.label}
                </span>
                {stage && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${stage.color} ${stage.textColor}`}
                  >
                    {stage.name}
                  </span>
                )}
              </div>
              <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>
                {team.projectName} · Prazo: {new Date(task.dueDate).toLocaleDateString("pt-BR")}
              </p>
              <p className="text-sm line-clamp-2" style={{ color: "var(--muted-foreground)" }}>
                {task.description}
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => onSelectTeam(team)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}
              >
                Ver equipe
              </button>
              {task.status === "entregue" && (
                <>
                  <button
                    onClick={() => onUpdateTask(team.id, task.id, "aprovada")}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "#ecfdf5", color: "var(--success)" }}
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => onUpdateTask(team.id, task.id, "ajustar", "Solicite os ajustes necessários.")}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
                  >
                    Pedir ajuste
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

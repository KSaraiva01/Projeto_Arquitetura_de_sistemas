// Painel do aluno: jornada, tarefas pendentes e entrega de arquivos
// As abas são rotas reais (/student/jornada, /student/tarefas), então dá
// pra compartilhar link direto e usar voltar/avançar do navegador.
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import type { AuthState, Task } from "../../types";
import { MOCK_TEAMS, STAGES, STUDENT_TEAM_ID } from "../../data/mockData";

interface Props {
  auth: AuthState;
  onLogout: () => void;
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  pendente:     { label: "Pendente",      bg: "#f1f5f9", color: "#475569" },
  em_andamento: { label: "Em andamento",  bg: "#eff6ff", color: "#1d4ed8" },
  atrasada:     { label: "Atrasada",      bg: "#fef2f2", color: "#dc2626" },
  entregue:     { label: "Entregue",      bg: "#ecfdf5", color: "#059669" },
  aprovada:     { label: "Aprovada ✓",    bg: "#d1fae5", color: "#065f46" },
  ajustar:      { label: "Ajustar",       bg: "#fffbeb", color: "#d97706" },
};

export default function StudentApp({ auth, onLogout }: Props) {
  const [tasks, setTasks] = useState(() => {
    const team = MOCK_TEAMS.find((t) => t.id === (auth.teamId ?? STUDENT_TEAM_ID))!;
    return team.tasks;
  });
  const location = useLocation();
  const navigate = useNavigate();
  const tabFromUrl = location.pathname.split("/")[2];
  const activeTab: "jornada" | "tarefas" = tabFromUrl === "tarefas" ? "tarefas" : "jornada";
  const setActiveTab = (t: "jornada" | "tarefas") => navigate(`/student/${t}`);
  // Simulação de upload: guarda nome do arquivo por tarefa
  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const team = MOCK_TEAMS.find((t) => t.id === (auth.teamId ?? STUDENT_TEAM_ID))!;
  const stage = STAGES.find((s) => s.id === team.currentStage)!;

  function handleFileChange(taskId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setUploaded((p) => ({ ...p, [taskId]: file.name }));
  }

  function handleSubmitTask(taskId: string) {
    setSubmitting((p) => ({ ...p, [taskId]: true }));
    setTimeout(() => {
      setTasks((prev) =>
        prev.map((tk) =>
          tk.id === taskId
            ? {
                ...tk,
                status: "entregue",
                submissions: [
                  ...tk.submissions,
                  {
                    id: Date.now().toString(),
                    fileName: uploaded[taskId] ?? "entrega.pdf",
                    fileType: "pdf",
                    submittedAt: new Date().toISOString().split("T")[0],
                    version: tk.submissions.length + 1,
                  },
                ],
              }
            : tk
        )
      );
      setSubmitting((p) => ({ ...p, [taskId]: false }));
      setUploaded((p) => { const n = { ...p }; delete n[taskId]; return n; });
    }, 1200);
  }

  const pendingTasks = tasks.filter((tk) => ["pendente", "em_andamento", "atrasada", "ajustar"].includes(tk.status));
  const doneTasks = tasks.filter((tk) => ["entregue", "aprovada"].includes(tk.status));

  // Normaliza "/student" para a aba padrão
  if (location.pathname === "/student") {
    return <Navigate to="/student/jornada" replace />;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-10 px-6 py-4 border-b flex items-center gap-4"
        style={{ background: "var(--sidebar)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          IH
        </div>
        <div className="flex-1">
          <span className="font-display font-semibold text-base" style={{ color: "#fff" }}>InfoHub</span>
          <span className="text-xs ml-2 opacity-60" style={{ color: "#fff" }}>Portal do Aluno</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium" style={{ color: "#fff" }}>{auth.name}</div>
            <div className="text-xs opacity-50" style={{ color: "#fff" }}>{auth.email}</div>
          </div>
          <button
            onClick={onLogout}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* ── Projeto card ── */}
        <div
          className="rounded-2xl p-6 mb-6 border"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
              style={{ background: "var(--secondary)", color: "var(--primary)" }}
            >
              {team.projectName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
                {team.projectName}
              </h1>
              <p className="text-sm mt-1 line-clamp-2" style={{ color: "var(--muted-foreground)" }}>
                {team.ideaDescription}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${stage.color} ${stage.textColor}`}>
                  {stage.fullName}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}>
                  {team.area}
                </span>
                {team.mentor && (
                  <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}>
                    Mentor: {team.mentor}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "var(--muted)" }}>
          {(["jornada", "tarefas"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: activeTab === t ? "var(--card)" : "transparent",
                color: activeTab === t ? "var(--foreground)" : "var(--muted-foreground)",
                boxShadow: activeTab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t === "jornada" ? "Minha jornada" : `Tarefas (${pendingTasks.length} pendentes)`}
            </button>
          ))}
        </div>

        {/* ── Jornada (timeline) ── */}
        {activeTab === "jornada" && (
          <div className="space-y-3">
            {STAGES.map((s) => {
              const isDone = s.id < team.currentStage;
              const isCurrent = s.id === team.currentStage;
              const isFuture = s.id > team.currentStage;
              return (
                <div
                  key={s.id}
                  className="flex gap-4 p-4 rounded-xl border"
                  style={{
                    background: isCurrent ? "var(--card)" : isFuture ? "transparent" : "var(--card)",
                    borderColor: isCurrent ? "var(--primary)" : "var(--border)",
                    opacity: isFuture ? 0.5 : 1,
                  }}
                >
                  {/* Indicador */}
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: isDone ? "var(--success)" : isCurrent ? "var(--primary)" : "var(--muted)",
                        color: isDone || isCurrent ? "#fff" : "var(--muted-foreground)",
                      }}
                    >
                      {isDone ? "✓" : s.id}
                    </div>
                    {s.id < 6 && (
                      <div
                        className="w-px flex-1 min-h-4"
                        style={{ background: isDone ? "var(--success)" : "var(--border)", opacity: 0.5 }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                        {s.fullName}
                      </span>
                      {isCurrent && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#eff6ff", color: "var(--primary)" }}>
                          Etapa atual
                        </span>
                      )}
                    </div>
                    <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>
                      {s.description}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      <strong>Entregável:</strong> {s.deliverable}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Status InovAMF */}
            <div
              className="flex gap-4 p-4 rounded-xl border-2"
              style={{
                borderColor: team.status === "encaminhado" ? "var(--success)" : "var(--border)",
                background: team.status === "encaminhado" ? "#ecfdf5" : "transparent",
                opacity: team.currentStage < 6 || team.status !== "encaminhado" ? 0.4 : 1,
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: team.status === "encaminhado" ? "var(--success)" : "var(--muted)", color: "#fff" }}
              >
                ★
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                  Encaminhamento ao InovAMF
                </div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {team.status === "encaminhado"
                    ? "Parabéns! Sua equipe foi encaminhada ao InovAMF."
                    : "Conclua a Etapa 6 para ser encaminhado ao InovAMF."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tarefas ── */}
        {activeTab === "tarefas" && (
          <div className="space-y-6">
            {/* Pendentes */}
            {pendingTasks.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--foreground)" }}>
                  Pendentes ({pendingTasks.length})
                </h3>
                <div className="space-y-3">
                  {pendingTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      uploadedName={uploaded[task.id]}
                      isSubmitting={!!submitting[task.id]}
                      onFileChange={(e) => handleFileChange(task.id, e)}
                      onSubmit={() => handleSubmitTask(task.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Concluídas */}
            {doneTasks.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--muted-foreground)" }}>
                  Concluídas ({doneTasks.length})
                </h3>
                <div className="space-y-3">
                  {doneTasks.map((task) => (
                    <TaskCard key={task.id} task={task} readonly />
                  ))}
                </div>
              </div>
            )}

            {tasks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Nenhuma tarefa atribuída ainda. Aguarde o contato da equipe InfoHub.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente de card de tarefa ──────────────────────────────
function TaskCard({
  task,
  uploadedName,
  isSubmitting,
  onFileChange,
  onSubmit,
  readonly = false,
}: {
  task: Task;
  uploadedName?: string;
  isSubmitting?: boolean;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: () => void;
  readonly?: boolean;
}) {
  const meta = STATUS_META[task.status] ?? STATUS_META.pendente;
  const stage = STAGES.find((s) => s.id === task.stageId);
  const isOverdue = new Date(task.dueDate) < new Date() && !["entregue", "aprovada"].includes(task.status);

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: "var(--card)",
        borderColor: task.status === "atrasada" ? "var(--danger)" : task.status === "ajustar" ? "var(--warning)" : "var(--border)",
      }}
    >
      <div className="flex items-start gap-3 mb-3">
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
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: isOverdue ? "var(--danger)" : "var(--muted-foreground)" }}>
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Prazo: {new Date(task.dueDate).toLocaleDateString("pt-BR")}
            {isOverdue && " — VENCIDA"}
            {stage && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full ${stage.color} ${stage.textColor}`}>
                {stage.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
        {task.description}
      </p>

      {/* Feedback de ajuste */}
      {task.adminComment && (
        <div
          className="mb-4 p-3 rounded-lg text-xs"
          style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
        >
          <strong>Feedback do mentor:</strong> {task.adminComment}
        </div>
      )}

      {/* Arquivos anteriores */}
      {task.submissions.length > 0 && (
        <div className="mb-4 space-y-1.5">
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Arquivos enviados:
          </p>
          {task.submissions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
              style={{ background: "var(--muted)", color: "var(--foreground)" }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {s.fileName}
              <span className="ml-auto opacity-60">v{s.version}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upload (somente tarefas ativas) */}
      {!readonly && !["aprovada", "entregue"].includes(task.status) && (
        <div className="flex items-center gap-3 flex-wrap">
          <label
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer"
            style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {uploadedName ? uploadedName : "Selecionar arquivo"}
            <input type="file" className="hidden" onChange={onFileChange} accept=".pdf,.jpg,.jpeg,.png,.mp4" />
          </label>
          {uploadedName && (
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {isSubmitting ? "Enviando..." : "Enviar entrega"}
            </button>
          )}
        </div>
      )}

      {/* Status de entregue aguardando revisão */}
      {task.status === "entregue" && (
        <div
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
          style={{ background: "#ecfdf5", color: "var(--success)" }}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Entrega recebida — aguardando revisão do mentor
        </div>
      )}
    </div>
  );
}

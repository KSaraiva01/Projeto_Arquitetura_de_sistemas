// Modal de detalhe de equipe: dados, tarefas, histórico, notas internas
import { useState } from "react";
import type { Team } from "../../types";
import { STAGES } from "../../data/mockData";

interface Props {
  team: Team;
  onClose: () => void;
  onChangeStage: (teamId: string, delta: 1 | -1) => void;
  onUpdateTask: (teamId: string, taskId: string, status: string, comment?: string) => void;
  onAddNote: (teamId: string, text: string) => void;
}

type Tab = "overview" | "tasks" | "notes";

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  pendente:     { label: "Pendente",      bg: "#f1f5f9", color: "#475569" },
  em_andamento: { label: "Em andamento",  bg: "#eff6ff", color: "#1d4ed8" },
  atrasada:     { label: "Atrasada",      bg: "#fef2f2", color: "#dc2626" },
  entregue:     { label: "Entregue",      bg: "#ecfdf5", color: "#059669" },
  aprovada:     { label: "Aprovada ✓",    bg: "#d1fae5", color: "#065f46" },
  ajustar:      { label: "Ajustar",       bg: "#fffbeb", color: "#d97706" },
};

export default function TeamDetailModal({ team, onClose, onChangeStage, onUpdateTask, onAddNote }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [noteText, setNoteText] = useState("");
  const [adjustComment, setAdjustComment] = useState<Record<string, string>>({});
  const [showAdjustInput, setShowAdjustInput] = useState<Record<string, boolean>>({});

  const stage = STAGES.find((s) => s.id === team.currentStage)!;
  const leader = team.members.find((m) => m.role === "lider");

  function handleAddNote() {
    if (!noteText.trim()) return;
    onAddNote(team.id, noteText.trim());
    setNoteText("");
  }

  function handleRequestAdjust(taskId: string) {
    onUpdateTask(team.id, taskId, "ajustar", adjustComment[taskId] || "Solicite os ajustes necessários.");
    setShowAdjustInput((p) => ({ ...p, [taskId]: false }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ background: "rgba(15,31,61,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="h-full w-full max-w-2xl flex flex-col shadow-2xl"
        style={{ background: "var(--background)" }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-start gap-4 px-6 py-5 border-b shrink-0"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: "var(--secondary)", color: "var(--primary)" }}
          >
            {team.projectName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl font-semibold" style={{ color: "var(--foreground)" }}>
              {team.projectName}
            </h2>
            <div className="flex items-center flex-wrap gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stage.color} ${stage.textColor}`}>
                {stage.fullName}
              </span>
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{team.area}</span>
              {team.mentor && (
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Mentor: {team.mentor}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 shrink-0"
            style={{ color: "var(--muted-foreground)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Controle de etapa ── */}
        <div
          className="flex items-center gap-3 px-6 py-3 border-b shrink-0"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Avançar / retroceder etapa:
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              disabled={team.currentStage <= 1}
              onClick={() => onChangeStage(team.id, -1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30"
              style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}
            >
              ← Anterior
            </button>
            <span className="text-xs font-semibold px-2" style={{ color: "var(--foreground)" }}>
              Etapa {team.currentStage} / 6
            </span>
            <button
              disabled={team.currentStage >= 6}
              onClick={() => onChangeStage(team.id, 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              Próxima →
            </button>
          </div>
          {team.currentStage === 6 && (
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-bold ml-2"
              style={{ background: "#d1fae5", color: "#065f46" }}
            >
              ✓ Pronto para InovAMF
            </button>
          )}
        </div>

        {/* ── Tabs ── */}
        <div
          className="flex border-b shrink-0"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          {(["overview", "tasks", "notes"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-6 py-3 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: tab === t ? "var(--primary)" : "transparent",
                color: tab === t ? "var(--primary)" : "var(--muted-foreground)",
              }}
            >
              {t === "overview" && "Visão geral"}
              {t === "tasks" && `Tarefas (${team.tasks.length})`}
              {t === "notes" && `Anotações (${team.notes.length})`}
            </button>
          ))}
        </div>

        {/* ── Conteúdo das tabs ── */}
        <div className="flex-1 overflow-auto p-6">
          {/* ── Overview ── */}
          {tab === "overview" && (
            <div className="space-y-5">
              {/* Ideia */}
              <div>
                <h3 className="font-semibold text-sm mb-2" style={{ color: "var(--foreground)" }}>
                  Ideia de negócio
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  {team.ideaDescription}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}>
                    Área: {team.area}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}>
                    Estágio: {team.ideaStage}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}>
                    Semestre: {team.semester}
                  </span>
                </div>
              </div>

              {/* Membros */}
              <div>
                <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--foreground)" }}>
                  Equipe ({team.members.length} integrante{team.members.length > 1 ? "s" : ""})
                </h3>
                <div className="space-y-2">
                  {team.members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: "var(--secondary)", color: "var(--primary)" }}
                      >
                        {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                            {m.name}
                          </span>
                          {m.role === "lider" && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "#eff6ff", color: "var(--primary)" }}>
                              Líder
                            </span>
                          )}
                        </div>
                        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {m.course} · {m.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Informações de inscrição */}
              <div>
                <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--foreground)" }}>
                  Dados de inscrição
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "Inscrito em", value: new Date(team.createdAt).toLocaleDateString("pt-BR") },
                    { label: "Como conheceu", value: team.source ?? "Não informado" },
                    { label: "Mentor", value: team.mentor ?? "Não atribuído" },
                    { label: "E-mail líder", value: leader?.email ?? "—" },
                  ].map((row) => (
                    <div key={row.label} className="p-3 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                      <div className="text-xs mb-0.5" style={{ color: "var(--muted-foreground)" }}>{row.label}</div>
                      <div className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{row.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tarefas ── */}
          {tab === "tasks" && (
            <div className="space-y-3">
              {team.tasks.length === 0 && (
                <div className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Nenhuma tarefa atribuída ainda.
                </div>
              )}
              {team.tasks.map((task) => {
                const meta = STATUS_META[task.status] ?? STATUS_META.pendente;
                const taskStage = STAGES.find((s) => s.id === task.stageId);
                return (
                  <div
                    key={task.id}
                    className="rounded-xl border p-4"
                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start gap-3">
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
                          {taskStage && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${taskStage.color} ${taskStage.textColor}`}>
                              {taskStage.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>
                          Prazo: {new Date(task.dueDate).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                          {task.description}
                        </p>

                        {/* Submissões */}
                        {task.submissions.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                              Arquivos entregues:
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
                                <span>{s.fileName}</span>
                                <span className="ml-auto opacity-60">v{s.version} · {new Date(s.submittedAt).toLocaleDateString("pt-BR")}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Comentário de ajuste */}
                        {task.adminComment && (
                          <div
                            className="mt-3 p-3 rounded-lg text-xs"
                            style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
                          >
                            <strong>Feedback:</strong> {task.adminComment}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações do admin */}
                    {task.status === "entregue" && (
                      <div className="mt-4 pt-3 border-t flex flex-wrap gap-2" style={{ borderColor: "var(--border)" }}>
                        <button
                          onClick={() => onUpdateTask(team.id, task.id, "aprovada")}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: "#ecfdf5", color: "var(--success)" }}
                        >
                          ✓ Aprovar entrega
                        </button>
                        <button
                          onClick={() => setShowAdjustInput((p) => ({ ...p, [task.id]: true }))}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
                        >
                          Solicitar ajuste
                        </button>
                      </div>
                    )}
                    {showAdjustInput[task.id] && (
                      <div className="mt-3 flex gap-2">
                        <input
                          className="flex-1 px-3 py-2 rounded-lg border text-xs"
                          style={{ borderColor: "var(--border)", background: "var(--background)" }}
                          placeholder="Descreva o que precisa ser ajustado..."
                          value={adjustComment[task.id] ?? ""}
                          onChange={(e) => setAdjustComment((p) => ({ ...p, [task.id]: e.target.value }))}
                        />
                        <button
                          onClick={() => handleRequestAdjust(task.id)}
                          className="px-3 py-2 rounded-lg text-xs font-semibold"
                          style={{ background: "var(--warning)", color: "#fff" }}
                        >
                          Enviar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Anotações internas ── */}
          {tab === "notes" && (
            <div className="space-y-4">
              {/* Input de nova nota */}
              <div
                className="p-4 rounded-xl border"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <p className="text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>
                  Nova anotação interna (não visível ao aluno)
                </p>
                <textarea
                  className="w-full px-3 py-2.5 rounded-lg border text-sm resize-none"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
                  rows={3}
                  placeholder="Registre observações, pontos de atenção, decisões de mentoria..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <button
                  onClick={handleAddNote}
                  className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "var(--primary)", color: "#fff" }}
                >
                  Salvar anotação
                </button>
              </div>

              {/* Lista de notas */}
              {team.notes.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: "var(--muted-foreground)" }}>
                  Nenhuma anotação registrada.
                </p>
              )}
              {team.notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-xl border"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "var(--secondary)", color: "var(--primary)" }}
                    >
                      {note.author[0]}
                    </div>
                    <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                      {note.author}
                    </span>
                    <span className="text-xs ml-auto" style={{ color: "var(--muted-foreground)" }}>
                      {new Date(note.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
                    {note.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

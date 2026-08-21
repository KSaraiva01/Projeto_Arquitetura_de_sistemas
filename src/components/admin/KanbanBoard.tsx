// Funil kanban com as 6 etapas da jornada InfoHub
import type { Team } from "../../types";
import { STAGES } from "../../data/mockData";

interface Props {
  teams: Team[];
  onSelectTeam: (t: Team) => void;
}

export default function KanbanBoard({ teams, onSelectTeam }: Props) {
  const active = teams.filter((t) => t.status !== "inativo");

  return (
    <div>
      {/* Equipes encaminhadas ao InovAMF */}
      {teams.some((t) => t.status === "encaminhado") && (
        <div
          className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: "#ecfdf5", color: "var(--success)", border: "1px solid #a7f3d0" }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {teams.filter((t) => t.status === "encaminhado").length} equipe(s) encaminhada(s) ao InovAMF:{" "}
          {teams.filter((t) => t.status === "encaminhado").map((t) => t.projectName).join(", ")}
        </div>
      )}

      {/* Board horizontal com scroll */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 220px)" }}>
        {STAGES.map((stage) => {
          const stageTeams = active.filter((t) => t.currentStage === stage.id);
          return (
            <div key={stage.id} className="flex flex-col shrink-0 w-56">
              {/* Cabeçalho da coluna */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.color} ${stage.textColor}`}
                  >
                    E{stage.id}
                  </span>
                  <span className="text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>
                    {stage.name}
                  </span>
                  <span
                    className="ml-auto text-xs font-medium w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                  >
                    {stageTeams.length}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  {stage.description}
                </p>
              </div>

              {/* Cards das equipes */}
              <div className="flex-1 space-y-2">
                {stageTeams.length === 0 && (
                  <div
                    className="h-20 rounded-xl border-2 border-dashed flex items-center justify-center"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      Nenhuma equipe
                    </span>
                  </div>
                )}
                {stageTeams.map((team) => {
                  const delayedTasks = team.tasks.filter((tk) => tk.status === "atrasada").length;
                  const pendingTasks = team.tasks.filter((tk) => ["pendente", "em_andamento"].includes(tk.status)).length;
                  const submittedTasks = team.tasks.filter((tk) => tk.status === "entregue").length;
                  return (
                    <button
                      key={team.id}
                      onClick={() => onSelectTeam(team)}
                      className="w-full rounded-xl p-3.5 border text-left group"
                      style={{ background: "var(--card)", borderColor: "var(--border)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)";
                        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(26,86,219,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        (e.currentTarget as HTMLElement).style.boxShadow = "none";
                      }}
                    >
                      {/* Nome do projeto */}
                      <div className="font-semibold text-sm mb-1" style={{ color: "var(--foreground)" }}>
                        {team.projectName}
                      </div>

                      {/* Área */}
                      <div className="text-xs mb-2.5" style={{ color: "var(--muted-foreground)" }}>
                        {team.area}
                      </div>

                      {/* Líder */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <div
                          className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                          style={{ background: "var(--secondary)", color: "var(--primary)" }}
                        >
                          {team.members[0]?.name[0]}
                        </div>
                        <span className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                          {team.members[0]?.name.split(" ")[0]}
                        </span>
                        {team.members.length > 1 && (
                          <span className="text-xs ml-auto" style={{ color: "var(--muted-foreground)" }}>
                            +{team.members.length - 1}
                          </span>
                        )}
                      </div>

                      {/* Badges de status */}
                      <div className="flex flex-wrap gap-1">
                        {delayedTasks > 0 && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                            style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
                          >
                            {delayedTasks} atrasada{delayedTasks > 1 ? "s" : ""}
                          </span>
                        )}
                        {submittedTasks > 0 && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                            style={{ background: "#ecfdf5", color: "var(--success)" }}
                          >
                            {submittedTasks} p/ revisar
                          </span>
                        )}
                        {pendingTasks > 0 && delayedTasks === 0 && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                            style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}
                          >
                            {pendingTasks} pendente{pendingTasks > 1 ? "s" : ""}
                          </span>
                        )}
                        {!team.mentor && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                            style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
                          >
                            Sem mentor
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

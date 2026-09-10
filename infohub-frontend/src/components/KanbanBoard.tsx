"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Loader2,
  Users,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import {
  JOURNEY_STATUS_LABELS,
  TASK_STATUS_LABELS,
  type ApiBoard,
  type ApiStageBlocker,
  type ApiTeamCard,
} from "@/lib/api-types";

interface KanbanBoardProps {
  /** Base das rotas de detalhe: "/admin/equipes" ou "/mentor/equipes". */
  detailBasePath: string;
  filters?: Record<string, string>;
  onBoardChange?: (board: ApiBoard) => void;
}

interface PendingMove {
  team: ApiTeamCard;
  toStage: number;
  blockers: ApiStageBlocker[];
}

/**
 * RF-06 + RF-09 — funil das 6 etapas com arrastar e soltar.
 *
 * O arrastar usa a API nativa de drag-and-drop do HTML, sem biblioteca. Para
 * quem não usa mouse, cada cartão traz botões de mover para a etapa anterior
 * e para a próxima, que disparam exatamente o mesmo caminho.
 *
 * Quem não pode mover (aluno e integrante) recebe `canDrag: false` do
 * backend e vê o mesmo quadro em modo leitura.
 */
export default function KanbanBoard({
  detailBasePath,
  filters,
  onBoardChange,
}: KanbanBoardProps) {
  const [board, setBoard] = useState<ApiBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState<{
    kind: "ok" | "erro";
    text: string;
  } | null>(null);

  const filterKey = JSON.stringify(filters ?? {});

  const loadBoard = useCallback(async () => {
    try {
      const data = await api.board(JSON.parse(filterKey));
      // Os setState ficam depois do await para o quadro não piscar um estado
      // intermediário entre "limpando o erro" e "dados novos".
      setBoard(data);
      setError(null);
      onBoardChange?.(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o quadro. A API está no ar?",
      );
    } finally {
      setLoading(false);
    }
  }, [filterKey, onBoardChange]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  /**
   * Move a equipe de etapa.
   *
   * Sem `force`, o backend recusa com 409 quando faltam tarefas obrigatórias
   * aprovadas (RN-01) e devolve a lista — que abre o diálogo de confirmação.
   */
  const move = useCallback(
    async (team: ApiTeamCard, toStage: number, force = false, why?: string) => {
      if (team.journeyStage === toStage) return;

      setMovingId(team.id);

      try {
        const result = await api.changeStage(team.id, {
          toStage,
          force,
          reason: why?.trim() ? why.trim() : undefined,
        });

        setToast({ kind: "ok", text: result.message });
        setPendingMove(null);
        setReason("");
        await loadBoard();
      } catch (err) {
        if (
          err instanceof ApiError &&
          err.code === "STAGE_REQUIREMENTS_PENDING"
        ) {
          setPendingMove({
            team,
            toStage,
            blockers:
              (err.details?.pendingTasks as ApiStageBlocker[] | undefined) ?? [],
          });
          return;
        }

        setToast({
          kind: "erro",
          text:
            err instanceof ApiError
              ? err.message
              : "Não foi possível mover a equipe.",
        });
      } finally {
        setMovingId(null);
      }
    },
    [loadBoard],
  );

  function findTeam(teamId: string): ApiTeamCard | undefined {
    return board?.columns
      .flatMap((column) => column.teams)
      .find((team) => team.id === teamId);
  }

  function handleDrop(event: React.DragEvent, toStage: number) {
    event.preventDefault();
    setDropTarget(null);
    setDraggingId(null);

    const teamId = event.dataTransfer.getData("text/team-id");
    const team = teamId ? findTeam(teamId) : undefined;

    if (team) void move(team, toStage);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando o quadro...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-card-border rounded-xl p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-3" />
        <p className="text-sm text-foreground mb-1">{error}</p>
        <button
          onClick={() => void loadBoard()}
          className="mt-3 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!board) return null;

  return (
    <>
      {board.canDrag && (
        <p className="text-xs text-muted-light mb-3">
          Arraste um cartão para mudar a equipe de etapa, ou use as setas do
          próprio cartão.
        </p>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {board.columns.map((column) => {
          const isTarget = dropTarget === column.stage;

          return (
            <div key={column.stage} className="min-w-[280px] flex-1">
              <div className="bg-kanban-col-bg rounded-t-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                    {column.stage}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">
                    {column.name}
                  </h3>
                </div>
                <span className="text-xs text-muted bg-card px-2 py-0.5 rounded-full">
                  {column.teams.length}
                </span>
              </div>

              <div
                onDragOver={(event) => {
                  if (!board.canDrag) return;
                  event.preventDefault();
                  setDropTarget(column.stage);
                }}
                onDragLeave={() =>
                  setDropTarget((current) =>
                    current === column.stage ? null : current,
                  )
                }
                onDrop={(event) => handleDrop(event, column.stage)}
                className={`rounded-b-xl p-3 space-y-3 min-h-[220px] border transition-colors ${
                  isTarget
                    ? "bg-primary/5 border-primary border-dashed"
                    : "bg-kanban-col-bg/50 border-kanban-col-border"
                }`}
              >
                {column.teams.length === 0 && (
                  <p className="text-xs text-muted-light text-center py-8">
                    {isTarget ? "Solte aqui" : "Nenhuma equipe"}
                  </p>
                )}

                {column.teams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    canDrag={board.canDrag}
                    isDragging={draggingId === team.id}
                    isMoving={movingId === team.id}
                    detailBasePath={detailBasePath}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/team-id", team.id);
                      event.dataTransfer.effectAllowed = "move";
                      setDraggingId(team.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropTarget(null);
                    }}
                    onStep={(delta) => void move(team, team.journeyStage + delta)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {pendingMove && (
        <ConfirmAdvanceDialog
          move={pendingMove}
          reason={reason}
          onReasonChange={setReason}
          isSubmitting={movingId === pendingMove.team.id}
          onCancel={() => {
            setPendingMove(null);
            setReason("");
          }}
          onConfirm={() =>
            void move(pendingMove.team, pendingMove.toStage, true, reason)
          }
        />
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm ${
            toast.kind === "ok"
              ? "bg-success text-white"
              : "bg-danger text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </>
  );
}

function TeamCard({
  team,
  canDrag,
  isDragging,
  isMoving,
  detailBasePath,
  onDragStart,
  onDragEnd,
  onStep,
}: {
  team: ApiTeamCard;
  canDrag: boolean;
  isDragging: boolean;
  isMoving: boolean;
  detailBasePath: string;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  onStep: (delta: -1 | 1) => void;
}) {
  return (
    <div
      draggable={canDrag && !isMoving}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      // A opacidade dos estados transitórios (arrastando / salvando) vai
      // inline em vez de classe utilitária: é um estado momentâneo, não um
      // estilo do componente, e assim não depende da cascata do CSS.
      style={{ opacity: isDragging ? 0.4 : isMoving ? 0.6 : undefined }}
      className={`group relative bg-card rounded-lg border border-card-border p-4 transition-all hover:border-primary/30 ${
        canDrag ? "cursor-grab active:cursor-grabbing" : ""
      } ${isMoving ? "pointer-events-none" : ""}`}
    >
      {isMoving && (
        <Loader2 className="absolute top-3 right-3 w-4 h-4 animate-spin text-primary" />
      )}

      <div className="flex items-start gap-2 mb-2">
        {canDrag && (
          <GripVertical className="w-4 h-4 text-muted-light shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
        <div className="flex-1 min-w-0">
          <Link
            href={`${detailBasePath}/${team.id}`}
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            {team.name}
          </Link>
          <p className="text-xs text-muted mt-1 line-clamp-2">
            {team.description}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-light mb-2">
        <span className="truncate">{team.leader?.name ?? "Sem líder"}</span>
        <span className="shrink-0 ml-2">{team.category.name}</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-light">
        <span className="inline-flex items-center gap-1">
          <Users className="w-3 h-3" />
          {team.memberCount}
        </span>
        {team.overdueTasks > 0 && (
          <span className="inline-flex items-center gap-1 text-danger font-medium">
            <AlertTriangle className="w-3 h-3" />
            {team.overdueTasks} atrasada(s)
          </span>
        )}
        {team.journeyStatus !== "IN_PROGRESS" && (
          <span className="text-success font-medium">
            {JOURNEY_STATUS_LABELS[team.journeyStatus]}
          </span>
        )}
      </div>

      {team.mentors.length > 0 && (
        <p className="mt-2 text-[11px] text-muted-light truncate">
          Mentoria: {team.mentors.map((mentor) => mentor.name).join(", ")}
        </p>
      )}

      {/* Alternativa acessível ao arrastar, para teclado e toque. */}
      {canDrag && (
        <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-divider">
          <button
            type="button"
            onClick={() => onStep(-1)}
            disabled={team.journeyStage <= 1}
            aria-label={`Mover ${team.name} para a etapa anterior`}
            className="p-1 rounded text-muted hover:text-foreground hover:bg-hover-bg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onStep(1)}
            disabled={team.journeyStage >= 6}
            aria-label={`Mover ${team.name} para a próxima etapa`}
            className="p-1 rounded text-muted hover:text-foreground hover:bg-hover-bg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * RN-01 — a equipe só avança com as tarefas obrigatórias aprovadas, salvo
 * decisão manual do mentor. Este diálogo é essa decisão: mostra exatamente o
 * que está pendente e pede um motivo, que vai para o histórico da equipe.
 */
function ConfirmAdvanceDialog({
  move,
  reason,
  onReasonChange,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  move: PendingMove;
  reason: string;
  onReasonChange: (value: string) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-advance-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-card rounded-2xl border border-card-border shadow-xl max-w-lg w-full p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h2
              id="confirm-advance-title"
              className="text-base font-semibold text-foreground"
            >
              Avançar mesmo com pendências?
            </h2>
            <p className="text-sm text-muted mt-1">
              A equipe <strong>{move.team.name}</strong> tem tarefas
              obrigatórias sem aprovação nas etapas anteriores à {move.toStage}.
            </p>
          </div>
        </div>

        <ul className="space-y-2 mb-4 max-h-52 overflow-y-auto">
          {move.blockers.map((blocker) => (
            <li
              key={blocker.id}
              className="flex items-center justify-between gap-3 text-sm bg-hover-bg rounded-lg px-3 py-2"
            >
              <span className="text-foreground truncate">{blocker.title}</span>
              <span className="text-xs text-muted shrink-0">
                Etapa {blocker.stage} · {TASK_STATUS_LABELS[blocker.status]}
              </span>
            </li>
          ))}
        </ul>

        <label className="block text-sm font-medium text-foreground mb-1.5">
          Motivo do avanço manual
          <span className="text-muted-light font-normal"> (opcional)</span>
        </label>
        <textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          rows={2}
          placeholder="Ex.: entregas revisadas presencialmente no encontro."
          className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
        <p className="text-xs text-muted-light mt-1.5">
          O motivo fica registrado no histórico da equipe e na auditoria.
        </p>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground rounded-lg hover:bg-hover-bg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors inline-flex items-center gap-2 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Avançar mesmo assim
          </button>
        </div>
      </div>
    </div>
  );
}

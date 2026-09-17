"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Inbox,
  Loader2,
  Users,
  X,
} from "lucide-react";
import { BoardSkeleton } from "./Skeleton";
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
  /** Quando o quadro vem vazio por causa dos filtros, oferece limpá-los. */
  onClearFilters?: () => void;
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
  onClearFilters,
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

  // Rolagem horizontal: as 6 colunas passam de 1.700px, então as bordas
  // ganham um degradê e um botão enquanto houver mais quadro daquele lado —
  // sem isso ninguém descobre as etapas 5 e 6.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  const updateScrollCues = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScroll({
      left: el.scrollLeft > 8,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    updateScrollCues();
    window.addEventListener("resize", updateScrollCues);
    return () => window.removeEventListener("resize", updateScrollCues);
  }, [updateScrollCues, board]);

  function scrollBoard(direction: -1 | 1) {
    scrollRef.current?.scrollBy({ left: direction * 300, behavior: "smooth" });
  }

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
    return <BoardSkeleton />;
  }

  if (error) {
    return (
      <div className="animate-rise bg-card border border-card-border rounded-xl p-8 text-center">
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

  const isEmpty = board.columns.every((column) => column.teams.length === 0);

  if (isEmpty) {
    return (
      <div className="animate-rise flex flex-col items-center rounded-xl border border-card-border bg-card px-6 py-12 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
          <Inbox className="h-7 w-7" />
        </div>
        <p className="text-sm font-semibold text-foreground">Nenhuma equipe com estes filtros</p>
        <p className="mt-1 max-w-sm text-xs text-muted">
          Tente outra área, status ou mentor — ou limpe os filtros para ver o quadro completo.
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 rounded-lg border border-card-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-hover-bg"
          >
            Limpar filtros
          </button>
        )}
      </div>
    );
  }

  let cardIndex = 0;

  return (
    <>
      {board.canDrag && (
        <p className="text-xs text-muted-light mb-3">
          Arraste um cartão para mudar a equipe de etapa, ou use as setas do
          próprio cartão.
        </p>
      )}

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={updateScrollCues}
          className="flex gap-4 overflow-x-auto pb-4"
        >
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
                className={`rounded-b-xl p-3 space-y-3 min-h-[220px] border transition-colors duration-150 ${
                  isTarget
                    ? "animate-drop-pulse bg-primary/5 border-2 border-dashed border-primary"
                    : "bg-kanban-col-bg/50 border-kanban-col-border"
                }`}
              >
                {column.teams.length === 0 && (
                  <p className={`text-xs text-center py-8 ${isTarget ? "text-primary font-medium" : "text-muted-light"}`}>
                    {isTarget ? `Solte aqui para mover para a etapa ${column.stage}` : "Nenhuma equipe"}
                  </p>
                )}

                {column.teams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    index={cardIndex++}
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

        <ScrollCue side="left" visible={canScroll.left} onClick={() => scrollBoard(-1)} />
        <ScrollCue side="right" visible={canScroll.right} onClick={() => scrollBoard(1)} />
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
        <Toast
          key={toast.text}
          kind={toast.kind}
          text={toast.text}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}

/**
 * Degradê + botão numa das bordas do quadro, visíveis só enquanto há
 * colunas escondidas daquele lado.
 */
function ScrollCue({
  side,
  visible,
  onClick,
}: {
  side: "left" | "right";
  visible: boolean;
  onClick: () => void;
}) {
  const edge = side === "left" ? "left-0" : "right-0";
  const gradient =
    side === "left"
      ? "bg-gradient-to-r from-background to-transparent"
      : "bg-gradient-to-l from-background to-transparent";

  return (
    <div
      className={`pointer-events-none absolute top-0 bottom-4 w-20 transition-opacity duration-200 ${edge} ${gradient} ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        tabIndex={visible ? 0 : -1}
        aria-hidden={!visible}
        aria-label={side === "left" ? "Rolar para as etapas anteriores" : "Rolar para as próximas etapas"}
        className={`absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-card-border bg-card text-muted shadow-[0_4px_10px_-4px_rgba(17,24,39,0.25)] transition-colors hover:bg-hover-bg hover:text-foreground ${
          side === "left" ? "left-2" : "right-2"
        } ${visible ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        {side === "left" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </div>
  );
}

/**
 * Aviso no canto: entra da direita, mostra quanto tempo falta na barra de
 * baixo, pausa enquanto o mouse está em cima e sai para baixo. Fecha no X
 * ou sozinho em 5s.
 */
function Toast({
  kind,
  text,
  onClose,
}: {
  kind: "ok" | "erro";
  text: string;
  onClose: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const remaining = useRef(5000);
  const startedAt = useRef(0);

  const dismiss = useCallback(() => {
    setLeaving(true);
    window.setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (paused || leaving) return;
    startedAt.current = performance.now();
    const timer = window.setTimeout(dismiss, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt.current));
    };
  }, [paused, leaving, dismiss]);

  const isOk = kind === "ok";

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`fixed bottom-6 right-6 z-50 flex w-[360px] max-w-[calc(100vw-3rem)] items-start gap-2.5 overflow-hidden rounded-[10px] border border-card-border border-l-4 bg-card py-3 pl-3.5 pr-3 shadow-lg ${
        isOk ? "border-l-success" : "border-l-danger"
      } ${leaving ? "animate-toast-out" : "animate-toast-in"}`}
    >
      {isOk ? (
        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      ) : (
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
      )}
      <p className="flex-1 text-sm text-foreground">{text}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar aviso"
        className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-light transition-colors hover:bg-hover-bg hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-0 h-[3px] w-full origin-left ${isOk ? "bg-success/35" : "bg-danger/35"}`}
        style={{
          // A barra encolhe de 1 para 0 no mesmo tempo do aviso.
          animation: "toast-bar 5s linear forwards",
          animationPlayState: paused ? "paused" : "running",
        }}
      />
    </div>
  );
}

function TeamCard({
  team,
  index,
  canDrag,
  isDragging,
  isMoving,
  detailBasePath,
  onDragStart,
  onDragEnd,
  onStep,
}: {
  team: ApiTeamCard;
  index: number;
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
      // Os estados transitórios (arrastando / salvando) vão inline em vez
      // de classe utilitária: são momentâneos, não estilo do componente, e
      // assim não dependem da cascata do CSS. Cada cartão entra 40ms depois
      // do anterior.
      style={{
        opacity: isDragging ? 0.4 : isMoving ? 0.6 : undefined,
        animationDelay: `${Math.min(index, 10) * 40}ms`,
      }}
      className={`group relative animate-rise bg-card rounded-lg border border-card-border p-4 transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_20px_-8px_rgba(17,24,39,0.2)] ${
        canDrag ? "cursor-grab active:cursor-grabbing active:rotate-2 active:scale-[1.02] active:shadow-[0_16px_32px_-12px_rgba(17,24,39,0.35)]" : ""
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
  // Esc fecha; o foco vai para a caixa de motivo, que é o que se preenche.
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    reasonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-advance-title"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="animate-dialog-in bg-card rounded-2xl border border-card-border shadow-xl max-w-lg w-full p-6"
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
          ref={reasonRef}
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
            className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground rounded-lg hover:bg-hover-bg transition-colors inline-flex items-center gap-2"
          >
            Cancelar
            <kbd className="rounded border border-card-border px-1 text-[10px] font-normal text-muted-light">Esc</kbd>
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

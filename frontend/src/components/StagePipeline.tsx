"use client";

import { useEffect, useState } from "react";
import { JourneyStage, STAGE_NAMES } from "@/lib/types";
import { Check, Flag } from "lucide-react";

/** Uma etapa como o pipeline desenha — `ApiJourneyStage` já serve. */
export interface PipelineStage {
  id: string;
  name: string;
  /** Número da etapa padrão; nulo = etapa extra incluída pelo mentor. */
  number: number | null;
}

interface StagePipelineProps {
  /** Posição (1..n) da etapa atual dentro de `stages`. */
  currentStage: number;
  /** Jornada da equipe (padrão + extras). Sem ela, as 6 etapas padrão. */
  stages?: PipelineStage[];
  compact?: boolean;
  /** Mostra "x de n · %" e a barra de progresso abaixo das etapas. */
  showProgress?: boolean;
  /** Com `onSelect`, cada etapa vira um botão e a selecionada ganha um anel. */
  selectedId?: string;
  onSelect?: (stage: PipelineStage) => void;
}

const DEFAULT_STAGES: PipelineStage[] = ([1, 2, 3, 4, 5, 6] as JourneyStage[]).map((number) => ({
  id: `padrao-${number}`,
  name: STAGE_NAMES[number],
  number,
}));

/**
 * As etapas da jornada — as 6 padrão ou a jornada de uma equipe com as
 * extras que o mentor incluiu (círculo tracejado com bandeira). Na versão
 * completa a linha preenche e cada check se desenha em sequência até chegar
 * na etapa atual, que pulsa — a pessoa vê o caminho percorrido, não só o
 * ponto onde está. Na versão compacta (listas) nada anima.
 */
export default function StagePipeline({
  currentStage,
  stages = DEFAULT_STAGES,
  compact,
  showProgress,
  selectedId,
  onSelect,
}: StagePipelineProps) {
  const completed = Math.max(0, currentStage - 1);
  const percent = Math.round((completed / stages.length) * 100);

  // A fila de 450ms por etapa é só a entrada. Depois dela, uma etapa que
  // chega (extra recém-criada) ou muda de estado anima na hora, sem esperar.
  const introStep = compact ? 0 : Math.min(450, Math.round(2700 / stages.length));
  const [introDone, setIntroDone] = useState(Boolean(compact));
  useEffect(() => {
    if (introDone) return;
    const timer = window.setTimeout(() => setIntroDone(true), stages.length * introStep + 600);
    return () => window.clearTimeout(timer);
  }, [introDone, stages.length, introStep]);
  const stepDelay = introDone ? 0 : introStep;

  return (
    <div className="w-full">
      <div className={`flex w-full items-start gap-1 ${compact ? "" : "overflow-x-auto pb-1"}`}>
        {stages.map((stage, idx) => {
          const position = idx + 1;
          const isCompleted = position < currentStage;
          const isCurrent = position === currentStage;
          const isExtra = stage.number === null;
          const isSelected = selectedId === stage.id;
          const delay = idx * stepDelay;

          const circle = (
            <div
              style={compact ? undefined : { animationDelay: `${delay}ms` }}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-shadow ${
                compact ? "" : "animate-pop"
              } ${
                isCompleted
                  ? "bg-success text-white"
                  : isCurrent
                    ? "bg-primary text-white"
                    : isExtra
                      ? "border border-dashed border-muted-light bg-card text-muted"
                      : "bg-badge-muted-bg text-muted"
              } ${isCurrent && !compact ? "animate-pulse-ring" : ""} ${
                // O anel de seleção usa box-shadow, como o pulso: só fora da etapa atual.
                isSelected && !isCurrent ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-card" : ""
              }`}
            >
              {isCompleted ? (
                <Check
                  className={`h-4 w-4 ${compact ? "" : "check-draw"}`}
                  style={compact ? undefined : { animationDelay: `${delay + 200}ms` }}
                />
              ) : isExtra ? (
                <Flag className="h-3.5 w-3.5" />
              ) : (
                stage.number
              )}
            </div>
          );

          const label = !compact && (
            <span
              className={`mt-1.5 max-w-[96px] text-center text-xs leading-4 ${
                isCurrent
                  ? "font-semibold text-primary"
                  : isSelected
                    ? "font-medium text-foreground"
                    : "text-muted-light"
              }`}
            >
              {stage.name}
              {isExtra && (
                <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-secondary-dark">
                  extra
                </span>
              )}
            </span>
          );

          const title = `${isExtra ? "Etapa extra" : `Etapa ${stage.number}`} — ${stage.name}`;

          return (
            <div key={stage.id} className={`flex flex-1 items-start ${compact ? "" : "min-w-[76px]"}`}>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(stage)}
                  aria-pressed={isSelected}
                  aria-current={isCurrent ? "step" : undefined}
                  title={title}
                  className="group flex flex-1 flex-col items-center rounded-lg py-1 transition-colors hover:bg-hover-bg"
                >
                  {circle}
                  {label}
                </button>
              ) : (
                <div
                  title={compact ? title : undefined}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex flex-1 flex-col items-center ${compact ? "" : "py-1"}`}
                >
                  {circle}
                  {label}
                </div>
              )}
              {idx < stages.length - 1 && (
                <div className={`relative h-0.5 min-w-[12px] flex-1 bg-divider ${compact ? "mt-[15px]" : "mt-[19px]"}`}>
                  {isCompleted && (
                    <span
                      style={compact ? undefined : { animationDelay: `${delay + 150}ms` }}
                      className={`absolute inset-0 origin-left bg-success ${compact ? "" : "animate-fill-x"}`}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showProgress && (
        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between text-xs text-muted">
            <span>
              <strong className="font-semibold text-foreground">
                {completed} de {stages.length}
              </strong>{" "}
              etapas concluídas
            </span>
            <span className="tabular-nums">{percent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-badge-muted-bg">
            <span
              className="block h-full origin-left rounded-full bg-gradient-to-r from-success to-primary animate-fill-x"
              style={{
                width: `${percent}%`,
                animationDuration: "900ms",
                animationDelay: `${completed * stepDelay}ms`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

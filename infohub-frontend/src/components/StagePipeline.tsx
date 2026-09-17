import { JourneyStage, STAGE_NAMES } from "@/lib/types";
import { Check } from "lucide-react";

interface StagePipelineProps {
  currentStage: JourneyStage;
  compact?: boolean;
  /** Mostra "x de 6 · %" e a barra de progresso abaixo das etapas. */
  showProgress?: boolean;
}

const STAGES: JourneyStage[] = [1, 2, 3, 4, 5, 6];

/**
 * As 6 etapas da jornada. Na versão completa a linha preenche e cada check
 * se desenha em sequência (450ms por etapa) até chegar na etapa atual, que
 * pulsa — a pessoa vê o caminho percorrido, não só o ponto onde está. Na
 * versão compacta (listas) nada anima.
 */
export default function StagePipeline({ currentStage, compact, showProgress }: StagePipelineProps) {
  const completed = currentStage - 1;
  const percent = Math.round((completed / STAGES.length) * 100);
  const stepDelay = compact ? 0 : 450;

  return (
    <div className="w-full">
      <div className="flex w-full items-start gap-1">
        {STAGES.map((stage, idx) => {
          const isCompleted = stage < currentStage;
          const isCurrent = stage === currentStage;
          const delay = idx * stepDelay;

          return (
            <div key={stage} className="flex flex-1 items-start">
              <div className="flex flex-1 flex-col items-center">
                <div
                  style={compact ? undefined : { animationDelay: `${delay}ms` }}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    compact ? "" : "animate-pop"
                  } ${
                    isCompleted
                      ? "bg-success text-white"
                      : isCurrent
                        ? "bg-primary text-white"
                        : "bg-badge-muted-bg text-muted"
                  } ${isCurrent && !compact ? "animate-pulse-ring" : ""}`}
                >
                  {isCompleted ? (
                    <Check
                      className={`h-4 w-4 ${compact ? "" : "check-draw"}`}
                      style={compact ? undefined : { animationDelay: `${delay + 200}ms` }}
                    />
                  ) : (
                    stage
                  )}
                </div>
                {!compact && (
                  <span
                    className={`mt-1.5 max-w-[88px] text-center text-xs leading-4 ${
                      isCurrent ? "font-semibold text-primary" : "text-muted-light"
                    }`}
                  >
                    {STAGE_NAMES[stage]}
                  </span>
                )}
              </div>
              {idx < STAGES.length - 1 && (
                <div className="relative mt-[15px] h-0.5 min-w-[12px] flex-1 bg-divider">
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
                {completed} de {STAGES.length}
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

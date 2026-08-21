import { JourneyStage, STAGE_NAMES } from "@/lib/types";
import { Check } from "lucide-react";

interface StagePipelineProps {
  currentStage: JourneyStage;
  compact?: boolean;
}

export default function StagePipeline({ currentStage, compact }: StagePipelineProps) {
  const stages: JourneyStage[] = [1, 2, 3, 4, 5, 6];

  return (
    <div className="flex items-center gap-1 w-full">
      {stages.map((stage, idx) => {
        const isCompleted = stage < currentStage;
        const isCurrent = stage === currentStage;
        return (
          <div key={stage} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isCompleted
                    ? "bg-success text-white"
                    : isCurrent
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stage}
              </div>
              {!compact && (
                <span
                  className={`text-[10px] mt-1 text-center leading-tight max-w-[80px] ${
                    isCurrent ? "text-primary font-semibold" : "text-gray-400"
                  }`}
                >
                  {STAGE_NAMES[stage]}
                </span>
              )}
            </div>
            {idx < stages.length - 1 && (
              <div
                className={`h-0.5 flex-1 min-w-[12px] ${
                  isCompleted ? "bg-success" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

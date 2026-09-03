import React from 'react'
import { Check } from 'lucide-react'
import { STAGES } from '../data/stages'
import { StageId } from '../types'

interface JourneyTrailProps {
  currentStageId: StageId
  orientation?: 'horizontal' | 'vertical'
  compact?: boolean
}

export const JourneyTrail: React.FC<JourneyTrailProps> = ({
  currentStageId,
  orientation = 'horizontal',
  compact = false,
}) => {
  const currentOrder = STAGES.find((s) => s.id === currentStageId)?.order ?? 1

  if (orientation === 'vertical') {
    return (
      <ol className="relative ml-3 space-y-6 border-l-2 border-slate-200 dark:border-white/15 pl-6">
        {STAGES.map((stage) => {
          const state = stage.order < currentOrder ? 'done' : stage.order === currentOrder ? 'current' : 'pending'
          return (
            <li key={stage.id} className="relative">
              <span
                className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${
                  state === 'done'
                    ? 'bg-trail-done text-white'
                    : state === 'current'
                    ? 'bg-trail-current text-white'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/40'
                }`}
              >
                {state === 'done' ? <Check size={14} strokeWidth={3} /> : <span className="text-[10px] font-bold">{stage.order}</span>}
              </span>
              <p className={`text-sm font-semibold ${state === 'pending' ? 'text-ink-700/50 dark:text-white/40' : 'text-ink-900 dark:text-white'}`}>{stage.title}</p>
              <p className="mt-0.5 text-xs text-ink-700/50 dark:text-white/40">{stage.description}</p>
            </li>
          )
        })}
      </ol>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className={`flex min-w-max items-center ${compact ? 'gap-0' : 'gap-0'}`}>
        {STAGES.map((stage, idx) => {
          const state = stage.order < currentOrder ? 'done' : stage.order === currentOrder ? 'current' : 'pending'
          const isLast = idx === STAGES.length - 1
          return (
            <div key={stage.id} className="flex items-center">
              <div className="flex flex-col items-center" style={{ width: compact ? 64 : 96 }}>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-4 ring-white transition-colors ${
                    state === 'done'
                      ? 'bg-trail-done text-white'
                      : state === 'current'
                      ? 'bg-trail-current text-white shadow-[0_0_0_4px_rgba(245,165,36,0.18)]'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/40'
                  }`}
                  title={stage.title}
                >
                  {state === 'done' ? <Check size={15} strokeWidth={3} /> : stage.order}
                </span>
                <span
                  className={`mt-2 text-center text-[11px] font-medium leading-tight ${
                    state === 'pending' ? 'text-ink-700/40 dark:text-white/35' : 'text-ink-800 dark:text-white/90'
                  }`}
                >
                  {stage.shortTitle}
                </span>
              </div>
              {!isLast && (
                <div className={`h-0.5 flex-1 ${compact ? 'w-6' : 'w-10'} ${stage.order < currentOrder ? 'bg-trail-done' : 'bg-slate-200 dark:bg-white/10'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

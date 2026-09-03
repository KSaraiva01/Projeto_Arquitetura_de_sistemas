import React from 'react'

interface ProgressBarProps {
  value: number
  colorClass?: string
  label?: string
  showValue?: boolean
  size?: 'sm' | 'md'
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  colorClass = 'bg-brand-600',
  label,
  showValue = true,
  size = 'md',
}) => {
  const clamped = Math.max(0, Math.min(100, value))
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="font-medium text-ink-700 dark:text-white/70">{label}</span>}
          {showValue && <span className="font-mono font-semibold text-ink-900 dark:text-white">{clamped}%</span>}
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10 ${height}`}>
        <div
          className={`${height} rounded-full ${colorClass} transition-all duration-500 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

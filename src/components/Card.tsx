import React from 'react'

export const Card: React.FC<{
  children: React.ReactNode
  className?: string
  padded?: boolean
}> = ({ children, className = '', padded = true }) => (
  <div className={`rounded-2xl border border-slate-200/70 bg-white shadow-card ${padded ? 'p-5' : ''} ${className}`}>
    {children}
  </div>
)

export const StatCard: React.FC<{
  label: string
  value: string | number
  icon?: React.ReactNode
  accent?: string
  hint?: string
}> = ({ label, value, icon, accent = 'bg-brand-50 text-brand-600', hint }) => (
  <Card className="flex items-start justify-between gap-3">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/60">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-700/60">{hint}</p>}
    </div>
    {icon && <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>{icon}</div>}
  </Card>
)

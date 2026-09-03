import React from 'react'
import { TaskStatus, DeliveryStatus } from '../types'
import { statusLabel } from '../context/AppDataContext'

type AnyStatus = TaskStatus | DeliveryStatus

const STYLES: Record<string, string> = {
  pendente: 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60 ring-slate-200 dark:ring-white/10',
  em_andamento: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/30',
  entregue: 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-violet-200 dark:ring-violet-500/30',
  atrasada: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-500/30',
  aprovada: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30',
  ajuste: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/30',
}

const DOT: Record<string, string> = {
  pendente: 'bg-slate-400 dark:bg-white/50',
  em_andamento: 'bg-blue-500',
  entregue: 'bg-violet-500',
  atrasada: 'bg-red-500',
  aprovada: 'bg-emerald-500',
  ajuste: 'bg-amber-500',
}

export const StatusBadge: React.FC<{ status: AnyStatus; className?: string }> = ({ status, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${STYLES[status] ?? STYLES.pendente} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status] ?? DOT.pendente}`} />
      {statusLabel(status)}
    </span>
  )
}

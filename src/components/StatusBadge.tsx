import React from 'react'
import { TaskStatus, DeliveryStatus } from '../types'
import { statusLabel } from '../context/AppDataContext'

type AnyStatus = TaskStatus | DeliveryStatus

const STYLES: Record<string, string> = {
  pendente: 'bg-slate-100 text-slate-600 ring-slate-200',
  em_andamento: 'bg-blue-50 text-blue-700 ring-blue-200',
  entregue: 'bg-violet-50 text-violet-700 ring-violet-200',
  atrasada: 'bg-red-50 text-red-700 ring-red-200',
  aprovada: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ajuste: 'bg-amber-50 text-amber-700 ring-amber-200',
}

const DOT: Record<string, string> = {
  pendente: 'bg-slate-400',
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

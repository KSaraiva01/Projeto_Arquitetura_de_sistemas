import React, { useState } from 'react'
import { Clock, Pencil, Check, X, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAppData } from '../context/AppDataContext'

/**
 * Mostra o prazo de uma tarefa. Apenas usuários com papel "mentor" podem
 * alterá-lo — para os demais perfis o campo é somente leitura.
 */
export const TaskDueDate: React.FC<{ taskId: string; dueDate: string; className?: string }> = ({
  taskId,
  dueDate,
  className = '',
}) => {
  const { user } = useAuth()
  const { updateTaskDueDate } = useAppData()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(dueDate)

  const canEdit = user?.role === 'mentor'
  const formatted = new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR')

  if (editing) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-lg border border-brand-300 dark:border-brand-500/40 bg-white dark:bg-ink-900 px-2 py-1 text-xs font-medium text-ink-900 dark:text-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-500/20"
          autoFocus
        />
        <button
          onClick={() => {
            updateTaskDueDate(taskId, value, user?.name)
            setEditing(false)
          }}
          className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
          aria-label="Confirmar novo prazo"
        >
          <Check size={13} />
        </button>
        <button
          onClick={() => {
            setValue(dueDate)
            setEditing(false)
          }}
          className="rounded-md bg-slate-100 dark:bg-white/10 p-1 text-ink-700/50 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/15"
          aria-label="Cancelar"
        >
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-ink-700/60 dark:text-white/50 ${className}`}>
      <Clock size={12} /> Prazo: {formatted}
      {canEdit ? (
        <button
          onClick={() => setEditing(true)}
          className="ml-0.5 rounded-md p-0.5 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/15 hover:text-brand-700 dark:hover:text-brand-300"
          title="Alterar prazo (somente mentor)"
          aria-label="Alterar prazo"
        >
          <Pencil size={12} />
        </button>
      ) : (
        <span title="Somente um(a) mentor(a) pode alterar o prazo">
          <Lock size={11} className="ml-0.5 text-ink-700/25 dark:text-white/20" />
        </span>
      )}
    </span>
  )
}

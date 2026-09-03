import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, children, footer, size = 'md' }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const width = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={`relative flex max-h-[90vh] w-full ${width} flex-col rounded-t-2xl bg-white dark:bg-ink-900 shadow-2xl sm:rounded-2xl animate-[fadeIn_.15s_ease-out]`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/10 px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-ink-700/60 dark:text-white/50">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-700/50 dark:text-white/40 transition hover:bg-slate-100 dark:hover:bg-white/10 hover:text-ink-900 dark:hover:text-white"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/10 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  )
}

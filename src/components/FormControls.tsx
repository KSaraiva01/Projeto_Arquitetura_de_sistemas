import React from 'react'

const baseInput =
  'w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-ink-900 px-3.5 py-2.5 text-sm text-ink-900 dark:text-white placeholder:text-ink-700/30 dark:placeholder:text-white/20 transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-500/20'

export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string; required?: boolean }> = ({
  label,
  children,
  hint,
  required,
}) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-ink-800 dark:text-white/90">
      {label} {required && <span className="text-red-500">*</span>}
    </span>
    {children}
    {hint && <span className="mt-1 block text-[11px] text-ink-700/40 dark:text-white/35">{hint}</span>}
  </label>
)

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={`${baseInput} ${props.className ?? ''}`} />
)

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea {...props} className={`${baseInput} resize-none ${props.className ?? ''}`} />
)

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select {...props} className={`${baseInput} appearance-none bg-no-repeat pr-9 ${props.className ?? ''}`} />
)

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }
> = ({ variant = 'primary', className = '', ...props }) => {
  const variants: Record<string, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-soft dark:shadow-none',
    secondary: 'bg-slate-100 dark:bg-white/10 text-ink-800 dark:text-white/90 hover:bg-slate-200 dark:hover:bg-white/15',
    ghost: 'text-ink-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10',
    danger: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20',
  }
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  )
}

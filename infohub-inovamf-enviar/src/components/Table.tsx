import React from 'react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export function Table<T>({ columns, data, rowKey, onRowClick, emptyMessage = 'Nenhum registro encontrado.' }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-ink-900 shadow-card dark:shadow-none">
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-ink-950">
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-700/60 dark:text-white/50 ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-ink-700/50 dark:text-white/40">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-slate-50 dark:border-white/5 last:border-0 ${
                  onRowClick ? 'cursor-pointer transition hover:bg-brand-50 dark:hover:bg-brand-500/15' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3.5 align-middle ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

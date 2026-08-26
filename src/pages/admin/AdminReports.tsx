import React from 'react'
import { Layout } from '../../components/Layout'
import { Card } from '../../components/Card'
import { useAppData } from '../../context/AppDataContext'
import { STAGES } from '../../data/stages'
import { TaskStatus } from '../../types'

const STATUS_COLORS: Record<TaskStatus, string> = {
  pendente: '#94A3B8',
  em_andamento: '#3B82F6',
  entregue: '#8B5CF6',
  atrasada: '#EF4548',
  aprovada: '#14B88A',
  ajuste: '#F5A524',
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  entregue: 'Entregue',
  atrasada: 'Atrasada',
  aprovada: 'Aprovada',
  ajuste: 'Precisa de ajuste',
}

const AdminReports: React.FC = () => {
  const { teams, tasks, deliveries } = useAppData()

  const totalTasks = tasks.length
  const statusBreakdown = (Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => ({
    status,
    count: tasks.filter((t) => t.status === status).length,
  }))

  const avgProgress = Math.round(teams.reduce((acc, t) => acc + t.progress, 0) / teams.length)
  const approvedDeliveries = deliveries.filter((d) => d.status === 'aprovada').length
  const adjustDeliveries = deliveries.filter((d) => d.status === 'ajuste').length
  const approvalRate = deliveries.length ? Math.round((approvedDeliveries / deliveries.length) * 100) : 0

  const teamsByArea = Object.entries(
    teams.reduce<Record<string, number>>((acc, t) => {
      acc[t.area] = (acc[t.area] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  // Donut chart geometry
  const radius = 60
  const circumference = 2 * Math.PI * radius
  let offsetAcc = 0

  return (
    <Layout title="Relatórios">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">Progresso médio das equipes</p>
          <p className="mt-2 font-display text-4xl font-bold text-ink-900">{avgProgress}%</p>
          <p className="mt-1 text-xs text-ink-700/50">Média da barra de progresso de todas as {teams.length} equipes</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">Taxa de aprovação de entregas</p>
          <p className="mt-2 font-display text-4xl font-bold text-emerald-600">{approvalRate}%</p>
          <p className="mt-1 text-xs text-ink-700/50">{approvedDeliveries} aprovadas · {adjustDeliveries} com pedido de ajuste</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">Equipes prontas para o InovAMF</p>
          <p className="mt-2 font-display text-4xl font-bold text-brand-600">{teams.filter((t) => t.stageId === 'pronto').length} / {teams.length}</p>
          <p className="mt-1 text-xs text-ink-700/50">Concluíram todas as 6 etapas da trilha</p>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h3 className="mb-5 font-display text-base font-semibold text-ink-900">Tarefas por status</h3>
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
              <circle cx="80" cy="80" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="20" />
              {statusBreakdown.map(({ status, count }) => {
                if (count === 0) return null
                const fraction = count / totalTasks
                const dash = fraction * circumference
                const el = (
                  <circle
                    key={status}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke={STATUS_COLORS[status]}
                    strokeWidth="20"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offsetAcc}
                    strokeLinecap="butt"
                  />
                )
                offsetAcc += dash
                return el
              })}
            </svg>
            <p className="-mt-24 font-display text-2xl font-bold text-ink-900 pointer-events-none">{totalTasks}</p>
            <p className="-mt-1 text-[10px] uppercase tracking-wide text-ink-700/40 pointer-events-none">tarefas</p>
          </div>
          <ul className="mt-6 space-y-2">
            {statusBreakdown.map(({ status, count }) => (
              <li key={status} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink-700/70">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                  {STATUS_LABELS[status]}
                </span>
                <span className="font-mono font-semibold text-ink-900">{count}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-5 font-display text-base font-semibold text-ink-900">Funil da jornada — equipes por etapa</h3>
          <div className="space-y-4">
            {STAGES.map((stage) => {
              const count = teams.filter((t) => t.stageId === stage.id).length
              const widthPct = Math.max((count / teams.length) * 100, count > 0 ? 6 : 0)
              return (
                <div key={stage.id} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-xs font-medium text-ink-700/70">{stage.title}</span>
                  <div className="h-7 flex-1 overflow-hidden rounded-lg bg-slate-50">
                    <div
                      className={`flex h-7 items-center justify-end rounded-lg px-2 text-[11px] font-bold text-white transition-all duration-500 ${
                        stage.id === 'pronto' ? 'bg-trail-done' : 'bg-brand-500'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    >
                      {count > 0 && count}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h4 className="mb-3 text-sm font-semibold text-ink-900">Equipes por área de atuação</h4>
            <div className="flex flex-wrap gap-2">
              {teamsByArea.map(([area, count]) => (
                <span key={area} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-ink-700">
                  {area} <span className="ml-1 font-bold text-ink-900">{count}</span>
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

export default AdminReports

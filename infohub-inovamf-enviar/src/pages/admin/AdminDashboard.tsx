import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ListChecks, AlertTriangle, Trophy, ArrowUpRight } from 'lucide-react'
import { Layout } from '../../components/Layout'
import { Card, StatCard } from '../../components/Card'
import { StatusBadge } from '../../components/StatusBadge'
import { useAppData } from '../../context/AppDataContext'
import { useAuth } from '../../context/AuthContext'
import { useBasePath } from '../../utils/basePath'
import { STAGES } from '../../data/stages'

const AdminDashboard: React.FC = () => {
  const { teams, tasks } = useAppData()
  const { user } = useAuth()
  const navigate = useNavigate()
  const basePath = useBasePath()

  const totalTeams = teams.length
  const readyTeams = teams.filter((t) => t.stageId === 'pronto')
  const pendingTasks = tasks.filter((t) => t.status === 'pendente' || t.status === 'em_andamento')
  const lateTasks = tasks.filter((t) => t.status === 'atrasada')

  const teamsByStage = STAGES.map((stage) => ({
    stage,
    count: teams.filter((t) => t.stageId === stage.id).length,
  }))
  const maxCount = Math.max(...teamsByStage.map((s) => s.count), 1)

  const recentActivity = teams
    .flatMap((t) => t.history.map((h) => ({ ...h, teamName: t.ideaName, teamId: t.id })))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6)

  return (
    <Layout title={user?.role === 'mentor' ? 'Dashboard do mentor' : 'Dashboard do administrador'}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total de equipes" value={totalTeams} icon={<Users size={20} />} accent="bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400" hint="Cadastradas no InfoHub" />
        <StatCard label="Tarefas pendentes" value={pendingTasks.length} icon={<ListChecks size={20} />} accent="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" hint="Pendentes ou em andamento" />
        <StatCard label="Tarefas atrasadas" value={lateTasks.length} icon={<AlertTriangle size={20} />} accent="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" hint="Requerem atenção imediata" />
        <StatCard label="Prontas p/ InovAMF" value={readyTeams.length} icon={<Trophy size={20} />} accent="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" hint="Concluíram a jornada" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-ink-900 dark:text-white">Equipes por etapa</h3>
              <p className="text-xs text-ink-700/50 dark:text-white/40">Distribuição atual na trilha da jornada</p>
            </div>
            <button
              onClick={() => navigate(`${basePath}/kanban`)}
              className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
            >
              Ver Kanban <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="space-y-3.5">
            {teamsByStage.map(({ stage, count }) => (
              <div key={stage.id} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-xs font-medium text-ink-700/70 dark:text-white/60">{stage.shortTitle}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div
                    className={`flex h-6 items-center justify-end rounded-full px-2 text-[11px] font-bold text-white transition-all duration-500 ${
                      stage.id === 'pronto' ? 'bg-trail-done' : 'bg-brand-500'
                    }`}
                    style={{ width: `${Math.max((count / maxCount) * 100, count > 0 ? 10 : 0)}%` }}
                  >
                    {count > 0 && count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-base font-semibold text-ink-900 dark:text-white">Atividade recente</h3>
          <p className="mb-4 text-xs text-ink-700/50 dark:text-white/40">Últimas movimentações registradas</p>
          <ul className="space-y-4">
            {recentActivity.map((item) => (
              <li key={item.id} className="flex gap-3 text-xs">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                <div>
                  <p className="text-ink-800 dark:text-white/90">
                    <button onClick={() => navigate(`${basePath}/equipes/${item.teamId}`)} className="font-semibold text-ink-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400">
                      {item.teamName}
                    </button>{' '}
                    — {item.description}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-700/40 dark:text-white/35">
                    {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')} · {item.author}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-ink-900 dark:text-white">Tarefas que precisam de atenção</h3>
            <p className="text-xs text-ink-700/50 dark:text-white/40">Atrasadas ou aguardando revisão</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/10 text-xs uppercase tracking-wide text-ink-700/50 dark:text-white/40">
                <th className="py-2 pr-4 font-semibold">Tarefa</th>
                <th className="py-2 pr-4 font-semibold">Equipe</th>
                <th className="py-2 pr-4 font-semibold">Prazo</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks
                .filter((t) => t.status === 'atrasada' || t.status === 'entregue')
                .slice(0, 6)
                .map((t) => {
                  const team = teams.find((tm) => tm.id === t.teamId)
                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`${basePath}/equipes/${t.teamId}`)}
                      className="cursor-pointer border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-brand-50 dark:hover:bg-brand-500/15"
                    >
                      <td className="py-3 pr-4 font-medium text-ink-900 dark:text-white">{t.title}</td>
                      <td className="py-3 pr-4 text-ink-700/70 dark:text-white/60">{team?.ideaName}</td>
                      <td className="py-3 pr-4 text-ink-700/70 dark:text-white/60">{new Date(t.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  )
}

export default AdminDashboard

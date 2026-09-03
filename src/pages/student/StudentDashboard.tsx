import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, AlertTriangle, UploadCloud, ArrowUpRight } from 'lucide-react'
import { Layout } from '../../components/Layout'
import { Card, StatCard } from '../../components/Card'
import { ProgressBar } from '../../components/ProgressBar'
import { JourneyTrail } from '../../components/JourneyTrail'
import { StatusBadge } from '../../components/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../context/AppDataContext'
import { stageById } from '../../data/stages'
import { usersByTeam } from '../../data/users'

const StudentDashboard: React.FC = () => {
  const { user } = useAuth()
  const { getTeam, tasksByTeam } = useAppData()
  const navigate = useNavigate()

  const team = user?.teamId ? getTeam(user.teamId) : undefined
  if (!team) {
    return (
      <Layout title="Dashboard">
        <Card>Você ainda não está vinculado(a) a nenhuma equipe.</Card>
      </Layout>
    )
  }

  const tasks = tasksByTeam(team.id)
  const pending = tasks.filter((t) => t.status === 'pendente' || t.status === 'em_andamento')
  const late = tasks.filter((t) => t.status === 'atrasada')
  const stage = stageById(team.stageId)
  const members = usersByTeam(team.id)

  return (
    <Layout title={`Olá, ${user?.name.split(' ')[0]} 👋`}>
      <Card className="mb-5 bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Sua equipe</p>
            <h2 className="mt-1 font-display text-2xl font-bold">{team.ideaName}</h2>
            <p className="mt-1 text-sm text-white/70">Etapa atual: {stage?.title}</p>
          </div>
          <div className="w-full sm:w-64">
            <ProgressBar value={team.progress} colorClass="bg-white dark:bg-ink-900" label="Progresso na jornada" />
          </div>
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Minhas tarefas pendentes" value={pending.length} icon={<ClipboardList size={20} />} accent="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" />
        <StatCard label="Tarefas atrasadas" value={late.length} icon={<AlertTriangle size={20} />} accent="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" />
        <StatCard label="Integrantes da equipe" value={members.length} icon={<UploadCloud size={20} />} accent="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
      </div>

      <Card className="mb-5">
        <h3 className="mb-5 font-display text-base font-semibold text-ink-900 dark:text-white">Trilha da jornada</h3>
        <JourneyTrail currentStageId={team.stageId} />
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink-900 dark:text-white">Próximas tarefas</h3>
          <button onClick={() => navigate('/aluno/tarefas')} className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
            Ver todas <ArrowUpRight size={13} />
          </button>
        </div>
        <ul className="divide-y divide-slate-50 dark:divide-white/10">
          {tasks.slice(0, 5).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-ink-900 dark:text-white">{t.title}</p>
                <p className="text-xs text-ink-700/50 dark:text-white/40">Prazo: {new Date(t.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
              <StatusBadge status={t.status} />
            </li>
          ))}
        </ul>
      </Card>
    </Layout>
  )
}

export default StudentDashboard

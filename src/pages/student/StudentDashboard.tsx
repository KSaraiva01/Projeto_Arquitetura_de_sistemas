import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { Card, StatCard } from '../../components/Card'
import { ProgressBar } from '../../components/ProgressBar'
import { JourneyTrail } from '../../components/JourneyTrail'
import { StatusBadge } from '../../components/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../context/AppDataContext'
import { stageById } from '../../data/stages'
import { usersByTeam } from '../../data/users'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elementName: string]: any
    }
  }
}

type IconProps = { size?: number }

const ClipboardList: React.FC<IconProps> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="8" height="4" x="8" y="2" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M8 12h8M8 16h6" />
  </svg>
)

const AlertTriangle: React.FC<IconProps> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
)

const UploadCloud: React.FC<IconProps> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 16l-4-4-4 4M12 12v9" />
    <path d="M20.39 17.39A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
)

const ArrowUpRight: React.FC<IconProps> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7M7 7h10v10" />
  </svg>
)

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
            <ProgressBar value={team.progress} colorClass="bg-white" label="Progresso na jornada" />
          </div>
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Minhas tarefas pendentes" value={pending.length} icon={<ClipboardList size={20} />} accent="bg-blue-50 text-blue-600" />
        <StatCard label="Tarefas atrasadas" value={late.length} icon={<AlertTriangle size={20} />} accent="bg-red-50 text-red-600" />
        <StatCard label="Integrantes da equipe" value={members.length} icon={<UploadCloud size={20} />} accent="bg-emerald-50 text-emerald-600" />
      </div>

      <Card className="mb-5">
        <h3 className="mb-5 font-display text-base font-semibold text-ink-900">Trilha da jornada</h3>
        <JourneyTrail currentStageId={team.stageId} />
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink-900">Próximas tarefas</h3>
          <button onClick={() => navigate('/aluno/tarefas')} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
            Ver todas <ArrowUpRight size={13} />
          </button>
        </div>
        <ul className="divide-y divide-slate-50">
          {tasks.slice(0, 5).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-ink-900">{t.title}</p>
                <p className="text-xs text-ink-700/50">Prazo: {new Date(t.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
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

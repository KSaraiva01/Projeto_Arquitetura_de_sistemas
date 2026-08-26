import React from 'react'
import { Layout } from '../../components/Layout'
import { Card } from '../../components/Card'
import { ProgressBar } from '../../components/ProgressBar'
import { JourneyTrail } from '../../components/JourneyTrail'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../context/AppDataContext'

const StudentJourney: React.FC = () => {
  const { user } = useAuth()
  const { getTeam } = useAppData()
  const team = user?.teamId ? getTeam(user.teamId) : undefined

  if (!team) {
    return (
      <Layout title="Minha jornada">
        <Card>Você ainda não está vinculado(a) a nenhuma equipe.</Card>
      </Layout>
    )
  }

  return (
    <Layout title="Minha jornada">
      <Card className="mb-5">
        <ProgressBar value={team.progress} label={`${team.ideaName} — progresso geral`} colorClass={team.stageId === 'pronto' ? 'bg-trail-done' : 'bg-brand-600'} />
        <div className="mt-6 hidden md:block">
          <JourneyTrail currentStageId={team.stageId} />
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 font-display text-base font-semibold text-ink-900">Linha do tempo detalhada</h3>
        <p className="mb-5 text-xs text-ink-700/50">Todas as 7 etapas da jornada, da ideia até o InovAMF</p>
        <JourneyTrail currentStageId={team.stageId} orientation="vertical" />
      </Card>

      <Card className="mt-5">
        <h3 className="mb-5 font-display text-base font-semibold text-ink-900">Histórico de movimentações</h3>
        <ul className="space-y-4 border-l-2 border-slate-100 pl-5">
          {[...team.history].reverse().map((h) => (
            <li key={h.id} className="relative">
              <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white" />
              <p className="text-sm text-ink-800">{h.description}</p>
              <p className="mt-0.5 text-xs text-ink-700/40">
                {new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')} · {h.author}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </Layout>
  )
}

export default StudentJourney

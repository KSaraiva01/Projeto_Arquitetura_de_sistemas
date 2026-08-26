import React from 'react'
import { Crown, GraduationCap, Tag, CalendarClock } from 'lucide-react'
import { Layout } from '../../components/Layout'
import { Card } from '../../components/Card'
import { ProgressBar } from '../../components/ProgressBar'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../context/AppDataContext'
import { stageById } from '../../data/stages'
import { usersByTeam } from '../../data/users'

const StudentTeam: React.FC = () => {
  const { user } = useAuth()
  const { getTeam } = useAppData()
  const team = user?.teamId ? getTeam(user.teamId) : undefined

  if (!team) {
    return (
      <Layout title="Minha equipe">
        <Card>Você ainda não está vinculado(a) a nenhuma equipe.</Card>
      </Layout>
    )
  }

  const members = usersByTeam(team.id)
  const stage = stageById(team.stageId)

  return (
    <Layout title="Minha equipe">
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-display text-xl font-bold text-ink-900">{team.ideaName}</h2>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{team.area}</span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-700/70">{team.description}</p>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <InfoItem icon={<Crown size={14} />} label="Curso principal" value={team.course} />
          <InfoItem icon={<Tag size={14} />} label="Área" value={team.area} />
          <InfoItem icon={<GraduationCap size={14} />} label="Etapa atual" value={stage?.title ?? ''} />
          <InfoItem icon={<CalendarClock size={14} />} label="Ideia enviada em" value={new Date(team.createdAt + 'T00:00:00').toLocaleDateString('pt-BR')} />
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <ProgressBar value={team.progress} label="Progresso geral da equipe" colorClass={team.stageId === 'pronto' ? 'bg-trail-done' : 'bg-brand-600'} />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-display text-base font-semibold text-ink-900">Integrantes ({members.length})</h3>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: m.avatarColor }}>
                {m.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {m.name} {m.id === team.leaderId && <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">LÍDER</span>}
                  {m.id === user?.id && <span className="ml-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">VOCÊ</span>}
                </p>
                <p className="text-xs text-ink-700/50">{m.course}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </Layout>
  )
}

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div>
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-700/40">
      {icon} {label}
    </p>
    <p className="mt-1 text-sm font-medium text-ink-900">{value}</p>
  </div>
)

export default StudentTeam

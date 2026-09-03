import React from 'react'
import { GraduationCap, Tag, CalendarClock, Mail, UserCog } from 'lucide-react'
import { Layout } from '../../components/Layout'
import { Card } from '../../components/Card'
import { ProgressBar } from '../../components/ProgressBar'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../context/AppDataContext'
import { usersByTeam, mentorsByIds } from '../../data/users'
import { leaderName, initialsOf } from '../../utils/team'

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
  const responsibleMentors = mentorsByIds(team.mentorIds)

  return (
    <Layout title="Minha equipe">
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">{team.ideaName}</h2>
          <span className="rounded-full bg-brand-50 dark:bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">{team.area}</span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-700/70 dark:text-white/60">{team.description}</p>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-white/10 pt-4 sm:grid-cols-4">
          <InfoItem icon={<UserCog size={14} />} label="Líder" value={leaderName(team)} />
          <InfoItem icon={<Mail size={14} />} label="E-mail de contato" value={team.email} />
          <InfoItem icon={<GraduationCap size={14} />} label="Curso" value={team.course} />
          <InfoItem icon={<Tag size={14} />} label="Área" value={team.area} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-white/10 pt-4">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-700/50 dark:text-white/40">
            <CalendarClock size={13} /> Mentor(es) responsável(is):
          </span>
          {responsibleMentors.length === 0 && (
            <span className="text-xs text-ink-700/40 dark:text-white/35">A definir</span>
          )}
          {responsibleMentors.map((m) => (
            <span key={m.id} className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: m.avatarColor }}>
                {initialsOf(m.name)}
              </span>
              {m.name}
            </span>
          ))}
        </div>

        <div className="mt-5 border-t border-slate-100 dark:border-white/10 pt-5">
          <ProgressBar value={team.progress} label="Progresso geral da equipe" colorClass={team.stageId === 'pronto' ? 'bg-trail-done' : 'bg-brand-600'} />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-display text-base font-semibold text-ink-900 dark:text-white">Integrantes ({members.length})</h3>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-white/10 p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: m.avatarColor }}>
                {m.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900 dark:text-white">
                  {m.name} {m.id === team.leaderId && <span className="ml-1 rounded bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">LÍDER</span>}
                  {m.id === user?.id && <span className="ml-1 rounded bg-brand-50 dark:bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-300">VOCÊ</span>}
                </p>
                <p className="text-xs text-ink-700/50 dark:text-white/40">{m.course}</p>
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
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-700/40 dark:text-white/35">
      {icon} {label}
    </p>
    <p className="mt-1 text-sm font-medium text-ink-900 dark:text-white">{value}</p>
  </div>
)

export default StudentTeam

import React, { useState } from 'react'
import { Users, MoveRight, GripVertical } from 'lucide-react'
import { STAGES } from '../data/stages'
import { Team, StageId } from '../types'
import { useAppData } from '../context/AppDataContext'
import { usersByTeam } from '../data/users'
import { leaderName } from '../utils/team'

const COLUMN_ACCENTS: Record<string, string> = {
  ideia: 'border-t-slate-400',
  contato: 'border-t-sky-400',
  encontro1: 'border-t-indigo-400',
  encontro2: 'border-t-violet-400',
  encontro3: 'border-t-fuchsia-400',
  encontro4: 'border-t-amber-400',
  pronto: 'border-t-trail-done',
}

export const KanbanBoard: React.FC<{ onOpenTeam: (teamId: string) => void }> = ({ onOpenTeam }) => {
  const { teams, moveTeamToStage } = useAppData()
  const [dragTeamId, setDragTeamId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<StageId | null>(null)

  const teamsByStage = (stageId: StageId) => teams.filter((t) => t.stageId === stageId)

  const handleDrop = (stageId: StageId) => {
    if (dragTeamId) {
      moveTeamToStage(dragTeamId, stageId)
    }
    setDragTeamId(null)
    setOverStage(null)
  }

  return (
    <div className="kanban-scroll flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageTeams = teamsByStage(stage.id)
        return (
          <div
            key={stage.id}
            onDragOver={(e) => {
              e.preventDefault()
              setOverStage(stage.id)
            }}
            onDragLeave={() => setOverStage((prev) => (prev === stage.id ? null : prev))}
            onDrop={() => handleDrop(stage.id)}
            className={`flex w-72 shrink-0 flex-col rounded-2xl border border-t-4 bg-slate-100 dark:bg-white/10 ${COLUMN_ACCENTS[stage.id]} ${
              overStage === stage.id ? 'ring-2 ring-brand-400' : ''
            }`}
          >
            <div className="flex items-center justify-between px-3.5 pt-3.5">
              <div>
                <p className="text-sm font-bold text-ink-900 dark:text-white">{stage.shortTitle}</p>
                <p className="text-[11px] text-ink-700/50 dark:text-white/40">{stage.title}</p>
              </div>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white dark:bg-ink-900 px-1.5 text-xs font-bold text-ink-700 dark:text-white/70 shadow-sm">
                {stageTeams.length}
              </span>
            </div>

            <div className="flex-1 space-y-2.5 px-2.5 py-3.5">
              {stageTeams.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/15 px-3 py-6 text-center text-xs text-ink-700/40 dark:text-white/35">
                  Nenhuma equipe nesta etapa
                </div>
              )}
              {stageTeams.map((team) => (
                <KanbanCard
                  key={team.id}
                  team={team}
                  onOpen={() => onOpenTeam(team.id)}
                  onDragStart={() => setDragTeamId(team.id)}
                  onDragEnd={() => setDragTeamId(null)}
                  onQuickMove={(stageId) => moveTeamToStage(team.id, stageId)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const KanbanCard: React.FC<{
  team: Team
  onOpen: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onQuickMove: (stageId: StageId) => void
}> = ({ team, onOpen, onDragStart, onDragEnd, onQuickMove }) => {
  const members = usersByTeam(team.id)
  const currentIndex = STAGES.findIndex((s) => s.id === team.stageId)
  const nextStage = STAGES[currentIndex + 1]

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className="group cursor-pointer rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-ink-900 p-3.5 shadow-soft dark:shadow-none transition hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-sm font-semibold leading-snug text-ink-900 dark:text-white">{team.ideaName}</p>
        <GripVertical size={14} className="mt-0.5 shrink-0 text-slate-300 dark:text-white/15 group-hover:text-slate-400 dark:group-hover:text-white/30" />
      </div>
      <p className="mt-1 text-xs text-ink-700/50 dark:text-white/40">{team.area}</p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-ink-700/60 dark:text-white/50">
          <Users size={13} />
          {members.length} integrante{members.length > 1 ? 's' : ''}
        </div>
        <span className="rounded-md bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-700/70 dark:text-white/60">
          {team.progress}%
        </span>
      </div>

      <p className="mt-2 truncate text-[11px] text-ink-700/50 dark:text-white/40">Líder: {leaderName(team)}</p>

      {nextStage && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onQuickMove(nextStage.id)
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/15 py-1.5 text-[11px] font-semibold text-ink-700 dark:text-white/70 opacity-0 transition group-hover:opacity-100 hover:border-brand-300 dark:hover:border-brand-500/40 hover:bg-brand-50 dark:hover:bg-brand-500/15 hover:text-brand-700 dark:hover:text-brand-300"
        >
          Avançar etapa <MoveRight size={12} />
        </button>
      )}
    </div>
  )
}

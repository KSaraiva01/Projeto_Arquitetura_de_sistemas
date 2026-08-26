import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users as UsersIcon } from 'lucide-react'
import { Layout } from '../../components/Layout'
import { Table, Column } from '../../components/Table'
import { ProgressBar } from '../../components/ProgressBar'
import { Input, Select } from '../../components/FormControls'
import { useAppData } from '../../context/AppDataContext'
import { STAGES, stageById } from '../../data/stages'
import { usersByTeam } from '../../data/users'
import { Team } from '../../types'

const AdminTeams: React.FC = () => {
  const { teams } = useAppData()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('todas')

  const filtered = useMemo(() => {
    return teams.filter((t) => {
      const matchesSearch =
        t.ideaName.toLowerCase().includes(search.toLowerCase()) ||
        t.course.toLowerCase().includes(search.toLowerCase()) ||
        t.area.toLowerCase().includes(search.toLowerCase())
      const matchesStage = stageFilter === 'todas' || t.stageId === stageFilter
      return matchesSearch && matchesStage
    })
  }, [teams, search, stageFilter])

  const columns: Column<Team>[] = [
    {
      key: 'idea',
      header: 'Equipe / Ideia',
      render: (t) => (
        <div>
          <p className="font-semibold text-ink-900">{t.ideaName}</p>
          <p className="text-xs text-ink-700/50">{t.area}</p>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Curso',
      render: (t) => <span className="text-ink-700/80">{t.course}</span>,
    },
    {
      key: 'members',
      header: 'Integrantes',
      render: (t) => (
        <span className="flex items-center gap-1.5 text-ink-700/80">
          <UsersIcon size={14} /> {usersByTeam(t.id).length}
        </span>
      ),
    },
    {
      key: 'stage',
      header: 'Etapa atual',
      render: (t) => (
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
          {stageById(t.stageId)?.shortTitle}
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'Progresso',
      className: 'min-w-[160px]',
      render: (t) => <ProgressBar value={t.progress} size="sm" colorClass={t.stageId === 'pronto' ? 'bg-trail-done' : 'bg-brand-500'} />,
    },
  ]

  return (
    <Layout title="Todas as equipes">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-700/30" />
          <Input
            placeholder="Buscar por ideia, curso ou área..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="sm:w-56">
          <option value="todas">Todas as etapas</option>
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </Select>
      </div>

      <p className="mb-3 text-xs text-ink-700/50">{filtered.length} equipe(s) encontrada(s)</p>

      <Table columns={columns} data={filtered} rowKey={(t) => t.id} onRowClick={(t) => navigate(`/admin/equipes/${t.id}`)} />
    </Layout>
  )
}

export default AdminTeams

import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users as UsersIcon, Plus, Mail } from 'lucide-react'
import { Layout } from '../../components/Layout'
import { Table, Column } from '../../components/Table'
import { ProgressBar } from '../../components/ProgressBar'
import { Modal } from '../../components/Modal'
import { Input, Select, Field, Textarea, Button } from '../../components/FormControls'
import { useAppData } from '../../context/AppDataContext'
import { STAGES, stageById } from '../../data/stages'
import { usersByTeam, mentors } from '../../data/users'
import { Team } from '../../types'
import { useBasePath } from '../../utils/basePath'

const emptyForm = {
  ideaName: '',
  description: '',
  course: '',
  area: '',
  email: '',
  leaderName: '',
  leaderEmail: '',
  mentorIds: [] as string[],
}

const AdminTeams: React.FC = () => {
  const { teams, addTeam } = useAppData()
  const navigate = useNavigate()
  const basePath = useBasePath()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('todas')
  const [newTeamOpen, setNewTeamOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const allMentors = mentors()

  const filtered = useMemo(() => {
    return teams.filter((t) => {
      const matchesSearch =
        t.ideaName.toLowerCase().includes(search.toLowerCase()) ||
        t.course.toLowerCase().includes(search.toLowerCase()) ||
        t.area.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase())
      const matchesStage = stageFilter === 'todas' || t.stageId === stageFilter
      return matchesSearch && matchesStage
    })
  }, [teams, search, stageFilter])

  const toggleMentor = (id: string) => {
    setForm((f) => ({
      ...f,
      mentorIds: f.mentorIds.includes(id) ? f.mentorIds.filter((m) => m !== id) : [...f.mentorIds, id],
    }))
  }

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault()
    const created = addTeam({
      ideaName: form.ideaName,
      description: form.description,
      course: form.course,
      area: form.area,
      email: form.email,
      leaderName: form.leaderName,
      leaderEmail: form.leaderEmail || form.email,
      memberIds: [],
      mentorIds: form.mentorIds,
    })
    setNewTeamOpen(false)
    setForm(emptyForm)
    navigate(`${basePath}/equipes/${created.id}`)
  }

  const columns: Column<Team>[] = [
    {
      key: 'idea',
      header: 'Equipe / Ideia',
      render: (t) => (
        <div>
          <p className="font-semibold text-ink-900 dark:text-white">{t.ideaName}</p>
          <p className="text-xs text-ink-700/50 dark:text-white/40">{t.area}</p>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Curso',
      render: (t) => <span className="text-ink-700/80 dark:text-white/65">{t.course}</span>,
    },
    {
      key: 'email',
      header: 'E-mail de contato',
      render: (t) => (
        <span className="flex items-center gap-1.5 text-ink-700/70 dark:text-white/60">
          <Mail size={13} /> {t.email}
        </span>
      ),
    },
    {
      key: 'members',
      header: 'Integrantes',
      render: (t) => (
        <span className="flex items-center gap-1.5 text-ink-700/80 dark:text-white/65">
          <UsersIcon size={14} /> {usersByTeam(t.id).length}
        </span>
      ),
    },
    {
      key: 'stage',
      header: 'Etapa atual',
      render: (t) => (
        <span className="rounded-full bg-brand-50 dark:bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
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
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-700/30 dark:text-white/25" />
          <Input
            placeholder="Buscar por ideia, curso, área ou e-mail..."
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
        <Button onClick={() => setNewTeamOpen(true)} className="whitespace-nowrap">
          <Plus size={16} /> Nova equipe
        </Button>
      </div>

      <p className="mb-3 text-xs text-ink-700/50 dark:text-white/40">{filtered.length} equipe(s) encontrada(s)</p>

      <Table columns={columns} data={filtered} rowKey={(t) => t.id} onRowClick={(t) => navigate(`${basePath}/equipes/${t.id}`)} />

      <Modal
        open={newTeamOpen}
        onClose={() => setNewTeamOpen(false)}
        title="Cadastrar nova equipe"
        subtitle="A equipe entra automaticamente na etapa Envio da ideia"
        size="lg"
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome da ideia" required>
              <Input required value={form.ideaName} onChange={(e) => setForm({ ...form, ideaName: e.target.value })} placeholder="Ex: EcoRecicla" />
            </Field>
            <Field label="Área de atuação" required>
              <Input required value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Ex: Sustentabilidade" />
            </Field>
          </div>

          <Field label="Descrição da ideia" required>
            <Textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Resumo do problema e da solução proposta" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Curso" required hint="Curso principal da equipe">
              <Input required value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="Ex: Engenharia de Software" />
            </Field>
            <Field label="E-mail de contato da equipe" required>
              <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="equipe@exemplo.com" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome do líder" required>
              <Input required value={form.leaderName} onChange={(e) => setForm({ ...form, leaderName: e.target.value })} placeholder="Nome completo" />
            </Field>
            <Field label="E-mail do líder" hint="Se vazio, usa o e-mail de contato da equipe">
              <Input type="email" value={form.leaderEmail} onChange={(e) => setForm({ ...form, leaderEmail: e.target.value })} placeholder="lider@exemplo.com" />
            </Field>
          </div>

          <Field label="Mentor(es) responsável(is)" hint="Uma equipe pode ter mais de um mentor">
            <div className="flex flex-wrap gap-2">
              {allMentors.map((m) => {
                const active = form.mentorIds.includes(m.id)
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggleMentor(m.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'border-slate-200 dark:border-white/15 text-ink-700/60 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/25'
                    }`}
                  >
                    {m.name}
                  </button>
                )
              })}
            </div>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setNewTeamOpen(false)}>Cancelar</Button>
            <Button type="submit">Cadastrar equipe</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}

export default AdminTeams

import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { Table, Column } from '../../components/Table'
import { StatusBadge } from '../../components/StatusBadge'
import { Select, Input } from '../../components/FormControls'
import { TaskDueDate } from '../../components/TaskDueDate'
import { useAppData } from '../../context/AppDataContext'
import { useBasePath } from '../../utils/basePath'
import { stageById } from '../../data/stages'
import { TaskItem, TaskStatus } from '../../types'
import { Search } from 'lucide-react'

const STATUS_OPTIONS: { value: TaskStatus | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todos os status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'atrasada', label: 'Atrasada' },
  { value: 'aprovada', label: 'Aprovada' },
  { value: 'ajuste', label: 'Precisa de ajuste' },
]

const AdminTasks: React.FC = () => {
  const { tasks, teams, updateTaskStatus } = useAppData()
  const navigate = useNavigate()
  const basePath = useBasePath()
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'todas'>('todas')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const team = teams.find((tm) => tm.id === t.teamId)
      const matchesStatus = statusFilter === 'todas' || t.status === statusFilter
      const matchesSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) || team?.ideaName.toLowerCase().includes(search.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [tasks, teams, statusFilter, search])

  const columns: Column<TaskItem>[] = [
    {
      key: 'title',
      header: 'Tarefa',
      render: (t) => (
        <div className="max-w-xs">
          <p className="font-semibold text-ink-900 dark:text-white">{t.title}</p>
          <p className="truncate text-xs text-ink-700/50 dark:text-white/40">{t.description}</p>
        </div>
      ),
    },
    {
      key: 'team',
      header: 'Equipe',
      render: (t) => {
        const team = teams.find((tm) => tm.id === t.teamId)
        return (
          <button onClick={(e) => { e.stopPropagation(); navigate(`${basePath}/equipes/${t.teamId}`) }} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
            {team?.ideaName}
          </button>
        )
      },
    },
    {
      key: 'stage',
      header: 'Etapa',
      render: (t) => <span className="text-xs text-ink-700/70 dark:text-white/60">{stageById(t.stageId)?.shortTitle}</span>,
    },
    {
      key: 'due',
      header: 'Prazo',
      render: (t) => <div onClick={(e) => e.stopPropagation()}><TaskDueDate taskId={t.id} dueDate={t.dueDate} /></div>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
          <StatusBadge status={t.status} />
          <Select
            value={t.status}
            onChange={(e) => updateTaskStatus(t.id, e.target.value as TaskStatus)}
            className="!w-auto py-1 text-xs"
          >
            {STATUS_OPTIONS.filter((o) => o.value !== 'todas').map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
      ),
    },
  ]

  return (
    <Layout title="Tarefas">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-700/30 dark:text-white/25" />
          <Input placeholder="Buscar tarefa ou equipe..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'todas')} className="sm:w-56">
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>

      <p className="mb-3 text-xs text-ink-700/50 dark:text-white/40">{filtered.length} tarefa(s) encontrada(s) de {tasks.length} no total</p>

      <Table columns={columns} data={filtered} rowKey={(t) => t.id} onRowClick={(t) => navigate(`${basePath}/equipes/${t.teamId}`)} />
    </Layout>
  )
}

export default AdminTasks

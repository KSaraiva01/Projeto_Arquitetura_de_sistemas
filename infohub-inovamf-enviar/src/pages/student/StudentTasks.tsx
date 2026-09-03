import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud } from 'lucide-react'
import { Layout } from '../../components/Layout'
import { Card } from '../../components/Card'
import { StatusBadge } from '../../components/StatusBadge'
import { TaskDueDate } from '../../components/TaskDueDate'
import { Select } from '../../components/FormControls'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../context/AppDataContext'
import { stageById } from '../../data/stages'
import { TaskStatus } from '../../types'

const STUDENT_EDITABLE_STATUSES: TaskStatus[] = ['pendente', 'em_andamento']

const StudentTasks: React.FC = () => {
  const { user } = useAuth()
  const { getTeam, tasksByTeam, updateTaskStatus } = useAppData()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'todas' | TaskStatus>('todas')

  const team = user?.teamId ? getTeam(user.teamId) : undefined
  if (!team) {
    return (
      <Layout title="Minhas tarefas">
        <Card>Você ainda não está vinculado(a) a nenhuma equipe.</Card>
      </Layout>
    )
  }

  const tasks = tasksByTeam(team.id).filter((t) => filter === 'todas' || t.status === filter)

  return (
    <Layout title="Minhas tarefas">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-700/60 dark:text-white/50">Tarefas da equipe {team.ideaName}</p>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as 'todas' | TaskStatus)} className="w-52">
          <option value="todas">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="em_andamento">Em andamento</option>
          <option value="entregue">Entregue</option>
          <option value="atrasada">Atrasada</option>
          <option value="aprovada">Aprovada</option>
          <option value="ajuste">Precisa de ajuste</option>
        </Select>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 && <Card className="text-center text-sm text-ink-700/50 dark:text-white/40">Nenhuma tarefa encontrada para este filtro.</Card>}
        {tasks.map((t) => (
          <Card key={t.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-xl">
                <p className="font-semibold text-ink-900 dark:text-white">{t.title}</p>
                <p className="mt-1 text-sm text-ink-700/60 dark:text-white/50">{t.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <TaskDueDate taskId={t.id} dueDate={t.dueDate} />
                  <span className="text-xs text-ink-700/50 dark:text-white/40">Etapa: {stageById(t.stageId)?.shortTitle}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={t.status} />
                {STUDENT_EDITABLE_STATUSES.includes(t.status) && (
                  <Select
                    value={t.status}
                    onChange={(e) => updateTaskStatus(t.id, e.target.value as TaskStatus, user?.name)}
                    className="!w-auto py-1.5 text-xs"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                  </Select>
                )}
                {(t.status === 'ajuste' || t.status === 'pendente' || t.status === 'em_andamento') && (
                  <button
                    onClick={() => navigate('/aluno/entregas')}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                  >
                    <UploadCloud size={13} /> Enviar entrega
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Layout>
  )
}

export default StudentTasks

import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeft, Crown, GraduationCap, Tag, CalendarClock, Plus, FileText, Download,
  CheckCircle2, RotateCcw, Clock,
} from 'lucide-react'
import { Layout } from '../../components/Layout'
import { Card } from '../../components/Card'
import { StatusBadge } from '../../components/StatusBadge'
import { ProgressBar } from '../../components/ProgressBar'
import { JourneyTrail } from '../../components/JourneyTrail'
import { Modal } from '../../components/Modal'
import { Field, Input, Textarea, Select, Button } from '../../components/FormControls'
import { useAppData } from '../../context/AppDataContext'
import { STAGES, stageById } from '../../data/stages'
import { usersByTeam, userById } from '../../data/users'
import { TaskStatus, StageId } from '../../types'

type TabId = 'visao' | 'tarefas' | 'entregas' | 'historico'

const TAB_LABELS: Record<TabId, string> = {
  visao: 'Visão geral',
  tarefas: 'Tarefas',
  entregas: 'Entregas',
  historico: 'Histórico',
}

const TeamDetails: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const { getTeam, tasksByTeam, deliveriesByTeam, moveTeamToStage, updateTaskStatus, addTask, reviewDelivery } = useAppData()
  const [tab, setTab] = useState<TabId>('visao')
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  const team = teamId ? getTeam(teamId) : undefined
  if (!team) {
    return (
      <Layout title="Equipe não encontrada">
        <Card>Equipe não encontrada. <Link to="/admin/equipes" className="text-brand-600">Voltar para a lista</Link></Card>
      </Layout>
    )
  }

  const members = usersByTeam(team.id)
  const leader = userById(team.leaderId)
  const tasks = tasksByTeam(team.id)
  const deliveries = deliveriesByTeam(team.id)
  const stage = stageById(team.stageId)

  const [taskForm, setTaskForm] = useState({ title: '', description: '', dueDate: '', stageId: team.stageId as StageId })

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    addTask({
      teamId: team.id,
      title: taskForm.title,
      description: taskForm.description,
      dueDate: taskForm.dueDate,
      status: 'pendente',
      stageId: taskForm.stageId,
    })
    setNewTaskOpen(false)
    setTaskForm({ title: '', description: '', dueDate: '', stageId: team.stageId })
  }

  const reviewDeliveryData = deliveries.find((d) => d.id === reviewTarget)

  return (
    <Layout title="Detalhes da equipe">
      <button
        onClick={() => navigate('/admin/equipes')}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-ink-700/60 hover:text-ink-900"
      >
        <ChevronLeft size={16} /> Voltar para todas as equipes
      </button>

      {/* Cabeçalho */}
      <Card className="mb-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-xl font-bold text-ink-900">{team.ideaName}</h2>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{team.area}</span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-700/70">{team.description}</p>
          </div>
          <Select
            value={team.stageId}
            onChange={(e) => moveTeamToStage(team.id, e.target.value as StageId)}
            className="w-full sm:w-64"
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <InfoItem icon={<Crown size={14} />} label="Líder" value={leader?.name ?? '—'} />
          <InfoItem icon={<GraduationCap size={14} />} label="Curso" value={team.course} />
          <InfoItem icon={<Tag size={14} />} label="Área" value={team.area} />
          <InfoItem icon={<CalendarClock size={14} />} label="Ideia enviada em" value={new Date(team.createdAt + 'T00:00:00').toLocaleDateString('pt-BR')} />
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <ProgressBar value={team.progress} label={`Progresso geral · Etapa atual: ${stage?.title}`} colorClass={team.stageId === 'pronto' ? 'bg-trail-done' : 'bg-brand-600'} />
          <div className="mt-5">
            <JourneyTrail currentStageId={team.stageId} compact />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {(Object.keys(TAB_LABELS) as TabId[]).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === id ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-700/50 hover:text-ink-800'
            }`}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>

      {tab === 'visao' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <h3 className="mb-4 font-display text-base font-semibold text-ink-900">Integrantes ({members.length})</h3>
            <ul className="space-y-3">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: m.avatarColor }}>
                    {m.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      {m.name} {m.id === team.leaderId && <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">LÍDER</span>}
                    </p>
                    <p className="text-xs text-ink-700/50">{m.course}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3 className="mb-4 font-display text-base font-semibold text-ink-900">Resumo de tarefas</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              {(['pendente', 'em_andamento', 'atrasada', 'entregue', 'aprovada', 'ajuste'] as TaskStatus[]).map((s) => {
                const count = tasks.filter((t) => t.status === s).length
                return (
                  <div key={s} className="rounded-xl bg-slate-50 py-3">
                    <p className="font-display text-xl font-bold text-ink-900">{count}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase text-ink-700/50">{s.replace('_', ' ')}</p>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {tab === 'tarefas' && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink-900">Tarefas da equipe</h3>
            <Button onClick={() => setNewTaskOpen(true)}>
              <Plus size={16} /> Nova tarefa
            </Button>
          </div>
          <div className="space-y-3">
            {tasks.length === 0 && <p className="py-6 text-center text-sm text-ink-700/50">Nenhuma tarefa cadastrada ainda.</p>}
            {tasks.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">{t.title}</p>
                    <p className="mt-1 max-w-xl text-sm text-ink-700/60">{t.description}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-700/50">
                      <Clock size={12} /> Prazo: {new Date(t.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')} · {stageById(t.stageId)?.shortTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} />
                    <Select
                      value={t.status}
                      onChange={(e) => updateTaskStatus(t.id, e.target.value as TaskStatus)}
                      className="!w-auto py-1.5 text-xs"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="entregue">Entregue</option>
                      <option value="atrasada">Atrasada</option>
                      <option value="aprovada">Aprovada</option>
                      <option value="ajuste">Precisa de ajuste</option>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'entregas' && (
        <Card>
          <h3 className="mb-4 font-display text-base font-semibold text-ink-900">Arquivos enviados</h3>
          <div className="space-y-3">
            {deliveries.length === 0 && <p className="py-6 text-center text-sm text-ink-700/50">Nenhum arquivo enviado ainda.</p>}
            {deliveries.map((d) => {
              const task = tasks.find((t) => t.id === d.taskId)
              return (
                <div key={d.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <FileText size={18} />
                      </span>
                      <div>
                        <p className="font-semibold text-ink-900">{d.fileName}</p>
                        <p className="text-xs text-ink-700/50">Tarefa: {task?.title} · v{d.version} · {d.sizeKb} KB</p>
                        <p className="mt-0.5 text-xs text-ink-700/50">Enviado em {new Date(d.uploadedAt + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                        {d.comment && (
                          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-ink-700/70">
                            <strong>Comentário:</strong> {d.comment}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={d.status === 'entregue' ? 'entregue' : d.status === 'aprovada' ? 'aprovada' : 'ajuste'} />
                      <div className="flex gap-1.5">
                        <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-slate-50">
                          <Download size={12} /> Ver arquivo
                        </button>
                        {d.status === 'entregue' && (
                          <button
                            onClick={() => {
                              setReviewTarget(d.id)
                              setReviewComment('')
                            }}
                            className="flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                          >
                            <CheckCircle2 size={12} /> Revisar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {tab === 'historico' && (
        <Card>
          <h3 className="mb-5 font-display text-base font-semibold text-ink-900">Histórico da jornada</h3>
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
      )}

      {/* Modal nova tarefa */}
      <Modal open={newTaskOpen} onClose={() => setNewTaskOpen(false)} title="Nova tarefa" subtitle={`Para a equipe ${team.ideaName}`}>
        <form onSubmit={handleAddTask} className="space-y-4">
          <Field label="Título" required>
            <Input required value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Ex: Enviar Business Model Canvas" />
          </Field>
          <Field label="Descrição" required>
            <Textarea required rows={3} value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Detalhe o que a equipe deve entregar" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prazo" required>
              <Input required type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
            </Field>
            <Field label="Etapa relacionada" required>
              <Select value={taskForm.stageId} onChange={(e) => setTaskForm({ ...taskForm, stageId: e.target.value as StageId })}>
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.shortTitle}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setNewTaskOpen(false)}>Cancelar</Button>
            <Button type="submit">Criar tarefa</Button>
          </div>
        </form>
      </Modal>

      {/* Modal revisão de entrega */}
      <Modal open={!!reviewTarget} onClose={() => setReviewTarget(null)} title="Revisar entrega" subtitle={reviewDeliveryData?.fileName}>
        <div className="space-y-4">
          <Field label="Comentário para a equipe">
            <Textarea rows={4} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Explique o motivo da aprovação ou do que precisa ser ajustado" />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                if (reviewTarget) reviewDelivery(reviewTarget, 'ajuste', reviewComment || 'Favor revisar o material enviado.')
                setReviewTarget(null)
              }}
            >
              <RotateCcw size={15} /> Solicitar ajuste
            </Button>
            <Button
              onClick={() => {
                if (reviewTarget) reviewDelivery(reviewTarget, 'aprovada', reviewComment || 'Entrega aprovada.')
                setReviewTarget(null)
              }}
            >
              <CheckCircle2 size={15} /> Aprovar entrega
            </Button>
          </div>
        </div>
      </Modal>
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

export default TeamDetails

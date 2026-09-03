import React, { useState } from 'react'
import { FileText, Download, CheckCircle2, RotateCcw } from 'lucide-react'
import { Layout } from '../../components/Layout'
import { Card } from '../../components/Card'
import { StatusBadge } from '../../components/StatusBadge'
import { Modal } from '../../components/Modal'
import { Field, Textarea, Button, Select } from '../../components/FormControls'
import { useAppData } from '../../context/AppDataContext'
import { DeliveryStatus } from '../../types'

const AdminDeliveries: React.FC = () => {
  const { deliveries, teams, tasks, reviewDelivery } = useAppData()
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'todas'>('todas')
  const [reviewTarget, setReviewTarget] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  const filtered = deliveries.filter((d) => statusFilter === 'todas' || d.status === statusFilter)
  const reviewData = deliveries.find((d) => d.id === reviewTarget)

  return (
    <Layout title="Entregas">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-ink-700/60 dark:text-white/50">Todos os arquivos enviados pelas equipes, com status e comentários de revisão.</p>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DeliveryStatus | 'todas')} className="w-48">
          <option value="todas">Todos os status</option>
          <option value="entregue">Aguardando revisão</option>
          <option value="aprovada">Aprovadas</option>
          <option value="ajuste">Precisam de ajuste</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 && <Card className="md:col-span-2 xl:col-span-3 text-center text-sm text-ink-700/50 dark:text-white/40">Nenhuma entrega encontrada para este filtro.</Card>}
        {filtered.map((d) => {
          const team = teams.find((t) => t.id === d.teamId)
          const task = tasks.find((t) => t.id === d.taskId)
          return (
            <Card key={d.id}>
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400">
                  <FileText size={18} />
                </span>
                <StatusBadge status={d.status === 'entregue' ? 'entregue' : d.status === 'aprovada' ? 'aprovada' : 'ajuste'} />
              </div>
              <p className="mt-3 truncate font-semibold text-ink-900 dark:text-white" title={d.fileName}>{d.fileName}</p>
              <p className="mt-0.5 text-xs text-ink-700/50 dark:text-white/40">{team?.ideaName} · v{d.version} · {d.sizeKb} KB</p>
              <p className="mt-1 text-xs text-ink-700/50 dark:text-white/40">Tarefa: {task?.title}</p>
              <p className="mt-1 text-xs text-ink-700/40 dark:text-white/35">Enviado em {new Date(d.uploadedAt + 'T00:00:00').toLocaleDateString('pt-BR')}</p>

              {d.comment && (
                <p className="mt-3 rounded-lg bg-slate-50 dark:bg-ink-950 px-3 py-2 text-xs text-ink-700/70 dark:text-white/60">
                  <strong>Comentário:</strong> {d.comment}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/15 py-2 text-xs font-semibold text-ink-700 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5">
                  <Download size={13} /> Ver arquivo
                </button>
                {d.status === 'entregue' && (
                  <button
                    onClick={() => {
                      setReviewTarget(d.id)
                      setReviewComment('')
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    <CheckCircle2 size={13} /> Revisar
                  </button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <Modal open={!!reviewTarget} onClose={() => setReviewTarget(null)} title="Revisar entrega" subtitle={reviewData?.fileName}>
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

export default AdminDeliveries

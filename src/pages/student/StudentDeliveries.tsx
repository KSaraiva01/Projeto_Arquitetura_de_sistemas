import React, { useState } from 'react'
import { FileText, CheckCircle2 } from 'lucide-react'
import { Layout } from '../../components/Layout'
import { Card } from '../../components/Card'
import { StatusBadge } from '../../components/StatusBadge'
import { FileUpload } from '../../components/FileUpload'
import { Field, Select, Button } from '../../components/FormControls'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../context/AppDataContext'

const StudentDeliveries: React.FC = () => {
  const { user } = useAuth()
  const { getTeam, tasksByTeam, deliveriesByTeam, submitDelivery } = useAppData()
  const team = user?.teamId ? getTeam(user.teamId) : undefined

  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [pendingFile, setPendingFile] = useState<{ name: string; sizeKb: number } | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  if (!team) {
    return (
      <Layout title="Envio de entregas">
        <Card>Você ainda não está vinculado(a) a nenhuma equipe.</Card>
      </Layout>
    )
  }

  const tasks = tasksByTeam(team.id)
  const submittableTasks = tasks.filter((t) => t.status !== 'aprovada')
  const deliveries = deliveriesByTeam(team.id)

  const handleSubmit = () => {
    if (!selectedTaskId || !pendingFile) return
    submitDelivery({ teamId: team.id, taskId: selectedTaskId, fileName: pendingFile.name, sizeKb: pendingFile.sizeKb })
    setConfirmed(true)
    setTimeout(() => {
      setConfirmed(false)
      setPendingFile(null)
      setSelectedTaskId('')
    }, 2200)
  }

  return (
    <Layout title="Envio de entregas">
      <Card className="mb-6">
        <h3 className="mb-1 font-display text-base font-semibold text-ink-900">Enviar novo arquivo</h3>
        <p className="mb-4 text-xs text-ink-700/50">Selecione a tarefa relacionada e envie o arquivo (simulado — nada é enviado a um servidor real).</p>

        <div className="space-y-4">
          <Field label="Tarefa relacionada" required>
            <Select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}>
              <option value="">Selecione uma tarefa...</option>
              {submittableTasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </Select>
          </Field>

          <FileUpload onFileSelected={setPendingFile} />

          {confirmed ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={17} /> Entrega enviada com sucesso! A equipe de mentoria irá revisar em breve.
            </div>
          ) : (
            <Button onClick={handleSubmit} disabled={!selectedTaskId || !pendingFile} className="w-full">
              Confirmar envio da entrega
            </Button>
          )}
        </div>
      </Card>

      <h3 className="mb-3 font-display text-base font-semibold text-ink-900">Entregas enviadas</h3>
      <div className="space-y-3">
        {deliveries.length === 0 && <Card className="text-center text-sm text-ink-700/50">Nenhum arquivo enviado ainda.</Card>}
        {[...deliveries].reverse().map((d) => {
          const task = tasks.find((t) => t.id === d.taskId)
          return (
            <Card key={d.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <FileText size={18} />
                  </span>
                  <div>
                    <p className="font-semibold text-ink-900">{d.fileName}</p>
                    <p className="text-xs text-ink-700/50">Tarefa: {task?.title} · versão {d.version} · {d.sizeKb} KB</p>
                    <p className="mt-0.5 text-xs text-ink-700/50">Enviado em {new Date(d.uploadedAt + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    {d.comment && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-ink-700/70">
                        <strong>Comentário do administrador:</strong> {d.comment}
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={d.status === 'entregue' ? 'entregue' : d.status === 'aprovada' ? 'aprovada' : 'ajuste'} />
              </div>
            </Card>
          )
        })}
      </div>
    </Layout>
  )
}

export default StudentDeliveries

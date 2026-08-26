import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Info } from 'lucide-react'
import { Layout } from '../../components/Layout'
import { KanbanBoard } from '../../components/KanbanBoard'

const AdminKanban: React.FC = () => {
  const navigate = useNavigate()

  return (
    <Layout title="Kanban da jornada">
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-xs text-brand-800">
        <Info size={15} className="mt-0.5 shrink-0" />
        <p>
          Arraste um card para outra coluna para mover a equipe de etapa, ou use o botão{' '}
          <strong>“Avançar etapa”</strong> que aparece ao passar o mouse. Clique no card para ver os detalhes completos da equipe.
        </p>
      </div>
      <KanbanBoard onOpenTeam={(id) => navigate(`/admin/equipes/${id}`)} />
    </Layout>
  )
}

export default AdminKanban

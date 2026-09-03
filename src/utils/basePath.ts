import { useAuth } from '../context/AuthContext'

/**
 * Administradores e mentores compartilham as mesmas telas de gestão
 * (Dashboard, Equipes, Kanban, Tarefas, Entregas, Relatórios), mas cada
 * papel navega sob seu próprio prefixo de rota: /admin ou /mentor.
 * Este hook resolve o prefixo correto conforme o usuário logado.
 */
export function useBasePath(): '/admin' | '/mentor' {
  const { user } = useAuth()
  return user?.role === 'mentor' ? '/mentor' : '/admin'
}

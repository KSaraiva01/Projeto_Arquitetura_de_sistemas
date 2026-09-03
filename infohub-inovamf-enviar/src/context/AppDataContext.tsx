import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { Team, TaskItem, Delivery, StageId, TaskStatus, DeliveryStatus, HistoryEntry } from '../types'
import { TEAMS } from '../data/teams'
import { TASKS } from '../data/tasks'
import { DELIVERIES } from '../data/deliveries'
import { STAGES, stageById } from '../data/stages'

interface AppDataContextValue {
  teams: Team[]
  tasks: TaskItem[]
  deliveries: Delivery[]
  getTeam: (id: string) => Team | undefined
  tasksByTeam: (teamId: string) => TaskItem[]
  deliveriesByTeam: (teamId: string) => Delivery[]
  deliveryForTask: (taskId: string) => Delivery | undefined
  moveTeamToStage: (teamId: string, stageId: StageId, author?: string) => void
  updateTaskStatus: (taskId: string, status: TaskStatus, author?: string) => void
  updateTaskDueDate: (taskId: string, dueDate: string, author?: string) => void
  addTask: (task: Omit<TaskItem, 'id'>) => void
  addTeam: (team: Omit<Team, 'id' | 'stageId' | 'progress' | 'createdAt' | 'history'>) => Team
  submitDelivery: (params: { teamId: string; taskId: string; fileName: string; sizeKb: number }) => void
  reviewDelivery: (deliveryId: string, decision: 'aprovada' | 'ajuste', comment: string) => void
  addHistoryEntry: (teamId: string, description: string, author: string) => void
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined)

let idCounter = 1000
const nextId = (prefix: string) => `${prefix}-${idCounter++}`

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>(TEAMS)
  const [tasks, setTasks] = useState<TaskItem[]>(TASKS)
  const [deliveries, setDeliveries] = useState<Delivery[]>(DELIVERIES)

  const getTeam = useCallback((id: string) => teams.find((t) => t.id === id), [teams])
  const tasksByTeamFn = useCallback((teamId: string) => tasks.filter((t) => t.teamId === teamId), [tasks])
  const deliveriesByTeamFn = useCallback((teamId: string) => deliveries.filter((d) => d.teamId === teamId), [deliveries])
  const deliveryForTask = useCallback((taskId: string) => deliveries.find((d) => d.taskId === taskId), [deliveries])

  const addHistoryEntry = useCallback((teamId: string, description: string, author: string) => {
    const entry: HistoryEntry = {
      id: nextId('h'),
      date: new Date().toISOString().slice(0, 10),
      description,
      author,
    }
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, history: [...t.history, entry] } : t)),
    )
  }, [])

  const moveTeamToStage = useCallback(
    (teamId: string, stageId: StageId, author = 'Administração') => {
      const stage = stageById(stageId)
      const progress = stage ? Math.round(((stage.order - 1) / (STAGES.length - 1)) * 100) : 0
      setTeams((prev) =>
        prev.map((t) => (t.id === teamId ? { ...t, stageId, progress } : t)),
      )
      addHistoryEntry(teamId, `Equipe movida para a etapa "${stage?.title ?? stageId}".`, author)
    },
    [addHistoryEntry],
  )

  const updateTaskStatus = useCallback(
    (taskId: string, status: TaskStatus, author = 'Administração') => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)))
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        addHistoryEntry(task.teamId, `Status da tarefa "${task.title}" alterado para "${statusLabel(status)}".`, author)
      }
    },
    [tasks, addHistoryEntry],
  )

  const updateTaskDueDate = useCallback(
    (taskId: string, dueDate: string, author = 'Mentoria') => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dueDate } : t)))
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        const formatted = new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR')
        addHistoryEntry(task.teamId, `Prazo da tarefa "${task.title}" alterado para ${formatted}.`, author)
      }
    },
    [tasks, addHistoryEntry],
  )

  const addTask = useCallback((task: Omit<TaskItem, 'id'>) => {
    const newTask: TaskItem = { ...task, id: nextId('tk') }
    setTasks((prev) => [...prev, newTask])
    addHistoryEntry(task.teamId, `Nova tarefa criada: "${task.title}".`, 'Administração')
  }, [addHistoryEntry])

  const addTeam = useCallback(
    (team: Omit<Team, 'id' | 'stageId' | 'progress' | 'createdAt' | 'history'>) => {
      const newTeam: Team = {
        ...team,
        id: nextId('t'),
        stageId: 'ideia',
        progress: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        history: [
          {
            id: nextId('h'),
            date: new Date().toISOString().slice(0, 10),
            description: 'Equipe cadastrada no InfoHub.',
            author: team.leaderName,
          },
        ],
      }
      setTeams((prev) => [...prev, newTeam])
      return newTeam
    },
    [],
  )

  const submitDelivery = useCallback(
    ({ teamId, taskId, fileName, sizeKb }: { teamId: string; taskId: string; fileName: string; sizeKb: number }) => {
      setDeliveries((prev) => {
        const existing = prev.filter((d) => d.taskId === taskId)
        const version = existing.length + 1
        const newDelivery: Delivery = {
          id: nextId('d'),
          teamId,
          taskId,
          fileName,
          version,
          status: 'entregue',
          comment: '',
          uploadedAt: new Date().toISOString().slice(0, 10),
          sizeKb,
        }
        return [...prev, newDelivery]
      })
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'entregue' } : t)))
      const task = tasks.find((t) => t.id === taskId)
      addHistoryEntry(teamId, `Arquivo "${fileName}" enviado para a tarefa "${task?.title ?? ''}".`, 'Aluno')
    },
    [tasks, addHistoryEntry],
  )

  const reviewDelivery = useCallback(
    (deliveryId: string, decision: 'aprovada' | 'ajuste', comment: string) => {
      let teamId = ''
      let taskId = ''
      setDeliveries((prev) =>
        prev.map((d) => {
          if (d.id === deliveryId) {
            teamId = d.teamId
            taskId = d.taskId
            return { ...d, status: decision, comment }
          }
          return d
        }),
      )
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: decision === 'aprovada' ? 'aprovada' : 'ajuste' } : t)),
      )
      if (teamId) {
        addHistoryEntry(
          teamId,
          decision === 'aprovada'
            ? 'Entrega aprovada pela administração.'
            : `Administração solicitou ajustes na entrega: "${comment}"`,
          'Administração',
        )
      }
    },
    [addHistoryEntry],
  )

  const value = useMemo(
    () => ({
      teams,
      tasks,
      deliveries,
      getTeam,
      tasksByTeam: tasksByTeamFn,
      deliveriesByTeam: deliveriesByTeamFn,
      deliveryForTask,
      moveTeamToStage,
      updateTaskStatus,
      updateTaskDueDate,
      addTask,
      addTeam,
      submitDelivery,
      reviewDelivery,
      addHistoryEntry,
    }),
    [teams, tasks, deliveries, getTeam, tasksByTeamFn, deliveriesByTeamFn, deliveryForTask, moveTeamToStage, updateTaskStatus, updateTaskDueDate, addTask, addTeam, submitDelivery, reviewDelivery, addHistoryEntry],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export const useAppData = () => {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData deve ser usado dentro de AppDataProvider')
  return ctx
}

export function statusLabel(status: TaskStatus | DeliveryStatus): string {
  const map: Record<string, string> = {
    pendente: 'Pendente',
    em_andamento: 'Em andamento',
    entregue: 'Entregue',
    atrasada: 'Atrasada',
    aprovada: 'Aprovada',
    ajuste: 'Precisa de ajuste',
  }
  return map[status] ?? status
}

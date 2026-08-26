export type Role = 'admin' | 'aluno'

export type StageId =
  | 'ideia'
  | 'contato'
  | 'encontro1'
  | 'encontro2'
  | 'encontro3'
  | 'encontro4'
  | 'pronto'

export interface Stage {
  id: StageId
  order: number
  title: string
  shortTitle: string
  description: string
}

export type TaskStatus =
  | 'pendente'
  | 'em_andamento'
  | 'entregue'
  | 'atrasada'
  | 'aprovada'
  | 'ajuste'

export interface User {
  id: string
  name: string
  email: string
  password: string
  role: Role
  teamId?: string
  course?: string
  avatarColor?: string
}

export interface HistoryEntry {
  id: string
  date: string
  description: string
  author: string
}

export interface Team {
  id: string
  ideaName: string
  description: string
  course: string
  area: string
  leaderId: string
  memberIds: string[]
  stageId: StageId
  progress: number
  createdAt: string
  history: HistoryEntry[]
}

export interface TaskItem {
  id: string
  teamId: string
  stageId: StageId
  title: string
  description: string
  dueDate: string
  status: TaskStatus
}

export type DeliveryStatus = 'entregue' | 'aprovada' | 'ajuste' | 'pendente'

export interface Delivery {
  id: string
  teamId: string
  taskId: string
  fileName: string
  version: number
  status: DeliveryStatus
  comment: string
  uploadedAt: string
  sizeKb: number
}

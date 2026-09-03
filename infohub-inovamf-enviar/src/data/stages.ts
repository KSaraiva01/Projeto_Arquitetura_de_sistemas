import { Stage } from '../types'

export const STAGES: Stage[] = [
  {
    id: 'ideia',
    order: 1,
    title: 'Envio da ideia',
    shortTitle: 'Ideia',
    description: 'A equipe registrou sua ideia inicial no InfoHub.',
  },
  {
    id: 'contato',
    order: 2,
    title: 'Contato com a equipe',
    shortTitle: 'Contato',
    description: 'Primeira aproximação da mentoria com a equipe.',
  },
  {
    id: 'encontro1',
    order: 3,
    title: 'Encontro 1 — Entendendo a ideia',
    shortTitle: 'Encontro 1',
    description: 'Mapeamento do problema, contexto e motivação da equipe.',
  },
  {
    id: 'encontro2',
    order: 4,
    title: 'Encontro 2 — Proposta de valor',
    shortTitle: 'Encontro 2',
    description: 'Construção da proposta de valor e diferenciais da solução.',
  },
  {
    id: 'encontro3',
    order: 5,
    title: 'Encontro 3 — Modelo de negócio',
    shortTitle: 'Encontro 3',
    description: 'Desenho do modelo de negócio (Business Model Canvas).',
  },
  {
    id: 'encontro4',
    order: 6,
    title: 'Encontro 4 — Pitch e inscrição',
    shortTitle: 'Encontro 4',
    description: 'Preparação do pitch final e inscrição no InovAMF.',
  },
  {
    id: 'pronto',
    order: 7,
    title: 'Pronto para o InovAMF',
    shortTitle: 'Pronto',
    description: 'Equipe concluiu a jornada e está apta para o InovAMF.',
  },
]

export const stageById = (id: string) => STAGES.find((s) => s.id === id)

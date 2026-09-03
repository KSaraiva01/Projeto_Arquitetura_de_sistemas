import { TaskItem } from '../types'

export const TASKS: TaskItem[] = [
  // Equipe t1 — NutriRota (Encontro 2)
  { id: 'tk1', teamId: 't1', stageId: 'encontro1', title: 'Pesquisa de validação com usuários', description: 'Aplicar questionário com pelo menos 30 estudantes sobre restrições alimentares.', dueDate: '2026-06-20', status: 'aprovada' },
  { id: 'tk2', teamId: 't1', stageId: 'encontro2', title: 'Canvas de proposta de valor', description: 'Preencher o Value Proposition Canvas com dores, ganhos e tarefas do usuário.', dueDate: '2026-08-28', status: 'em_andamento' },
  { id: 'tk3', teamId: 't1', stageId: 'encontro2', title: 'Roteiro para o Encontro 3', description: 'Levantar dúvidas sobre modelo de receita para discutir no próximo encontro.', dueDate: '2026-09-02', status: 'pendente' },

  // Equipe t2 — EcoRecicla (Ideia)
  { id: 'tk4', teamId: 't2', stageId: 'ideia', title: 'Formulário de submissão da ideia', description: 'Preencher formulário completo com dados da equipe e da ideia.', dueDate: '2026-08-12', status: 'aprovada' },
  { id: 'tk5', teamId: 't2', stageId: 'contato', title: 'Agendar primeira reunião com mentoria', description: 'Escolher 3 horários disponíveis para o primeiro contato.', dueDate: '2026-08-30', status: 'pendente' },

  // Equipe t3 — StudyMatch (Pronto)
  { id: 'tk6', teamId: 't3', stageId: 'encontro3', title: 'Business Model Canvas', description: 'Finalizar os 9 blocos do modelo de negócio.', dueDate: '2026-05-08', status: 'aprovada' },
  { id: 'tk7', teamId: 't3', stageId: 'encontro4', title: 'Slides do pitch final', description: 'Preparar apresentação de 5 minutos para a banca.', dueDate: '2026-05-28', status: 'aprovada' },
  { id: 'tk8', teamId: 't3', stageId: 'pronto', title: 'Inscrição oficial no InovAMF', description: 'Enviar formulário de inscrição com todos os anexos exigidos.', dueDate: '2026-06-05', status: 'aprovada' },

  // Equipe t4 — AgroSense (Encontro 1)
  { id: 'tk9', teamId: 't4', stageId: 'encontro1', title: 'Mapa de empatia dos produtores rurais', description: 'Construir mapa de empatia com base nas entrevistas realizadas.', dueDate: '2026-08-15', status: 'atrasada' },
  { id: 'tk10', teamId: 't4', stageId: 'encontro1', title: 'Entrevistas com produtores locais', description: 'Realizar 5 entrevistas com pequenos produtores da região.', dueDate: '2026-08-27', status: 'em_andamento' },

  // Equipe t5 — SaúdeJá (Encontro 4)
  { id: 'tk11', teamId: 't5', stageId: 'encontro4', title: 'Slides do pitch', description: 'Montar apresentação seguindo o roteiro de storytelling sugerido.', dueDate: '2026-08-20', status: 'entregue' },
  { id: 'tk12', teamId: 't5', stageId: 'pronto', title: 'Inscrição no InovAMF', description: 'Preencher e enviar o formulário oficial de inscrição.', dueDate: '2026-08-29', status: 'pendente' },
  { id: 'tk13', teamId: 't5', stageId: 'encontro4', title: 'Ensaio do pitch com a mentoria', description: 'Apresentar o pitch para feedback antes da entrega final.', dueDate: '2026-08-10', status: 'aprovada' },

  // Equipe t6 — FinLeve (Contato)
  { id: 'tk14', teamId: 't6', stageId: 'ideia', title: 'Formulário de submissão da ideia', description: 'Preencher formulário completo com dados da equipe e da ideia.', dueDate: '2026-08-03', status: 'aprovada' },
  { id: 'tk15', teamId: 't6', stageId: 'contato', title: 'Enviar disponibilidade de agenda', description: 'Compartilhar 3 opções de horário para o Encontro 1.', dueDate: '2026-08-26', status: 'pendente' },

  // Equipe t7 — PetCare Connect (Encontro 3)
  { id: 'tk16', teamId: 't7', stageId: 'encontro3', title: 'Business Model Canvas', description: 'Detalhar fontes de receita e estrutura de custos do marketplace.', dueDate: '2026-08-18', status: 'ajuste' },
  { id: 'tk17', teamId: 't7', stageId: 'encontro3', title: 'Análise de concorrentes', description: 'Mapear 3 concorrentes diretos e 2 indiretos com pontos fortes e fracos.', dueDate: '2026-08-30', status: 'em_andamento' },

  // Equipe t8 — Artesanato Digital (Encontro 1)
  { id: 'tk18', teamId: 't8', stageId: 'encontro1', title: 'Resumo do problema identificado', description: 'Documento de 1 página descrevendo o problema validado com artesãos.', dueDate: '2026-08-10', status: 'atrasada' },
  { id: 'tk19', teamId: 't8', stageId: 'encontro1', title: 'Persona do artesão local', description: 'Criar persona detalhada com base nas entrevistas realizadas.', dueDate: '2026-08-31', status: 'pendente' },
]

export const tasksByTeam = (teamId: string) => TASKS.filter((t) => t.teamId === teamId)

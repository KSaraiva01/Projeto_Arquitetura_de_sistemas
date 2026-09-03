import { User } from '../types'

export const USERS: User[] = [
  {
    id: 'u-admin',
    name: 'Camila Torres',
    email: 'admin@infohub.com',
    password: 'admin123',
    role: 'admin',
    avatarColor: '#4640DE',
  },

  // Mentores — podem existir vários
  {
    id: 'u-mentor1',
    name: 'Prof. Ricardo Nunes',
    email: 'ricardo.mentor@infohub.com',
    password: 'mentor123',
    role: 'mentor',
    course: 'Mentoria de Inovação',
    avatarColor: '#14B88A',
  },
  {
    id: 'u-mentor2',
    name: 'Profa. Juliana Prado',
    email: 'juliana.mentor@infohub.com',
    password: 'mentor123',
    role: 'mentor',
    course: 'Mentoria de Negócios',
    avatarColor: '#F5A524',
  },
  {
    id: 'u-mentor3',
    name: 'Prof. Eduardo Katsu',
    email: 'eduardo.mentor@infohub.com',
    password: 'mentor123',
    role: 'mentor',
    course: 'Mentoria de Produto',
    avatarColor: '#5B5FEF',
  },

  // Equipe 1 — NutriRota
  { id: 'u1', name: 'João Pedro Silva', email: 'joao@aluno.com', password: '123456', role: 'aluno', teamId: 't1', course: 'Engenharia de Software', avatarColor: '#F5A524' },
  { id: 'u2', name: 'Ana Beatriz Lima', email: 'ana@aluno.com', password: '123456', role: 'aluno', teamId: 't1', course: 'Nutrição', avatarColor: '#14B88A' },
  { id: 'u3', name: 'Rafael Souza', email: 'rafael@aluno.com', password: '123456', role: 'aluno', teamId: 't1', course: 'Design', avatarColor: '#EF4548' },

  // Equipe 2 — EcoRecicla
  { id: 'u4', name: 'Mariana Costa', email: 'mariana@aluno.com', password: '123456', role: 'aluno', teamId: 't2', course: 'Engenharia Ambiental', avatarColor: '#5B5FEF' },
  { id: 'u5', name: 'Lucas Almeida', email: 'lucas@aluno.com', password: '123456', role: 'aluno', teamId: 't2', course: 'Administração', avatarColor: '#F5A524' },

  // Equipe 3 — StudyMatch
  { id: 'u6', name: 'Beatriz Rocha', email: 'beatriz@aluno.com', password: '123456', role: 'aluno', teamId: 't3', course: 'Sistemas de Informação', avatarColor: '#14B88A' },
  { id: 'u7', name: 'Gustavo Ferreira', email: 'gustavo@aluno.com', password: '123456', role: 'aluno', teamId: 't3', course: 'Ciência da Computação', avatarColor: '#EF4548' },
  { id: 'u8', name: 'Isabela Martins', email: 'isabela@aluno.com', password: '123456', role: 'aluno', teamId: 't3', course: 'Psicologia', avatarColor: '#4640DE' },

  // Equipe 4 — AgroSense
  { id: 'u9', name: 'Pedro Henrique Dias', email: 'pedro@aluno.com', password: '123456', role: 'aluno', teamId: 't4', course: 'Agronomia', avatarColor: '#F5A524' },
  { id: 'u10', name: 'Larissa Nogueira', email: 'larissa@aluno.com', password: '123456', role: 'aluno', teamId: 't4', course: 'Engenharia da Computação', avatarColor: '#14B88A' },

  // Equipe 5 — SaúdeJá
  { id: 'u11', name: 'Fernanda Oliveira', email: 'fernanda@aluno.com', password: '123456', role: 'aluno', teamId: 't5', course: 'Enfermagem', avatarColor: '#5B5FEF' },
  { id: 'u12', name: 'Thiago Barbosa', email: 'thiago@aluno.com', password: '123456', role: 'aluno', teamId: 't5', course: 'Sistemas de Informação', avatarColor: '#EF4548' },
  { id: 'u13', name: 'Camila Ribeiro', email: 'camila.r@aluno.com', password: '123456', role: 'aluno', teamId: 't5', course: 'Administração', avatarColor: '#F5A524' },

  // Equipe 6 — FinLeve
  { id: 'u14', name: 'Diego Santos', email: 'diego@aluno.com', password: '123456', role: 'aluno', teamId: 't6', course: 'Ciências Contábeis', avatarColor: '#4640DE' },
  { id: 'u15', name: 'Juliana Pires', email: 'juliana@aluno.com', password: '123456', role: 'aluno', teamId: 't6', course: 'Economia', avatarColor: '#14B88A' },

  // Equipe 7 — PetCare Connect
  { id: 'u16', name: 'Vinícius Araújo', email: 'vinicius@aluno.com', password: '123456', role: 'aluno', teamId: 't7', course: 'Medicina Veterinária', avatarColor: '#F5A524' },
  { id: 'u17', name: 'Letícia Fonseca', email: 'leticia@aluno.com', password: '123456', role: 'aluno', teamId: 't7', course: 'Engenharia de Software', avatarColor: '#EF4548' },

  // Equipe 8 — Artesanato Digital
  { id: 'u18', name: 'Bruno Cardoso', email: 'bruno@aluno.com', password: '123456', role: 'aluno', teamId: 't8', course: 'Design', avatarColor: '#5B5FEF' },
  { id: 'u19', name: 'Amanda Teixeira', email: 'amanda@aluno.com', password: '123456', role: 'aluno', teamId: 't8', course: 'Marketing', avatarColor: '#14B88A' },
  { id: 'u20', name: 'Rodrigo Melo', email: 'rodrigo@aluno.com', password: '123456', role: 'aluno', teamId: 't8', course: 'Administração', avatarColor: '#4640DE' },
]

export const userById = (id: string) => USERS.find((u) => u.id === id)
export const usersByTeam = (teamId: string) => USERS.filter((u) => u.teamId === teamId)
export const mentors = () => USERS.filter((u) => u.role === 'mentor')
export const mentorsByIds = (ids: string[]) => USERS.filter((u) => ids.includes(u.id))

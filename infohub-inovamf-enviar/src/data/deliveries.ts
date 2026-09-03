import { Delivery } from '../types'

export const DELIVERIES: Delivery[] = [
  { id: 'd1', teamId: 't1', taskId: 'tk1', fileName: 'pesquisa-validacao-nutrirota.pdf', version: 1, status: 'aprovada', comment: 'Ótima amostra! Dados bem organizados, segue para a próxima etapa.', uploadedAt: '2026-06-19', sizeKb: 842 },

  { id: 'd2', teamId: 't3', taskId: 'tk6', fileName: 'bmc-studymatch-v2.pdf', version: 2, status: 'aprovada', comment: 'Modelo de negócio consistente. Aprovado.', uploadedAt: '2026-05-07', sizeKb: 512 },
  { id: 'd3', teamId: 't3', taskId: 'tk7', fileName: 'pitch-studymatch-final.pptx', version: 1, status: 'aprovada', comment: 'Apresentação clara e objetiva. Excelente trabalho.', uploadedAt: '2026-05-27', sizeKb: 3120 },
  { id: 'd4', teamId: 't3', taskId: 'tk8', fileName: 'inscricao-inovamf-studymatch.pdf', version: 1, status: 'aprovada', comment: 'Inscrição validada com sucesso.', uploadedAt: '2026-06-04', sizeKb: 220 },

  { id: 'd5', teamId: 't5', taskId: 'tk11', fileName: 'pitch-saudeja-v1.pptx', version: 1, status: 'entregue', comment: '', uploadedAt: '2026-08-19', sizeKb: 2840 },

  { id: 'd6', teamId: 't5', taskId: 'tk13', fileName: 'roteiro-ensaio-pitch.docx', version: 1, status: 'aprovada', comment: 'Boa fluidez na narrativa, mantenha o tom no dia da banca.', uploadedAt: '2026-08-09', sizeKb: 96 },

  { id: 'd7', teamId: 't6', taskId: 'tk14', fileName: 'formulario-ideia-finleve.pdf', version: 1, status: 'aprovada', comment: 'Ideia bem descrita, aguardamos o contato inicial.', uploadedAt: '2026-08-02', sizeKb: 180 },

  { id: 'd8', teamId: 't7', taskId: 'tk16', fileName: 'bmc-petcare-v1.pdf', version: 1, status: 'ajuste', comment: 'Revisem o bloco de "Fontes de receita" — está genérico demais. Detalhem valores e frequência de cobrança.', uploadedAt: '2026-08-17', sizeKb: 430 },

  { id: 'd9', teamId: 't8', taskId: 'tk18', fileName: 'resumo-problema-artesanato-v1.docx', version: 1, status: 'ajuste', comment: 'Faltou evidenciar dados quantitativos das entrevistas. Podem reenviar até sexta-feira.', uploadedAt: '2026-08-09', sizeKb: 64 },
]

export const deliveriesByTeam = (teamId: string) => DELIVERIES.filter((d) => d.teamId === teamId)
export const deliveryByTask = (taskId: string) => DELIVERIES.find((d) => d.taskId === taskId)

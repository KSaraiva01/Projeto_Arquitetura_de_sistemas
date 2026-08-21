quero que faça apenas um front end de desta aplicação O InfoHub é o laboratório da Faculdade Antonio Meneghetti onde alunos desenvolvem uma ideia de negócio até

um MVP, com apoio de mentores, antes de serem encaminhados ao centro de inovação InovAMF. O processo

hoje é guiado por uma cartilha (“Do InfoHub ao InovAMF – Guia do participante”) que descreve as etapas, mas o

acompanhamento de cada aluno/equipe é feito manualmente.

Este documento descreve os requisitos para um sistema web que digitalize esse acompanhamento: um

administrador (equipe InfoHub/mentores) gerencia a jornada de cada aluno ou equipe, atribui tarefas, define

prazos, envia lembretes automáticos por e-mail e recebe os arquivos entregues. O aluno acessa uma área própria

para preencher seus dados, ver as tarefas pendentes e enviar os entregáveis solicitados.

1.1 Objetivos do sistema

• OBJ-01 Centralizar o cadastro dos alunos/equipes e das ideias em avaliação no InfoHub.

• OBJ-02 Dar visibilidade ao administrador sobre em que etapa da jornada cada aluno/equipe está e o que

falta para avançar.

• OBJ-03 Permitir que o administrador atribua tarefas e prazos, e que o aluno envie os arquivos/entregáveis

solicitados diretamente no sistema.

• OBJ-04 Enviar lembretes automáticos por e-mail em datas configuráveis, reduzindo o acompanhamento

manual via WhatsApp.

• OBJ-05 Gerar uma visão consolidada (painel/relatório) do funil InfoHub → InovAMF para a coordenação.

1.2 Fora de escopo (nesta primeira versão)

• Submissão automática da inscrição no edital do InovAMF (o sistema prepara os materiais; a submissão ao

InovAMF permanece um processo à parte).

• Comunicação via WhatsApp (o guia atual usa WhatsApp para o primeiro contato; nesta v1 o sistema cobre

apenas e-mail, ver seção 8 sobre integrações futuras).

• Videochamada/agendamento integrado para os encontros com mentores.

Perfis de usuário
Perfil Quem é O que faz no sistema

Administrador Equipe InfoHub / mentores / coordenação Cadastra e acompanha alunos e equipes, define

e atribui tarefas e prazos, avalia entregas, avança

etapas da jornada, envia lembretes, acessa

relatórios.

Aluno (líder de

equipe)

Aluno que envia a ideia inicial Preenche o formulário de inscrição, cadastra os

colegas de equipe, acompanha tarefas, envia

arquivos, recebe lembretes por e-mail.

Integrante de

equipe

Demais alunos da equipe Perfil opcional (ver seção 9 – Perguntas em

aberto): pode ter acesso próprio de

leitura/entrega ou ser apenas cadastrado pelo

líder.

Mentor Responsável por conduzir os encontros Perfil opcional, com permissões parecidas às do

administrador, mas restrito às equipes sob sua

mentoria (ver seção 9).

Jornada do aluno mapeada no sistema
Página 2 de 6

InfoHub → InovAMF – Documento de Requisitos

A jornada segue as seis etapas descritas na cartilha do InfoHub. O sistema deve representar essas etapas como

um funil/pipeline, com cada aluno ou equipe posicionado em uma delas.

Etapa Nome O que acontece Entregável / dado gerado

1 Envio da ideia Aluno preenche o formulário inicial

contando a ideia.

Cadastro da ideia (formulário)

2 Contato com a equipe Equipe InfoHub analisa a proposta e agenda

o 1o encontro.

Agendamento confirmado

3 Encontro 1 – Entendendo a

ideia

Mentor e aluno definem problema,

público-alvo e solução inicial.

Problema, público-alvo e

solução definidos

4 Encontro 2 – Proposta de

valor

Construção do Value Proposition Design. Value Proposition Design

5 Encontro 3 – Modelo de

negócio

Construção do Business Model Canvas. Business Model Canvas

6 Encontro 4 – Pitch e inscrição Revisão geral, gravação do Pitch Vídeo e

conferência de documentos.

Pitch Vídeo, Canvas final, VPD

final, dados de todos os

integrantes

Ao concluir a etapa 6, a equipe está apta para submissão ao InovAMF — o sistema deve marcar esse status como

“Pronto para o InovAMF” / “Encaminhado ao InovAMF”.

Requisitos funcionais
4.1 Cadastro e autenticação

• RF-01 O sistema deve permitir login separado para administrador e para aluno (e-mail e senha, com opção

de recuperação de senha).

• RF-02 O aluno deve poder se cadastrar preenchendo o formulário inicial de ideia (ver 4.2), que cria

automaticamente sua conta de acesso.

• RF-03 O administrador deve poder criar, editar e desativar contas de administrador/mentor.

4.2 Formulário inicial do aluno (Etapa 1 – Envio da ideia)

Campos mínimos do formulário de inscrição, com base no fluxo descrito na cartilha:

• Nome completo do aluno (responsável pelo envio)

• E-mail e telefone/WhatsApp

• Curso e semestre/período

• Nome e curso de cada colega de equipe (campo repetível – adicionar quantos integrantes forem

necessários)

• Nome da ideia/projeto

• Descrição inicial da ideia (“esboço”, mesmo que ainda “crua”)

• Área/setor da ideia (ex.: educação, saúde, tecnologia, sustentabilidade — lista configurável pelo

administrador)

• Estágio atual da ideia (apenas ideia, protótipo, MVP em desenvolvimento, MVP pronto)

• Como conheceu o InfoHub (opcional, campo de origem/divulgação)

• RF-04 O sistema deve validar campos obrigatórios antes de permitir o envio do formulário.

• RF-05 Após o envio, o sistema deve criar automaticamente o registro da equipe/ideia na Etapa 1 do funil e

notificar o administrador por e-mail (novo cadastro recebido).

Página 3 de 6

InfoHub → InovAMF – Documento de Requisitos

4.3 Painel do administrador

• RF-06 Visão em funil/kanban com todas as equipes, agrupadas por etapa da jornada (1 a 6), permitindo ver

rapidamente onde cada uma está.

• RF-07 Busca e filtros por nome da equipe/ideia, curso, área da ideia, status da tarefa (pendente, em

andamento, atrasada, concluída) e mentor responsável.

• RF-08 Página de detalhe da equipe com: dados cadastrais, histórico de etapas concluídas, tarefas atribuídas,

arquivos entregues e anotações internas do mentor.

• RF-09 O administrador deve poder avançar ou retroceder manualmente a equipe entre as etapas da

jornada.

• RF-10 O administrador deve poder registrar anotações internas (não visíveis ao aluno) sobre cada

encontro/mentoria.

4.4 Tarefas e prazos

• RF-11 O administrador deve poder criar tarefas para uma equipe específica ou usar modelos de tarefa

pré-configurados por etapa (ex.: “enviar Business Model Canvas” na Etapa 5).

• RF-12 Cada tarefa deve ter: título, descrição/instruções, etapa relacionada, data de entrega e status

(pendente, em andamento, entregue, atrasada, aprovada, reprovada/ajustar).

• RF-13 O aluno deve visualizar, na sua área, a lista de tarefas pendentes e concluídas, com prazos e

instruções.

• RF-14 O aluno deve poder anexar um ou mais arquivos como entrega de uma tarefa (ex.: Canvas em PDF,

Value Proposition Design, link ou arquivo do Pitch Vídeo).

• RF-15 O administrador deve poder aprovar uma entrega (marcando a tarefa como concluída) ou solicitar

ajustes (reabrindo a tarefa com um comentário para o aluno).

• RF-16 O sistema deve manter histórico de versões dos arquivos enviados, caso o aluno reenvie um arquivo

corrigido.

4.5 Lembretes e notificações por e-mail

• RF-17 O administrador deve poder configurar, por tarefa, uma ou mais datas de lembrete automático (ex.: 3

dias antes do prazo, 1 dia antes, no dia do prazo).

• RF-18 O sistema deve enviar e-mail automático ao aluno quando: uma nova tarefa é atribuída, um prazo

está próximo (conforme datas configuradas), um prazo venceu sem entrega, ou uma entrega é

aprovada/reprovada.

• RF-19 O sistema deve enviar e-mail automático ao administrador quando: um aluno se cadastra, um arquivo

é entregue, ou uma tarefa fica atrasada.

• RF-20 O administrador deve poder disparar um lembrete manual avulso para uma equipe específica.

• RF-21 O aluno deve poder, no futuro, optar por não receber determinados tipos de notificação (preferências

de e-mail) – desejável, não obrigatório na v1.

4.6 Relatórios e visão geral

• RF-22 Dashboard com indicadores gerais: total de equipes ativas, distribuição por etapa, tarefas atrasadas,

equipes prontas para o InovAMF.

• RF-23 Exportação da lista de equipes/ideias e status em planilha (CSV/Excel) para uso em reuniões de

coordenação.

• RF-24 Filtro por período (ex.: turma/semestre) para acompanhar ciclos diferentes do programa.

Requisitos não funcionais
Página 4 de 6

InfoHub → InovAMF – Documento de Requisitos

• RNF-01 Acesso via navegador, com layout responsivo (mobile-first para o aluno, que tende a acessar pelo

celular).

• RNF-02 Proteção de dados pessoais dos alunos conforme a LGPD (consentimento no cadastro, política de

retenção e exclusão de dados).

• RNF-03 Controle de acesso: aluno só visualiza dados da própria equipe; administrador/mentor vê o que

estiver dentro de seu escopo de permissão.

• RNF-04 Armazenamento seguro de arquivos enviados, com limite de tamanho definido (ex.: até 50–100 MB

por arquivo) e tipos permitidos (PDF, imagem, vídeo ou link externo).

• RNF-05 Registro de auditoria (log) de mudanças de etapa, aprovações/reprovações de tarefas e envios de

e-mail, para rastreabilidade.

• RNF-06 Envio de e-mail confiável (uso de serviço transacional de e-mail, com reenvio em caso de falha).

• RNF-07 Backup periódico dos dados e possibilidade de recuperação.

Regras de negócio
• RN-01 Uma equipe só avança de etapa quando as tarefas obrigatórias daquela etapa estiverem marcadas

como aprovadas pelo administrador (ou for avançada manualmente por decisão do mentor).

• RN-02 Os entregáveis finais obrigatórios da Etapa 6 são: Business Model Canvas, Value Proposition Design,

Pitch Vídeo e dados de todos os integrantes da equipe.

• RN-03 Um aluno pode integrar apenas uma equipe/ideia ativa por vez no InfoHub (a confirmar com a

coordenação).

• RN-04 Tarefas vencidas sem entrega são automaticamente marcadas como “atrasadas” e sinalizadas no

painel do administrador.

Fluxo resumido

Aluno preenche o formulário inicial → conta é criada e a ideia entra na Etapa 1.

Administrador recebe notificação, avalia a ideia e faz o primeiro contato (Etapa 2).

Administrador atribui as tarefas de cada encontro (Etapas 3 a 6), com prazos e lembretes configurados.

Aluno recebe lembretes por e-mail, realiza as tarefas e envia os arquivos pelo sistema.

Administrador avalia cada entrega, aprova ou solicita ajustes, e avança a equipe pelas etapas.

Ao concluir a Etapa 6 com todos os entregáveis aprovados, a equipe é marcada como “Pronta para o

InovAMF”.

Coordenação acompanha o funil completo pelo dashboard e exporta relatórios quando necessário.

Integrações futuras (não obrigatórias na v1)

• Envio de lembretes também por WhatsApp, replicando o canal já usado hoje no primeiro contato.

• Integração com o sistema acadêmico da faculdade para validar automaticamente curso/matrícula do aluno.

• Integração direta com o formulário/edital de inscrição do InovAMF, para envio automático dos materiais

aprovados. não precisa fazer banco nem back, quero apenas um prototipo de front end com a entrada do adm e a entrada do usuario/aluno, faça a versão comentada de todas as linhas para o vs cod
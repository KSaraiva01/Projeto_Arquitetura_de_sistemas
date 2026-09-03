# InfoHub → InovAMF (Protótipo Front-end)

Front-end funcional e navegável para acompanhar a jornada de equipes do InfoHub até o
status **"Pronto para o InovAMF"**. Este é um protótipo apenas de front-end: **não há
backend, banco de dados ou API real** — todos os dados são mockados e as ações
(mover equipe, alterar status de tarefa, enviar arquivo, aprovar entrega etc.) atualizam
apenas o estado local da aplicação em memória (React Context).

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS (com modo escuro via classe `dark`)
- React Router DOM
- lucide-react (ícones)

## Como executar localmente

Pré-requisitos: Node.js 18+ instalado.

```bash
# 1. Instalar dependências
npm install

# 2. Rodar o servidor de desenvolvimento
npm run dev
```

A aplicação abrirá em `http://localhost:5173`.

Para gerar uma build de produção:

```bash
npm run build
npm run preview
```

## Acessos de demonstração (login mockado)

Na tela de login, use os botões de **acesso rápido** ("Admin" / "Mentor(a)" / "Aluno(a)") ou os e-mails/senhas abaixo:

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | admin@infohub.com | admin123 |
| Mentor (Prof. Ricardo Nunes) | ricardo.mentor@infohub.com | mentor123 |
| Mentor (Profa. Juliana Prado) | juliana.mentor@infohub.com | mentor123 |
| Mentor (Prof. Eduardo Katsu) | eduardo.mentor@infohub.com | mentor123 |
| Aluno (líder da equipe NutriRota) | joao@aluno.com | 123456 |
| Aluno (equipe StudyMatch — já "Pronta para o InovAMF") | beatriz@aluno.com | 123456 |
| Aluno (equipe PetCare Connect — entrega com pedido de ajuste) | vinicius@aluno.com | 123456 |

Todos os demais alunos cadastrados em `src/data/users.ts` usam a senha `123456`. Pode haver **mais de um mentor** no sistema — o cadastro de equipe (tela "Equipes") permite atribuir um ou vários mentores responsáveis.

## Estrutura do projeto

```
src/
  components/     Componentes reutilizáveis (Sidebar, Navbar, Kanban, Modal, Table,
                  TaskDueDate, etc.)
  context/        Estado global mockado (AuthContext, AppDataContext, ThemeContext)
  data/           "Banco de dados" mockado (usuários, equipes, tarefas, etapas, entregas)
  pages/
    admin/        Telas de gestão (usadas por Administrador e Mentor)
    student/      Telas do perfil Aluno
    Login.tsx
  types/          Tipos TypeScript compartilhados
  utils/          Helpers (basePath por papel, dados de exibição do líder da equipe)
  App.tsx         Rotas da aplicação
  main.tsx        Ponto de entrada
```

## Perfis de acesso

O sistema tem **três perfis**:

- **Administrador** — visão completa de todas as equipes, tarefas, entregas e relatórios.
- **Mentor(a)** — mesma área de gestão do administrador (pode haver vários mentores
  cadastrados simultaneamente); é o **único perfil que pode alterar o prazo de uma
  tarefa já criada** — administrador e aluno veem o prazo com um ícone de cadeado,
  somente leitura.
- **Aluno** — acompanha a jornada da própria equipe, tarefas e envio de entregas.

## Funcionalidades implementadas

**Login**
- E-mail, senha, "Entrar" e "Recuperar senha" (simulado)
- Acesso rápido para Administrador, Mentor(a) ou Aluno(a)
- Alternância entre modo claro e escuro (ícone de sol/lua — também disponível na barra
  superior de todas as telas internas); a preferência fica salva no navegador

**Administrador e Mentor(a)** (telas de gestão compartilhadas, sob `/admin` e `/mentor`)
- Dashboard com KPIs (total de equipes, tarefas pendentes/atrasadas, equipes prontas)
- Todas as equipes (busca, filtro por etapa, e **cadastro de nova equipe** informando
  curso, e-mail de contato e um ou mais mentores responsáveis)
- Kanban da jornada com 6 etapas + "Pronto para o InovAMF" (drag-and-drop e botão de avanço)
- Detalhes da equipe (dados, e-mail, mentores responsáveis, integrantes, progresso, tarefas, entregas, histórico)
- Tarefas (criar, filtrar, alterar status; **alterar o prazo é exclusivo do perfil Mentor(a)**)
- Entregas (revisar, aprovar ou solicitar ajuste com comentário)
- Relatórios (gráfico de status das tarefas, funil por etapa, taxa de aprovação)

**Aluno**
- Dashboard com etapa atual, progresso e próximas tarefas
- Minha equipe (integrantes, líder, curso, e-mail de contato, mentor(es) responsável(is))
- Minha jornada (trilha visual das 7 etapas + histórico)
- Minhas tarefas (visualizar status e prazo — prazo somente leitura para o aluno)
- Envio de entregas (upload simulado com feedback visual, versão, status e comentário do administrador/mentor)

## Observações importantes

- **Nenhum dado é persistido** entre recarregamentos de página (exceto a sessão de login,
  que fica em `sessionStorage` apenas para não perder o usuário logado ao navegar).
- Não há integração real com e-mail, WhatsApp, sistema acadêmico ou com o InovAMF.
- O upload de arquivos é inteiramente simulado (não há envio para nenhum servidor).

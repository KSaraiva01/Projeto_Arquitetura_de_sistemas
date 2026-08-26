# InfoHub → InovAMF (Protótipo Front-end)

Front-end funcional e navegável para acompanhar a jornada de equipes do InfoHub até o
status **"Pronto para o InovAMF"**. Este é um protótipo apenas de front-end: **não há
backend, banco de dados ou API real** — todos os dados são mockados e as ações
(mover equipe, alterar status de tarefa, enviar arquivo, aprovar entrega etc.) atualizam
apenas o estado local da aplicação em memória (React Context).

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
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

Na tela de login, use os botões de **acesso rápido** ("Entrar como Admin" / "Entrar como
Aluno") ou os e-mails/senhas abaixo:

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | admin@infohub.com | admin123 |
| Aluno (líder da equipe NutriRota) | joao@aluno.com | 123456 |
| Aluno (equipe StudyMatch — já "Pronta para o InovAMF") | beatriz@aluno.com | 123456 |
| Aluno (equipe PetCare Connect — entrega com pedido de ajuste) | vinicius@aluno.com | 123456 |

Todos os demais alunos cadastrados em `src/data/users.ts` usam a senha `123456`.

## Estrutura do projeto

```
src/
  components/     Componentes reutilizáveis (Sidebar, Navbar, Kanban, Modal, Table, etc.)
  context/        Estado global mockado (AuthContext, AppDataContext)
  data/           "Banco de dados" mockado (usuários, equipes, tarefas, etapas, entregas)
  pages/
    admin/        Telas do perfil Administrador
    student/      Telas do perfil Aluno
    Login.tsx
  types/          Tipos TypeScript compartilhados
  App.tsx         Rotas da aplicação
  main.tsx        Ponto de entrada
```

## Funcionalidades implementadas

**Login**
- E-mail, senha, "Entrar" e "Recuperar senha" (simulado)
- Acesso rápido para Administrador ou Aluno

**Administrador**
- Dashboard com KPIs (total de equipes, tarefas pendentes/atrasadas, equipes prontas)
- Todas as equipes (busca e filtro por etapa)
- Kanban da jornada com 6 etapas + "Pronto para o InovAMF" (drag-and-drop e botão de avanço)
- Detalhes da equipe (dados, integrantes, progresso, tarefas, entregas, histórico)
- Tarefas (criar, filtrar, alterar status)
- Entregas (revisar, aprovar ou solicitar ajuste com comentário)
- Relatórios (gráfico de status das tarefas, funil por etapa, taxa de aprovação)

**Aluno**
- Dashboard com etapa atual, progresso e próximas tarefas
- Minha equipe (integrantes, líder, curso, área)
- Minha jornada (trilha visual das 7 etapas + histórico)
- Minhas tarefas (visualizar e atualizar status)
- Envio de entregas (upload simulado com feedback visual, versão, status e comentário do administrador)

## Observações importantes

- **Nenhum dado é persistido** entre recarregamentos de página (exceto a sessão de login,
  que fica em `sessionStorage` apenas para não perder o usuário logado ao navegar).
- Não há integração real com e-mail, WhatsApp, sistema acadêmico ou com o InovAMF.
- O upload de arquivos é inteiramente simulado (não há envio para nenhum servidor).

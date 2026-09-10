# InfoHub → InovAMF

Sistema de acompanhamento da jornada do empreendedor do InfoHub, o laboratório de ideias da **Faculdade Antonio Meneghetti**, até o encaminhamento ao centro de inovação **InovAMF**.

O sistema digitaliza o fluxo que hoje é feito manualmente (WhatsApp e planilhas): cadastro da ideia, mentoria em 6 etapas, atribuição de tarefas e prazos, envio de entregáveis pelos alunos, aprovação pelos mentores/administração e relatórios consolidados para a coordenação.

## Perfis de usuário

| Perfil | Acesso |
|---|---|
| **Administrador** | Cadastra e acompanha todas as equipes, atribui tarefas, avalia entregas, avança etapas e acessa relatórios |
| **Mentor** | Mesmas ações do administrador, restritas às equipes sob sua mentoria |
| **Aluno (líder)** | Preenche o formulário inicial, acompanha tarefas e envia entregáveis da própria equipe |
| **Integrante de equipe** | Acesso próprio de leitura e entrega, vinculado à equipe do líder |

## Jornada (6 etapas)

1. Envio da ideia
2. Contato com a equipe
3. Entendendo a ideia (problema, público-alvo e solução)
4. Proposta de valor (Value Proposition Design)
5. Modelo de negócio (Business Model Canvas)
6. Pitch e inscrição (Pitch Vídeo, Canvas final, VPD final, dados dos integrantes)

Ao concluir a Etapa 6 com todos os entregáveis aprovados, a equipe é marcada como **Pronta para o InovAMF**.

## Stack

**Frontend** (`infohub-frontend/`)
- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- React 19 + TypeScript
- Tailwind CSS 4
- [lucide-react](https://lucide.dev) para ícones, date-fns para datas

**Backend** (`infohub-backend/`)
- Node.js 20+ com TypeScript e Express 5
- PostgreSQL acessado com `pg` — SQL puro, sem ORM
- Zod para validação, JWT + refresh token para autenticação

Detalhes da API, do schema e dos endpoints: [`infohub-backend/README.md`](infohub-backend/README.md).

## Estrutura

```
infohub-backend/                 # API REST (ver README próprio)
infohub-frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx            # Landing page + login (seleção de perfil)
│   │   ├── cadastro/           # Formulário de inscrição da ideia
│   │   ├── admin/              # Painel do administrador (dashboard, equipes, tarefas, relatórios)
│   │   ├── mentor/             # Painel do mentor (dashboard, equipes, tarefas)
│   │   ├── aluno/               # Área do aluno líder (jornada, tarefas)
│   │   └── integrante/         # Área do integrante de equipe (jornada, tarefas)
│   ├── components/             # Sidebar, Header, KanbanBoard, CalendarView, etc.
│   └── lib/
│       ├── api.ts               # Cliente HTTP da API, com refresh de sessão
│       ├── api-types.ts         # Tipos das respostas da API
│       ├── session.tsx          # Contexto de sessão e guarda de rota
│       ├── types.ts             # Tipos do protótipo (telas ainda em mock)
│       └── mock-data.ts         # Dados mock das telas não migradas
```

## Como rodar localmente

São dois processos. Comece pelo backend, porque o frontend já consulta a API.

**1. Backend** (precisa de um PostgreSQL rodando):

```bash
cd infohub-backend
npm install
cp .env.example .env    # preencha a senha do seu PostgreSQL
npm run db:setup        # cria o banco, aplica as migrations e popula
npm run db:seed:demo    # opcional: 6 equipes de exemplo, com tarefas e prazos
npm run dev
```

**2. Frontend**, em outro terminal:

```bash
cd infohub-frontend
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) e entre com
`admin@amf.edu.br` / `InfoHub@2026`.

Com o seed de demonstração aplicado, também funcionam
`ana.ramos@amf.edu.br` e `ricardo.ferreira@amf.edu.br` (mentores, cada um com
suas equipes) e `lucas.oliveira@aluno.amf.edu.br` (aluno líder) — todos com a
mesma senha.

## Status atual

O projeto está em migração do protótipo para o sistema de verdade. Hoje
convivem duas metades:

**Ligado à API e persistindo no PostgreSQL:**
- Login, sessão e recuperação de senha (RF-01). O perfil vem da API — não há
  mais seletor de perfil na tela de login.
- Gestão de contas de administrador e mentor (RF-03).
- Kanban do funil com **arrastar e soltar** para administrador e mentor
  (RF-06, RF-09), respeitando a RN-01: avançar com tarefa obrigatória
  pendente pede confirmação e registra o motivo.
- **Calendário** de prazos e lembretes, com escopo por perfil.
- Escopo de acesso (RNF-03): mentor vê apenas as equipes que acompanha.

**Ainda sobre `src/lib/mock-data.ts`:**
- Páginas de Equipes, Tarefas e Relatórios do administrador
- Área do aluno e do integrante (Minha Jornada, Minhas Tarefas)
- Formulário de cadastro da ideia

**Ainda não implementado:**
- Cadastro da ideia criando equipe e conta de verdade (RF-02, RF-04, RF-05)
- Criar tarefa e avaliar entrega (RF-11, RF-12, RF-15)
- Upload e armazenamento de arquivos (RF-14, RF-16, RNF-04)
- Disparo automático dos e-mails (RF-18 a RF-20) — a fila e os lembretes já
  existem no banco, falta a rotina agendada
- Exportação de relatórios em CSV/Excel (RF-23)

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm run start` | Roda o build de produção |
| `npm run lint` | Executa o ESLint |

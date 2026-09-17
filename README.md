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

Cada equipe recebe uma cópia dessa jornada, e o mentor pode **acrescentar etapas
extras** só para ela. Ao chegar à última etapa da sua jornada com todos os
entregáveis obrigatórios aprovados, a equipe é marcada como **Pronta para o
InovAMF** e então encaminhada.

## Stack

**Frontend** (`infohub-frontend/`)
- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- React 19 + TypeScript
- Tailwind CSS 4
- [lucide-react](https://lucide.dev) para ícones, date-fns para datas

**Backend** (`infohub-backend/`)
- Node.js 20+ com TypeScript e Express 5
- PostgreSQL 13+ acessado com `pg` — SQL puro, sem ORM
- Zod para validação, JWT + refresh token para autenticação

**Banco** (`database/`, na raiz do repositório do projeto)
- `schema.sql`: tabelas em português, relacionamentos, índices e dados iniciais
- `seed_demo.sql`: cenário de demonstração (só desenvolvimento)
- `README.md`: modelo de dados e as respostas às perguntas de banco × requisitos

Detalhes da API e dos endpoints: [`infohub-backend/README.md`](infohub-backend/README.md).

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

Pré-requisitos: Node.js 20+ e PostgreSQL 13+ rodando. São dois processos;
comece pelo backend, porque o frontend consulta a API.

**1. Backend**

```bash
cd infohub-backend
npm install
cp .env.example .env    # preencha a senha do PostgreSQL e gere um JWT_SECRET
npm run db:setup        # cria o banco (se faltar) e aplica database/schema.sql
npm run db:seed:demo    # opcional: 6 equipes de exemplo, com tarefas e prazos
npm run dev             # http://localhost:3333/api
```

**2. Frontend**, em outro terminal:

```bash
cd infohub-frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3333/api
npm run dev                  # http://localhost:3000
```

Entre com `admin@amf.edu.br` / `InfoHub@2026` (troque no primeiro acesso).

Com o seed de demonstração aplicado, também funcionam
`ana.ramos@amf.edu.br` e `ricardo.ferreira@amf.edu.br` (mentores, cada um com
suas equipes) e `lucas.oliveira@aluno.amf.edu.br` (aluno líder) — todos com a
mesma senha.

## Deploy no servidor da faculdade

1. A infra cria um banco PostgreSQL vazio e informa host, porta, usuário,
   senha e nome do banco.
2. Aplique o schema uma única vez:
   `psql -h <host> -U <usuario> -d <banco> -f database/schema.sql`
   (ou configure o `.env` do backend e rode `npm run db:setup`).
3. Backend: `.env` com `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`
   forte, `CORS_ORIGINS` e `APP_URL` apontando para o endereço do front,
   `MAIL_DRIVER=resend` + `RESEND_API_KEY`. Depois `npm run build && npm start`.
4. Frontend: `.env.local` com `NEXT_PUBLIC_API_URL=https://<api>/api`, depois
   `npm run build && npm start`.

O `seed_demo.sql` **não** deve ser aplicado em produção (ele apaga as equipes).

## Status atual

**Ligado à API e persistindo no PostgreSQL:**
- Login, sessão, primeiro acesso por link e recuperação de senha (RF-01, RF-02).
- Gestão de contas de administrador e mentor (RF-03); atribuição de mentores.
- Kanban do funil com **arrastar e soltar** para administrador e mentor
  (RF-06, RF-09), respeitando a RN-01: avançar com tarefa obrigatória
  pendente pede confirmação e registra o motivo.
- **Calendário** de prazos e lembretes, com escopo por perfil.
- Escopo de acesso (RNF-03): mentor vê apenas as equipes que acompanha.

**Pronto na API, ainda em mock no front:**
- Cadastro da ideia (`POST /teams/register`) — o formulário atual ainda tem
  campo de senha; na API a senha é definida pelo link de primeiro acesso.
- Criar/editar tarefa, entregar (versionado), aprovar/solicitar ajustes
  (RF-11 a RF-16), anotações do mentor (RF-10), etapas extras, exclusão
  lógica de equipe e exclusão de conta (LGPD).
- Lembretes e avisos de atraso por e-mail (RF-17 a RF-20), disparados pela
  rotina agendada do backend.

**Ainda não implementado:**
- Upload físico de arquivos (RNF-04) — a entrega `FILE` recebe a URL já armazenada.
- Relatórios consolidados e exportação CSV/Excel (RF-22 a RF-24).

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm run start` | Roda o build de produção |
| `npm run lint` | Executa o ESLint |

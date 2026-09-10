# InfoHub — Backend

API REST do Sistema de Acompanhamento da Jornada do Empreendedor do InfoHub
(Faculdade Antonio Meneghetti).

## Stack

| Camada | Escolha |
|---|---|
| Runtime | Node.js 20+ com TypeScript 5 |
| HTTP | Express 5 |
| Banco | PostgreSQL 18, acessado com `pg` (SQL puro, sem ORM) |
| Validação | Zod 4 |
| Autenticação | JWT (access token) + refresh token opaco rotativo |
| Senhas | bcrypt (`bcryptjs`) |
| E-mail | Resend, com driver `console` para desenvolvimento |

Não há ORM por decisão de projeto: o schema vive em migrations SQL versionadas
e cada repositório escreve as próprias queries com parâmetros (`$1`, `$2`...).

## Estrutura

```
src/
├── server.ts                  # sobe o HTTP, encerramento gracioso
├── app.ts                     # middlewares globais do Express
├── routes.ts                  # health check + montagem dos módulos
├── config/
│   ├── env.ts                 # validação das variáveis de ambiente (Zod)
│   └── database.ts            # pool do pg, query(), withTransaction()
├── database/
│   ├── migrations/*.sql       # schema versionado, aplicado em ordem
│   ├── create.ts              # cria o banco se não existir
│   ├── migrate.ts             # runner de migrations (up / status)
│   ├── seed.ts                # áreas, modelos de tarefa e admin inicial
│   ├── seed-demo.ts           # cenário de demonstração (dev)
│   └── reset.ts               # dropa e recria o schema (dev)
├── modules/
│   ├── auth/                  # RF-01: login, refresh, recuperação de senha
│   ├── users/                 # RF-03: contas de admin e mentor
│   ├── teams/                 # RF-06 a RF-09: kanban, detalhe e troca de etapa
│   └── tasks/                 # RF-13: consulta de tarefas e calendário
└── shared/
    ├── middlewares/           # autenticação, RBAC, validação, erros, rate limit
    ├── mail/                  # mailer + templates HTML
    ├── utils/                 # jwt, hash de senha e de token
    ├── scope.ts               # quem enxerga quais equipes (RNF-03, Q10)
    ├── types/domain.ts        # enums do domínio espelhando o PostgreSQL
    └── audit.ts               # registro de auditoria (RNF-05)
```

Cada módulo segue a mesma divisão: `routes` → `controller` → `service` →
`repository`. Regra de negócio fica no service; SQL fica no repository; o
controller só traduz HTTP.

## Como rodar

Pré-requisitos: Node.js 20+ e PostgreSQL rodando localmente.

```bash
npm install
```

Crie o `.env` a partir do exemplo e preencha a senha do seu PostgreSQL:

```bash
cp .env.example .env
```

Gere um `JWT_SECRET` de verdade:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Crie o banco, aplique as migrations e popule os dados iniciais:

```bash
npm run db:setup
```

Suba a API:

```bash
npm run dev
```

A API fica em `http://localhost:3333/api`. Confira com `GET /api/health`.

O seed cria o administrador definido em `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` (por padrão `admin@amf.edu.br` / `InfoHub@2026`).
**Troque essa senha no primeiro acesso.**

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | API em modo watch |
| `npm run build` | Compila para `dist/` e copia as migrations |
| `npm start` | Roda o build de produção |
| `npm run typecheck` | Checagem de tipos sem gerar arquivos |
| `npm run db:create` | Cria o banco, se ainda não existir |
| `npm run db:migrate` | Aplica as migrations pendentes |
| `npm run db:status` | Lista o que já foi aplicado e o que falta |
| `npm run db:seed` | Áreas da ideia, modelos de tarefa e admin inicial |
| `npm run db:seed:demo` | Cenário de demonstração: 6 equipes, tarefas e lembretes (apaga as equipes existentes) |
| `npm run db:reset` | Apaga e recria o schema (bloqueado em produção) |
| `npm run db:setup` | `db:create` + `db:migrate` + `db:seed` |

## Endpoints implementados

Base: `/api`

### Autenticação — `/api/auth` (RF-01)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/login` | público | Login com e-mail e senha; devolve access token, refresh token e o usuário |
| POST | `/auth/refresh` | público | Troca o refresh token por uma nova sessão (com rotação) |
| POST | `/auth/logout` | público | Revoga o refresh token da sessão atual |
| GET | `/auth/me` | autenticado | Usuário atual, com as equipes do seu escopo |
| POST | `/auth/forgot-password` | público | Dispara o e-mail de redefinição |
| POST | `/auth/reset-password` | público | Define a nova senha usando o token do e-mail |
| POST | `/auth/change-password` | autenticado | Troca a senha informando a atual |

### Usuários — `/api/users` (RF-03)

Todas exigem perfil **ADMIN**.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/users` | Lista paginada, com filtros `role`, `isActive`, `search`, `page`, `pageSize` |
| POST | `/users` | Cria conta de ADMIN ou MENTOR e envia o link de definição de senha |
| GET | `/users/:id` | Detalhe de um usuário |
| PATCH | `/users/:id` | Edita nome, e-mail, perfil, telefone, curso e semestre |
| PATCH | `/users/:id/status` | Ativa ou desativa a conta |

### Equipes e jornada — `/api/teams` (RF-06 a RF-09)

Autenticadas. O que cada perfil enxerga é decidido pelo escopo, não pela rota:
administrador vê todas as equipes, mentor vê só as que acompanha (Q10), aluno
vê só as suas.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/teams` | autenticado | Lista com filtros `search`, `stage`, `status`, `categoryId`, `mentorId`, `course`, `semester`, `taskStatus` |
| GET | `/teams/board` | autenticado | As mesmas equipes já agrupadas nas 6 colunas do kanban, mais `canDrag` |
| GET | `/teams/:id` | autenticado | Detalhe com integrantes e histórico de etapas (RF-08) |
| GET | `/teams/:id/stage-blockers?toStage=N` | ADMIN, MENTOR | Prévia da RN-01: o que falta para chegar à etapa N |
| PATCH | `/teams/:id/stage` | ADMIN, MENTOR | Move a equipe de etapa — é o que o arrastar do kanban chama |

`PATCH /teams/:id/stage` recebe `{ toStage, reason?, force? }`. Avançar com
tarefas obrigatórias sem aprovação é recusado com **409
`STAGE_REQUIREMENTS_PENDING`**, e a resposta traz `details.pendingTasks` com o
que está faltando. O mentor decide e repete com `force: true`; o motivo vai
para o histórico da equipe e para a auditoria. Retroceder nunca é bloqueado —
desfazer um avanço feito por engano precisa ser fácil.

### Tarefas e calendário — `/api/tasks`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/tasks` | Lista com filtros `teamId`, `status`, `stage`, `dueFrom`, `dueTo`, `search` |
| GET | `/tasks/calendar?from=&to=` | Eventos do calendário no período (máx. 366 dias) |
| GET | `/tasks/:id` | Detalhe de uma tarefa |

O calendário devolve duas espécies de evento na mesma lista: `DUE`, o prazo de
entrega da tarefa, e `REMINDER`, cada data de lembrete configurada (RF-17) —
desligável com `includeReminders=false`. Vem agrupado por dia, no formato que a
grade do mês consome direto, mais um `summary` com os contadores do período.

Toda leitura de tarefa passa antes por RN-04: o que venceu sem entrega é
marcado como `OVERDUE` na hora, para o painel nunca mostrar como pendente algo
cujo prazo já passou.

Exemplo de login:

```bash
curl -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@amf.edu.br","password":"InfoHub@2026"}'
```

E uma chamada autenticada:

```bash
curl http://localhost:3333/api/auth/me -H "Authorization: Bearer <accessToken>"
```

## Formato das respostas

Sucesso devolve o recurso direto (`{ "user": {...} }`, `{ "data": [...], "pagination": {...} }`).

Erro sempre tem o mesmo envelope:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "E-mail ou senha incorretos."
  }
}
```

Erros de validação (HTTP 422) incluem `fields`, com o caminho e a mensagem de
cada campo rejeitado — pronto para o frontend destacar o input.

## Decisões de segurança

- **Senhas** com bcrypt. O login roda um `compare` mesmo quando o e-mail não
  existe, para o tempo de resposta não revelar quais contas existem.
- **Access token** JWT de vida curta (15 min); **refresh token** é opaco,
  guardado só como SHA-256 e rotacionado a cada uso.
- **Conta desativada perde o acesso na hora**: o middleware `authenticate`
  relê o usuário no banco a cada requisição, em vez de confiar no JWT antigo.
- **Recuperação de senha** com token de uso único e validade configurável; o
  endpoint responde igual exista ou não a conta.
- **Trocar a senha derruba todas as sessões** abertas.
- **Rate limit** no login (força bruta) e na recuperação de senha (spam).
- **RBAC** por perfil no middleware `authorize` (RNF-03).
- **Auditoria** (RNF-05) de login, criação/edição/desativação de conta e
  redefinição de senha, em `audit_log`.

## Modelo de dados

As migrations em `src/database/migrations/` são a fonte da verdade do schema.

Pontos que valem destaque:

- `team_mentor` implementa a decisão **Q10**: mentor não é global, acessa
  apenas as equipes que acompanha. **Q11** também: a chave é composta por
  `(team_id, mentor_id)`, então uma equipe pode ter vários mentores.
- `team_member.role` (`LEADER` / `MEMBER`) resolve **Q1** — líder e integrante
  têm login próprio, e o papel é por equipe, não uma role global do usuário.
  Um índice parcial garante um único líder ativo por equipe.
- Um aluno pode estar em várias equipes ao mesmo tempo (**Q4**), por isso a
  unicidade é `(team_id, user_id)` e não apenas `user_id`.
- `task_submission` guarda `version`, atendendo ao histórico de reenvios
  (RF-16), e aceita `FILE` ou `LINK` — este último para o Pitch Vídeo (**Q3**).
- Datas (`due_date`) são lidas como texto `YYYY-MM-DD`, sem conversão de fuso,
  para um prazo não "voltar um dia" dependendo do servidor.

> O arquivo `database/schema.sql` na raiz do repositório principal é o desenho
> original e está defasado: ele descreve mentores como globais (RN-07) e não
> tem `team_mentor`, `team_stage_history` nem as tabelas de token. As
> migrations deste diretório substituem aquele arquivo.

## O que ainda não existe

Próximos módulos, em ordem sugerida:

1. **Cadastro da ideia** — RF-02 e RF-04/RF-05: o formulário inicial que cria
   a equipe e a conta do aluno líder. Hoje as equipes só nascem pelo seed.
2. **Escrita de tarefas** — RF-11, RF-12 e RF-15: criar tarefa (avulsa ou a
   partir de modelo), aprovar entrega e solicitar ajustes. A leitura já existe.
3. **Entregas** — RF-14 e RF-16: upload de arquivo (RNF-04), link do Pitch
   Vídeo e versionamento dos reenvios.
4. **Notificações** — RF-18 a RF-20, com rotina agendada disparando os
   lembretes já cadastrados em `task_reminder`.
5. **Relatórios** — RF-22 a RF-24, dashboard e exportação CSV.
6. **Anotações do mentor** — RF-10.

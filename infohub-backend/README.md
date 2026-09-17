# InfoHub — Backend

API REST do Sistema de Acompanhamento da Jornada do Empreendedor do InfoHub
(Faculdade Antonio Meneghetti).

## Stack

| Camada | Escolha |
|---|---|
| Runtime | Node.js 20+ com TypeScript 5 |
| HTTP | Express 5 |
| Banco | PostgreSQL 13+, acessado com `pg` (SQL puro, sem ORM) |
| Validação | Zod 4 |
| Autenticação | JWT (access token) + refresh token opaco rotativo |
| Senhas | bcrypt (`bcryptjs`) |
| E-mail | Resend, com driver `console` para desenvolvimento |

Não há ORM por decisão de projeto: o schema inteiro vive em um único arquivo
de SQL puro (`database/schema.sql`, na raiz do repositório) e cada
repositório escreve as próprias queries com parâmetros (`$1`, `$2`...).
Tabelas e colunas são em português; os códigos dos enums (`PENDING`,
`APPROVED`...) são em inglês por serem o contrato com o front.

## Estrutura

```
src/
├── server.ts                  # sobe o HTTP, liga a rotina agendada, encerramento gracioso
├── app.ts                     # middlewares globais do Express
├── routes.ts                  # health check, montagem dos módulos, POST /jobs/run
├── config/
│   ├── env.ts                 # validação das variáveis de ambiente (Zod)
│   └── database.ts            # pool do pg, query(), withTransaction()
├── jobs/
│   └── scheduler.ts           # RN-04 (atrasadas) + lembretes (RF-17) + avisos de atraso (RF-20)
├── modules/
│   ├── auth/                  # RF-01/RF-02: login, refresh, primeiro acesso, recuperação, exclusão LGPD
│   ├── users/                 # RF-03: contas de admin e mentor; anonimização (RNF-02)
│   ├── areas/                 # RF-04: áreas da ideia (público)
│   ├── teams/                 # RF-02, RF-05 a RF-10: cadastro, kanban, jornada, etapas extras, anotações
│   └── tasks/                 # RF-11 a RF-17: modelos, tarefas, entregas, avaliação, calendário
└── shared/
    ├── middlewares/           # autenticação, RBAC, validação, erros, rate limit
    ├── mail/                  # mailer (tabela notificacao) + templates HTML
    ├── utils/                 # jwt, hash de senha e de token
    ├── scope.ts               # quem enxerga quais equipes (RNF-03, Q10)
    ├── types/domain.ts        # enums do domínio espelhando o PostgreSQL
    └── audit.ts               # registro de auditoria (RNF-05)
```

Cada módulo segue a mesma divisão: `routes` → `controller` → `service` →
`repository`. **Regra de negócio fica no service** (a RN-01, por exemplo, está
em `teams.service.ts → changeStage`); SQL fica no repository; o controller só
traduz HTTP.

## Como rodar

Pré-requisitos: Node.js 20+ e um PostgreSQL 13+ acessível.

```bash
npm install
cp .env.example .env     # preencha PGPASSWORD (ou DATABASE_URL) e o JWT_SECRET
```

Gere um `JWT_SECRET` de verdade:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Crie o banco (se faltar) e aplique o SQL (schema + dados iniciais):

```bash
npm run db:setup
```

Para um cenário cheio (6 equipes nas 6 etapas, tarefas, prazos e lembretes):

```bash
npm run db:seed:demo
```

Suba a API:

```bash
npm run dev
```

A API fica em `http://localhost:3333/api`. Confira com `GET /api/health`.

Login inicial: `admin@amf.edu.br` / `InfoHub@2026`. **Troque no primeiro acesso.**

### Deploy no servidor da faculdade

1. A infra cria o banco vazio e informa host, porta, usuário, senha e nome.
2. Aplique o schema uma vez: `psql -h <host> -U <usuario> -d <banco> -f database/schema.sql`
   (ou preencha o `.env` e rode `npm run db:setup`, que detecta banco já aplicado e não repete).
3. No `.env` do servidor: `NODE_ENV=production`, `DATABASE_URL=postgresql://...`,
   `JWT_SECRET` forte, `CORS_ORIGINS=https://<endereço-do-front>`,
   `APP_URL=https://<endereço-do-front>`, `MAIL_DRIVER=resend` + `RESEND_API_KEY`.
4. `npm run build && npm start` (ou um serviço systemd/pm2 chamando `node dist/server.js`).

`db:reset` e `db:seed:demo` ficam bloqueados quando `NODE_ENV=production`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | API em modo watch |
| `npm run build` | Compila para `dist/` |
| `npm start` | Roda o build de produção |
| `npm run typecheck` | Checagem de tipos sem gerar arquivos |
| `npm run db:setup` | Cria o banco (se faltar) e aplica `database/schema.sql` em banco vazio |
| `npm run db:seed:demo` | Cenário de demonstração (apaga as equipes existentes) |
| `npm run db:reset` | Apaga o schema inteiro e aplica o SQL de novo (bloqueado em produção) |

## Endpoints

Base: `/api`. Erro sempre vem como `{ "error": { "code", "message", "details?", "fields?" } }`.

### Autenticação — `/api/auth` (RF-01, RF-02)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/login` | público | E-mail e senha. Conta ainda sem senha responde **403 `PASSWORD_NOT_SET`** |
| POST | `/auth/refresh` | público | Troca o refresh token por uma nova sessão (rotação) |
| POST | `/auth/logout` | público | Revoga o refresh token |
| GET | `/auth/me` | autenticado | Usuário atual com as equipes do seu escopo |
| POST | `/auth/forgot-password` | público | Envia link de redefinição — ou de **primeiro acesso**, se a conta ainda não tem senha |
| POST | `/auth/reset-password` | público | Define a senha com o token do e-mail (primeiro acesso ou recuperação) |
| POST | `/auth/change-password` | autenticado | Troca a senha informando a atual |
| DELETE | `/auth/me` | autenticado | **RNF-02 (LGPD)**: exclui a própria conta (body `{ password }`) |

### Áreas — `/api/areas` (RF-04)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/areas` | público | Áreas ativas para o select do formulário |

### Usuários — `/api/users` (RF-03) — só ADMIN

| Método | Rota | Descrição |
|---|---|---|
| GET | `/users` | Lista paginada (`role`, `isActive`, `search`, `page`, `pageSize`) |
| POST | `/users` | Cria conta de ADMIN ou MENTOR **sem senha** e envia o link de primeiro acesso |
| GET | `/users/:id` | Detalhe |
| PATCH | `/users/:id` | Edita nome, e-mail, perfil, telefone, curso, semestre |
| PATCH | `/users/:id/status` | Ativa/desativa (desativar derruba as sessões) |
| DELETE | `/users/:id` | RNF-02: anonimiza a conta (promove outro líder / exclui equipe de 1 integrante) |

### Equipes e jornada — `/api/teams` (RF-02, RF-05 a RF-10)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/teams/register` | **público** | RF-02/RF-05: formulário inicial. Cria equipe, jornada (6 etapas), líder e integrantes; manda link de primeiro acesso; avisa a coordenação |
| GET | `/teams` | autenticado | Lista com filtros `search`, `stage`, `status`, `categoryId`, `mentorId`, `course`, `semester`, `taskStatus`, `includeInactive` |
| GET | `/teams/board` | autenticado | Kanban: colunas vêm da tabela `etapa`, mais `canDrag` |
| GET | `/teams/:id` | autenticado | Detalhe com integrantes, **jornada** (padrão + extras) e histórico de etapas |
| DELETE | `/teams/:id` | ADMIN | Q4: exclusão **lógica** |
| POST | `/teams/:id/mentors` | ADMIN | Q10/Q11: atribui um mentor `{ mentorId }` |
| DELETE | `/teams/:id/mentors/:mentorId` | ADMIN | Desvincula o mentor |
| GET | `/teams/:id/stage-blockers?toStage=N` | ADMIN, MENTOR | Prévia da RN-01 (aceita `toStageId` para etapa extra) |
| PATCH | `/teams/:id/stage` | ADMIN, MENTOR | RF-09: `{ toStage | toStageId, reason?, force? }` |
| POST | `/teams/:id/stages` | ADMIN, MENTOR | Etapa extra: `{ name, description?, afterStage? | afterStageId? }` (sem `after…`, vai para o fim) |
| GET | `/teams/:id/notes` | ADMIN, MENTOR | RF-10: anotações internas (aluno recebe 403) |
| POST | `/teams/:id/notes` | ADMIN, MENTOR | Nova anotação `{ content }` |

`PATCH /teams/:id/stage`: avançar com tarefas obrigatórias sem aprovação é
recusado com **409 `STAGE_REQUIREMENTS_PENDING`** e `details.pendingTasks`. O
mentor repete com `force: true`; o histórico grava `forcado = true` e o motivo.
Retroceder nunca é bloqueado. Os integrantes recebem e-mail da mudança.

Corpo do cadastro (`POST /teams/register`):

```json
{
  "team": { "name": "...", "description": "...", "areaId": "<uuid>", "ideaStage": "JUST_IDEA", "howDidYouHear": "Instagram" },
  "leader": { "name": "...", "email": "...", "course": "...", "phone": "...", "semester": "6º" },
  "members": [{ "name": "...", "email": "...", "course": "..." }],
  "lgpdConsent": true
}
```

Não há campo de senha: cada pessoa recebe um link de primeiro acesso (72 h)
por e-mail. Quem já tem conta de aluno entra na equipe direto (Q12).

### Tarefas, entregas e calendário — `/api/tasks` (RF-11 a RF-17)

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/tasks` | autenticado | Filtros `teamId`, `status`, `stage`, `dueFrom`, `dueTo`, `search` |
| GET | `/tasks/calendar?from=&to=` | autenticado | Eventos `DUE` e `REMINDER` agrupados por dia (máx. 366 dias) |
| GET | `/tasks/templates` | ADMIN, MENTOR | RF-11: modelos por etapa |
| POST | `/tasks` | ADMIN, MENTOR | RF-12: `{ teamId, templateId? | title, description?, dueDate, isMandatory?, stageId?, reminderDaysBefore? }` |
| GET | `/tasks/:id` | autenticado | Detalhe com entregas (todas as versões), comentários e lembretes |
| PATCH | `/tasks/:id` | ADMIN, MENTOR | Q8/RF-17: mudar `dueDate` recalcula os lembretes não enviados |
| POST | `/tasks/:id/submissions` | quem está na equipe | RF-14/RF-16: `{ type: "LINK"\|"FILE", url, fileName?, fileSize?, mimeType? }` — cada envio é uma nova versão |
| POST | `/tasks/:id/review` | ADMIN, MENTOR | RF-15: `{ decision: "APPROVED"\|"REJECTED", comment }` |

Para `FILE`, o upload em si (armazenamento do arquivo) ainda não existe: o
cliente envia a URL/caminho já armazenado e os metadados. O restante do fluxo
(versão, avaliação, e-mails) já funciona.

### Rotina agendada — `POST /api/jobs/run` (ADMIN)

`jobs/scheduler.ts` roda na subida e a cada `JOBS_INTERVAL_MINUTES` (padrão
15). O endpoint dispara na hora, útil para testar. Três passos:

1. **RN-04** — tarefas vencidas sem entrega viram `OVERDUE` (status gravado).
2. **RF-17** — lembretes com `enviar_em <= NOW()` e `enviado_em IS NULL` são
   enviados aos integrantes e marcados.
3. **RF-20** — cada tarefa recém-atrasada gera um aviso por integrante.

O que impede e-mail duplicado são os índices únicos parciais de `notificacao`
(`lembrete_id + destinatario_id`; `tarefa_id + destinatario_id` para `OVERDUE`):
o INSERT usa `ON CONFLICT DO NOTHING` e, sem linha nova, nada é enviado.

## Decisões de segurança

- **Senhas** com bcrypt; contas nascem **sem senha** e a definem por link de
  uso único (RF-02/RF-03). O login roda um `compare` mesmo quando o e-mail não
  existe, para o tempo de resposta não revelar quais contas existem.
- **Access token** JWT de vida curta (15 min); **refresh token** opaco,
  guardado só como SHA-256 e rotacionado a cada uso.
- **Conta desativada perde o acesso na hora**: `authenticate` relê o usuário
  no banco a cada requisição.
- **Trocar a senha derruba todas as sessões** abertas.
- **Rate limit** no login, na recuperação de senha e no cadastro público.
- **RBAC** por perfil (`authorize`) + **escopo** por equipe (`shared/scope.ts`).
- **Auditoria** (RNF-05) de login, contas, cadastro, mudança de etapa, tarefas,
  entregas, avaliações e exclusão LGPD, em `auditoria`.

## Modelo de dados

Ver [`database/README.md`](../../database/README.md): diagrama das tabelas e
as respostas, uma a uma, às perguntas de banco × requisitos (senha antes do 1º
acesso, um líder por equipe, versionamento de entregas, lembretes ao adiar
prazo, RN-04 por job, exclusão lógica, anotações do mentor, LGPD,
deduplicação de e-mails e etapas extras por equipe).

## O que ainda não existe

- Upload físico de arquivos (RNF-04): hoje a entrega `FILE` recebe a URL/caminho
  já armazenado. Falta um endpoint multipart + armazenamento (disco ou S3).
- Relatórios consolidados e exportação CSV (RF-22 a RF-24): os dados estão
  todos no banco; falta o endpoint de agregação.

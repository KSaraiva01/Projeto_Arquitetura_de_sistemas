# API do InfoHub

Base: `/api` (mesmo domínio do frontend — sem CORS). Respostas em JSON, datas em ISO-8601 (UTC).
Enums no contrato da API ficam em inglês (o que o frontend já consumia); no banco ficam em português.
A tradução está em `backend/src/shared/dto.ts`.

| API | Banco |
| --- | --- |
| `role`: `ADMIN` / `MENTOR` / `STUDENT` | `perfil`: `ADMIN` / `MENTOR` / `ALUNO` |
| task `status`: `PENDING` / `IN_PROGRESS` / `SUBMITTED` / `OVERDUE` / `APPROVED` / `REJECTED` | `PENDENTE` / `EM_ANDAMENTO` / `ENTREGUE` / `ATRASADA` / `APROVADA` / `REPROVADA` |
| `journeyStatus`: `IN_PROGRESS` / `READY_FOR_INOVAMF` / `REFERRED` | `EM_ANDAMENTO` / `PRONTA_INOVAMF` / `ENCAMINHADA` |
| `ideaStage`: `JUST_IDEA` / `PROTOTYPE` / `MVP_IN_DEV` / `MVP_READY` | `APENAS_IDEIA` / `PROTOTIPO` / `MVP_EM_DESENVOLVIMENTO` / `MVP_PRONTO` |
| `memberRole`: `LEADER` / `MEMBER` | derivado de `equipes.lider_id` |

## Autenticação e erros

- `Authorization: Bearer <accessToken>` (JWT, 15 min). O refresh token (7 dias) vai em cookie httpOnly
  `infohub_refresh_token` (path `/api/auth`) **e** no corpo da resposta de login/refresh. Cada refresh rotaciona o
  token; reutilizar um token antigo derruba todas as sessões do usuário.
- Erros sempre no envelope `{ "error": { "code", "message", "details"?, "fields"? } }`.
  `422 VALIDATION_ERROR` traz `fields: [{ field, message }]`. Outros códigos comuns: `401 INVALID_CREDENTIALS`,
  `403 PASSWORD_NOT_SET` (conta ainda não ativada), `403 TEAM_OUT_OF_SCOPE`, `404 *_NOT_FOUND`,
  `409 STAGE_REQUIREMENTS_PENDING` (RN-01, com `details.pendingTasks`), `409 STUDENT_ALREADY_IN_TEAM` (RN-03),
  `413 UPLOAD_LIMIT_FILE_SIZE`, `429 TOO_MANY_REQUESTS`.
- Escopo (RNF-03): ADMIN vê tudo; MENTOR só as equipes que acompanha; STUDENT só a própria equipe. Vale para
  equipes, tarefas, calendário, relatórios e download de anexos.

## Endpoints

### Público
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | `{ status, database }` — usado pelo Coolify |
| GET | `/areas` · `/courses` | Listas para o formulário de ideia: `{ data: [{ id, name }] }` |
| POST | `/teams/register` | RF-02/05 — formulário inicial (ver abaixo) |
| POST | `/auth/login` | `{ email, password }` → `{ accessToken, refreshToken, expiresIn, user }` |
| POST | `/auth/refresh` · `/auth/logout` | `{ refreshToken? }` (ou cookie) |
| POST | `/auth/forgot-password` | `{ email }` → sempre 202 (conta sem senha recebe link de ativação) |
| POST | `/auth/reset-password` | `{ token, password }` — serve para ativação (RF-02) e recuperação (RF-01) |

`user` da sessão (`ApiSessionUser`): `{ id, name, email, role, phone, course, semester, isActive, createdAt,
teams: [{ id, name, memberRole, journeyStage, journeyStatus }], mentoredTeamIds? }`.

**Cadastro** (`POST /teams/register`):
```json
{
  "team": { "name": "…", "description": "… (≥ 20 caracteres)", "areaId": "uuid", "ideaStage": "JUST_IDEA", "howDidYouHear": "…" },
  "leader": { "name": "…", "email": "…", "phone": "…", "course": "Administração", "semester": "3º semestre", "password": "Senha123" },
  "members": [{ "name": "…", "email": "…", "course": "Sistemas de Informação" }],
  "lgpdConsent": true
}
```
→ `201 { teamId, leaderId, memberCount, message }`. O líder cria a senha no formulário; cada colega recebe por e-mail
um link `/definir-senha?token=…` (72 h) e só consegue logar depois de ativar. Um aluno em equipe ativa não pode entrar
em outra (RN-03). Cursos são validados pelo nome (tabela `cursos`).

### Sessão (autenticado)
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/auth/me` | `{ user }` |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }` — derruba as outras sessões |
| DELETE | `/auth/me` | RNF-02 — `{ password }`; anonimiza os dados, promove outro líder se preciso → `{ promotedLeaders, deletedTeams, message }` |
| GET/PUT | `/auth/me/notification-preferences` | RF-21 — `{ preferences: [{ type, enabled }] }` |

### Usuários — só ADMIN (RF-03)
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/users?role=&isActive=&search=&page=&pageSize=` | `{ data: [{ id, name, email, role, phone, course, semester, isActive, createdAt, mentoredTeams }], total, page, pageSize }` |
| POST | `/users` | `{ name, email, role: "ADMIN"\|"MENTOR", phone? }` — conta nasce sem senha; recebe ativação por e-mail |
| GET / PATCH | `/users/:id` | PATCH: `{ name?, email?, role?, phone?, course?, semester? }` |
| PATCH | `/users/:id/status` | `{ isActive }` — desativar derruba as sessões; último admin não pode |
| DELETE | `/users/:id` | Exclusão LGPD feita pelo admin |

### Equipes (`/teams`)
| Método | Rota | Quem | Descrição |
| --- | --- | --- | --- |
| GET | `/teams?search=&stage=&status=&categoryId=&mentorId=&course=&period=&taskStatus=&includeInactive=` | todos (escopo) | `{ data: TeamCard[], total }` |
| GET | `/teams/board` (mesmos filtros) | todos | RF-06 — `{ columns: [{ stage, name, teams }], total, canDrag }` |
| GET | `/teams/:id` | todos | RF-08 — `{ team, members, journey, stageHistory }` |
| PATCH | `/teams/:id` | líder, mentor, admin | `{ name?, description?, areaId?, ideaStage? }` |
| DELETE | `/teams/:id` | admin | Q4 — exclusão lógica |
| GET | `/teams/:id/stage-blockers?toStage=N` ou `?toStageId=` | admin, mentor | RN-01 — `{ isAdvancing, blockers }` |
| PATCH | `/teams/:id/stage` | admin, mentor | RF-09 — `{ toStage? \| toStageId?, reason?, force? }` → `{ team, fromStage, toStage, isAdvancing, forced, skippedTasks, journeyStatus, message }`; 409 se faltar obrigatória e `force=false` |
| POST | `/teams/:id/stages` | admin, mentor | Etapa extra: `{ name, description?, afterStage? \| afterStageId? }` → `{ stageId, journey }` |
| DELETE | `/teams/:id/stages/:stageId` | admin, mentor | Remove etapa extra sem tarefas/histórico |
| POST | `/teams/:id/refer` | admin | `{ force? }` — marca ENCAMINHADA (exige READY_FOR_INOVAMF, salvo `force`) |
| POST / DELETE | `/teams/:id/mentors` · `/teams/:id/mentors/:mentorId` | admin | `{ mentorId }` |
| POST | `/teams/:id/members` | líder, mentor, admin | `{ name, email, course, semester? }` — cria a conta (ativação por e-mail) se não existir |
| DELETE | `/teams/:id/members/:userId` | líder, mentor, admin | Sai da equipe (`saiu_em`); líder não pode ser removido |
| POST | `/teams/:id/members/:userId/promote` | líder, mentor, admin | Troca o líder |
| GET / POST | `/teams/:id/notes` | admin, mentor | RF-10 — `{ data: [{ id, author, content, createdAt, updatedAt }] }` / `{ content }` |
| PATCH / DELETE | `/teams/:id/notes/:noteId` | autor ou admin | |
| POST | `/teams/:id/reminders` | admin, mentor | RF-20 — `{ subject, message }` → `{ recipients, message }` |

`TeamCard`: `{ id, name, description, category: { id, name }, ideaStage, journeyStage (coluna 1–6), journeyStageName,
currentStage: { id, name, order, isExtra }, journeyStatus, period, semester (= period, compatibilidade), howDidYouHear,
isActive, createdAt, readyAt, referredAt, leader: { id, name, email, course }, mentors: [{ id, name }], memberCount,
openTasks, overdueTasks }`.
`journey[]`: `{ id, order, number (null = extra), name, description, isExtra, isCurrent }`.
`stageHistory[]`: `{ id, fromStage, fromStageName, toStage, toStageName, direction: start|advance|rollback, reason, forced, changedAt, changedByName }`.

### Tarefas (`/tasks`)
| Método | Rota | Quem | Descrição |
| --- | --- | --- | --- |
| GET | `/tasks?teamId=&status=&stage=&dueFrom=&dueTo=&search=` | todos (escopo) | `{ data: Task[], total }` |
| GET | `/tasks/templates` | admin, mentor | RF-11 — `{ data: [{ id, stage, stageName, title, description, isMandatory }] }` |
| GET | `/tasks/calendar?from=AAAA-MM-DD&to=&teamId=&includeReminders=` | todos | `{ range, summary: { total, overdue, pending, approved }, days: [{ date, events }], events }` |
| POST | `/tasks` | admin, mentor | RF-12 — `{ teamId, templateId? \| title, description?, stageId?, dueDate: "AAAA-MM-DD", isMandatory?, reminderDaysBefore?: [3,1] }` |
| GET | `/tasks/:id` | todos | `{ task: TaskDetail }` |
| PATCH | `/tasks/:id` | admin, mentor | `{ title?, description?, dueDate?, isMandatory? }` — mudar o prazo recalcula lembretes (RF-17) e reabre tarefa atrasada |
| PATCH | `/tasks/:id/status` | aluno | `{ status: "IN_PROGRESS" }` |
| DELETE | `/tasks/:id` | admin, mentor | Só sem entregas |
| POST | `/tasks/:id/submissions` | aluno da equipe (ou admin) | RF-14/16 — **multipart/form-data**: `files` (até 5 × 50 MB), `linkUrl?`, `linkTitle?`, `note?` → nova versão |
| POST | `/tasks/:id/review` | admin, mentor | RF-15 — `{ decision: "APPROVED"\|"REJECTED", comment }` |
| POST | `/tasks/:id/comments` | todos (escopo) | `{ content }` — comentário sem decisão |
| POST / DELETE | `/tasks/:id/reminders` · `/tasks/:id/reminders/:reminderId` | admin, mentor | RF-17 — `{ daysBefore }` ou `{ remindAt: "AAAA-MM-DD" }` |
| GET | `/tasks/:id/attachments/:attachmentId/download` | todos (escopo) | Download do arquivo (RNF-04) |

`Task`: `{ id, teamId, teamName, title, description, stage, stageId, stageName, dueDate, status, isMandatory,
submissionCount, lastSubmissionAt, createdAt, updatedAt }`.
`TaskDetail` = `Task` + `submissions: [{ id, version, note, submittedAt, submittedBy, attachments: [{ id, type: FILE|LINK,
name, url, size, mimeType }], type, url, fileName, fileSize, mimeType }]` (os cinco últimos = primeiro anexo, por
compatibilidade) + `comments: [{ id, submissionId, submissionVersion, author, decision, content, createdAt }]` +
`reminders: [{ id, daysBefore, remindAt, sentAt }]`.
Evento do calendário: `{ kind: DUE|REMINDER, date, taskId, title, stage, stageName, status, isMandatory, teamId, teamName, dueDate, reminderSent }`.

### Relatórios — ADMIN e MENTOR (`/reports`)
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/reports/dashboard?period=2026/2&status=&includeInactive=` | RF-22 — `{ totals: { teams, activeTeams, readyForInovamf, referred, openTasks, overdueTasks, teamsWithOverdueTasks, newTeamsLast30Days }, byStage, byArea, byStatus, periods }` |
| GET | `/reports/teams.csv?period=&status=` | RF-23/24 — CSV (`;`, UTF-8 com BOM) para Excel |

### Outros
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/stages` | Catálogo das 6 etapas padrão |
| POST | `/areas` · `/courses` (admin) | `{ name }` |
| POST | `/jobs/run` (admin) | Executa a rotina agendada agora → `{ tarefasAtrasadas, lembretesEnfileirados, avisosAtrasoEnfileirados, emailsEnviados, emailsComFalha }` |

## O que mudou em relação ao backend antigo (para ajustar o frontend)

1. **Cadastro** (`POST /teams/register`): `leader.password` passou a ser obrigatório (o líder cria a senha no formulário);
   integrantes continuam recebendo o link de ativação por e-mail.
2. **Entrega** (`POST /tasks/:id/submissions`): agora é `multipart/form-data` com upload real (`files`) e/ou `linkUrl`,
   em vez de JSON com URL de um arquivo já hospedado. A resposta traz `attachments[]` por versão (os campos antigos
   `type/url/fileName/fileSize/mimeType` continuam, refletindo o primeiro anexo).
3. **Download** de arquivo: `GET /tasks/:id/attachments/:attachmentId/download` (autenticado), nunca URL pública.
4. `TeamCard.period` (período de ingresso) — `semester` foi mantido com o mesmo valor.
5. Novos: `/reports/*`, `/teams/:id/refer`, `/teams/:id/members*`, `/teams/:id/reminders` (RF-20),
   `/tasks/:id/reminders`, `/tasks/:id/comments`, `/tasks/:id/status`, `/auth/me/notification-preferences`, `/courses`, `/stages`.
6. Links dos e-mails: `/definir-senha?token=…` (ativação e recuperação usam a mesma tela e o mesmo endpoint).

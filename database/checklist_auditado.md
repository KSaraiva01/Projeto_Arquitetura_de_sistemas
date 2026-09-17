# ✅ CHECKLIST — BANCO × REQUISITOS × ARQUITETURA | InfoHub

Auditado contra o código em 2026-09-17.

Legenda: `[x]` feito e conferido · `[~]` parcial · `[ ]` não feito.
Caminhos: `db/` = `database/` · `be/` = `Projeto_Arquitetura_de_sistemas/infohub-backend/src/` · `fe/` = `Projeto_Arquitetura_de_sistemas/infohub-frontend/src/`.

---

## 🏗️ A. ARQUITETURA DO SISTEMA

### 01. Contas
- [x] **Onde ficam:** tabela `usuario` (`db/schema.sql`), uma linha por pessoa. Sessões em `token_sessao`; tokens de primeiro acesso/recuperação em `token_senha`.
- [x] **Usuário × equipe × perfil:** `usuario.perfil` (ADMIN / MENTOR / STUDENT) → `equipe_membro (equipe_id, usuario_id, papel)` para alunos → `equipe_mentor (equipe_id, mentor_id)` para mentores.
- [x] **Admin, mentor, líder, integrante:** admin e mentor são valores de `usuario.perfil`; líder e integrante são o mesmo perfil STUDENT diferenciado por `equipe_membro.papel` (LEADER / MEMBER). Decisão Q1: os dois têm login.
- [x] **RNF-03 (permissões):** duas camadas — `authorize("ADMIN","MENTOR")` nas rotas (`be/shared/middlewares/authenticate.ts`) decide *quem pode chamar*; `buildTeamScopeCondition` (`be/shared/scope.ts`) decide *o que cada um enxerga*: ADMIN tudo, MENTOR só `equipe_mentor`, STUDENT só `equipe_membro`. Fora do escopo = 403, inexistente = 404.

### 02. Jornada
- [x] **Onde ficam as etapas:** catálogo `etapa` (6 linhas fixas, `numero` 1–6) e a jornada de cada equipe em `equipe_etapa` (cópia das 6 + extras).
- [x] **Equipe × etapa atual:** `equipe.etapa_atual_id UUID → equipe_etapa.id` (FK adicionada com `ALTER TABLE` porque as tabelas se referenciam).
- [x] **Histórico:** `historico_etapa (de_equipe_etapa_id, para_equipe_etapa_id, movido_por, motivo, forcado, movido_em)`. Só INSERT.
- [x] **Avançar e retroceder:** `PATCH /teams/:id/stage` → `changeStage` (`be/modules/teams/teams.service.ts`). Retroceder é uma linha com `para.ordem < de.ordem` e nunca é bloqueado.

### 03. Tarefas
- [x] **Tabela:** `tarefa (equipe_id, equipe_etapa_id, modelo_id, titulo, descricao, prazo DATE, status, obrigatoria)`.
- [x] **Tarefas específicas da equipe:** `tarefa.equipe_id NOT NULL` — toda tarefa é de uma equipe.
- [x] **Modelos pré-configurados:** `modelo_tarefa` (8 modelos inseridos pelo schema, um por entregável das etapas 2–6).
- [x] **tarefa → etapa → equipe:** `tarefa.equipe_etapa_id → equipe_etapa.id → equipe_etapa.equipe_id`.

### 04. Notificações
- [x] **Onde ficam:** tabela `notificacao (destinatario_id, email_destino, tipo, assunto, status, tentativas, erro, equipe_id, tarefa_id, lembrete_id, enviado_em)`.
- [x] **Registro dos e-mails:** `sendMail` (`be/shared/mail/mailer.ts`) insere a linha ANTES de chamar o Resend e depois atualiza para `SENT` ou `FAILED` (+ `erro`).
- [x] **Envio duplicado:** dois índices únicos parciais — `uq_notificacao_lembrete (lembrete_id, destinatario_id)` e `uq_notificacao_atraso (tarefa_id, destinatario_id) WHERE tipo='OVERDUE'` — e o INSERT usa `ON CONFLICT DO NOTHING`; se não devolve id, o e-mail não sai.
- [x] **notificação → usuário → tarefa/equipe:** FKs `destinatario_id`, `tarefa_id`, `equipe_id`, `lembrete_id` (todas `ON DELETE SET NULL` para o log sobreviver).

---

## ⚙️ B. REGRA RN-01 — AVANÇO DE ETAPA

### 05. Onde mora a RN-01?
- [x] **Controller?** Não. `teams.controller.ts → changeStage` só lê `params.id`, `body`, `ip` e chama o service.
- [x] **Service?** **Sim.** `teams.service.ts → changeStage` (aplicar) e `getStageBlockers` (consultar sem aplicar).
- [x] **Model/Repository?** Só a consulta: `teams.repository.ts → findPendingMandatoryTasks` devolve as obrigatórias não aprovadas; quem decide é o service.
- [x] **Banco?** Só o estrutural: `tarefa.obrigatoria`, `historico_etapa.forcado`, FKs. Sem trigger nem função de regra (decisão registrada no cabeçalho do schema).
- [x] **Espalhada?** Não — um ponto de decisão, reutilizado pelo `GET /teams/:id/stage-blockers` que o front consulta antes de soltar o cartão.

### 06. Responsabilidade
- [x] Controller recebe a requisição (`*.controller.ts`).
- [x] Service aplica a regra (`*.service.ts`).
- [x] Repository acessa os dados (`*.repository.ts`, SQL parametrizado com `pg`).
- [x] Banco garante restrições estruturais: PK/FK, UNIQUE, CHECK, índices parciais.

### 07. A query
- [x] **"Esta equipe pode avançar?"** → `GET /teams/:id/stage-blockers?toStage=N`. `blockers: []` = pode.
- [x] **Identifica todas as tarefas da etapa?** Identifica as das etapas que ficam para trás: `ee.ordem >= ordem_atual AND ee.ordem < ordem_destino` — cobre pular mais de uma etapa e cobre extras.
- [x] **Obrigatória × opcional:** `tarefa.obrigatoria BOOLEAN`.
- [x] **Todas as obrigatórias aprovadas?** `tk.obrigatoria AND tk.status <> 'APPROVED'` → qualquer linha bloqueia (409 `STAGE_REQUIREMENTS_PENDING`). Com `force: true` passa e grava `forcado = TRUE`.

```sql
SELECT tk.id, tk.titulo, tk.status
  FROM tarefa tk JOIN equipe_etapa ee ON ee.id = tk.equipe_etapa_id
 WHERE tk.equipe_id = $1 AND tk.obrigatoria AND tk.status <> 'APPROVED'
   AND ee.ordem >= $2 AND ee.ordem < $3;   -- 0 linhas = pode avançar
```

---

## 🔄 C. IMPACTO DE ALTERAÇÕES NO SISTEMA

### 08. Renomear um campo de tarefa (exemplo real: `prazo` / `dueDate`)
- [x] **Banco:** `db/schema.sql` + `db/seed_demo.sql`.
- [x] **Model/Entity:** `be/modules/tasks/tasks.repository.ts` (`TaskRow` + SQL), `be/modules/teams/teams.repository.ts` (query da RN-01), `be/jobs/scheduler.ts` (só se o job usar a coluna).
- [x] **Service:** `tasks.service.ts` (`toPublicTask`) — só se o nome da API mudar.
- [x] **Controller:** não muda.
- [x] **DTO:** `tasks.schemas.ts` (Zod) — só se o nome da API mudar.
- [x] **Rotas:** não mudam.
- [x] **Front:** `fe/lib/api-types.ts` + `DueChip.tsx`, `TeamDetail.tsx`, páginas de tarefas — só se o nome da API mudar.
- [x] **Validações:** mesmo `tasks.schemas.ts`.
- [ ] **Testes:** não existem.
- [x] **Documentação:** `be/README.md`, `db/README.md`.

➡️ **Resposta:** renomear **só no banco** = **5 arquivos** (schema, seed, 2 repositories, README). O repository isola o resto. Renomear **também no contrato da API** = +4 no back (schemas, 2 services, templates de e-mail) e ~10 no front. Conclusão: o custo está no contrato da API, não no banco.

---

## 🌐 D. FRONT-END × BACK-END × BANCO

### 09. O front conversa só pela API?
- [x] Não acessa o banco: nenhum `pg`, `DATABASE_URL` ou driver no `infohub-frontend/package.json` ou em `fe/`.
- [x] Tudo passa pelo back: os únicos `fetch` do front estão em `fe/lib/api.ts` (`${API_URL}${path}`).
- [x] Rotas usadas hoje: `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/forgot-password`, `/teams/board`, `/teams/:id/stage-blockers`, `/teams/:id/stage`, `/tasks/calendar`.

### 10. Atalhos
- [x] Front → banco: **não existe**.
- [x] Front → serviço externo: **não existe** (nenhum `fetch` para fora do `API_URL`; o Resend é chamado só pelo back).
- [x] Front → API → Service → Banco: `fe/lib/api.ts` → `be/routes.ts` → `*.routes.ts` → `*.controller.ts` → `*.service.ts` → `*.repository.ts` → PostgreSQL.

### 11. Rotas (documentadas em `be/README.md`, seção "Endpoints")
- [x] **Autenticação** `/api/auth`: `POST login`, `refresh`, `logout`, `forgot-password`, `reset-password`, `change-password`; `GET me`; `DELETE me`.
- [x] **Equipes** `/api/teams`: `POST register` (público), `GET /`, `GET board`, `GET :id`, `DELETE :id`, `POST :id/mentors`, `DELETE :id/mentors/:mentorId`, `GET/POST :id/notes`.
- [x] **Tarefas** `/api/tasks`: `GET /`, `GET templates`, `GET calendar`, `POST /`, `GET :id`, `PATCH :id`.
- [x] **Entregas**: `POST /api/tasks/:id/submissions` (versionada), `POST /api/tasks/:id/review` (aprovar / pedir ajuste).
- [x] **Etapas**: `GET /api/teams/:id/stage-blockers`, `PATCH /api/teams/:id/stage`, `POST /api/teams/:id/stages` (extra).
- [~] **Notificações**: não há rota de consulta; só `POST /api/jobs/run` (ADMIN) dispara a rotina. O registro fica na tabela.
- [~] **Dashboard**: não há endpoint dedicado; os KPIs vêm de `GET /api/teams/board` (cada cartão traz `overdueTasks`, `openTasks`, `journeyStatus`).

---

## 📚 E. README / ONBOARDING

### 12. Outra dupla roda amanhã? **Sim** — `Projeto_Arquitetura_de_sistemas/README.md` ("Como rodar localmente") + `infohub-backend/README.md`.
- [x] Pré-requisitos: Node 20+, PostgreSQL 13+.
- [x] Instalação do front: `cd infohub-frontend && npm install`.
- [x] Instalação do back: `cd infohub-backend && npm install`.
- [x] Dependências: `npm install`.
- [x] Banco: `npm run db:setup` (cria o banco se faltar e aplica `database/schema.sql`) ou `psql -f`.
- [x] Variáveis de ambiente: `.env.example` nos dois projetos, cada variável explicada no README do back.
- [x] `.env`: `cp .env.example .env`.
- [x] Tabelas: `db:setup` / `db:reset` (sem migrations, por decisão: um único `schema.sql`).
- [x] Seed: `npm run db:seed:demo` (opcional, dev).
- [x] Iniciar front: `npm run dev` → http://localhost:3000.
- [x] Iniciar back: `npm run dev` → http://localhost:3333/api.
- [ ] **Testes: não há testes nem script `npm test`.**
- [x] Acesso: http://localhost:3000.
- [x] Usuário de teste: `admin@amf.edu.br / InfoHub@2026` (+ 2 mentores e 1 aluno do seed).
- [x] Documentação da API: `be/README.md` → "Endpoints".
- [x] Estrutura de pastas: nos dois READMEs.
- [ ] `infohub-frontend/README.md` ainda é o padrão do `create-next-app`.

---

## 🗄️ F. BANCO × REQUISITOS — RF-02 Criação da conta

### 13. Como a conta é criada?
- [x] **Nasce com o formulário:** `POST /teams/register` → `registerTeam` cria equipe + conta do líder + contas dos integrantes na mesma transação.
- [x] **E-mail identifica:** `uq_usuario_email ON usuario (LOWER(email))`.
- [x] **Como a senha é criada:** não é. `usuario.senha_hash` nasce `NULL`; o login recusa contas sem senha.
- [x] **Senha inicial substituída por token:** sim — não existe senha inicial; sai um token de primeiro acesso por e-mail (`FIRST_ACCESS`).
- [x] **Validade:** `token_senha.expira_em` = `FIRST_ACCESS_EXPIRES_IN_HOURS` (env).
- [x] **Uso único:** `token_senha.usado_em`; ao emitir um novo, os anteriores são invalidados (`invalidatePasswordTokens`).
- [x] **Senha definitiva no 1º acesso:** `POST /auth/reset-password {token, password}` → bcrypt em `senha_hash`.
- [x] **Armazenamento seguro:** o token gerado com `randomBytes` só existe no e-mail; o banco guarda `token_hash CHAR(64)` (SHA-256). Senha em bcrypt.

Decisão "token de acesso por e-mail":
- [x] Banco: `token_senha`, `senha_hash NULL`, enum `finalidade_token`.
- [x] API: `/teams/register`, `/auth/forgot-password` (reemite FIRST_ACCESS se ainda não tem senha), `/auth/reset-password`.
- [ ] **Front: não.** `fe/app/cadastro/page.tsx` ainda tem "Senha" e "Confirmar senha" e grava em mock; não existe a página que recebe o link do token.

---

## 👥 G. Q1 — LIDERANÇA DA EQUIPE

- [x] **Banco impede dois líderes:** `CREATE UNIQUE INDEX uq_equipe_um_lider ON equipe_membro (equipe_id) WHERE papel = 'LEADER' AND ativo`.
- [~] **Banco impede equipe sem líder:** não (um índice parcial não garante "pelo menos um"). É o back que garante: o cadastro sempre cria o líder e a exclusão LGPD promove outro antes de desativar.
- [x] **Campo de papel:** `equipe_membro.papel` (`papel_membro` ENUM).
- [x] **Índice parcial:** o acima.
- [~] **Troca de líder:** só automática, na exclusão LGPD (`users.service.ts → anonymizeUser`). Não há endpoint para o mentor/admin trocar o líder manualmente.
- [x] **Novo líder automático:** sim — integrante ativo mais antigo (`findLeaderships`, `ORDER BY entrou_em`). Auditoria `USER_ANONYMIZED.promotedLeaders`.

---

## 📄 H. RF-16 — VERSIONAMENTO DE ARQUIVOS

### 14. Primeiro envio
- [x] Versão 1: `insertSubmission` grava `versao = COALESCE(MAX(versao),0)+1`.

### 15. Envio corrigido
- [x] Versão 2: nova linha em `entrega`.
- [x] Versão 1 mantida: nunca há UPDATE/DELETE em `entrega`.
- [x] Versão atual: maior `versao` (`findLatestSubmission`; índice `(tarefa_id, versao DESC)`).
- [x] Data/hora: `entrega.enviado_em`.
- [x] Quem enviou: `entrega.enviado_por`.
- [x] Arquivos antigos acessíveis: `GET /tasks/:id` devolve todas as `submissions` com `url` (o arquivo em si depende do upload físico — RNF-04, ainda não feito).
- [x] `entrega → versões`: `UNIQUE (tarefa_id, versao)`.
- [x] Comentários/aprovações ligados à versão: `comentario_tarefa.entrega_id` = versão avaliada.

---

## 🔔 I. RF-17 — ALTERAÇÃO DE PRAZO

- [x] Alterou o prazo → verifica lembretes: `updateTask` detecta `dueDateChanged` e chama `rescheduleReminders`.
- [x] Lembretes antigos ajustados: os **não enviados** recebem novo `enviar_em = novo_prazo − dias_antes`; os já enviados ficam como registro.
- [~] Criar novos lembretes: não cria — só recalcula os que existem. Não há endpoint para adicionar lembrete a tarefa existente.
- [x] Lembrete antigo não dispara: `enviar_em` é recalculado antes do job rodar; os que cairiam no passado são apagados; `lembrete.enviado_em` + índice único em `notificacao` impedem repetição.
- [x] Registro da alteração: auditoria `TASK_UPDATED` com `previousDueDate` e `dueDateChanged`.
- [x] Quem alterou: `auditoria.usuario_id` (só ADMIN/MENTOR chegam aqui — Q8).
- [x] Data/hora: `auditoria.criado_em`.
- [x] Extra: tarefa `OVERDUE` cujo novo prazo é futuro volta para `PENDING`.

---

## ⏰ J. RN-04 — TAREFA ATRASADA

- [x] Job/Scheduler: `be/jobs/scheduler.ts` — roda na subida do servidor e a cada `JOBS_INTERVAL_MINUTES` (padrão 15); `POST /api/jobs/run` dispara na hora.
- [x] Tarefas vencidas: `markOverdueTasks` → `prazo < CURRENT_DATE`.
- [x] Sem entrega: só `status IN ('PENDING','IN_PROGRESS')` vira OVERDUE — `SUBMITTED`/`APPROVED` não.
- [x] Marcar: `UPDATE tarefa SET status = 'OVERDUE'`; o kanban mostra `overdueTasks` no cartão.
- [x] Notificação: `findOverdueUnnotified` → e-mail `OVERDUE` a cada integrante.
- [x] Registro: linha em `notificacao`.
- [x] Sem duplicado: `uq_notificacao_atraso`.
- [x] Frequência: `JOBS_INTERVAL_MINUTES`, `JOBS_ENABLED=false` desliga.
- [x] Alteração de prazo: `updateTask` volta OVERDUE → PENDING se o novo prazo é futuro; o job reavalia na próxima rodada.
- [ ] Ponto aberto: tarefa `REJECTED` que passa do prazo **não** vira OVERDUE. Decidir.

**Pergunta:** "atrasada" é **gravada pelo job**. Justificativa (comentário em `tarefa` no schema e `db/README.md`): o contador do dashboard vira `COUNT(*) WHERE status='OVERDUE'` sem cálculo de data, e o aviso de atraso tem um momento único para disparar (o instante em que o job marca). O custo é o atraso de até 15 min, aceitável para um prazo em dias.

---

## 🗑️ K. Q4 — EXCLUSÃO DE EQUIPE

- [x] Campo: `equipe.excluida_em TIMESTAMPTZ` + `excluida_por`.
- [x] Some das consultas: `listTeams` filtra `excluida_em IS NULL` (salvo `?includeInactive=true`, ADMIN); o job ignora equipes excluídas.
- [x] Histórico permanece: `softDelete` é um UPDATE.
- [x] `ON DELETE` percorridos — os CASCADE partem de `equipe`, mas como ela nunca é apagada fisicamente, não disparam:
  - [x] Pessoa: `equipe_membro.equipe_id` CASCADE; `usuario` intocado.
  - [x] Ideia: é a própria linha de `equipe`.
  - [x] Tarefas: `tarefa.equipe_id` CASCADE.
  - [x] Entregas: `entrega.tarefa_id` CASCADE.
  - [x] Arquivos: colunas de `entrega` (`url`, `nome_arquivo`).
  - [x] Comentários: `comentario_tarefa.tarefa_id` CASCADE.
  - [x] Notificações: `notificacao.equipe_id` SET NULL.
  - [x] Histórico de etapas: `historico_etapa.equipe_id` CASCADE.
  - [x] Auditoria: sem FK (`entidade_id` livre) — nunca perde linha.

---

## 🔐 L. RF-10 — ANOTAÇÕES DO MENTOR

- [x] Relação: `anotacao_mentor (equipe_id, autor_id)`.
- [x] Aluno sem permissão: rotas `GET/POST /teams/:id/notes` com `authorize("ADMIN","MENTOR")`.
- [x] Endpoint não retorna para aluno: 403 antes de qualquer SQL; `getTeamDetail` não faz JOIN com `anotacao_mentor`.
- [x] Service verifica: `loadTeamInScope` — mentor só nas equipes dele.
- [x] Banco: FKs adequadas; nenhuma view/consulta do aluno toca a tabela.
- [ ] Teste pela API: sem teste automatizado. Manual: token de aluno em `GET /teams/:id/notes` → 403 `INSUFFICIENT_ROLE`.
- [ ] Teste pelo front: a tela de anotações ainda não existe.

---

## 🛡️ M. RNF-02 — LGPD / EXCLUSÃO DE DADOS

- [x] Dados excluídos: nome, e-mail, telefone, curso, semestre, senha (`users.repository.ts → anonymize`).
- [x] `PESSOA` (`usuario`): a linha vira âncora — `nome = 'Usuário removido'`, `email = 'removido-<id>@anonimizado.invalid'` (libera o e-mail real), `ativo = FALSE`, `anonimizado_em = NOW()`.
- [x] Autenticação: `token_sessao` e `token_senha` apagados; `senha_hash = NULL`.
- [x] Equipe: `deactivateMemberships` (`ativo = FALSE`, `saiu_em`) e `removeMentorships`.
- [x] Entregas: mantidas; `enviado_por` aponta para a âncora.
- [x] Arquivos: mantidos (são da equipe).
- [x] Comentários: mantidos; `autor_id` → âncora.
- [~] Notificações: mantidas — `email_destino` ainda guarda o e-mail real. Ponto aberto.
- [~] Histórico/auditoria: mantidos — `auditoria.detalhes` do cadastro guarda `leaderEmail`. Ponto aberto.
- [x] Anonimizar × apagar: anonimiza `usuario`; apaga só tokens.
- [x] Se for líder:
  - [x] Novo líder: integrante ativo mais antigo.
  - [x] Só um líder: desativa o vínculo do antigo **antes** de promover (respeita o índice parcial).
  - [x] Registro: auditoria `USER_ANONYMIZED` com `promotedLeaders`/`deletedTeams`.
- [x] Se era o único integrante: equipe excluída logicamente (Q4).
- [x] Rotas: `DELETE /auth/me` (o próprio, confirmando a senha) e `DELETE /users/:id` (admin). Último admin ativo não pode ser excluído.
- [x] Consentimento: `usuario.consentimento_lgpd_em` gravado no cadastro.

---

## 👤 N. Q4 — MESMO E-MAIL EM DUAS EQUIPES

- [x] **Resposta: UMA linha em `usuario`, DUAS em `equipe_membro`.**
- [x] Pode participar de várias equipes: sim (decisão Q4).
- [x] Uma linha em PESSOA: `uq_usuario_email`.
- [x] Tabela intermediária: `equipe_membro UNIQUE (equipe_id, usuario_id)`.
- [x] Restrição "não pode": não aplicável.
- [x] RN-03: a Q4 substitui a RN-03 (registrado em `db/README.md`). `registerTeam` reaproveita a conta existente e a coloca na nova equipe sem aceite (Q12).

---

## 📝 O. RF-11 — MODELO DE TAREFA × TAREFA DA EQUIPE

- [x] `modelo_tarefa` (etapa_id do catálogo, titulo, descricao, obrigatoria, ativo).
- [x] `tarefa`.
- [x] `tarefa.modelo_id → modelo_tarefa` (NULL para avulsa; `ON DELETE SET NULL`).
- [x] Pertence à equipe: `tarefa.equipe_id NOT NULL`.
- [x] Reutilizável: N tarefas apontam para o mesmo modelo.
- [x] Alterar o modelo não altera tarefas: `createTask` **copia** título/descrição/obrigatoria para a `tarefa`.
- [x] `GET /tasks/templates` (modelos) × `GET /tasks` (tarefas reais).

---

## 🚦 P. RN-01 — O BANCO SABE SE PODE AVANÇAR?

- [x] Etapa atual: `equipe.etapa_atual_id → equipe_etapa.ordem`.
- [x] Tarefas da etapa: `tarefa.equipe_etapa_id`.
- [x] Obrigatórias: `tarefa.obrigatoria`.
- [x] Status: `tarefa.status`.
- [x] Aprovadas: `status = 'APPROVED'`.
- [x] Exceção manual: `force: true` no `PATCH /teams/:id/stage`.
- [x] Quem autorizou: `historico_etapa.movido_por` + `forcado = TRUE` + auditoria `TEAM_STAGE_CHANGED`.
- [x] Data/hora: `historico_etapa.movido_em`.
- [ ] Teste com obrigatória pendente — manual: esperado 409 `STAGE_REQUIREMENTS_PENDING` com `pendingTasks[]`.
- [ ] Teste com todas aprovadas — manual: esperado 200, `forced: false`.
- [ ] Teste avanço manual — manual: `force: true` → 200, `forced: true`, `skippedTasks[]`.

---

## 🕒 Q. RF-08 / RF-09 — HISTÓRICO DAS ETAPAS

- [x] Etapa atual: `equipe.etapa_atual_id`.
- [x] Etapa anterior: `historico_etapa.de_equipe_etapa_id`.
- [x] Entrou: `movido_em` da linha com `para = etapa`.
- [x] Saiu: `movido_em` da linha seguinte com `de = etapa`.
- [x] Quem moveu: `movido_por`.
- [x] Motivo: `motivo` (o front exige quando forçado).
- [x] Avanço: `para.ordem > de.ordem` → `direction: "advance"`.
- [x] Retrocesso: `para.ordem < de.ordem` → `"rollback"`.
- [x] Múltiplas passagens: sem UNIQUE em (equipe, etapa).
- [x] Nunca sobrescreve: só INSERT (`updateStage`).

---

## 🎥 R. Q3 — PITCH × BMC

- [x] Formato do Pitch: **link do YouTube**.
- [x] Arquivo? Não. Link? Sim (`tipo = 'LINK'`).
- [x] BMC: arquivo (`tipo = 'FILE'`), PDF ou imagem — `tipo_mime` diz qual.
- [x] Armazenamento: uma tabela `entrega` para os dois tipos.
- [x] Uma tabela representa os dois: sim, com CHECK.
- [x] `tipo`: `tipo_entrega ENUM ('FILE','LINK')`.
- [x] `arquivo`: coluna `url` (caminho quando FILE).
- [x] `url`: mesma coluna (link quando LINK).
- [x] `nome_arquivo`: sim, + `tamanho_bytes`, `tipo_mime`.
- [x] `data_envio`: `enviado_em`.
- [x] Incompatíveis em NULL: `CHECK ((tipo='LINK' AND nome_arquivo IS NULL AND tamanho_bytes IS NULL AND tipo_mime IS NULL) OR (tipo='FILE' AND nome_arquivo IS NOT NULL))`.
- [ ] Upload físico (RNF-04): não feito — a API recebe a `url` já hospedada.

---

## 💬 S. RF-15 — COMENTÁRIOS E REENVIO

- [x] Reprova/solicita ajuste: `POST /tasks/:id/review {decision: 'REJECTED', comment}`.
- [x] Comentário registrado: `comentario_tarefa`.
- [x] Tarefa volta: `status = 'REJECTED'`; `submit` aceita nova entrega (só recusa se `APPROVED`).
- [x] Nova versão: `versao + 1`.
- [x] Comentário antigo permanece: só INSERT.
- [x] Novos comentários: sim.
- [x] Data/hora: `criado_em`.
- [x] Autor: `autor_id`.
- [x] Versão correta: `entrega_id` = última entrega no momento da avaliação.

---

## 📧 T. RF-18 / RF-19 — CONTROLE DE NOTIFICAÇÕES

- [x] Tabela: `notificacao`.
- [x] Destinatário: `destinatario_id` + `email_destino`.
- [x] Tipo: `tipo_notificacao` (11 eventos: NEW_REGISTRATION, FIRST_ACCESS, PASSWORD_RESET, ACCOUNT_CREATED, NEW_TASK, DEADLINE_REMINDER, OVERDUE, SUBMITTED, APPROVED, REJECTED, STAGE_CHANGED).
- [x] Tarefa/equipe: `tarefa_id`, `equipe_id`, `lembrete_id`.
- [x] Data/hora: `criado_em`, `enviado_em`.
- [x] Status: `PENDING | SENT | FAILED`.
- [x] Tentativa/falha: `tentativas`, `erro`.
- [x] Verifica antes: INSERT `ON CONFLICT DO NOTHING` — sem id, não envia.
- [x] Sem duplicidade: índices únicos parciais.
- [ ] **Reenvio em caso de falha: não existe.** `FAILED` fica gravado, nenhum job reprocessa.
- [x] RNF-05 (auditoria dos envios): a própria `notificacao` é o log (assunto, destinatário, status, erro, tentativas, data).

---

## 📊 U. RF-06 / RF-22 — KANBAN E DASHBOARD

### Kanban
- [x] Query: `listTeams` em `teams.repository.ts` (`TEAM_CARD_COLUMNS` + `TEAM_CARD_JOINS`).
- [x] JOINs: **4** — `area_ideia`, `equipe_etapa` (atual), `equipe_membro` (líder), `usuario` (líder) — mais 5 subconsultas correlacionadas (coluna do kanban, nº de membros, tarefas abertas, tarefas atrasadas, mentores em `json_agg`).
- [x] Necessários: cada um alimenta um campo do cartão; mentores em JSON evita duplicar linha quando há 2 mentores.
- [x] Equipe: `FROM equipe e`.
- [x] Ideia: mesma linha.
- [x] Etapa: JOIN `equipe_etapa atual` + subconsulta "última etapa padrão com `ordem <= atual`" → coluna do kanban.
- [x] Mentor: subconsulta `json_agg`.
- [x] Tarefas/status: `COUNT` de `<> 'APPROVED'` e `= 'OVERDUE'`.

### Dashboard (calculado no front a partir de `GET /teams/board`)
- [x] Equipes ativas: `total` (já filtra `excluida_em IS NULL`).
- [x] Por etapa: `columns[].teams.length`.
- [x] Atrasadas: soma de `overdueTasks`.
- [x] Prontas para InovAMF: `journeyStatus = 'READY_FOR_INOVAMF'` (recalculado em `recomputeJourneyStatus` a cada mudança de etapa, tarefa ou avaliação).
- [x] "Atrasadas" é: **campo gravado no banco pelo job** → `COUNT` direto, sem cálculo de data.
- [~] Sem endpoint `/dashboard` nem relatórios/CSV (RF-22 a RF-24).

---

## 🚨 V. NOVA MUDANÇA DE REQUISITO — ETAPAS EXTRAS

### 01. Catálogo fixo
- [x] ENUM de etapas: **não existe** — é a tabela `etapa`.
- [x] `CHECK (etapa BETWEEN 1 AND 6)`: **não existe** (`numero > 0`).
- [~] Números 1–6 hardcoded: **back: não**. **Front: sim** — `fe/lib/types.ts` (`JourneyStage = 1|2|3|4|5|6`), `StagePipeline.tsx` (`STAGES = [1..6]`), `KanbanBoard.tsx` (`journeyStage >= 6`).
- [x] `switch/case` 1–6: nenhum no back.
- [~] Front espera 6 etapas: nas telas em mock sim; o `KanbanBoard` lê as colunas da API.
- [x] Queries assumindo 6: nenhuma — tudo é por `ordem` na jornada da equipe.
- [x] Modelo suporta extras: `equipe_etapa.etapa_id NULL`.

**Resposta:** o catálogo fixo **sobrevive** como as 6 etapas padrão (`etapa`) e as 6 colunas do kanban. O que virou flexível foi a **jornada da equipe** (`equipe_etapa`), não o catálogo.

---

## ➕ W. ETAPAS EXTRAS POR EQUIPE

- [x] Etapa por equipe: `equipe_etapa` com `etapa_id NULL`.
- [x] Onde: mesma tabela das padrão.
- [x] Ordem: `equipe_etapa.ordem`, `UNIQUE (equipe_id, ordem) DEFERRABLE INITIALLY DEFERRED` (permite empurrar as seguintes na mesma transação).
- [x] Sequência diferente por equipe: sim.
- [x] Nome: `equipe_etapa.nome`.
- [x] Descrição: `equipe_etapa.descricao`.
- [x] Posição: `afterStage` / `afterStageId` em `POST /teams/:id/stages`; sem informar, entra no fim.
- [~] Obrigatória: a etapa não tem flag; o bloqueio vem das tarefas obrigatórias dela (RN-01). Decisão consciente.
- [x] Tarefas da extra: `POST /tasks` com `stageId` da extra.
- [x] Quem cria: ADMIN e MENTOR (`authorize` + `canManageJourney`).
- [ ] **Quem edita/remove: não há endpoint.** Falta `PATCH/DELETE /teams/:id/stages/:stageId` e a regra (não remover a atual nem uma com tarefas/histórico).

---

## 🎯 X. `ETAPA_ATUAL`

- [x] Aponta para número? **Não** — `etapa_atual_id UUID → equipe_etapa`.
- [x] ID da etapa da jornada da equipe: sim.
- [x] Sequência diferente por equipe: sim.
- [x] Próxima: `MIN(ordem) WHERE ordem > atual` na jornada da equipe (a API devolve `journey[]` ordenada com `isCurrent`).
- [x] Anterior: `MAX(ordem) WHERE ordem < atual`.
- [x] Padrão ou extra: `etapa_id IS NULL` → `isExtra` na API.

### Histórico
- [x] Continua funcionando: `historico_etapa` referencia `equipe_etapa`.
- [x] Etapa: `de_equipe_etapa_id` / `para_equipe_etapa_id`.
- [x] Equipe: `historico_etapa.equipe_id`.
- [x] Entrada: `movido_em`.
- [x] Saída: linha seguinte.
- [x] Responsável: `movido_por`.
- [x] Retrocesso: permitido.
- [x] Avanço novamente: permitido.

---

## 🔄 Y. MIGRAÇÃO DAS EQUIPES EXISTENTES

Contexto: o schema foi reescrito em 2026-09-16 e ainda **não há banco em produção** — as únicas equipes existentes são as do `seed_demo.sql`, refeito para o novo modelo.

- [x] Equipes existentes: 6 equipes do seed.
- [x] 6 etapas padrão: `createJourney` copia o catálogo para cada equipe nova; o seed faz o mesmo.
- [x] Registros no novo modelo: `equipe_etapa` por equipe.
- [x] Etapa atual: seed grava `etapa_atual_id` na linha de `equipe_etapa`.
- [x] Histórico: seed insere `historico_etapa`.
- [x] Tarefas: seed insere com `equipe_etapa_id`.
- [x] Entregas: seed insere versionadas.
- [~] Aprovações: o seed **não** insere `comentario_tarefa`; tarefas aprovadas aparecem só pelo `status`.
- [~] Banco após migração: `db:reset` + `db:seed:demo` roda sem erro; sem teste automatizado.
- [~] Front após migração: kanban e calendário validados à mão; telas em mock não leem o banco.
- [~] Dashboard: KPIs do board validados à mão.
- [ ] Se aparecer um banco no modelo antigo (`etapa_atual INT`): script = para cada equipe, inserir 6 linhas em `equipe_etapa` e apontar `etapa_atual_id` para a de `numero = etapa_atual`. Não escrito porque não há esse banco.

---

## ⚙️ Z. RN-01 APÓS A MUDANÇA

- [x] Etapa padrão: funciona (comparação por `ordem`).
- [x] Etapa extra: funciona — mesma query; `ordem` inclui as extras.
- [x] Obrigatórias da extra: `tarefa.obrigatoria` + `equipe_etapa_id` da extra.
- [x] Opcionais não bloqueiam: filtro `tk.obrigatoria`.
- [x] Todas aprovadas → avança: `blockers = []`.
- [x] Pendente → não avança automaticamente: 409.
- [x] Mentor avança manualmente: `force`.
- [x] Quem: `movido_por`.
- [x] Data/hora: `movido_em`.

---

## 📌 CHECKLIST FINAL — 15 PONTOS CRÍTICOS

- [x] **1.** PESSOAS/CONTAS = `usuario` (+ `token_sessao`, `token_senha`). EQUIPES = `equipe`, `equipe_membro`, `equipe_mentor`. TAREFAS = `modelo_tarefa`, `tarefa`, `entrega`, `comentario_tarefa`, `lembrete`. JORNADA = `etapa`, `equipe_etapa`, `historico_etapa`. NOTIFICAÇÕES = `notificacao` (+ `auditoria`).
- [x] **2.** RN-01: `be/modules/teams/teams.service.ts → changeStage` (query em `teams.repository.ts → findPendingMandatoryTasks`).
- [x] **3.** Renomear coluna: 5 arquivos (schema, seed, 2 repositories, README). Renomear no contrato da API: +4 back, ~10 front.
- [x] **4.** Front só via `fe/lib/api.ts`; sem driver de banco; sem chamada externa.
- [x] **5.** Sim — README da raiz + do back. Faltam testes (não existem) e o README do front (padrão Next).
- [x] **6.** Conta nasce sem senha; token aleatório, só SHA-256 no banco; e-mail com link; validade em horas; uso único; senha definida em `/auth/reset-password`. **Front ainda não adaptado.**
- [x] **7.** `uq_equipe_um_lider ON equipe_membro (equipe_id) WHERE papel='LEADER' AND ativo`.
- [x] **8.** `entrega UNIQUE (tarefa_id, versao)`, só INSERT; comentário aponta para a versão avaliada.
- [x] **9.** Lembretes não enviados são recalculados por `dias_antes`; os no passado apagados; OVERDUE volta a PENDING se o novo prazo é futuro; auditoria guarda o prazo anterior.
- [x] **10.** Job a cada 15 min: grava OVERDUE (PENDING/IN_PROGRESS vencidas), envia lembretes vencidos, avisa atraso uma vez por tarefa/destinatário. **Sem retry de FAILED.**
- [x] **11.** `excluida_em`; nada é apagado; some de listagens, kanban e job; membros, tarefas, entregas, histórico e auditoria ficam.
- [x] **12.** `anotacao_mentor` só em rotas `authorize("ADMIN","MENTOR")`; nenhuma consulta de aluno faz JOIN com ela. (O banco em si não impede — quem impede é a API; o banco só não expõe view/consulta.)
- [x] **13.** Anonimiza `usuario`, apaga tokens, encerra vínculos, promove líder mais antigo ou exclui a equipe se era o único. **Ponto aberto:** e-mail em `notificacao.email_destino` e `auditoria.detalhes`.
- [x] **14.** `modelo_tarefa` (molde) → `tarefa` (cópia por equipe, `modelo_id`) → `entrega` (versões) → `comentario_tarefa` (por versão).
- [x] **15.** `etapa` (catálogo) + `equipe_etapa` (jornada da equipe; extras com `etapa_id NULL`, `ordem` DEFERRABLE) + `etapa_atual_id` UUID + histórico por `equipe_etapa` + RN-01 por `ordem`. Kanban mantém 6 colunas: extra cai na coluna da última padrão anterior. **Front em mock ainda assume 6.**

---

## O que falta (ordem sugerida)

1. **Front do cadastro (F):** tirar senha do formulário, chamar `POST /teams/register`, criar a página do link de primeiro acesso.
2. **Editar/remover etapa extra (W):** `PATCH/DELETE /teams/:id/stages/:stageId` + front.
3. **Retry de e-mail FAILED (T):** passo extra no `scheduler.ts` (`status='FAILED' AND tentativas < N`).
4. **Telas em mock → API:** tarefas, entregas, avaliação, anotações, detalhe da equipe; trocar `JourneyStage = 1..6` por `journey[]` da API.
5. **Testes (C, L, P):** RN-01 nos 3 cenários + 403 em `/notes` com token de aluno.
6. **Decisões pendentes:** `REJECTED` vencida vira OVERDUE? Limpar e-mail de `notificacao`/`auditoria` na LGPD? Endpoint de troca manual de líder? Etapa extra "obrigatória"?
7. README do front, upload físico (RNF-04), relatórios/CSV (RF-22 a RF-24), seed com `comentario_tarefa`.

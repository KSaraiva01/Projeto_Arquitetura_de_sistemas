# Banco de dados do InfoHub

PostgreSQL 13+. Dois arquivos, SQL puro, sem ORM e sem migrations:

| Arquivo | O que faz |
|---|---|
| `schema.sql` | Tipos, tabelas, relacionamentos, índices e dados iniciais (etapas, áreas, modelos de tarefa, admin). Feito para um banco **vazio**. |
| `seed_demo.sql` | Cenário de demonstração (6 equipes, tarefas, lembretes). Apaga as equipes existentes — só para desenvolvimento. |

```bash
# no servidor da faculdade (banco já criado pela infra):
psql -U <usuario> -h <servidor> -d <banco> -f database/schema.sql

# ou pelo back-end (cria o banco se faltar):
cd Projeto_Arquitetura_de_sistemas/infohub-backend && npm run db:setup
```

Login inicial: `admin@amf.edu.br` / `InfoHub@2026` — trocar no primeiro acesso.

## Modelo

```
usuario ──< equipe_membro >── equipe ──< equipe_etapa ──< tarefa ──< entrega
   │            (papel)          │        (jornada da      │       (versao)
   ├──< equipe_mentor >──────────┤         equipe)         ├──< comentario_tarefa
   ├──< token_sessao             ├──< historico_etapa      ├──< lembrete
   ├──< token_senha              ├──< anotacao_mentor      │
   └──< auditoria                └──> area_ideia           └──> modelo_tarefa ──> etapa
                                                                              (catálogo)
notificacao ──> usuario / equipe / tarefa / lembrete
```

**Contas** vivem em `usuario` (+ `token_sessao`, `token_senha`).
**Jornada** vive em `etapa` (catálogo das 6), `equipe_etapa` (a jornada de cada equipe, onde entram as extras), `equipe.etapa_atual_id` e `historico_etapa`.
**Tarefas** vivem em `modelo_tarefa` (molde), `tarefa` (instância), `entrega`, `comentario_tarefa` e `lembrete`.
**Notificações** vivem em `notificacao`.

Convenções: tabelas e colunas em português; valores de ENUM em inglês (`PENDING`, `APPROVED`…) porque são o contrato da API com o front. Regra de negócio fica no back-end (camada *service*); o banco garante só o estrutural (chaves, unicidade, FKs, CHECKs simples).

---

## Respostas às perguntas do professor

### A. Estrutura

| # | Pergunta | Resposta |
|---|---|---|
| 01 | Onde vivem contas, jornada, tarefas e notificações? | Ver "Modelo" acima. No back-end: `modules/auth` + `modules/users`, `modules/teams`, `modules/tasks`, `shared/mail` + `jobs/scheduler.ts`. |
| 02 | Onde mora a RN-01? | **No service**: `modules/teams/teams.service.ts → changeStage()`. Ela consulta `repository.findPendingMandatoryTasks()` e decide (409 `STAGE_REQUIREMENTS_PENDING` ou avança com `force`). O controller só traduz HTTP; o banco não tem função de regra. |
| 03 | Renomear um campo de tarefa: quantos arquivos mudam? | Dois: `database/schema.sql` e `modules/tasks/tasks.repository.ts` (interface `TaskRow` + SQL). O `tasks.service.ts` mapeia a linha para o DTO em camelCase, então o front não muda. |
| 04 | Front fala com o back só pela API? | Sim. O front (`infohub-frontend`) não tem driver de banco; tudo passa por `src/lib/api.ts` → `/api/*`. |
| 05 | Outra dupla assumiria pelo README? | `README.md` (raiz) + `infohub-backend/README.md`: pré-requisitos, `.env.example`, `npm run db:setup`, `npm run dev`, endpoints e deploy. |

### B. Banco × requisitos

| # | Pergunta | Como o banco (e o back) resolvem |
|---|---|---|
| 01 | RF-02: senha antes do 1º acesso | Não existe: `usuario.senha_hash` é **NULL**. O cadastro (`POST /teams/register`) grava um token em `token_senha` (`finalidade = FIRST_ACCESS`, 72 h) e envia o link por e-mail. Login com senha NULL responde 403 `PASSWORD_NOT_SET`. |
| 02 | Q1: dois líderes? nenhum? | Dois: índice único parcial `uq_equipe_um_lider ON equipe_membro (equipe_id) WHERE papel='LEADER' AND ativo`. Nenhum: o cadastro sempre cria o líder e não há endpoint para removê-lo; na exclusão LGPD do líder, o back promove o integrante mais antigo (`users.service.ts → anonymizeUser`). |
| 03 | RF-16: reenvio sobrescreve ou versiona? | Versiona: `entrega (tarefa_id, versao)` UNIQUE, cada reenvio é `MAX(versao)+1`. A versão 1 continua na tabela. |
| 04 | RF-17: mentor adia o prazo, e os lembretes? | `lembrete` guarda `dias_antes` além de `enviar_em`. `PATCH /tasks/:id` com `dueDate` novo recalcula `enviar_em` dos lembretes com `enviado_em IS NULL` (`tasks.repository.ts → rescheduleReminders`); os já enviados ficam como registro. |
| 05 | RN-04: calculada ou gravada por job? | **Gravada** por `jobs/scheduler.ts` (na subida e a cada `JOBS_INTERVAL_MINUTES`): `UPDATE tarefa SET status='OVERDUE' WHERE prazo < CURRENT_DATE AND status IN (PENDING, IN_PROGRESS)`. Motivo: o contador do dashboard vira um `COUNT` direto e o aviso de atraso tem um único momento de disparo. |
| 06 | Q4: apagar equipe apaga o quê? | Nada — exclusão **lógica**: `equipe.excluida_em` (+ `excluida_por`). As telas filtram `excluida_em IS NULL`. Os `ON DELETE CASCADE` (membros, jornada, tarefas, entregas, histórico, anotações) só valem para um `DELETE` físico feito na mão, como o do `seed_demo.sql`. |
| 07 | RF-10: anotação do mentor vazar? | Tabela separada `anotacao_mentor`, lida só por `GET/POST /teams/:id/notes` com `authorize("ADMIN","MENTOR")`. Nenhuma query do aluno faz JOIN com ela; o detalhe da equipe não a inclui. |
| 08 | RNF-02: aluno pede exclusão; e as entregas? | `DELETE /auth/me` (ou `DELETE /users/:id` pelo admin) **anonimiza** a linha de `usuario` (nome, e-mail, telefone, curso, senha apagados; `anonimizado_em`), encerra vínculos e sessões. As entregas ficam na equipe apontando para a linha anonimizada. Se era líder, outro sobe; se era o único, a equipe é excluída logicamente. |
| 09 | Q4: mesmo e-mail em duas equipes | **Uma** linha em `usuario` (índice único em `LOWER(email)`) e duas em `equipe_membro` (UNIQUE `(equipe_id, usuario_id)`). Q12: quem já tem conta entra direto. |
| 10 | RF-11: modelo e tarefa, uma ou duas tabelas? | Duas: `modelo_tarefa` (molde, ligado a `etapa` do catálogo) e `tarefa` (instância da equipe, ligada a `equipe_etapa`, com prazo e status). Mudar o molde não altera tarefas já criadas; `tarefa.modelo_id` guarda a origem. |
| 11 | RN-01 em palavras | "Existe tarefa desta equipe, com `obrigatoria = TRUE` e `status <> 'APPROVED'`, cuja etapa (`equipe_etapa.ordem`) está entre a etapa atual (inclusive) e a de destino (exclusive)?" Sim → bloqueia. O banco distingue obrigatória de opcional pela coluna `tarefa.obrigatoria`. |
| 12 | RF-08/09: quando passou, quem moveu, retrocesso | `historico_etapa`: `de_equipe_etapa_id`, `para_equipe_etapa_id`, `movido_por`, `movido_em`, `motivo`, `forcado`. Retroceder é só uma linha cujo destino tem `ordem` menor. |
| 13 | Q3: pitch é link, BMC é PDF — mesma tabela? | Mesma (`entrega`), com `tipo` FILE/LINK. Para LINK, `nome_arquivo`, `tamanho_bytes` e `tipo_mime` ficam NULL — garantido por um `CHECK`. |
| 14 | RF-15: três rodadas, comentários antigos sobrevivem? | Sim: `comentario_tarefa` é só INSERT, e `entrega_id` diz sobre qual versão cada comentário foi. |
| 15 | RF-18/19: não mandar o mesmo e-mail duas vezes | `notificacao` registra tudo antes de enviar. Índices únicos parciais: `(lembrete_id, destinatario_id)` e `(tarefa_id, destinatario_id) WHERE tipo='OVERDUE'`. O INSERT usa `ON CONFLICT DO NOTHING` — sem linha nova, sem e-mail. `lembrete.enviado_em` marca o lembrete como já disparado. |
| 16 | RF-06/22: JOINs do kanban; contador de atrasadas | Kanban: `equipe ⋈ area_ideia ⋈ equipe_etapa` (etapa atual) + LEFT JOIN do líder, mais subconsultas de contagem (`teams.repository.ts → TEAM_CARD_COLUMNS`). Atrasadas: `COUNT(*) WHERE status = 'OVERDUE'` direto, porque a RN-04 grava o status. |

### Mudança de requisito: etapas extras por equipe

| # | Pergunta | Resposta |
|---|---|---|
| 01 | O catálogo fixo sobrevive? | Sobrevive como **tabela** `etapa` (6 linhas), não como ENUM nem `CHECK 1–6`. Nada no schema limita a 6; o número 6 só aparece no back-end para validar o `toStage` que o kanban manda. |
| 02 | Onde vivem as extras e como ordenam? | Em `equipe_etapa`, com `etapa_id = NULL` e `ordem` dentro da jornada daquela equipe. `POST /teams/:id/stages { afterStage }` empurra as seguintes (`ordem + 1`); a unicidade `(equipe_id, ordem)` é `DEFERRABLE` para o UPDATE em lote passar. |
| 03 | Para onde `etapa_atual` aponta? Histórico faz sentido? | `equipe.etapa_atual_id → equipe_etapa.id` (linha da jornada da equipe, padrão ou extra). O histórico referencia `equipe_etapa` de/para, então continua valendo. No kanban, uma equipe em etapa extra aparece na coluna da última etapa padrão anterior. |
| 04 | Equipes já concluídas com 6 etapas: migração? | O deploy é em banco novo, então não há dados a migrar. Se houvesse: `INSERT INTO equipe_etapa SELECT equipe.id, etapa.id, nome, descricao, numero FROM equipe CROSS JOIN etapa` e `UPDATE equipe SET etapa_atual_id = (linha de ordem = journey_stage antigo)`. |
| 05 | RN-01 muda? | Não. Ela compara `equipe_etapa.ordem`, não o número da etapa, então tarefas obrigatórias de uma etapa extra bloqueiam o avanço do mesmo jeito. A RN-07 passou a olhar "última etapa da jornada **da equipe**" em vez de "etapa 6". |

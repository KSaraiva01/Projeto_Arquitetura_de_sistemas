# InfoHub → InovAMF

Sistema de Acompanhamento da Jornada do Empreendedor — Faculdade Antonio Meneghetti.

**Monolito** Node.js + TypeScript: uma API Express e o frontend Next.js rodando no **mesmo processo e na mesma porta**,
com PostgreSQL via Prisma (migrations versionadas). Deploy no Coolify (servidor interno da faculdade) com um `Dockerfile`.

> Branches: `main`/`info` = versão nova (monolito). Nas demais branches está a versão anterior de cada integrante do
> grupo (principal na `losekann`), de onde o frontend foi reaproveitado.

## Estrutura

```
├── backend/src/          API (Express 5) — porta única com o frontend
│   ├── server.ts         ponto de entrada: sobe Express + Next + rotina agendada
│   ├── app.ts            middlewares e montagem de /api
│   ├── routes.ts         índice das rotas
│   ├── config/           env (validado com Zod), locale do Zod
│   ├── lib/prisma.ts     Prisma Client (com o schema da faculdade travado)
│   ├── shared/           erros, auditoria, escopo (RNF-03), DTOs (enum DB ↔ API),
│   │                     middlewares (auth/JWT, validação, rate limit, erros),
│   │                     e-mail (templates + drivers), armazenamento de arquivos
│   ├── modules/          auth · usuarios · equipes · tarefas · notificacoes · catalogos · relatorios
│   │                     (cada um com routes / schemas (Zod) / service / dto)
│   ├── jobs/             rotina agendada (RN-04, lembretes, fila de e-mails)
│   └── generated/prisma  Prisma Client gerado (ignorado no git)
├── frontend/             Next.js 16 (App Router) — reaproveitado do projeto anterior
├── prisma/               schema.prisma · migrations/ · seed.ts
├── docs/                 banco-de-dados.md · api.md · lgpd.md
├── Dockerfile            imagem única para o Coolify
└── package.json          um só, para back e front
```

Como o código está organizado: **Router** (rota + validação Zod) → **Service** (regra de negócio, transações, auditoria,
enfileira e-mails) → **Prisma** (banco). O banco fala português (`equipes`, `tarefas`, `entregas`…); a API fala o
contrato que o frontend já consumia (inglês) — a tradução fica em `backend/src/shared/dto.ts` e nos `*.dto.ts`.

## Como rodar

Pré-requisitos: Node 22+ e um PostgreSQL (o da faculdade ou o local do `docker-compose.dev.yml`).

```bash
npm install
cp .env.example .env      # preencha DATABASE_URL (com ?schema=...), JWT_SECRET, SEED_*
npm run db:preparar       # cria o schema → aplica as migrations → seed (referência + cenário da G1)
npm run dev               # http://localhost:3000 — API em /api, frontend com HMR
```

Outros scripts: `npm run build` (Prisma + tsc + Next), `npm start` (`db:preparar` + servidor de produção — é o que o
container roda), `npm run typecheck`, `npm run jobs:run` (executa a rotina agendada uma vez), `npm run db:studio`,
`npm run db:migrate` (nova migration em dev), `npm run db:reset` (zera o schema, com confirmação),
`npm run db:recriar` (zera + migrations + seed, sem confirmação — ambos protegidos pelo `scripts/checar-schema.cjs`),
`npm run backup` e `npm run backup:restaurar` (ver [Backup](#backup-e-restauração-rnf-07)).

**Atenção:** o PostgreSQL da faculdade é compartilhado entre as duplas, cada uma no seu schema. Este projeto usa
`infohub_losekann`; nunca aponte a `DATABASE_URL` para o schema `public`. Detalhes em [docs/banco-de-dados.md](docs/banco-de-dados.md).

## E-mails (Resend)

Todo e-mail entra primeiro na fila `notificacoes` e sai em segundo plano (e pela rotina agendada). Com
`MAIL_DRIVER=resend` o envio usa o SDK oficial da Resend: cada e-mail leva a chave de idempotência `notificacao/<id>`
(repetir um envio nunca duplica o e-mail), o ID devolvido pela Resend fica em `notificacoes.id_mensagem_provedor`
e só falhas passageiras (rede, limite de envio, 5xx) voltam para a fila. Endereço inválido ou domínio não
verificado viram `FALHOU` na hora, com o motivo em `erro`.

1. Crie uma API key em [resend.com/api-keys](https://resend.com/api-keys) (permissão *Sending access*) → `RESEND_API_KEY`.
2. Verifique um domínio em [resend.com/domains](https://resend.com/domains) e use-o no remetente:
   `MAIL_FROM="InfoHub <nao-responda@seu-dominio.com>"`. Sem domínio próprio, `MAIL_FROM="InfoHub <onboarding@resend.dev>"`
   serve só para testes: a Resend entrega apenas para o e-mail dono da conta.
3. `MAIL_DRIVER=resend` e `APP_URL` com a URL pública — é ela que vai nos links dos e-mails.

**Validação do e-mail.** O líder cria a senha no cadastro, mas só entra depois de abrir o link de confirmação
(`/confirmar-email?token=…`, válido por `ACTIVATION_EXPIRES_IN_HOURS`); até lá o login responde `EMAIL_NOT_CONFIRMED`
e a tela oferece reenviar o link. Integrantes, mentores e admins confirmam o e-mail ao criar a senha pelo link de
ativação (`/definir-senha?token=…`), onde também aceitam a política de privacidade. Contas que já existiam antes dessa
regra (e as do seed) contam como confirmadas.

**Sem e-mail configurado** (`MAIL_DRIVER=console`, o link só aparece no log do container): em *Usuários* a coordenação
reenvia o link de acesso ou confirma o e-mail de quem já criou a senha — dá para demonstrar o cadastro de uma ideia
ao vivo sem depender do e-mail. Os links de ativação e recuperação continuam só no log.

## Backup e restauração (RNF-07)

Com `BACKUP_ENABLED=true` (padrão no Dockerfile), a rotina agendada grava a cada `BACKUP_INTERVAL_HOURS` (24 h) um
backup lógico do schema — todas as tabelas, lidas numa única transação — em `BACKUP_DIR/infohub-<schema>-<data>.json.gz`,
espelha os arquivos das entregas em `BACKUP_DIR/uploads` e guarda os `BACKUP_KEEP` (14) mais recentes. Não depende de
`pg_dump` nem de acesso ao servidor do banco da faculdade.

```bash
npm run backup                                    # gera um backup agora
npm run backup:restaurar                          # lista os backups disponíveis
npm run backup:restaurar -- ultimo                # mostra o que seria restaurado (não altera nada)
npm run backup:restaurar -- ultimo --confirmar    # substitui o conteúdo do schema pelo do backup
```

A restauração roda em uma transação (ou volta tudo, ou nada muda), exige que o banco esteja com as mesmas migrations do
backup e recupera os arquivos de entrega que faltarem. No Coolify, rode pelo *Terminal* do container. Os backups
contêm dados pessoais: o volume `/app/backups` não pode ser público (ver [docs/lgpd.md](docs/lgpd.md)).

## G1 — o que é avaliado e como o projeto atende

| Requisito de entrega (slide "G1: o que será avaliado")                     | Como está aqui |
| ------------------------------------------------------------------------- | -------------- |
| Aplicação no ar no Coolify com **um único resource** (front + back juntos) | Um `Dockerfile`, um processo, uma porta: Express serve `/api` e o Next.js serve as páginas ([backend/src/server.ts](backend/src/server.ts)). |
| Conectada ao **banco do professor, no schema da dupla**                    | `DATABASE_URL=...@192.168.49.161:5432/postgres?schema=infohub_losekann`. O schema é criado se não existir e nada toca o `public`. |
| **Seed obrigatório no deploy** (cria schema, tabelas e inserts)            | `npm start` → `db:preparar`: `scripts/criar-schema.cjs` (schema) → `prisma migrate deploy` (tabelas) → `prisma/seed.ts` (inserts). Roda em todo deploy; é idempotente. |

Cenário montado pelo seed, exatamente como pedido:

| Pedido                                                          | No seed |
| --------------------------------------------------------------- | ------- |
| 3 equipes com ao menos 3 integrantes, 1 líder por equipe        | **EcoTrack** (3, líder Lucas), **MedConnect** (3, líder Mariana), **AgroSense** (4, líder Pedro). |
| 1 administrador e 4 mentores; um atende 2 equipes, outro a 3ª   | Admin (`SEED_ADMIN_*`); **Ana** → EcoTrack e MedConnect; **Ricardo** → AgroSense; **Paula** e **Marcos** sem equipe (para o admin atribuir ao vivo). |
| 2 equipes com a Etapa 1 aprovada, cursando a Etapa 2            | EcoTrack e MedConnect: "Cadastro da ideia" entregue (PDF real) e aprovado, histórico 1 → 2 feito pela mentora. |
| 1 equipe com tarefa de prazo atrasado                           | MedConnect: "Confirmar agendamento do 1º encontro" venceu há 4 dias → `ATRASADA`, com os e-mails de aviso registrados. |

E a AgroSense está na Etapa 1 com o formulário **entregue, aguardando avaliação** — dá para mostrar ao vivo a RN-01:
tentar avançar (bloqueia), aprovar a entrega e então avançar para a Etapa 2.

Credenciais: admin `admin@infohub.amf.edu.br` / `Admin@123`; mentores `ana@amf.edu.br`, `ricardo@amf.edu.br`,
`paula@amf.edu.br`, `marcos@amf.edu.br` / `Mentor@123`; alunos `lucas@aluno.amf.edu.br` (líder EcoTrack),
`mariana@aluno.amf.edu.br` (líder MedConnect), `pedro@aluno.amf.edu.br` (líder AgroSense), `fernanda@aluno.amf.edu.br`
(integrante) etc. / `Aluno@123`.

## Deploy no Coolify

Um único resource (Application), apontando para este repositório na branch `info`:

| Aba / campo                                   | Valor |
| --------------------------------------------- | ----- |
| Build pipeline → **Build strategy**           | **Dockerfile** (não Railpack/Nixpacks: o `Dockerfile` já faz o build do back e do front, define usuário, fuso e health check). Dockerfile location: `/Dockerfile`. |
| Install / Build / Start command               | Vazios — vêm do Dockerfile (`CMD npm start`). **Não** use `npm run dev` em produção. |
| Pre-deployment / Post-deployment              | Vazios. Migrations e seed já rodam dentro do `npm start`; não repita aqui. (Um `npx prisma db:seed` nesse campo falha com `Unknown command "db:seed"`: `db:seed` é o nome do script npm, e o comando do Prisma é `prisma db seed`.) |
| Networking → **Ports exposes**                | `3000` (porta interna do container, a mesma do Dockerfile). Se o acesso for por IP:porta em vez de domínio, acrescente um *Port mapping* `<porta externa>:3000`, ex.: `3008:3000`. |
| Environment variables                         | `DATABASE_URL` (com `?schema=infohub_losekann`), `JWT_SECRET` (aleatório, ≥ 32 caracteres), `APP_URL` (URL pública — vai nos links dos e-mails), `SEED_ADMIN_NOME/EMAIL/SENHA`, `MAIL_DRIVER` (`resend` + `RESEND_API_KEY` + `MAIL_FROM` — ver [E-mails](#e-mails-resend); `console` só imprime no log e **ninguém recebe e-mail**). `NODE_ENV`, `PORT`, `HOST`, `UPLOADS_DIR`, `BACKUP_ENABLED`, `BACKUP_DIR` e `TZ` já vêm do Dockerfile; `RETENTION_*` e `BACKUP_*` têm padrões (ver `.env.example`). |
| Storages                                      | **Volume Mount** com destino `/app/uploads` (arquivos das entregas — inclusive os PDFs do cenário) e outro com destino `/app/backups` (backups diários — sem ele, somem a cada deploy). |
| Healthchecks (opcional)                       | `GET /api/health` na porta `3000`. A imagem já traz um `HEALTHCHECK` equivalente. |

O container roda `npm start`: cria o schema (se preciso), aplica as migrations pendentes, roda o seed e sobe o servidor.
Nada manual. Um redeploy **não** zera o que foi mexido na demonstração (o seed vê que o cenário existe e o mantém).

Para **voltar ao cenário inicial da G1** (ou trocar dados antigos do schema pelo cenário), no *Terminal* do container
no Coolify — ou na sua máquina, na rede da faculdade:

```bash
npm run db:recriar      # zera o schema da dupla, reaplica as migrations e roda o seed (sem perguntar)
```

## Documentação

- [docs/banco-de-dados.md](docs/banco-de-dados.md) — tabelas, regras de negócio (onde cada uma é garantida), fluxos e seeds.
- [docs/api.md](docs/api.md) — todos os endpoints, formatos de resposta e o que mudou em relação ao frontend antigo.
- [docs/lgpd.md](docs/lgpd.md) — dados tratados, consentimento, retenção e exclusão (RNF-02); a versão para o usuário
  está na página `/privacidade`.

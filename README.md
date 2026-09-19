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
├── docs/                 banco-de-dados.md · api.md
├── Dockerfile            imagem única para o Coolify
└── package.json          um só, para back e front
```

Como o código está organizado: **Router** (rota + validação Zod) → **Service** (regra de negócio, transações, auditoria,
enfileira e-mails) → **Prisma** (banco). O banco fala português (`equipes`, `tarefas`, `entregas`…); a API fala o
contrato que o frontend já consumia (inglês) — a tradução fica em `backend/src/shared/dto.ts` e nos `*.dto.ts`.

## Como rodar

Pré-requisitos: Node 20+ e um PostgreSQL (o da faculdade ou o local do `docker-compose.dev.yml`).

```bash
npm install
cp .env.example .env      # preencha DATABASE_URL (com ?schema=...), JWT_SECRET, SEED_*
npm run db:deploy         # aplica as migrations no schema
npm run db:seed           # cursos, áreas, etapas, modelos, admin (+ demo com SEED_DEMO=true)
npm run dev               # http://localhost:3000 — API em /api, frontend com HMR
```

Outros scripts: `npm run build` (Prisma + tsc + Next), `npm start` (`migrate deploy` + servidor de produção),
`npm run typecheck`, `npm run jobs:run` (executa a rotina agendada uma vez), `npm run db:studio`, `npm run db:migrate`
(nova migration em dev), `npm run db:reset` (zera o schema — protegido pelo `scripts/checar-schema.cjs`).

Credenciais da demonstração (`SEED_DEMO=true`): admin `admin@infohub.amf.edu.br` / `Admin@123`; mentores
`ana@amf.edu.br` e `ricardo@amf.edu.br` / `Mentor@123`; alunos `lucas@aluno.amf.edu.br` (líder da EcoTrack),
`fernanda@aluno.amf.edu.br` (integrante) etc. / `Aluno@123`.

**Atenção:** o PostgreSQL da faculdade é compartilhado entre as duplas, cada uma no seu schema. Este projeto usa
`infohub_losekann`; nunca aponte a `DATABASE_URL` para o schema `public`. Detalhes em [docs/banco-de-dados.md](docs/banco-de-dados.md).

## Deploy no Coolify

1. Novo recurso → repositório Git deste projeto, branch da versão nova, build pack **Dockerfile**.
2. Porta `3000`; health check `GET /api/health`.
3. Variáveis de ambiente (ver `.env.example`): `DATABASE_URL` (com `?schema=infohub_losekann`), `JWT_SECRET` (aleatório,
   ≥ 32 caracteres), `APP_URL` (URL pública, usada nos links dos e-mails), `MAIL_DRIVER=smtp` + `SMTP_*` (ou `resend` +
   `RESEND_API_KEY`), `SEED_ADMIN_*`.
4. Volume persistente montado em `/app/uploads` (arquivos das entregas).
5. O container roda `npm start`: aplica as migrations pendentes e sobe o servidor. Na primeira vez, rode o seed
   (`npm run db:seed` no terminal do container) para criar cursos, áreas, etapas, modelos e o admin.

## Documentação

- [docs/banco-de-dados.md](docs/banco-de-dados.md) — tabelas, regras de negócio (onde cada uma é garantida), fluxos e seeds.
- [docs/api.md](docs/api.md) — todos os endpoints, formatos de resposta e o que mudou em relação ao frontend antigo.

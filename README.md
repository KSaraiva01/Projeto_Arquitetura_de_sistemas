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

Pré-requisitos: Node 22+ e um PostgreSQL (o da faculdade ou o local do `docker-compose.dev.yml`).

```bash
npm install
cp .env.example .env      # preencha DATABASE_URL (com ?schema=...), JWT_SECRET, SEED_*
npm run db:preparar       # cria o schema → aplica as migrations → seed (referência + cenário da G1)
npm run dev               # http://localhost:3000 — API em /api, frontend com HMR
```

Outros scripts: `npm run build` (Prisma + tsc + Next), `npm start` (`db:preparar` + servidor de produção — é o que o
container roda), `npm run typecheck`, `npm run jobs:run` (executa a rotina agendada uma vez), `npm run db:studio`,
`npm run db:migrate` (nova migration em dev), `npm run db:reset` (zera o schema — protegido pelo
`scripts/checar-schema.cjs`; depois `npm run db:seed` recria o cenário).

**Atenção:** o PostgreSQL da faculdade é compartilhado entre as duplas, cada uma no seu schema. Este projeto usa
`infohub_losekann`; nunca aponte a `DATABASE_URL` para o schema `public`. Detalhes em [docs/banco-de-dados.md](docs/banco-de-dados.md).

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
| Pre-deployment / Post-deployment              | Vazios. Migrations e seed já rodam dentro do `npm start`; não repita aqui. |
| Networking → **Ports exposes**                | `3000` (porta interna do container, a mesma do Dockerfile). Se o acesso for por IP:porta em vez de domínio, acrescente um *Port mapping* `<porta externa>:3000`, ex.: `3008:3000`. |
| Environment variables                         | `DATABASE_URL` (com `?schema=infohub_losekann`), `JWT_SECRET` (aleatório, ≥ 32 caracteres), `APP_URL` (URL pública — vai nos links dos e-mails), `SEED_ADMIN_NOME/EMAIL/SENHA`, `MAIL_DRIVER` (`console` se não houver SMTP; senão `smtp` + `SMTP_*`). `NODE_ENV`, `PORT`, `HOST`, `UPLOADS_DIR` e `TZ` já vêm do Dockerfile. |
| Storages                                      | **Volume Mount** com destino `/app/uploads` (arquivos das entregas — inclusive os PDFs do cenário). |
| Healthchecks (opcional)                       | `GET /api/health` na porta `3000`. A imagem já traz um `HEALTHCHECK` equivalente. |

O container roda `npm start`: cria o schema (se preciso), aplica as migrations pendentes, roda o seed e sobe o servidor.
Nada manual. Um redeploy **não** zera o que foi mexido na demonstração (o seed vê que o cenário existe e o mantém);
para voltar ao cenário inicial, `npm run db:reset` e `npm run db:seed` no terminal do container.

## Documentação

- [docs/banco-de-dados.md](docs/banco-de-dados.md) — tabelas, regras de negócio (onde cada uma é garantida), fluxos e seeds.
- [docs/api.md](docs/api.md) — todos os endpoints, formatos de resposta e o que mudou em relação ao frontend antigo.

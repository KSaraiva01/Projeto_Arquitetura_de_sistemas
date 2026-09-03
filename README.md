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

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- React 19 + TypeScript
- Tailwind CSS 4
- [lucide-react](https://lucide.dev) para ícones

## Estrutura

```
infohub-frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx            # Landing page + login (seleção de perfil)
│   │   ├── cadastro/           # Formulário de inscrição da ideia
│   │   ├── admin/              # Painel do administrador (dashboard, equipes, tarefas, relatórios)
│   │   ├── mentor/             # Painel do mentor (dashboard, equipes, tarefas)
│   │   ├── aluno/               # Área do aluno líder (jornada, tarefas)
│   │   └── integrante/         # Área do integrante de equipe (jornada, tarefas)
│   ├── components/             # Sidebar, Header, TeamDetail, StagePipeline, StatusBadge, etc.
│   └── lib/
│       ├── types.ts             # Tipos do domínio (Team, Task, TaskTemplate, etc.)
│       └── mock-data.ts         # Dados mock (equipes, tarefas, cursos, modelos de tarefa)
```

## Como rodar localmente

```bash
cd infohub-frontend
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Status atual

Este repositório contém o **frontend** do InfoHub, funcionando como protótipo navegável sobre dados mock (`src/lib/mock-data.ts`). As interações (criar tarefa, aprovar entrega, avançar etapa, etc.) atualizam apenas o estado local da página — não há persistência entre recarregamentos.

**Ainda não implementado** (fora do escopo deste repositório até o momento):
- Backend/API e banco de dados conectado (existe um schema PostgreSQL desenhado no repositório principal do projeto)
- Autenticação real (login, recuperação de senha, hash de senha)
- Envio de e-mails transacionais (lembretes e notificações automáticas)
- Upload e armazenamento real de arquivos
- Exportação de relatórios (CSV/Excel)

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm run start` | Roda o build de produção |
| `npm run lint` | Executa o ESLint |

-- CreateEnum
CREATE TYPE "perfil" AS ENUM ('ADMIN', 'MENTOR', 'ALUNO');

-- CreateEnum
CREATE TYPE "estagio_ideia" AS ENUM ('APENAS_IDEIA', 'PROTOTIPO', 'MVP_EM_DESENVOLVIMENTO', 'MVP_PRONTO');

-- CreateEnum
CREATE TYPE "status_jornada" AS ENUM ('EM_ANDAMENTO', 'PRONTA_INOVAMF', 'ENCAMINHADA');

-- CreateEnum
CREATE TYPE "status_tarefa" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'ENTREGUE', 'ATRASADA', 'APROVADA', 'REPROVADA');

-- CreateEnum
CREATE TYPE "decisao_avaliacao" AS ENUM ('APROVADA', 'REPROVADA');

-- CreateEnum
CREATE TYPE "direcao_mudanca_etapa" AS ENUM ('INICIO', 'AVANCO', 'RETROCESSO');

-- CreateEnum
CREATE TYPE "tipo_anexo" AS ENUM ('ARQUIVO', 'LINK');

-- CreateEnum
CREATE TYPE "tipo_token" AS ENUM ('ATIVACAO_CONTA', 'RECUPERACAO_SENHA');

-- CreateEnum
CREATE TYPE "tipo_notificacao" AS ENUM ('NOVO_CADASTRO', 'NOVA_TAREFA', 'PRAZO_PROXIMO', 'PRAZO_VENCIDO', 'TAREFA_ATRASADA', 'ENTREGA_RECEBIDA', 'ENTREGA_AVALIADA', 'LEMBRETE_MANUAL', 'ATIVACAO_CONTA', 'RECUPERACAO_SENHA');

-- CreateEnum
CREATE TYPE "status_notificacao" AS ENUM ('PENDENTE', 'ENVIADA', 'FALHOU');

-- CreateTable
CREATE TABLE "cursos" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas_ideia" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_ideia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "senha_hash" VARCHAR(255),
    "perfil" "perfil" NOT NULL,
    "telefone" VARCHAR(30),
    "curso_id" UUID,
    "semestre" SMALLINT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "consentimento_lgpd_em" TIMESTAMPTZ(6),
    "excluido_em" TIMESTAMPTZ(6),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_usuario" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "tipo" "tipo_token" NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "usado_em" TIMESTAMPTZ(6),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "revogada_em" TIMESTAMPTZ(6),
    "user_agent" VARCHAR(255),
    "ip" VARCHAR(45),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipes" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "descricao" TEXT NOT NULL,
    "area_id" UUID NOT NULL,
    "estagio_ideia" "estagio_ideia" NOT NULL,
    "como_conheceu" VARCHAR(120),
    "periodo_ingresso" VARCHAR(10) NOT NULL,
    "lider_id" UUID NOT NULL,
    "etapa_atual_id" UUID,
    "status_jornada" "status_jornada" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "pronta_em" TIMESTAMPTZ(6),
    "encaminhada_em" TIMESTAMPTZ(6),
    "excluida_em" TIMESTAMPTZ(6),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "equipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrantes_equipe" (
    "id" UUID NOT NULL,
    "equipe_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "entrou_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saiu_em" TIMESTAMPTZ(6),

    CONSTRAINT "integrantes_equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentores_equipe" (
    "id" UUID NOT NULL,
    "equipe_id" UUID NOT NULL,
    "mentor_id" UUID NOT NULL,
    "atribuido_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentores_equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas_padrao" (
    "id" UUID NOT NULL,
    "numero" SMALLINT NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "descricao" TEXT NOT NULL,
    "entregavel" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etapas_padrao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas_equipe" (
    "id" UUID NOT NULL,
    "equipe_id" UUID NOT NULL,
    "ordem" SMALLINT NOT NULL,
    "etapa_padrao_id" UUID,
    "nome" VARCHAR(120) NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etapas_equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_etapas" (
    "id" UUID NOT NULL,
    "equipe_id" UUID NOT NULL,
    "de_etapa_id" UUID,
    "para_etapa_id" UUID NOT NULL,
    "direcao" "direcao_mudanca_etapa" NOT NULL,
    "motivo" TEXT,
    "forcado" BOOLEAN NOT NULL DEFAULT false,
    "alterado_por_id" UUID,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelos_tarefa" (
    "id" UUID NOT NULL,
    "etapa_padrao_id" UUID NOT NULL,
    "titulo" VARCHAR(160) NOT NULL,
    "descricao" TEXT,
    "obrigatoria" BOOLEAN NOT NULL DEFAULT true,
    "ordem" SMALLINT NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "modelos_tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefas" (
    "id" UUID NOT NULL,
    "equipe_id" UUID NOT NULL,
    "etapa_equipe_id" UUID NOT NULL,
    "modelo_tarefa_id" UUID,
    "titulo" VARCHAR(160) NOT NULL,
    "descricao" TEXT,
    "prazo" TIMESTAMPTZ(6) NOT NULL,
    "status" "status_tarefa" NOT NULL DEFAULT 'PENDENTE',
    "obrigatoria" BOOLEAN NOT NULL DEFAULT true,
    "criado_por_id" UUID,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" UUID NOT NULL,
    "tarefa_id" UUID NOT NULL,
    "versao" SMALLINT NOT NULL,
    "enviado_por_id" UUID,
    "observacao" TEXT,
    "enviado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos_entrega" (
    "id" UUID NOT NULL,
    "entrega_id" UUID NOT NULL,
    "tipo" "tipo_anexo" NOT NULL,
    "nome_original" VARCHAR(255) NOT NULL,
    "caminho_armazenamento" VARCHAR(500),
    "url" VARCHAR(1000),
    "tamanho_bytes" INTEGER,
    "mime_type" VARCHAR(120),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios_tarefa" (
    "id" UUID NOT NULL,
    "tarefa_id" UUID NOT NULL,
    "entrega_id" UUID,
    "autor_id" UUID,
    "decisao" "decisao_avaliacao",
    "conteudo" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lembretes_tarefa" (
    "id" UUID NOT NULL,
    "tarefa_id" UUID NOT NULL,
    "dias_antes" SMALLINT,
    "lembrar_em" TIMESTAMPTZ(6) NOT NULL,
    "enviado_em" TIMESTAMPTZ(6),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lembretes_tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" UUID NOT NULL,
    "tipo" "tipo_notificacao" NOT NULL,
    "destinatario_id" UUID,
    "email_destino" VARCHAR(160) NOT NULL,
    "assunto" VARCHAR(255) NOT NULL,
    "corpo" TEXT NOT NULL,
    "chave_idempotencia" VARCHAR(255),
    "status" "status_notificacao" NOT NULL DEFAULT 'PENDENTE',
    "tentativas" SMALLINT NOT NULL DEFAULT 0,
    "proximo_envio_em" TIMESTAMPTZ(6),
    "enviada_em" TIMESTAMPTZ(6),
    "erro" TEXT,
    "equipe_id" UUID,
    "tarefa_id" UUID,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferencias_notificacao" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "tipo" "tipo_notificacao" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "preferencias_notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anotacoes_mentoria" (
    "id" UUID NOT NULL,
    "equipe_id" UUID NOT NULL,
    "autor_id" UUID,
    "conteudo" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "anotacoes_mentoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_auditoria" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "acao" VARCHAR(80) NOT NULL,
    "entidade" VARCHAR(60) NOT NULL,
    "entidade_id" UUID,
    "detalhes" JSONB,
    "ip" VARCHAR(45),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cursos_nome_key" ON "cursos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "areas_ideia_nome_key" ON "areas_ideia"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_perfil_idx" ON "usuarios"("perfil");

-- CreateIndex
CREATE INDEX "usuarios_curso_id_idx" ON "usuarios"("curso_id");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_usuario_token_hash_key" ON "tokens_usuario"("token_hash");

-- CreateIndex
CREATE INDEX "tokens_usuario_usuario_id_tipo_idx" ON "tokens_usuario"("usuario_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_refresh_token_hash_key" ON "sessoes"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessoes_usuario_id_idx" ON "sessoes"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipes_etapa_atual_id_key" ON "equipes"("etapa_atual_id");

-- CreateIndex
CREATE INDEX "equipes_status_jornada_idx" ON "equipes"("status_jornada");

-- CreateIndex
CREATE INDEX "equipes_periodo_ingresso_idx" ON "equipes"("periodo_ingresso");

-- CreateIndex
CREATE INDEX "equipes_area_id_idx" ON "equipes"("area_id");

-- CreateIndex
CREATE INDEX "equipes_lider_id_idx" ON "equipes"("lider_id");

-- CreateIndex
CREATE INDEX "equipes_excluida_em_idx" ON "equipes"("excluida_em");

-- CreateIndex
CREATE INDEX "integrantes_equipe_usuario_id_idx" ON "integrantes_equipe"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "integrantes_equipe_equipe_id_usuario_id_key" ON "integrantes_equipe"("equipe_id", "usuario_id");

-- CreateIndex
CREATE INDEX "mentores_equipe_mentor_id_idx" ON "mentores_equipe"("mentor_id");

-- CreateIndex
CREATE UNIQUE INDEX "mentores_equipe_equipe_id_mentor_id_key" ON "mentores_equipe"("equipe_id", "mentor_id");

-- CreateIndex
CREATE UNIQUE INDEX "etapas_padrao_numero_key" ON "etapas_padrao"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "etapas_equipe_equipe_id_ordem_key" ON "etapas_equipe"("equipe_id", "ordem");

-- CreateIndex
CREATE INDEX "historico_etapas_equipe_id_criado_em_idx" ON "historico_etapas"("equipe_id", "criado_em");

-- CreateIndex
CREATE INDEX "modelos_tarefa_etapa_padrao_id_idx" ON "modelos_tarefa"("etapa_padrao_id");

-- CreateIndex
CREATE INDEX "tarefas_equipe_id_idx" ON "tarefas"("equipe_id");

-- CreateIndex
CREATE INDEX "tarefas_etapa_equipe_id_idx" ON "tarefas"("etapa_equipe_id");

-- CreateIndex
CREATE INDEX "tarefas_status_prazo_idx" ON "tarefas"("status", "prazo");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_tarefa_id_versao_key" ON "entregas"("tarefa_id", "versao");

-- CreateIndex
CREATE INDEX "anexos_entrega_entrega_id_idx" ON "anexos_entrega"("entrega_id");

-- CreateIndex
CREATE INDEX "comentarios_tarefa_tarefa_id_criado_em_idx" ON "comentarios_tarefa"("tarefa_id", "criado_em");

-- CreateIndex
CREATE INDEX "lembretes_tarefa_tarefa_id_idx" ON "lembretes_tarefa"("tarefa_id");

-- CreateIndex
CREATE INDEX "lembretes_tarefa_enviado_em_lembrar_em_idx" ON "lembretes_tarefa"("enviado_em", "lembrar_em");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_chave_idempotencia_key" ON "notificacoes"("chave_idempotencia");

-- CreateIndex
CREATE INDEX "notificacoes_status_proximo_envio_em_idx" ON "notificacoes"("status", "proximo_envio_em");

-- CreateIndex
CREATE INDEX "notificacoes_destinatario_id_idx" ON "notificacoes"("destinatario_id");

-- CreateIndex
CREATE INDEX "notificacoes_equipe_id_idx" ON "notificacoes"("equipe_id");

-- CreateIndex
CREATE INDEX "notificacoes_tarefa_id_idx" ON "notificacoes"("tarefa_id");

-- CreateIndex
CREATE UNIQUE INDEX "preferencias_notificacao_usuario_id_tipo_key" ON "preferencias_notificacao"("usuario_id", "tipo");

-- CreateIndex
CREATE INDEX "anotacoes_mentoria_equipe_id_criado_em_idx" ON "anotacoes_mentoria"("equipe_id", "criado_em");

-- CreateIndex
CREATE INDEX "registros_auditoria_entidade_entidade_id_idx" ON "registros_auditoria"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "registros_auditoria_usuario_id_idx" ON "registros_auditoria"("usuario_id");

-- CreateIndex
CREATE INDEX "registros_auditoria_criado_em_idx" ON "registros_auditoria"("criado_em");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_usuario" ADD CONSTRAINT "tokens_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas_ideia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_lider_id_fkey" FOREIGN KEY ("lider_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_etapa_atual_id_fkey" FOREIGN KEY ("etapa_atual_id") REFERENCES "etapas_equipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrantes_equipe" ADD CONSTRAINT "integrantes_equipe_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrantes_equipe" ADD CONSTRAINT "integrantes_equipe_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentores_equipe" ADD CONSTRAINT "mentores_equipe_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentores_equipe" ADD CONSTRAINT "mentores_equipe_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas_equipe" ADD CONSTRAINT "etapas_equipe_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas_equipe" ADD CONSTRAINT "etapas_equipe_etapa_padrao_id_fkey" FOREIGN KEY ("etapa_padrao_id") REFERENCES "etapas_padrao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_etapas" ADD CONSTRAINT "historico_etapas_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_etapas" ADD CONSTRAINT "historico_etapas_de_etapa_id_fkey" FOREIGN KEY ("de_etapa_id") REFERENCES "etapas_equipe"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_etapas" ADD CONSTRAINT "historico_etapas_para_etapa_id_fkey" FOREIGN KEY ("para_etapa_id") REFERENCES "etapas_equipe"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_etapas" ADD CONSTRAINT "historico_etapas_alterado_por_id_fkey" FOREIGN KEY ("alterado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelos_tarefa" ADD CONSTRAINT "modelos_tarefa_etapa_padrao_id_fkey" FOREIGN KEY ("etapa_padrao_id") REFERENCES "etapas_padrao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_etapa_equipe_id_fkey" FOREIGN KEY ("etapa_equipe_id") REFERENCES "etapas_equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_modelo_tarefa_id_fkey" FOREIGN KEY ("modelo_tarefa_id") REFERENCES "modelos_tarefa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos_entrega" ADD CONSTRAINT "anexos_entrega_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_tarefa" ADD CONSTRAINT "comentarios_tarefa_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_tarefa" ADD CONSTRAINT "comentarios_tarefa_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios_tarefa" ADD CONSTRAINT "comentarios_tarefa_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lembretes_tarefa" ADD CONSTRAINT "lembretes_tarefa_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencias_notificacao" ADD CONSTRAINT "preferencias_notificacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anotacoes_mentoria" ADD CONSTRAINT "anotacoes_mentoria_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anotacoes_mentoria" ADD CONSTRAINT "anotacoes_mentoria_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_auditoria" ADD CONSTRAINT "registros_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;


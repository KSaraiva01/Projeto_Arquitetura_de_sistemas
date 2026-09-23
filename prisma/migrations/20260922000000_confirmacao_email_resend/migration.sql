-- AlterEnum
ALTER TYPE "tipo_token" ADD VALUE 'CONFIRMACAO_EMAIL';

-- AlterEnum
ALTER TYPE "tipo_notificacao" ADD VALUE 'CONFIRMACAO_EMAIL';

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "email_confirmado_em" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "notificacoes" ADD COLUMN     "id_mensagem_provedor" VARCHAR(255);

-- Contas que já tinham senha continuam entrando: valem como e-mail confirmado
-- desde a criação. As que ainda não têm senha confirmam ao usar o link de ativação.
UPDATE "usuarios" SET "email_confirmado_em" = "criado_em" WHERE "senha_hash" IS NOT NULL;

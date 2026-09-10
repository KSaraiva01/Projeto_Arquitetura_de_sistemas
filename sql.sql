-- =====================================================================================
--  INFOHUB → INOVAMF
--  Sistema de Acompanhamento da Jornada do Empreendedor
--  Faculdade Antonio Meneghetti
--
--  SCRIPT SQL COMPLETO E CONSOLIDADO (PostgreSQL 14+)
--  Gerado a partir da análise do front-end (Next.js/React/TypeScript) e do
--  back-end (Node.js + Express + "pg", SQL puro, sem ORM) do projeto.
--
--  Este arquivo reúne em um único lugar:
--    1) Extensões e tipos enumerados (ENUM)
--    2) Funções e gatilhos (triggers) utilitários e de regra de negócio
--    3) Tabelas, com comentários indicando o requisito atendido (RF/RN/RNF)
--    4) Índices de apoio às consultas mais usadas pelo front-end
--    5) Views de apoio a relatórios e telas (kanban, calendário, dashboard)
--    6) Funções de regra de negócio (RN-01 e RN-04) expostas como funções SQL
--    7) Dados iniciais (seed): áreas da ideia, modelos de tarefa e admin
--
--  Referências de requisitos encontradas no código (comentários originais das
--  migrations e dos services em infohub-backend/src):
--    RF-01  Login, sessão e recuperação de senha
--    RF-02  Cadastro da ideia (formulário inicial)
--    RF-03  Cadastro/gestão de contas de ADMIN e MENTOR
--    RF-04  Áreas/categorias da ideia no formulário inicial
--    RF-05  Cadastro cria a equipe (ideia em avaliação)
--    RF-06  Kanban do funil de 6 etapas
--    RF-07  Detalhe/consulta de equipe
--    RF-08  Histórico de etapas concluídas na página da equipe
--    RF-09  Mover equipe entre etapas (arrastar e soltar no kanban)
--    RF-10  Anotações internas do mentor (nunca visíveis ao aluno)
--    RF-11  Modelos de tarefa pré-configurados por etapa
--    RF-12  Criação de tarefas (avulsas ou a partir de modelo) com prazo
--    RF-13  Consulta de tarefas e calendário
--    RF-14  Envio de entregáveis (arquivo ou link)
--    RF-15  Aprovar entrega / solicitar ajustes (feedback)
--    RF-16  Reenvio de entrega gera nova versão
--    RF-17  Lembretes automáticos por tarefa
--    RF-18  Fila/log de envio de e-mails
--    RF-19  Notificação de novo cadastro/nova tarefa
--    RF-20  Notificação de atraso/aprovação/rejeição
--    RF-22  Relatórios consolidados para a coordenação
--    RF-23  Exportação de relatórios (CSV/Excel)
--    RF-24  Painel de acompanhamento de todas as equipes
--
--    RN-01  Tarefa obrigatória não aprovada trava o avanço de etapa
--           (pode ser forçado por ADMIN/MENTOR, com motivo registrado)
--    RN-04  Tarefa vencida sem entrega vira "OVERDUE" (atrasada) automaticamente
--    RN-07  Uma equipe fica "Pronta para o InovAMF" ao concluir a etapa 6
--           com todas as tarefas obrigatórias aprovadas
--
--    RNF-02 LGPD: consentimento do usuário registrado no cadastro
--    RNF-03 Controle de acesso por perfil/escopo (admin vê tudo, mentor só
--           as equipes que acompanha, aluno só as suas)
--    RNF-04 Upload/armazenamento de arquivos de entrega
--    RNF-05 Auditoria de ações sensíveis (login, aprovação, troca de etapa...)
--    RNF-06 Reenvio de e-mail em caso de falha
--
--    Decisões de projeto (Q1, Q3, Q4, Q9, Q10, Q11) documentadas junto às
--    tabelas correspondentes abaixo.
--
--  Perfis de usuário (front-end): ADMIN, MENTOR, ALUNO líder (STUDENT com
--  papel LEADER na equipe) e INTEGRANTE (STUDENT com papel MEMBER).
--
--  Jornada de 6 etapas (telas /admin, /mentor, /aluno, /integrante):
--    1. Envio da ideia
--    2. Contato com a equipe
--    3. Entendendo a ideia (problema, público-alvo e solução)
--    4. Proposta de valor (Value Proposition Design)
--    5. Modelo de negócio (Business Model Canvas)
--    6. Pitch e inscrição (Pitch Vídeo, Canvas final, VPD final, integrantes)
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- 0. EXTENSÕES
-- =====================================================================================

-- gen_random_uuid() para chaves primárias e crypt()/gen_salt() para o hash
-- de senha do usuário administrador inicial (seed), no mesmo formato bcrypt
-- ("$2a$"/"$2b$") usado pelo back-end (bcryptjs).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================================
-- 1. TIPOS ENUMERADOS (ENUM)
-- =====================================================================================

CREATE TYPE user_role        AS ENUM ('ADMIN', 'MENTOR', 'STUDENT');
CREATE TYPE team_member_role AS ENUM ('LEADER', 'MEMBER');
CREATE TYPE idea_stage       AS ENUM ('JUST_IDEA', 'PROTOTYPE', 'MVP_IN_DEV', 'MVP_READY');
CREATE TYPE journey_status   AS ENUM ('IN_PROGRESS', 'READY_FOR_INOVAMF', 'REFERRED');
CREATE TYPE task_status      AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'OVERDUE', 'APPROVED', 'REJECTED');
CREATE TYPE submission_type  AS ENUM ('FILE', 'LINK');

CREATE TYPE email_type AS ENUM (
  'NEW_TASK',
  'DEADLINE_REMINDER',
  'OVERDUE',
  'APPROVED',
  'REJECTED',
  'NEW_REGISTRATION',
  'FILE_SUBMITTED',
  'MANUAL_REMINDER',
  'PASSWORD_RESET',
  'ACCOUNT_CREATED'
);

CREATE TYPE email_status AS ENUM ('PENDING', 'SENT', 'FAILED');

-- =====================================================================================
-- 2. FUNÇÕES UTILITÁRIAS (usadas por triggers, definidas antes das tabelas)
-- =====================================================================================

-- Mantém a coluna updated_at sempre coerente em qualquer UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- 3. USUÁRIOS
-- =====================================================================================

-- RF-01, RF-02, RF-03 | Q9: o cadastro do aluno exige apenas e-mail e curso;
-- os demais campos ficam opcionais no próprio schema.
-- Q1: líder e integrante são o mesmo tipo de conta (STUDENT); o que muda é o
-- papel dentro da equipe (ver team_member.role), não um perfil separado.
CREATE TABLE app_user (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(255) NOT NULL,
  email          VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  phone          VARCHAR(30),
  course         VARCHAR(150),
  semester       VARCHAR(30),
  role           user_role NOT NULL DEFAULT 'STUDENT',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  -- RNF-02 (LGPD): consentimento registrado no momento do cadastro
  consent_at     TIMESTAMPTZ,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  app_user IS 'Contas de acesso: administrador, mentor ou aluno (líder/integrante).';
COMMENT ON COLUMN app_user.role IS 'Perfil global da conta. O papel dentro da equipe (líder/integrante) vive em team_member.role.';
COMMENT ON COLUMN app_user.consent_at IS 'RNF-02 (LGPD): data em que o usuário aceitou os termos no cadastro.';

-- E-mail único ignorando maiúsculas/minúsculas
CREATE UNIQUE INDEX idx_app_user_email ON app_user (LOWER(email));
CREATE INDEX idx_app_user_role ON app_user (role);

CREATE TRIGGER trg_app_user_updated_at
  BEFORE UPDATE ON app_user
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================================
-- 4. ÁREAS DA IDEIA E EQUIPES (JORNADA)
-- =====================================================================================

-- RF-04: lista configurável de áreas/setores usada no formulário inicial (tela /cadastro)
CREATE TABLE idea_category (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(150) NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE idea_category IS 'RF-04: áreas/setores oferecidos no formulário inicial de cadastro da ideia.';

-- RF-05, RF-06, RF-09, RF-24 | equipe = ideia em avaliação no InfoHub.
-- journey_stage vai de 1 a 6, refletindo o funil mostrado no kanban.
CREATE TABLE team (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  description       TEXT NOT NULL,
  category_id       UUID NOT NULL REFERENCES idea_category (id),
  idea_stage        idea_stage NOT NULL DEFAULT 'JUST_IDEA',
  journey_stage     INT NOT NULL DEFAULT 1 CHECK (journey_stage BETWEEN 1 AND 6),
  journey_status    journey_status NOT NULL DEFAULT 'IN_PROGRESS',
  semester          VARCHAR(30) NOT NULL,
  how_did_you_hear  VARCHAR(150),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  team IS 'Equipe/ideia acompanhada no funil de 6 etapas do InfoHub.';
COMMENT ON COLUMN team.journey_stage IS '1 Envio da ideia · 2 Contato · 3 Entendendo a ideia · 4 Proposta de valor · 5 Modelo de negócio · 6 Pitch e inscrição.';
COMMENT ON COLUMN team.journey_status IS 'RN-07: fica READY_FOR_INOVAMF ao concluir a etapa 6 com todas as tarefas obrigatórias aprovadas.';

CREATE INDEX idx_team_journey_stage  ON team (journey_stage);
CREATE INDEX idx_team_journey_status ON team (journey_status);
CREATE INDEX idx_team_semester       ON team (semester);
CREATE INDEX idx_team_category       ON team (category_id);

CREATE TRIGGER trg_team_updated_at
  BEFORE UPDATE ON team
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Q1 (líder e integrante têm login próprio) | Q4 (aluno pode estar em N equipes ao mesmo tempo)
CREATE TABLE team_member (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id   UUID NOT NULL REFERENCES team (id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  role      team_member_role NOT NULL DEFAULT 'MEMBER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

COMMENT ON TABLE team_member IS 'Q1/Q4: vínculo aluno-equipe com papel (LEADER/MEMBER). A unicidade é por (equipe, usuário), permitindo o mesmo aluno em várias equipes.';

CREATE INDEX idx_team_member_user ON team_member (user_id);
CREATE INDEX idx_team_member_team ON team_member (team_id);

-- Garante um único líder ativo por equipe
CREATE UNIQUE INDEX idx_team_single_leader
  ON team_member (team_id)
  WHERE role = 'LEADER' AND is_active;

-- Q10: mentor acessa APENAS as equipes que acompanha (escopo, não é global)
-- Q11: uma equipe pode ter mais de um mentor/monitor
CREATE TABLE team_mentor (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES team (id) ON DELETE CASCADE,
  mentor_id   UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES app_user (id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, mentor_id)
);

COMMENT ON TABLE team_mentor IS 'Q10/Q11/RNF-03: mentoria é por equipe (N:N), não um vínculo global do mentor.';

CREATE INDEX idx_team_mentor_mentor ON team_mentor (mentor_id);
CREATE INDEX idx_team_mentor_team   ON team_mentor (team_id);

-- RF-08: histórico de etapas concluídas, exibido na página de detalhe da equipe
CREATE TABLE team_stage_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES team (id) ON DELETE CASCADE,
  from_stage INT CHECK (from_stage BETWEEN 1 AND 6),
  to_stage   INT NOT NULL CHECK (to_stage BETWEEN 1 AND 6),
  changed_by UUID REFERENCES app_user (id) ON DELETE SET NULL,
  reason     TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE team_stage_history IS 'RF-08/RN-01/RNF-05: cada mudança de etapa (avanço ou retrocesso), com motivo quando aplicável.';

CREATE INDEX idx_team_stage_history_team ON team_stage_history (team_id, changed_at);

-- =====================================================================================
-- 5. MODELOS DE TAREFA, TAREFAS, ENTREGAS, COMENTÁRIOS E LEMBRETES
-- =====================================================================================

-- RF-11: modelos de tarefa pré-configurados por etapa (usados ao criar tarefas novas)
CREATE TABLE task_template (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  journey_stage INT NOT NULL CHECK (journey_stage BETWEEN 1 AND 6),
  is_mandatory  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_template_stage ON task_template (journey_stage);

CREATE TRIGGER trg_task_template_updated_at
  BEFORE UPDATE ON task_template
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RF-11, RF-12, RF-13 | RN-01: tarefa obrigatória não aprovada trava o avanço de etapa.
-- due_date é DATE (sem fuso horário) para o prazo não "voltar um dia" conforme
-- o servidor, exatamente como no back-end (lido/gravado como texto YYYY-MM-DD).
CREATE TABLE task (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES team (id) ON DELETE CASCADE,
  template_id   UUID REFERENCES task_template (id) ON DELETE SET NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  journey_stage INT NOT NULL CHECK (journey_stage BETWEEN 1 AND 6),
  due_date      DATE NOT NULL,
  status        task_status NOT NULL DEFAULT 'PENDING',
  is_mandatory  BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID NOT NULL REFERENCES app_user (id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE task IS 'RF-11 a RF-13: tarefa atribuída a uma equipe em uma etapa da jornada, com prazo.';
COMMENT ON COLUMN task.is_mandatory IS 'RN-01: se TRUE e status <> APPROVED, bloqueia o avanço de etapa (a não ser que seja forçado).';

CREATE INDEX idx_task_team          ON task (team_id);
CREATE INDEX idx_task_status        ON task (status);
CREATE INDEX idx_task_due_date      ON task (due_date);
CREATE INDEX idx_task_journey_stage ON task (journey_stage);

CREATE TRIGGER trg_task_updated_at
  BEFORE UPDATE ON task
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RF-14, RF-16 | Q3: Pitch Vídeo entra como LINK (YouTube); demais entregas como FILE.
-- Cada reenvio corrigido gera uma nova versão (version), preservando o histórico.
CREATE TABLE task_submission (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES task (id) ON DELETE CASCADE,
  submitted_by  UUID NOT NULL REFERENCES app_user (id),
  type          submission_type NOT NULL,
  url           VARCHAR(2048) NOT NULL,
  original_name VARCHAR(255),
  file_size     INT,
  mime_type     VARCHAR(100),
  version       INT NOT NULL DEFAULT 1,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, version)
);

COMMENT ON TABLE task_submission IS 'RF-14/RF-16/RNF-04/Q3: entregas de arquivo (FILE) ou link (LINK, ex.: Pitch Vídeo), versionadas por tarefa.';

CREATE INDEX idx_submission_task ON task_submission (task_id, version DESC);

-- RF-15: feedback do mentor/admin ao aprovar a entrega ou solicitar ajustes
CREATE TABLE task_comment (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES task (id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES app_user (id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comment_task ON task_comment (task_id, created_at);

-- RF-17: uma ou mais datas de lembrete automático por tarefa
CREATE TABLE task_reminder (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id   UUID NOT NULL REFERENCES task (id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  is_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at   TIMESTAMPTZ
);

CREATE INDEX idx_task_reminder_task    ON task_reminder (task_id);
CREATE INDEX idx_task_reminder_pending ON task_reminder (remind_at) WHERE is_sent = FALSE;

-- RF-10: anotações internas do mentor, nunca visíveis ao aluno
CREATE TABLE mentor_note (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES team (id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES app_user (id),
  journey_stage INT NOT NULL CHECK (journey_stage BETWEEN 1 AND 6),
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE mentor_note IS 'RF-10: anotação interna do mentor/admin sobre a equipe. Nunca deve ser exposta nas rotas consumidas pelo aluno.';

CREATE INDEX idx_mentor_note_team ON mentor_note (team_id, created_at);

CREATE TRIGGER trg_mentor_note_updated_at
  BEFORE UPDATE ON mentor_note
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================================
-- 6. NOTIFICAÇÕES (E-MAIL) E AUDITORIA
-- =====================================================================================

-- RF-18, RF-19, RF-20 | RNF-06: reenvio em caso de falha (coluna attempts)
CREATE TABLE email_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id    UUID REFERENCES app_user (id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  type            email_type NOT NULL,
  subject         VARCHAR(500) NOT NULL,
  status          email_status NOT NULL DEFAULT 'PENDING',
  attempts        INT NOT NULL DEFAULT 0,
  provider_id     VARCHAR(255),
  task_id         UUID REFERENCES task (id) ON DELETE SET NULL,
  team_id         UUID REFERENCES team (id) ON DELETE SET NULL,
  error           TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_log_recipient ON email_log (recipient_id);
CREATE INDEX idx_email_log_status    ON email_log (status, created_at);

-- RNF-05: auditoria de mudanças de etapa, aprovações, login e envios de e-mail
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES app_user (id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   UUID,
  details     JSONB,
  ip_address  VARCHAR(64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user    ON audit_log (user_id);
CREATE INDEX idx_audit_log_entity  ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log (created_at DESC);

-- =====================================================================================
-- 7. AUTENTICAÇÃO: TOKENS DE SESSÃO E DE RECUPERAÇÃO DE SENHA
-- =====================================================================================

-- RF-01: os tokens são gravados apenas como hash SHA-256; o valor em claro
-- existe somente na resposta HTTP / no e-mail enviado ao usuário.
CREATE TABLE refresh_token (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  user_agent VARCHAR(255),
  ip_address VARCHAR(64),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_token_user    ON refresh_token (user_id);
CREATE INDEX idx_refresh_token_expires ON refresh_token (expires_at);

CREATE TABLE password_reset_token (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_user ON password_reset_token (user_id);

-- =====================================================================================
-- 8. FUNÇÕES DE REGRA DE NEGÓCIO
-- (equivalentes SQL das regras hoje aplicadas em tasks.repository.ts /
--  teams.repository.ts, disponibilizadas aqui como funções reutilizáveis)
-- =====================================================================================

-- ---------------------------------------------------------------------
-- RN-04 — tarefa vencida sem entrega vira "OVERDUE" automaticamente.
-- Retorna a quantidade de tarefas atualizadas. Pode ser chamada sob demanda
-- (antes de listar tarefas/calendário) ou por um job agendado.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_marcar_tarefas_atrasadas()
RETURNS INT AS $$
DECLARE
  v_linhas_afetadas INT;
BEGIN
  UPDATE task
     SET status = 'OVERDUE'
   WHERE status IN ('PENDING', 'IN_PROGRESS')
     AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS v_linhas_afetadas = ROW_COUNT;
  RETURN v_linhas_afetadas;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_marcar_tarefas_atrasadas() IS 'RN-04: marca como OVERDUE toda tarefa pendente cujo prazo já passou.';

-- ---------------------------------------------------------------------
-- RN-01 — o que falta para a equipe avançar até a etapa "p_etapa_destino":
-- lista as tarefas obrigatórias ainda não aprovadas entre a etapa atual da
-- equipe e a etapa de destino (exclusive). Usada tanto na prévia do
-- kanban quanto para validar antes de aplicar a troca de etapa.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_pendencias_avanco_etapa(
  p_equipe_id     UUID,
  p_etapa_destino INT
)
RETURNS TABLE (
  tarefa_id     UUID,
  titulo        VARCHAR,
  etapa         INT,
  status        task_status,
  prazo         DATE
) AS $$
DECLARE
  v_etapa_atual INT;
BEGIN
  SELECT journey_stage INTO v_etapa_atual FROM team WHERE id = p_equipe_id;

  IF v_etapa_atual IS NULL THEN
    RAISE EXCEPTION 'Equipe % não encontrada.', p_equipe_id;
  END IF;

  IF p_etapa_destino <= v_etapa_atual THEN
    RETURN; -- retrocesso nunca é bloqueado (RN-01)
  END IF;

  RETURN QUERY
    SELECT tk.id, tk.title, tk.journey_stage, tk.status, tk.due_date
      FROM task tk
     WHERE tk.team_id = p_equipe_id
       AND tk.is_mandatory
       AND tk.status <> 'APPROVED'
       AND tk.journey_stage >= v_etapa_atual
       AND tk.journey_stage <  p_etapa_destino
     ORDER BY tk.journey_stage, tk.due_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_pendencias_avanco_etapa(UUID, INT) IS 'RN-01: tarefas obrigatórias pendentes que travam o avanço de etapa da equipe.';

-- ---------------------------------------------------------------------
-- RF-09 — move a equipe para "p_etapa_destino".
-- Registra o histórico (team_stage_history) e recalcula journey_status
-- (RN-07). Se houver pendência obrigatória ao avançar e p_forcar = FALSE,
-- a função levanta uma exceção — o chamador decide repetir com
-- p_forcar = TRUE, assim como o back-end faz com o parâmetro "force".
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_mudar_etapa_equipe(
  p_equipe_id     UUID,
  p_etapa_destino INT,
  p_usuario_id    UUID,
  p_motivo        TEXT DEFAULT NULL,
  p_forcar        BOOLEAN DEFAULT FALSE
)
RETURNS journey_status AS $$
DECLARE
  v_etapa_atual   INT;
  v_ativa         BOOLEAN;
  v_pendencias    INT;
  v_novo_status   journey_status;
BEGIN
  SELECT journey_stage, is_active INTO v_etapa_atual, v_ativa
    FROM team WHERE id = p_equipe_id FOR UPDATE;

  IF v_etapa_atual IS NULL THEN
    RAISE EXCEPTION 'Equipe % não encontrada.', p_equipe_id;
  END IF;

  IF NOT v_ativa THEN
    RAISE EXCEPTION 'Esta equipe está inativa e não pode mudar de etapa.';
  END IF;

  IF p_etapa_destino = v_etapa_atual THEN
    RAISE EXCEPTION 'A equipe já está na etapa %.', p_etapa_destino;
  END IF;

  IF p_etapa_destino > v_etapa_atual THEN
    SELECT COUNT(*) INTO v_pendencias FROM fn_pendencias_avanco_etapa(p_equipe_id, p_etapa_destino);

    IF v_pendencias > 0 AND NOT p_forcar THEN
      RAISE EXCEPTION 'STAGE_REQUIREMENTS_PENDING: % tarefa(s) obrigatória(s) sem aprovação.', v_pendencias;
    END IF;
  END IF;

  UPDATE team SET journey_stage = p_etapa_destino WHERE id = p_equipe_id;

  INSERT INTO team_stage_history (team_id, from_stage, to_stage, changed_by, reason)
  VALUES (p_equipe_id, v_etapa_atual, p_etapa_destino, p_usuario_id, p_motivo);

  UPDATE team t
     SET journey_status = CASE
           WHEN t.journey_stage = 6
            AND EXISTS (SELECT 1 FROM task tk WHERE tk.team_id = t.id AND tk.is_mandatory)
            AND NOT EXISTS (
                  SELECT 1 FROM task tk
                   WHERE tk.team_id = t.id AND tk.is_mandatory AND tk.status <> 'APPROVED'
                )
           THEN 'READY_FOR_INOVAMF'::journey_status
           ELSE 'IN_PROGRESS'::journey_status
         END
   WHERE t.id = p_equipe_id
     AND t.journey_status <> 'REFERRED'
  RETURNING t.journey_status INTO v_novo_status;

  INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
  VALUES (
    p_usuario_id, 'TEAM_STAGE_CHANGED', 'team', p_equipe_id,
    jsonb_build_object(
      'fromStage', v_etapa_atual,
      'toStage', p_etapa_destino,
      'forced', p_forcar,
      'reason', p_motivo
    )
  );

  RETURN COALESCE(v_novo_status, (SELECT journey_status FROM team WHERE id = p_equipe_id));
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_mudar_etapa_equipe(UUID, INT, UUID, TEXT, BOOLEAN) IS 'RF-09/RN-01/RN-07/RNF-05: move a equipe de etapa, grava histórico, recalcula journey_status e registra auditoria.';

-- =====================================================================================
-- 9. VIEWS DE APOIO ÀS TELAS (kanban, calendário, relatórios/dashboard)
-- =====================================================================================

-- ---------------------------------------------------------------------
-- RF-06/RF-24 — cartão de equipe como consumido pelo kanban
-- (telas /admin, /mentor: quadro com as 6 colunas da jornada).
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_quadro_equipes AS
SELECT
  t.id,
  t.name,
  t.description,
  t.category_id,
  c.name                                          AS category_name,
  t.idea_stage,
  t.journey_stage,
  t.journey_status,
  t.semester,
  t.how_did_you_hear,
  t.is_active,
  t.created_at,
  lider.id                                        AS leader_id,
  lider.name                                       AS leader_name,
  lider.email                                      AS leader_email,
  lider.course                                     AS leader_course,
  (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name)), '[]'::jsonb)
      FROM team_mentor tm
      JOIN app_user m ON m.id = tm.mentor_id
     WHERE tm.team_id = t.id
  )                                                AS mentors,
  (
    SELECT COUNT(*) FROM team_member tmb
     WHERE tmb.team_id = t.id AND tmb.is_active
  )                                                AS member_count,
  (
    SELECT COUNT(*) FROM task tk
     WHERE tk.team_id = t.id AND tk.status NOT IN ('APPROVED', 'REJECTED')
  )                                                AS open_tasks,
  (
    SELECT COUNT(*) FROM task tk
     WHERE tk.team_id = t.id AND tk.status = 'OVERDUE'
  )                                                AS overdue_tasks
FROM team t
JOIN idea_category c ON c.id = t.category_id
LEFT JOIN team_member tmb_lider
       ON tmb_lider.team_id = t.id AND tmb_lider.role = 'LEADER' AND tmb_lider.is_active
LEFT JOIN app_user lider ON lider.id = tmb_lider.user_id;

COMMENT ON VIEW vw_quadro_equipes IS 'RF-06/RF-07/RF-24: equipe com líder, mentores e contadores de tarefas — base do kanban e das listagens.';

-- ---------------------------------------------------------------------
-- RF-13/RF-17 — eventos de calendário: prazo (DUE) e lembrete (REMINDER)
-- na mesma lista, como consumido pela tela de calendário.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_calendario_eventos AS
SELECT 'DUE'::text            AS kind,
       tk.due_date            AS event_date,
       tk.id                  AS task_id,
       tk.title,
       tk.journey_stage,
       tk.status,
       tk.is_mandatory,
       tk.team_id,
       t.name                 AS team_name,
       NULL::boolean          AS reminder_sent
  FROM task tk
  JOIN team t ON t.id = tk.team_id
 WHERE t.is_active
UNION ALL
SELECT 'REMINDER'::text       AS kind,
       (r.remind_at::date)    AS event_date,
       tk.id                  AS task_id,
       tk.title,
       tk.journey_stage,
       tk.status,
       tk.is_mandatory,
       tk.team_id,
       t.name                 AS team_name,
       r.is_sent              AS reminder_sent
  FROM task_reminder r
  JOIN task tk ON tk.id = r.task_id
  JOIN team t  ON t.id = tk.team_id
 WHERE t.is_active;

COMMENT ON VIEW vw_calendario_eventos IS 'RF-13/RF-17: união de prazos de entrega e datas de lembrete, para a grade do calendário.';

-- ---------------------------------------------------------------------
-- RF-22/RF-23/RF-24 — indicadores por equipe para a tela de Relatórios
-- do administrador (progresso na jornada, tarefas e prazos).
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_relatorio_equipes AS
SELECT
  t.id                                                        AS team_id,
  t.name                                                       AS team_name,
  c.name                                                        AS category_name,
  t.semester,
  t.journey_stage,
  t.journey_status,
  COUNT(tk.id)                                                  AS total_tasks,
  COUNT(tk.id) FILTER (WHERE tk.status = 'APPROVED')            AS approved_tasks,
  COUNT(tk.id) FILTER (WHERE tk.status = 'OVERDUE')             AS overdue_tasks,
  COUNT(tk.id) FILTER (WHERE tk.is_mandatory AND tk.status <> 'APPROVED') AS pending_mandatory_tasks,
  ROUND(
    100.0 * COUNT(tk.id) FILTER (WHERE tk.status = 'APPROVED')
      / NULLIF(COUNT(tk.id), 0), 1
  )                                                              AS approved_pct
FROM team t
JOIN idea_category c ON c.id = t.category_id
LEFT JOIN task tk ON tk.team_id = t.id
WHERE t.is_active
GROUP BY t.id, t.name, c.name, t.semester, t.journey_stage, t.journey_status;

COMMENT ON VIEW vw_relatorio_equipes IS 'RF-22/RF-23: indicadores por equipe (progresso e tarefas) para relatórios e exportação.';

-- ---------------------------------------------------------------------
-- RF-22/RF-24 — visão geral (dashboard) para a coordenação: quantidade de
-- equipes por etapa e por status da jornada.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_dashboard_geral AS
SELECT
  journey_stage,
  journey_status,
  COUNT(*) AS total_equipes
FROM team
WHERE is_active
GROUP BY journey_stage, journey_status
ORDER BY journey_stage;

COMMENT ON VIEW vw_dashboard_geral IS 'RF-22/RF-24: contagem de equipes por etapa e status da jornada, para o painel da coordenação.';

-- =====================================================================================
-- 10. DADOS INICIAIS (SEED) — idempotente, iguais aos gerados por
--     infohub-backend/src/database/seed.ts
-- =====================================================================================

-- --- RF-04: áreas/setores da ideia -------------------------------------------------
INSERT INTO idea_category (name) VALUES
  ('Educação'),
  ('Saúde'),
  ('Tecnologia'),
  ('Sustentabilidade'),
  ('Agronegócio'),
  ('Finanças'),
  ('Serviços'),
  ('Indústria'),
  ('Comércio'),
  ('Social')
ON CONFLICT (name) DO NOTHING;

-- --- RF-11: modelos de tarefa por etapa da jornada ---------------------------------
INSERT INTO task_template (title, description, journey_stage, is_mandatory) VALUES
  ('Cadastro da ideia',
   'Preencher o formulário inicial com os dados da ideia e da equipe.',
   1, TRUE),
  ('Confirmar agendamento do 1º encontro',
   'Confirmar data e horário do primeiro encontro com o mentor.',
   2, TRUE),
  ('Definir problema, público-alvo e solução',
   'Documentar o problema identificado, o público-alvo e a proposta de solução inicial.',
   3, TRUE),
  ('Enviar Value Proposition Design',
   'Construir e enviar o Value Proposition Design da ideia.',
   4, TRUE),
  ('Enviar Business Model Canvas',
   'Construir e enviar o Business Model Canvas da ideia.',
   5, TRUE),
  ('Gravar Pitch Vídeo',
   'Gravar vídeo de pitch de até 3 minutos apresentando o projeto e enviar o link do YouTube.',
   6, TRUE),
  ('Entregar Canvas final',
   'Versão final do Business Model Canvas após as revisões da mentoria.',
   6, TRUE),
  ('Entregar VPD final',
   'Versão final do Value Proposition Design após as revisões da mentoria.',
   6, TRUE),
  ('Confirmar dados dos integrantes',
   'Preencher os dados completos de todos os integrantes para a submissão ao InovAMF.',
   6, TRUE)
ON CONFLICT DO NOTHING;

-- --- Administrador inicial ----------------------------------------------------------
-- Senha padrão do seed original: InfoHub@2026 — TROQUE no primeiro acesso.
-- crypt(texto, gen_salt('bf')) gera hash bcrypt compatível com bcryptjs
-- (mesma biblioteca usada em infohub-backend/src/shared/utils/crypto.ts).
INSERT INTO app_user (name, email, password_hash, role, consent_at)
SELECT 'Administrador InfoHub',
       'admin@amf.edu.br',
       crypt('InfoHub@2026', gen_salt('bf')),
       'ADMIN',
       NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM app_user WHERE LOWER(email) = LOWER('admin@amf.edu.br')
);

COMMIT;

-- =====================================================================================
-- FIM DO SCRIPT
--
-- Exemplos de uso das funções de regra de negócio criadas na seção 8:
--
--   -- Marcar tarefas atrasadas (RN-04), chamar antes de listar tarefas/calendário:
--   SELECT fn_marcar_tarefas_atrasadas();
--
--   -- Ver o que falta para a equipe X chegar à etapa 4 (RN-01):
--   SELECT * FROM fn_pendencias_avanco_etapa('<uuid-da-equipe>', 4);
--
--   -- Mover a equipe X para a etapa 4, forçando mesmo com pendência (RF-09):
--   SELECT fn_mudar_etapa_equipe('<uuid-da-equipe>', 4, '<uuid-do-usuario>',
--                                 'Avanço autorizado em reunião de mentoria', TRUE);
-- =====================================================================================

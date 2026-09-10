-- =====================================================================
-- 002 - Tarefas, entregas, comentários, lembretes e anotações do mentor
-- =====================================================================

CREATE TYPE task_status     AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'OVERDUE', 'APPROVED', 'REJECTED');
CREATE TYPE submission_type AS ENUM ('FILE', 'LINK');

-- ---------------------------------------------------------------------
-- RF-11: modelos de tarefa pré-configurados por etapa
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- RF-11, RF-12, RF-13 | RN-01: tarefa obrigatória trava o avanço de etapa
-- ---------------------------------------------------------------------
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

CREATE INDEX idx_task_team          ON task (team_id);
CREATE INDEX idx_task_status        ON task (status);
CREATE INDEX idx_task_due_date      ON task (due_date);
CREATE INDEX idx_task_journey_stage ON task (journey_stage);

CREATE TRIGGER trg_task_updated_at
  BEFORE UPDATE ON task
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- RF-14, RF-16 | Q3: Pitch Vídeo entra como LINK (YouTube), demais como FILE
-- Cada reenvio corrigido gera uma nova versão da entrega
-- ---------------------------------------------------------------------
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

CREATE INDEX idx_submission_task ON task_submission (task_id, version DESC);

-- ---------------------------------------------------------------------
-- RF-15: feedback ao aprovar a entrega ou solicitar ajustes
-- ---------------------------------------------------------------------
CREATE TABLE task_comment (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES task (id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES app_user (id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comment_task ON task_comment (task_id, created_at);

-- ---------------------------------------------------------------------
-- RF-17: uma ou mais datas de lembrete automático por tarefa
-- ---------------------------------------------------------------------
CREATE TABLE task_reminder (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id   UUID NOT NULL REFERENCES task (id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  is_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at   TIMESTAMPTZ
);

CREATE INDEX idx_task_reminder_task    ON task_reminder (task_id);
CREATE INDEX idx_task_reminder_pending ON task_reminder (remind_at) WHERE is_sent = FALSE;

-- ---------------------------------------------------------------------
-- RF-10: anotações internas do mentor, nunca visíveis ao aluno
-- ---------------------------------------------------------------------
CREATE TABLE mentor_note (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES team (id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES app_user (id),
  journey_stage INT NOT NULL CHECK (journey_stage BETWEEN 1 AND 6),
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mentor_note_team ON mentor_note (team_id, created_at);

CREATE TRIGGER trg_mentor_note_updated_at
  BEFORE UPDATE ON mentor_note
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

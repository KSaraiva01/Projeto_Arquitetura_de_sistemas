-- =====================================================================
-- 003 - Fila/log de e-mails (RF-18 a RF-20) e auditoria (RNF-05)
-- =====================================================================

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

-- ---------------------------------------------------------------------
-- RF-18, RF-19, RF-20 | RNF-06: reenvio em caso de falha (attempts)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- RNF-05: auditoria de mudanças de etapa, aprovações e envios de e-mail
-- ---------------------------------------------------------------------
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

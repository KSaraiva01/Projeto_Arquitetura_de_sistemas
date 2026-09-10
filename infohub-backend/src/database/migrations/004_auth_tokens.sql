-- =====================================================================
-- 004 - Tokens de sessão e de recuperação de senha (RF-01)
-- Os tokens são gravados apenas como hash SHA-256; o valor em claro
-- existe somente na resposta HTTP / no e-mail enviado ao usuário.
-- =====================================================================

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

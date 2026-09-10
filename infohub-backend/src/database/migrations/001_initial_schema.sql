-- =====================================================================
-- 001 - Schema inicial: usuários, equipes, membros, mentores e jornada
-- InfoHub -> InovAMF | Faculdade Antonio Meneghetti
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
CREATE TYPE user_role        AS ENUM ('ADMIN', 'MENTOR', 'STUDENT');
CREATE TYPE team_member_role AS ENUM ('LEADER', 'MEMBER');
CREATE TYPE idea_stage       AS ENUM ('JUST_IDEA', 'PROTOTYPE', 'MVP_IN_DEV', 'MVP_READY');
CREATE TYPE journey_status   AS ENUM ('IN_PROGRESS', 'READY_FOR_INOVAMF', 'REFERRED');

-- ---------------------------------------------------------------------
-- Função utilitária: mantém updated_at sempre coerente
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- RF-01, RF-02, RF-03 | Q9: cadastro do aluno exige apenas e-mail e curso
-- ---------------------------------------------------------------------
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
  -- RNF-02 (LGPD): consentimento registrado no cadastro
  consent_at     TIMESTAMPTZ,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E-mail único ignorando maiúsculas/minúsculas
CREATE UNIQUE INDEX idx_app_user_email ON app_user (LOWER(email));
CREATE INDEX idx_app_user_role ON app_user (role);

CREATE TRIGGER trg_app_user_updated_at
  BEFORE UPDATE ON app_user
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Áreas/setores da ideia (lista configurável usada no formulário inicial)
-- ---------------------------------------------------------------------
CREATE TABLE idea_category (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(150) NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- RF-05, RF-06, RF-09, RF-24 | equipe = ideia em avaliação no InfoHub
-- ---------------------------------------------------------------------
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

CREATE INDEX idx_team_journey_stage  ON team (journey_stage);
CREATE INDEX idx_team_journey_status ON team (journey_status);
CREATE INDEX idx_team_semester       ON team (semester);
CREATE INDEX idx_team_category       ON team (category_id);

CREATE TRIGGER trg_team_updated_at
  BEFORE UPDATE ON team
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Q1 (líder e integrante têm login) | Q4 (aluno pode estar em N equipes)
-- ---------------------------------------------------------------------
CREATE TABLE team_member (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id   UUID NOT NULL REFERENCES team (id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  role      team_member_role NOT NULL DEFAULT 'MEMBER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_member_user ON team_member (user_id);
CREATE INDEX idx_team_member_team ON team_member (team_id);

-- Garante um único líder ativo por equipe
CREATE UNIQUE INDEX idx_team_single_leader
  ON team_member (team_id)
  WHERE role = 'LEADER' AND is_active;

-- ---------------------------------------------------------------------
-- Q10: mentor acessa APENAS as equipes que acompanha (não é global)
-- Q11: uma equipe pode ter mais de um mentor/monitor
-- ---------------------------------------------------------------------
CREATE TABLE team_mentor (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES team (id) ON DELETE CASCADE,
  mentor_id   UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES app_user (id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, mentor_id)
);

CREATE INDEX idx_team_mentor_mentor ON team_mentor (mentor_id);
CREATE INDEX idx_team_mentor_team   ON team_mentor (team_id);

-- ---------------------------------------------------------------------
-- RF-08: histórico de etapas concluídas exibido na página da equipe
-- ---------------------------------------------------------------------
CREATE TABLE team_stage_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID NOT NULL REFERENCES team (id) ON DELETE CASCADE,
  from_stage   INT CHECK (from_stage BETWEEN 1 AND 6),
  to_stage     INT NOT NULL CHECK (to_stage BETWEEN 1 AND 6),
  changed_by   UUID REFERENCES app_user (id) ON DELETE SET NULL,
  reason       TEXT,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_stage_history_team ON team_stage_history (team_id, changed_at);

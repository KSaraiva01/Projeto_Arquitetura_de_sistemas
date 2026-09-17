-- =====================================================================================
--  INFOHUB → INOVAMF
--  Sistema de Acompanhamento da Jornada do Empreendedor
--  Faculdade Antonio Meneghetti
--
--  SCHEMA DO BANCO DE DADOS (PostgreSQL 13 ou superior)
--
--  Este arquivo é a única fonte da verdade do banco: não há ORM nem migrations.
--  Ele cria os tipos, as tabelas, os relacionamentos, os índices e os dados
--  iniciais (etapas da jornada, áreas da ideia, modelos de tarefa e o admin).
--
--  Como aplicar em um banco vazio:
--    psql -U <usuario> -h <servidor> -d <banco> -f database/schema.sql
--  ou, pelo back-end (cria o banco se ainda não existir):
--    npm run db:setup
--
--  Para reaplicar do zero (apaga tudo!):  npm run db:reset
--
--  Convenções:
--    - Nomes de tabelas e colunas em português, no singular (equipe, tarefa...).
--    - Chaves primárias UUID geradas pelo próprio banco (gen_random_uuid()).
--    - Os VALORES dos tipos enumerados são códigos em inglês (PENDING, APPROVED...)
--      porque são o contrato da API com o front-end; o rótulo em português fica
--      na tela. Os NOMES dos tipos e das colunas são em português.
--    - A regra de negócio (RN-01, RN-04, RN-07...) vive no back-end, na camada
--      de service. O banco garante só o que é estrutural: chaves, unicidade,
--      integridade referencial e CHECKs simples.
--
--  Jornada padrão (6 etapas, tabela `etapa`):
--    1. Envio da ideia
--    2. Contato com a equipe
--    3. Entendendo a ideia (problema, público-alvo e solução)
--    4. Proposta de valor (Value Proposition Design)
--    5. Modelo de negócio (Business Model Canvas)
--    6. Pitch e inscrição
--  Cada equipe recebe uma CÓPIA dessa jornada em `equipe_etapa`, e é nela que o
--  mentor pode acrescentar etapas extras só para aquela equipe. Concluída a
--  jornada, a equipe é encaminhada ao InovAMF.
-- =====================================================================================

BEGIN;

-- O arquivo está em UTF-8. Sem esta linha o psql do Windows assume WIN1252 e
-- grava os acentos errados ("EducaÃ§Ã£o").
SET client_encoding TO 'UTF8';

-- =====================================================================================
-- 1. TIPOS ENUMERADOS
-- =====================================================================================

CREATE TYPE perfil_usuario     AS ENUM ('ADMIN', 'MENTOR', 'STUDENT');
CREATE TYPE papel_membro       AS ENUM ('LEADER', 'MEMBER');
CREATE TYPE estagio_ideia      AS ENUM ('JUST_IDEA', 'PROTOTYPE', 'MVP_IN_DEV', 'MVP_READY');
CREATE TYPE status_jornada     AS ENUM ('IN_PROGRESS', 'READY_FOR_INOVAMF', 'REFERRED');
CREATE TYPE status_tarefa      AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'OVERDUE', 'APPROVED', 'REJECTED');
CREATE TYPE tipo_entrega       AS ENUM ('FILE', 'LINK');
CREATE TYPE finalidade_token   AS ENUM ('FIRST_ACCESS', 'PASSWORD_RESET');
CREATE TYPE status_notificacao AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE tipo_notificacao   AS ENUM (
  'NEW_REGISTRATION',   -- RF-19: nova ideia cadastrada (para a coordenação)
  'FIRST_ACCESS',       -- RF-02: link para o aluno definir a senha
  'PASSWORD_RESET',     -- RF-01: recuperação de senha
  'ACCOUNT_CREATED',    -- RF-03: conta de admin/mentor criada
  'NEW_TASK',           -- RF-19: nova tarefa para a equipe
  'DEADLINE_REMINDER',  -- RF-17: lembrete de prazo
  'OVERDUE',            -- RF-20: tarefa atrasada
  'SUBMITTED',          -- RF-14: aluno enviou uma entrega (para o mentor)
  'APPROVED',           -- RF-20: entrega aprovada
  'REJECTED',           -- RF-20: entrega devolvida para ajustes
  'STAGE_CHANGED'       -- RF-09: equipe mudou de etapa
);

-- =====================================================================================
-- 2. FUNÇÃO DO GATILHO DE atualizado_em
-- =====================================================================================

-- Toda tabela com a coluna atualizado_em recebe este gatilho: assim o back-end
-- não precisa lembrar de gravar NOW() em cada UPDATE.
CREATE FUNCTION atualiza_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- 3. CONTAS
-- =====================================================================================

-- RF-01, RF-02, RF-03 | Q1: líder e integrante são o mesmo tipo de conta (STUDENT);
-- o papel dentro da equipe fica em equipe_membro.papel.
-- RF-02: a conta do aluno nasce do formulário SEM senha (senha_hash = NULL). Ele
-- recebe por e-mail um token de primeiro acesso (tabela token_senha) e só então
-- define a senha. O login recusa contas com senha_hash NULL.
CREATE TABLE usuario (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  VARCHAR(255) NOT NULL,
  email                 VARCHAR(255) NOT NULL,
  senha_hash            VARCHAR(255),                 -- NULL até o 1º acesso
  telefone              VARCHAR(30),
  curso                 VARCHAR(150),
  semestre              VARCHAR(30),
  perfil                perfil_usuario NOT NULL DEFAULT 'STUDENT',
  ativo                 BOOLEAN NOT NULL DEFAULT TRUE,
  consentimento_lgpd_em TIMESTAMPTZ,                  -- RNF-02: aceite dos termos no cadastro
  anonimizado_em        TIMESTAMPTZ,                  -- RNF-02: pedido de exclusão atendido
  ultimo_login_em       TIMESTAMPTZ,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  usuario IS 'Contas de acesso: administrador, mentor ou aluno (líder/integrante).';
COMMENT ON COLUMN usuario.senha_hash IS 'bcrypt. NULL enquanto o usuário não definir a senha pelo link de primeiro acesso (RF-02).';
COMMENT ON COLUMN usuario.anonimizado_em IS 'RNF-02 (LGPD): dados pessoais apagados; a linha fica só para as entregas e o histórico da equipe continuarem íntegros.';

-- Q4/Q9: o e-mail identifica a pessoa. Um mesmo e-mail em duas equipes = UMA
-- linha em usuario e DUAS em equipe_membro.
CREATE UNIQUE INDEX uq_usuario_email ON usuario (LOWER(email));
CREATE INDEX idx_usuario_perfil ON usuario (perfil);

CREATE TRIGGER trg_usuario_atualizado_em
  BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION atualiza_atualizado_em();

-- RF-01: sessão (refresh token). Só o SHA-256 do token é gravado.
CREATE TABLE token_sessao (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  user_agent  VARCHAR(255),
  ip          VARCHAR(64),
  expira_em   TIMESTAMPTZ NOT NULL,
  revogado_em TIMESTAMPTZ,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_sessao_usuario ON token_sessao (usuario_id);

-- RF-01/RF-02: token de uso único enviado por e-mail, para definir a senha no
-- primeiro acesso (FIRST_ACCESS) ou para recuperá-la (PASSWORD_RESET).
CREATE TABLE token_senha (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  finalidade  finalidade_token NOT NULL,
  expira_em   TIMESTAMPTZ NOT NULL,
  usado_em    TIMESTAMPTZ,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_senha_usuario ON token_senha (usuario_id);

-- =====================================================================================
-- 4. JORNADA: CATÁLOGO DE ETAPAS, ÁREAS E EQUIPES
-- =====================================================================================

-- Catálogo das 6 etapas padrão. Não é ENUM nem CHECK 1–6 de propósito: a jornada
-- de cada equipe é copiada daqui para equipe_etapa, onde podem entrar extras.
CREATE TABLE etapa (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero    INT NOT NULL UNIQUE CHECK (numero > 0),   -- 1..6, coluna do kanban
  nome      VARCHAR(100) NOT NULL,
  descricao TEXT
);

COMMENT ON TABLE etapa IS 'Catálogo das etapas padrão da jornada (RF-06). Cada equipe recebe uma cópia em equipe_etapa.';

-- RF-04: áreas/setores oferecidos no formulário inicial
CREATE TABLE area_ideia (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      VARCHAR(150) NOT NULL UNIQUE,
  ativa     BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RF-05, RF-06, RF-24 | equipe = ideia em avaliação no InfoHub.
-- etapa_atual_id aponta para a linha de equipe_etapa em que a equipe está; a FK
-- é adicionada logo depois de equipe_etapa existir (as tabelas se referenciam).
-- Q4: exclusão é LÓGICA (excluida_em); nada some do banco.
CREATE TABLE equipe (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            VARCHAR(255) NOT NULL,
  descricao       TEXT NOT NULL,
  area_id         UUID NOT NULL REFERENCES area_ideia (id),
  estagio_ideia   estagio_ideia NOT NULL DEFAULT 'JUST_IDEA',
  etapa_atual_id  UUID,
  status_jornada  status_jornada NOT NULL DEFAULT 'IN_PROGRESS',
  semestre        VARCHAR(30) NOT NULL,             -- edição do programa, ex.: 2026/2
  como_conheceu   VARCHAR(150),
  excluida_em     TIMESTAMPTZ,                      -- Q4: exclusão lógica
  excluida_por    UUID REFERENCES usuario (id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  equipe IS 'Equipe/ideia acompanhada na jornada do InfoHub.';
COMMENT ON COLUMN equipe.etapa_atual_id IS 'Etapa em que a equipe está (linha de equipe_etapa, não do catálogo).';
COMMENT ON COLUMN equipe.status_jornada IS 'RN-07: READY_FOR_INOVAMF ao chegar à última etapa da SUA jornada com todas as tarefas obrigatórias aprovadas; REFERRED quando encaminhada.';
COMMENT ON COLUMN equipe.excluida_em IS 'Q4: exclusão lógica. Equipe excluída some das telas, mas membros, tarefas e entregas continuam no banco.';

CREATE INDEX idx_equipe_area     ON equipe (area_id);
CREATE INDEX idx_equipe_status   ON equipe (status_jornada);
CREATE INDEX idx_equipe_semestre ON equipe (semestre);

CREATE TRIGGER trg_equipe_atualizado_em
  BEFORE UPDATE ON equipe
  FOR EACH ROW EXECUTE FUNCTION atualiza_atualizado_em();

-- Jornada de UMA equipe: as 6 etapas padrão copiadas do catálogo no cadastro
-- (etapa_id preenchido) mais as extras acrescentadas pelo mentor (etapa_id NULL).
-- `ordem` é a posição dentro da jornada daquela equipe. Para encaixar uma extra
-- entre a 4 e a 5, o back-end empurra as seguintes (ordem + 1) — por isso a
-- unicidade é DEFERRABLE: é conferida no COMMIT, não linha a linha.
CREATE TABLE equipe_etapa (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id  UUID NOT NULL REFERENCES equipe (id) ON DELETE CASCADE,
  etapa_id   UUID REFERENCES etapa (id),             -- NULL = etapa extra desta equipe
  nome       VARCHAR(100) NOT NULL,
  descricao  TEXT,
  ordem      INT NOT NULL CHECK (ordem > 0),
  criada_por UUID REFERENCES usuario (id) ON DELETE SET NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (equipe_id, ordem) DEFERRABLE INITIALLY DEFERRED,
  UNIQUE (equipe_id, etapa_id)                       -- cada etapa padrão só uma vez por equipe
);

COMMENT ON TABLE  equipe_etapa IS 'Jornada da equipe: cópia das etapas padrão + etapas extras criadas pelo mentor só para esta equipe.';
COMMENT ON COLUMN equipe_etapa.etapa_id IS 'Etapa do catálogo que originou esta linha. NULL quando é uma etapa extra.';

CREATE INDEX idx_equipe_etapa_equipe ON equipe_etapa (equipe_id, ordem);

ALTER TABLE equipe
  ADD CONSTRAINT fk_equipe_etapa_atual
  FOREIGN KEY (etapa_atual_id) REFERENCES equipe_etapa (id);

-- Q1 (líder e integrante têm login próprio) | Q4 (aluno pode estar em N equipes)
CREATE TABLE equipe_membro (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id  UUID NOT NULL REFERENCES equipe (id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  papel      papel_membro NOT NULL DEFAULT 'MEMBER',
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  entrou_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  saiu_em    TIMESTAMPTZ,
  UNIQUE (equipe_id, usuario_id)
);

COMMENT ON TABLE equipe_membro IS 'Vínculo aluno–equipe com papel. A unicidade é por (equipe, usuário): o mesmo aluno pode estar em várias equipes (Q4).';

CREATE INDEX idx_equipe_membro_usuario ON equipe_membro (usuario_id);

-- Q1: no máximo UM líder ativo por equipe (índice parcial). "Nenhum líder" é
-- impedido pelo back-end: o cadastro sempre cria o líder e, na exclusão LGPD do
-- líder, outro integrante é promovido antes.
CREATE UNIQUE INDEX uq_equipe_um_lider
  ON equipe_membro (equipe_id)
  WHERE papel = 'LEADER' AND ativo;

-- Q10: mentor acessa APENAS as equipes que acompanha | Q11: N mentores por equipe
CREATE TABLE equipe_mentor (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id     UUID NOT NULL REFERENCES equipe (id) ON DELETE CASCADE,
  mentor_id     UUID NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  atribuido_por UUID REFERENCES usuario (id) ON DELETE SET NULL,
  atribuido_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (equipe_id, mentor_id)
);

CREATE INDEX idx_equipe_mentor_mentor ON equipe_mentor (mentor_id);

-- RF-08/RF-09: cada mudança de etapa — avanço ou retrocesso — com quem moveu,
-- quando e por quê. Retroceder é só uma linha cuja etapa de destino tem ordem
-- menor que a de origem.
CREATE TABLE historico_etapa (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id            UUID NOT NULL REFERENCES equipe (id) ON DELETE CASCADE,
  de_equipe_etapa_id   UUID REFERENCES equipe_etapa (id) ON DELETE SET NULL,   -- NULL no cadastro
  para_equipe_etapa_id UUID NOT NULL REFERENCES equipe_etapa (id) ON DELETE CASCADE,
  movido_por           UUID REFERENCES usuario (id) ON DELETE SET NULL,
  motivo               TEXT,
  forcado              BOOLEAN NOT NULL DEFAULT FALSE,   -- RN-01 ignorada pelo mentor
  movido_em            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE historico_etapa IS 'RF-08: histórico de etapas da equipe (quando passou, quem moveu, motivo). forcado = avançou mesmo com obrigatória pendente (RN-01).';

CREATE INDEX idx_historico_etapa_equipe ON historico_etapa (equipe_id, movido_em);

-- =====================================================================================
-- 5. TAREFAS, ENTREGAS, COMENTÁRIOS E LEMBRETES
-- =====================================================================================

-- RF-11: MODELO de tarefa ("enviar BMC"), ligado a uma etapa do catálogo. É o
-- molde; a tarefa concreta da equipe X fica em `tarefa` (duas tabelas de
-- propósito: o modelo pode mudar sem alterar tarefas já criadas).
CREATE TABLE modelo_tarefa (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id      UUID NOT NULL REFERENCES etapa (id),
  titulo        VARCHAR(255) NOT NULL,
  descricao     TEXT,
  obrigatoria   BOOLEAN NOT NULL DEFAULT FALSE,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (etapa_id, titulo)
);

CREATE TRIGGER trg_modelo_tarefa_atualizado_em
  BEFORE UPDATE ON modelo_tarefa
  FOR EACH ROW EXECUTE FUNCTION atualiza_atualizado_em();

-- RF-12, RF-13 | RN-01: tarefa obrigatória não aprovada trava o avanço de etapa.
-- RN-04: status OVERDUE é GRAVADO por uma rotina do back-end (job), não
-- calculado na consulta — assim o contador de atrasadas é um COUNT direto.
-- prazo é DATE (sem fuso) para não "voltar um dia" conforme o servidor.
CREATE TABLE tarefa (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id        UUID NOT NULL REFERENCES equipe (id) ON DELETE CASCADE,
  equipe_etapa_id  UUID NOT NULL REFERENCES equipe_etapa (id),
  modelo_id        UUID REFERENCES modelo_tarefa (id) ON DELETE SET NULL,
  titulo           VARCHAR(255) NOT NULL,
  descricao        TEXT,
  prazo            DATE NOT NULL,
  status           status_tarefa NOT NULL DEFAULT 'PENDING',
  obrigatoria      BOOLEAN NOT NULL DEFAULT FALSE,
  criado_por       UUID REFERENCES usuario (id) ON DELETE SET NULL,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  tarefa IS 'Tarefa concreta de uma equipe, em uma etapa da jornada DELA (equipe_etapa), com prazo.';
COMMENT ON COLUMN tarefa.obrigatoria IS 'RN-01: se TRUE e status <> APPROVED, bloqueia o avanço de etapa (salvo forçado pelo mentor).';

CREATE INDEX idx_tarefa_equipe ON tarefa (equipe_id);
CREATE INDEX idx_tarefa_etapa  ON tarefa (equipe_etapa_id);
CREATE INDEX idx_tarefa_status ON tarefa (status);
CREATE INDEX idx_tarefa_prazo  ON tarefa (prazo);

CREATE TRIGGER trg_tarefa_atualizado_em
  BEFORE UPDATE ON tarefa
  FOR EACH ROW EXECUTE FUNCTION atualiza_atualizado_em();

-- RF-14, RF-16 | Q3: o Pitch Vídeo é LINK (YouTube); BMC, VPD etc. são FILE.
-- Mesma tabela: para LINK as colunas de arquivo ficam NULL (CHECK abaixo).
-- Cada reenvio é uma NOVA linha com versao + 1; a versão 1 nunca é sobrescrita.
CREATE TABLE entrega (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id      UUID NOT NULL REFERENCES tarefa (id) ON DELETE CASCADE,
  enviado_por    UUID REFERENCES usuario (id) ON DELETE SET NULL,
  tipo           tipo_entrega NOT NULL,
  url            VARCHAR(2048) NOT NULL,   -- link (LINK) ou caminho do arquivo (FILE)
  nome_arquivo   VARCHAR(255),
  tamanho_bytes  BIGINT,
  tipo_mime      VARCHAR(100),
  versao         INT NOT NULL,
  enviado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tarefa_id, versao),
  CHECK (
    (tipo = 'LINK' AND nome_arquivo IS NULL AND tamanho_bytes IS NULL AND tipo_mime IS NULL)
    OR
    (tipo = 'FILE' AND nome_arquivo IS NOT NULL)
  )
);

COMMENT ON TABLE entrega IS 'RF-14/RF-16: entregas versionadas por tarefa. Reenvio = nova versão; o histórico fica todo aqui.';

CREATE INDEX idx_entrega_tarefa ON entrega (tarefa_id, versao DESC);

-- RF-15: feedback do mentor/admin ao aprovar ou pedir ajustes. Só INSERT: cada
-- rodada é uma linha nova, e a coluna entrega_id diz sobre qual versão foi.
CREATE TABLE comentario_tarefa (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id  UUID NOT NULL REFERENCES tarefa (id) ON DELETE CASCADE,
  entrega_id UUID REFERENCES entrega (id) ON DELETE SET NULL,
  autor_id   UUID REFERENCES usuario (id) ON DELETE SET NULL,
  decisao    status_tarefa,               -- APPROVED / REJECTED, ou NULL se for só um comentário
  texto      TEXT NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comentario_tarefa ON comentario_tarefa (tarefa_id, criado_em);

-- RF-17: lembretes automáticos. Guardamos `dias_antes` além de `enviar_em`:
-- quando o mentor adia o prazo, o back-end recalcula enviar_em dos lembretes
-- ainda não enviados (enviado_em IS NULL) a partir de dias_antes.
CREATE TABLE lembrete (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id  UUID NOT NULL REFERENCES tarefa (id) ON DELETE CASCADE,
  dias_antes INT NOT NULL CHECK (dias_antes >= 0),
  enviar_em  TIMESTAMPTZ NOT NULL,
  enviado_em TIMESTAMPTZ,
  UNIQUE (tarefa_id, dias_antes)
);

COMMENT ON TABLE lembrete IS 'RF-17: datas de lembrete de uma tarefa. enviado_em preenchido = já foi (o job não manda de novo).';

CREATE INDEX idx_lembrete_pendente ON lembrete (enviar_em) WHERE enviado_em IS NULL;

-- RF-10: anotação interna do mentor. Só as rotas de ADMIN/MENTOR leem esta
-- tabela; nenhuma consulta do aluno faz JOIN com ela.
CREATE TABLE anotacao_mentor (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id     UUID NOT NULL REFERENCES equipe (id) ON DELETE CASCADE,
  autor_id      UUID REFERENCES usuario (id) ON DELETE SET NULL,
  texto         TEXT NOT NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE anotacao_mentor IS 'RF-10: anotações privadas do mentor/admin sobre a equipe. Nunca expostas ao aluno.';

CREATE INDEX idx_anotacao_mentor_equipe ON anotacao_mentor (equipe_id, criado_em);

CREATE TRIGGER trg_anotacao_mentor_atualizado_em
  BEFORE UPDATE ON anotacao_mentor
  FOR EACH ROW EXECUTE FUNCTION atualiza_atualizado_em();

-- =====================================================================================
-- 6. NOTIFICAÇÕES (E-MAIL) E AUDITORIA
-- =====================================================================================

-- RF-18/RF-19/RF-20 | RNF-06: todo e-mail é registrado aqui ANTES de sair, e o
-- status vira SENT ou FAILED depois (tentativas conta os reenvios).
-- Os índices únicos parciais são o que impede mandar o mesmo e-mail duas vezes:
-- um lembrete só é enviado uma vez por destinatário, e o aviso de atraso idem.
CREATE TABLE notificacao (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id UUID REFERENCES usuario (id) ON DELETE SET NULL,
  email_destino   VARCHAR(255) NOT NULL,
  tipo            tipo_notificacao NOT NULL,
  assunto         VARCHAR(500) NOT NULL,
  status          status_notificacao NOT NULL DEFAULT 'PENDING',
  tentativas      INT NOT NULL DEFAULT 0,
  erro            TEXT,
  equipe_id       UUID REFERENCES equipe (id) ON DELETE SET NULL,
  tarefa_id       UUID REFERENCES tarefa (id) ON DELETE SET NULL,
  lembrete_id     UUID REFERENCES lembrete (id) ON DELETE SET NULL,
  enviado_em      TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notificacao IS 'RF-18: fila/log de e-mails. Os índices únicos parciais evitam envio duplicado de lembrete e de aviso de atraso.';

CREATE INDEX idx_notificacao_status ON notificacao (status, criado_em);

-- RF-17: cada lembrete vai uma única vez para cada destinatário
CREATE UNIQUE INDEX uq_notificacao_lembrete
  ON notificacao (lembrete_id, destinatario_id)
  WHERE lembrete_id IS NOT NULL;

-- RF-20: o aviso de "tarefa atrasada" vai uma única vez por tarefa e destinatário
CREATE UNIQUE INDEX uq_notificacao_atraso
  ON notificacao (tarefa_id, destinatario_id)
  WHERE tipo = 'OVERDUE';

-- RNF-05: auditoria de ações sensíveis (login, mudança de etapa, aprovação,
-- exclusão de conta...). Só INSERT.
CREATE TABLE auditoria (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID REFERENCES usuario (id) ON DELETE SET NULL,
  acao        VARCHAR(100) NOT NULL,
  entidade    VARCHAR(50) NOT NULL,
  entidade_id UUID,
  detalhes    JSONB,
  ip          VARCHAR(64),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_entidade ON auditoria (entidade, entidade_id);
CREATE INDEX idx_auditoria_criado   ON auditoria (criado_em DESC);

-- =====================================================================================
-- 7. DADOS INICIAIS
-- =====================================================================================

-- RF-06: as 6 etapas padrão
INSERT INTO etapa (numero, nome, descricao) VALUES
  (1, 'Envio da ideia',        'Formulário inicial preenchido pelo líder.'),
  (2, 'Contato com a equipe',  'Primeiro encontro com o mentor.'),
  (3, 'Entendendo a ideia',    'Problema, público-alvo e solução.'),
  (4, 'Proposta de valor',     'Value Proposition Design.'),
  (5, 'Modelo de negócio',     'Business Model Canvas.'),
  (6, 'Pitch e inscrição',     'Pitch Vídeo, Canvas final, VPD final e dados dos integrantes.');

-- RF-04: áreas/setores da ideia
INSERT INTO area_ideia (nome) VALUES
  ('Educação'), ('Saúde'), ('Tecnologia'), ('Sustentabilidade'), ('Agronegócio'),
  ('Finanças'), ('Serviços'), ('Indústria'), ('Comércio'), ('Social');

-- RF-11: modelos de tarefa por etapa
INSERT INTO modelo_tarefa (etapa_id, titulo, descricao, obrigatoria)
SELECT e.id, m.titulo, m.descricao, m.obrigatoria
  FROM (VALUES
    (2, 'Confirmar agendamento do 1º encontro',
        'Confirmar data e horário do primeiro encontro com o mentor.', TRUE),
    (3, 'Definir problema, público-alvo e solução',
        'Documentar o problema identificado, o público-alvo e a proposta de solução inicial.', TRUE),
    (4, 'Enviar Value Proposition Design',
        'Construir e enviar o Value Proposition Design da ideia.', TRUE),
    (5, 'Enviar Business Model Canvas',
        'Construir e enviar o Business Model Canvas da ideia.', TRUE),
    (6, 'Gravar Pitch Vídeo',
        'Gravar vídeo de pitch de até 3 minutos e enviar o link do YouTube.', TRUE),
    (6, 'Entregar Canvas final',
        'Versão final do Business Model Canvas após as revisões da mentoria.', TRUE),
    (6, 'Entregar VPD final',
        'Versão final do Value Proposition Design após as revisões da mentoria.', TRUE),
    (6, 'Confirmar dados dos integrantes',
        'Preencher os dados completos de todos os integrantes para a submissão ao InovAMF.', TRUE)
  ) AS m(numero, titulo, descricao, obrigatoria)
  JOIN etapa e ON e.numero = m.numero;

-- Administrador inicial. Senha: InfoHub@2026 (hash bcrypt) — TROQUE no 1º acesso.
INSERT INTO usuario (nome, email, senha_hash, perfil, consentimento_lgpd_em) VALUES
  ('Administrador InfoHub', 'admin@amf.edu.br',
   '$2b$10$H5VG6mNL0rartDSRoqkesu8sS9d017nszSpsCOgomW7pdl6H//PI6', 'ADMIN', NOW());

COMMIT;

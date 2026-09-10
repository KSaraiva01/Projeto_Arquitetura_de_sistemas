-- =====================================================================
-- InfoHub - Banco de Dados (versão simplificada)
-- Plataforma de acompanhamento da jornada de ideias/startups de alunos
-- Perfis: admin, mentor, aluno (líder ou integrante de equipe)
-- =====================================================================
-- Compatível com PostgreSQL. Usa IDs numéricos (SERIAL) e CHECK no lugar
-- de ENUM/triggers para manter o schema simples e fácil de ler.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) USUARIOS
-- Todas as pessoas do sistema: administradores, mentores e alunos.
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id            SERIAL PRIMARY KEY,
    nome          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    senha_hash    VARCHAR(255) NOT NULL,
    telefone      VARCHAR(20),
    curso         VARCHAR(100),
    semestre      VARCHAR(20),
    papel         VARCHAR(10)  NOT NULL DEFAULT 'aluno'
                  CHECK (papel IN ('admin', 'mentor', 'aluno')),
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMP    NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 2) EQUIPES
-- Cada equipe representa uma ideia/startup em acompanhamento no InfoHub.
-- ---------------------------------------------------------------------
CREATE TABLE equipes (
    id             SERIAL PRIMARY KEY,
    nome_ideia     VARCHAR(150) NOT NULL,
    descricao      TEXT NOT NULL,
    area           VARCHAR(100),
    etapa_ideia    VARCHAR(25) NOT NULL DEFAULT 'apenas_ideia'
                   CHECK (etapa_ideia IN
                          ('apenas_ideia', 'prototipo', 'mvp_desenvolvimento', 'mvp_pronto')),
    etapa_atual    INTEGER NOT NULL DEFAULT 1
                   CHECK (etapa_atual BETWEEN 1 AND 6),
    -- 1 Envio da ideia | 2 Contato com a equipe | 3 Entendendo a ideia
    -- 4 Proposta de valor | 5 Modelo de negócio | 6 Pitch e inscrição
    status         VARCHAR(20) NOT NULL DEFAULT 'ativa'
                   CHECK (status IN ('ativa', 'pronta_inovamf', 'encaminhada', 'inativa')),
    semestre       VARCHAR(20),
    como_conheceu  VARCHAR(100),
    criado_em      TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 3) MEMBROS_EQUIPE
-- Liga usuários (alunos) às equipes das quais participam.
-- Um aluno pode estar em mais de uma equipe; cada equipe tem 1 líder.
-- ---------------------------------------------------------------------
CREATE TABLE membros_equipe (
    id          SERIAL PRIMARY KEY,
    equipe_id   INTEGER NOT NULL REFERENCES equipes (id) ON DELETE CASCADE,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    papel       VARCHAR(11) NOT NULL DEFAULT 'integrante'
                CHECK (papel IN ('lider', 'integrante')),
    entrou_em   TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (equipe_id, usuario_id)
);


-- ---------------------------------------------------------------------
-- 4) MENTORES_EQUIPE
-- Liga mentores às equipes que acompanham (uma equipe pode ter vários
-- mentores; um mentor só enxerga as equipes que está vinculado).
-- ---------------------------------------------------------------------
CREATE TABLE mentores_equipe (
    id            SERIAL PRIMARY KEY,
    equipe_id     INTEGER NOT NULL REFERENCES equipes (id) ON DELETE CASCADE,
    mentor_id     INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    atribuido_em  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (equipe_id, mentor_id)
);


-- ---------------------------------------------------------------------
-- 5) HISTORICO_ETAPAS
-- Registra quando cada equipe concluiu/avançou de etapa na jornada.
-- ---------------------------------------------------------------------
CREATE TABLE historico_etapas (
    id             SERIAL PRIMARY KEY,
    equipe_id      INTEGER NOT NULL REFERENCES equipes (id) ON DELETE CASCADE,
    etapa          INTEGER NOT NULL CHECK (etapa BETWEEN 1 AND 6),
    alterado_por   INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
    concluida_em   TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 6) TAREFAS
-- Tarefas/entregáveis que cada equipe precisa cumprir em cada etapa.
-- ---------------------------------------------------------------------
CREATE TABLE tarefas (
    id            SERIAL PRIMARY KEY,
    equipe_id     INTEGER NOT NULL REFERENCES equipes (id) ON DELETE CASCADE,
    titulo        VARCHAR(150) NOT NULL,
    descricao     TEXT,
    etapa         INTEGER NOT NULL CHECK (etapa BETWEEN 1 AND 6),
    data_entrega  DATE NOT NULL,
    status        VARCHAR(15) NOT NULL DEFAULT 'pendente'
                  CHECK (status IN
                         ('pendente', 'em_andamento', 'entregue', 'atrasada', 'aprovada', 'reprovada')),
    obrigatoria   BOOLEAN NOT NULL DEFAULT FALSE,
    criado_por    INTEGER NOT NULL REFERENCES usuarios (id),
    criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 7) ENTREGAS
-- O arquivo ou link que o aluno envia para cumprir uma tarefa.
-- ---------------------------------------------------------------------
CREATE TABLE entregas (
    id             SERIAL PRIMARY KEY,
    tarefa_id      INTEGER NOT NULL REFERENCES tarefas (id) ON DELETE CASCADE,
    enviado_por    INTEGER NOT NULL REFERENCES usuarios (id),
    tipo           VARCHAR(10) NOT NULL CHECK (tipo IN ('arquivo', 'link')),
    url            VARCHAR(500) NOT NULL,
    nome_arquivo   VARCHAR(150),
    enviado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 8) COMENTARIOS
-- Feedback trocado em uma tarefa (ex.: mentor pede ajuste, aluno responde).
-- ---------------------------------------------------------------------
CREATE TABLE comentarios (
    id          SERIAL PRIMARY KEY,
    tarefa_id   INTEGER NOT NULL REFERENCES tarefas (id) ON DELETE CASCADE,
    autor_id    INTEGER NOT NULL REFERENCES usuarios (id),
    conteudo    TEXT NOT NULL,
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 9) ANOTACOES_MENTOR
-- Notas internas do mentor/admin sobre a equipe (não visíveis ao aluno).
-- ---------------------------------------------------------------------
CREATE TABLE anotacoes_mentor (
    id          SERIAL PRIMARY KEY,
    equipe_id   INTEGER NOT NULL REFERENCES equipes (id) ON DELETE CASCADE,
    autor_id    INTEGER NOT NULL REFERENCES usuarios (id),
    conteudo    TEXT NOT NULL,
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- 10) TOKENS_REDEFINICAO_SENHA
-- Suporte ao fluxo de "esqueci minha senha".
-- ---------------------------------------------------------------------
CREATE TABLE tokens_redefinicao_senha (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL UNIQUE,
    expira_em   TIMESTAMP NOT NULL,
    usado       BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- Índices para as buscas mais comuns da aplicação
-- ---------------------------------------------------------------------
CREATE INDEX idx_equipes_status        ON equipes (status);
CREATE INDEX idx_equipes_etapa_atual   ON equipes (etapa_atual);
CREATE INDEX idx_membros_equipe_user   ON membros_equipe (usuario_id);
CREATE INDEX idx_mentores_equipe_user  ON mentores_equipe (mentor_id);
CREATE INDEX idx_tarefas_equipe        ON tarefas (equipe_id);
CREATE INDEX idx_tarefas_status        ON tarefas (status);
CREATE INDEX idx_tarefas_data_entrega  ON tarefas (data_entrega);
CREATE INDEX idx_entregas_tarefa       ON entregas (tarefa_id);
CREATE INDEX idx_comentarios_tarefa    ON comentarios (tarefa_id);
CREATE INDEX idx_anotacoes_equipe      ON anotacoes_mentor (equipe_id);


-- ---------------------------------------------------------------------
-- Dados iniciais de exemplo (opcional, útil para testar a aplicação)
-- ---------------------------------------------------------------------
INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES
    ('Administrador InfoHub', 'admin@infohub.com', '$2b$10$hash_de_exemplo', 'admin'),
    ('Mentor Exemplo', 'mentor@infohub.com', '$2b$10$hash_de_exemplo', 'mentor'),
    ('Aluno Exemplo', 'aluno@infohub.com', '$2b$10$hash_de_exemplo', 'aluno');

INSERT INTO equipes (nome_ideia, descricao, area, semestre) VALUES
    ('App de Caronas Universitárias', 'Aplicativo para organizar caronas entre alunos da faculdade.', 'Mobilidade', '3º semestre');

INSERT INTO membros_equipe (equipe_id, usuario_id, papel) VALUES
    (1, 3, 'lider');

INSERT INTO mentores_equipe (equipe_id, mentor_id) VALUES
    (1, 2);

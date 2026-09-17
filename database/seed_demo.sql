-- =====================================================================================
--  INFOHUB — DADOS DE DEMONSTRAÇÃO (opcional, só para desenvolvimento)
--
--  Popula o banco com um cenário completo para o kanban, o calendário e os
--  relatórios terem o que mostrar: 6 equipes espalhadas pelas 6 etapas, com
--  líder, integrantes, mentores, jornada, histórico, tarefas e lembretes.
--
--  ATENÇÃO: começa apagando TODAS as equipes (e, em cascata, membros, mentores,
--  jornada, tarefas, entregas, lembretes e histórico). NÃO rode em produção.
--  Usuários, áreas, etapas e modelos de tarefa são preservados.
--
--  Pré-requisito: database/schema.sql já aplicado.
--
--  Como aplicar:
--    psql -U postgres -h localhost -d infohub -f database/seed_demo.sql
--  ou, pelo back-end:  npm run db:seed:demo
--
--  Senha de todos os usuários criados aqui: InfoHub@2026
-- =====================================================================================

BEGIN;

SET client_encoding TO 'UTF8';

DO $$
DECLARE
  -- bcrypt de "InfoHub@2026" (o mesmo do admin criado pelo schema.sql)
  v_senha_hash TEXT := '$2b$10$H5VG6mNL0rartDSRoqkesu8sS9d017nszSpsCOgomW7pdl6H//PI6';
  v_semestre   TEXT := to_char(CURRENT_DATE, 'YYYY') || '/' ||
                       CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 6 THEN '1' ELSE '2' END;
  v_admin_id   UUID;
  v_equipe_id  UUID;
  v_usuario_id UUID;
  v_mentor_id  UUID;
  v_tarefa_id  UUID;
  v_etapa_id   UUID;
  v_prazo      DATE;
  v_status     status_tarefa;
  v_contador   INT := 0;
  v_apagadas   INT;
  eq           RECORD;
  integrante   RECORD;
  modelo       RECORD;
  etapa_eq     RECORD;
  email_mentor TEXT;
BEGIN
  DELETE FROM equipe;
  GET DIAGNOSTICS v_apagadas = ROW_COUNT;
  RAISE NOTICE '[demo] % equipe(s) anterior(es) removida(s).', v_apagadas;

  -- ---------------------------------------------------------------------------
  -- Contas: administrador (vem do schema.sql) e mentores
  -- ---------------------------------------------------------------------------
  SELECT id INTO v_admin_id FROM usuario WHERE LOWER(email) = 'admin@amf.edu.br';

  INSERT INTO usuario (nome, email, senha_hash, perfil, consentimento_lgpd_em)
  SELECT novo.nome, novo.email, v_senha_hash, 'MENTOR', NOW()
    FROM (VALUES
      ('Ana Beatriz Ramos', 'ana.ramos@amf.edu.br'),
      ('Ricardo Ferreira',  'ricardo.ferreira@amf.edu.br')
    ) AS novo(nome, email)
   WHERE NOT EXISTS (SELECT 1 FROM usuario u WHERE LOWER(u.email) = LOWER(novo.email));

  -- ---------------------------------------------------------------------------
  -- Equipes: uma por etapa, para o kanban nascer com as 6 colunas preenchidas
  -- ---------------------------------------------------------------------------
  FOR eq IN
    SELECT * FROM (VALUES
      ('EcoTrack',
       'Aplicativo para monitoramento de pegada de carbono pessoal, com gamificação e desafios semanais.',
       'Sustentabilidade', 'PROTOTYPE', 5,
       'Lucas Oliveira', 'lucas.oliveira@aluno.amf.edu.br', 'Sistemas de Informação', '6º semestre', '(55) 99101-2233',
       ARRAY['ana.ramos@amf.edu.br']),
      ('MedConnect',
       'Plataforma que conecta pacientes de áreas rurais a médicos por telemedicina, com triagem inicial.',
       'Saúde', 'JUST_IDEA', 2,
       'Mariana Santos', 'mariana.santos@aluno.amf.edu.br', 'Administração', '4º semestre', '(55) 99202-3344',
       ARRAY['ana.ramos@amf.edu.br']),
      ('AgroSmart',
       'Sensores de baixo custo para pequenos produtores acompanharem a umidade do solo pelo celular.',
       'Agronegócio', 'MVP_IN_DEV', 6,
       'Pedro Henrique Costa', 'pedro.costa@aluno.amf.edu.br', 'Sistemas de Informação', '8º semestre', '(55) 99303-4455',
       ARRAY['ana.ramos@amf.edu.br', 'ricardo.ferreira@amf.edu.br']),
      ('EduPlay',
       'Jogos educativos para alfabetização em escolas municipais, com acompanhamento para o professor.',
       'Educação', 'PROTOTYPE', 3,
       'Juliana Prado', 'juliana.prado@aluno.amf.edu.br', 'Pedagogia', '5º semestre', '(55) 99404-5566',
       ARRAY['ricardo.ferreira@amf.edu.br']),
      ('Sabor Local',
       'Marketplace que conecta produtores da região a restaurantes, encurtando a cadeia de fornecimento.',
       'Comércio', 'JUST_IDEA', 1,
       'Gabriel Almeida', 'gabriel.almeida@aluno.amf.edu.br', 'Gastronomia', '3º semestre', '(55) 99505-6677',
       ARRAY[]::TEXT[]),
      ('FinanceJovem',
       'Trilha de educação financeira para universitários, com simulador de orçamento mensal.',
       'Finanças', 'MVP_READY', 4,
       'Beatriz Moraes', 'beatriz.moraes@aluno.amf.edu.br', 'Ciências Contábeis', '7º semestre', '(55) 99606-7788',
       ARRAY['ricardo.ferreira@amf.edu.br'])
    ) AS t(nome, descricao, area, estagio_ideia, etapa_numero,
           lider_nome, lider_email, lider_curso, lider_semestre, lider_telefone,
           mentores)
  LOOP
    INSERT INTO equipe (nome, descricao, area_id, estagio_ideia, semestre, como_conheceu)
    SELECT eq.nome, eq.descricao, a.id, eq.estagio_ideia::estagio_ideia, v_semestre,
           'Professor(a) ou coordenação'
      FROM area_ideia a
     WHERE a.nome = eq.area
    RETURNING id INTO v_equipe_id;

    IF v_equipe_id IS NULL THEN
      RAISE EXCEPTION 'Área "%" não existe. Aplique o database/schema.sql antes.', eq.area;
    END IF;

    -- Jornada da equipe: cópia das 6 etapas do catálogo
    INSERT INTO equipe_etapa (equipe_id, etapa_id, nome, descricao, ordem)
    SELECT v_equipe_id, e.id, e.nome, e.descricao, e.numero FROM etapa e;

    -- Etapa atual = a de número eq.etapa_numero
    SELECT ee.id INTO v_etapa_id
      FROM equipe_etapa ee JOIN etapa e ON e.id = ee.etapa_id
     WHERE ee.equipe_id = v_equipe_id AND e.numero = eq.etapa_numero;

    UPDATE equipe SET etapa_atual_id = v_etapa_id WHERE id = v_equipe_id;

    -- Líder (Q1: aluno com papel LEADER)
    SELECT id INTO v_usuario_id FROM usuario WHERE LOWER(email) = LOWER(eq.lider_email);

    IF v_usuario_id IS NULL THEN
      INSERT INTO usuario (nome, email, senha_hash, perfil, curso, semestre, telefone, consentimento_lgpd_em)
      VALUES (eq.lider_nome, eq.lider_email, v_senha_hash, 'STUDENT',
              eq.lider_curso, eq.lider_semestre, eq.lider_telefone, NOW())
      RETURNING id INTO v_usuario_id;
    END IF;

    INSERT INTO equipe_membro (equipe_id, usuario_id, papel) VALUES (v_equipe_id, v_usuario_id, 'LEADER');

    -- Integrantes (mesma conta STUDENT, papel MEMBER)
    FOR integrante IN
      SELECT * FROM (VALUES
        ('EcoTrack',     'Fernanda Lima',      'fernanda.lima@aluno.amf.edu.br', 'Administração'),
        ('EcoTrack',     'João Pedro Martins', 'joao.martins@aluno.amf.edu.br',  'Administração'),
        ('MedConnect',   'Carla Souza',        'carla.souza@aluno.amf.edu.br',   'Ontopsicologia'),
        ('AgroSmart',    'Rafael Dias',        'rafael.dias@aluno.amf.edu.br',   'Ciências Contábeis'),
        ('AgroSmart',    'Bianca Rocha',       'bianca.rocha@aluno.amf.edu.br',  'Administração'),
        ('EduPlay',      'Tiago Nunes',        'tiago.nunes@aluno.amf.edu.br',   'Sistemas de Informação'),
        ('FinanceJovem', 'Henrique Vaz',       'henrique.vaz@aluno.amf.edu.br',  'Direito')
      ) AS m(equipe, nome, email, curso)
      WHERE m.equipe = eq.nome
    LOOP
      SELECT id INTO v_usuario_id FROM usuario WHERE LOWER(email) = LOWER(integrante.email);

      IF v_usuario_id IS NULL THEN
        INSERT INTO usuario (nome, email, senha_hash, perfil, curso, consentimento_lgpd_em)
        VALUES (integrante.nome, integrante.email, v_senha_hash, 'STUDENT', integrante.curso, NOW())
        RETURNING id INTO v_usuario_id;
      END IF;

      INSERT INTO equipe_membro (equipe_id, usuario_id, papel) VALUES (v_equipe_id, v_usuario_id, 'MEMBER');
    END LOOP;

    -- Mentores (Q10/Q11)
    FOREACH email_mentor IN ARRAY eq.mentores LOOP
      SELECT id INTO v_mentor_id FROM usuario WHERE LOWER(email) = LOWER(email_mentor);
      INSERT INTO equipe_mentor (equipe_id, mentor_id, atribuido_por)
      VALUES (v_equipe_id, v_mentor_id, v_admin_id);
    END LOOP;

    -- RF-08: histórico — entrada na etapa 1 no cadastro e um avanço a cada 15 dias
    FOR etapa_eq IN
      SELECT ee.id, ee.ordem,
             LAG(ee.id) OVER (ORDER BY ee.ordem) AS anterior_id
        FROM equipe_etapa ee
       WHERE ee.equipe_id = v_equipe_id AND ee.ordem <= eq.etapa_numero
       ORDER BY ee.ordem
    LOOP
      INSERT INTO historico_etapa (equipe_id, de_equipe_etapa_id, para_equipe_etapa_id, movido_por, movido_em)
      VALUES (v_equipe_id, etapa_eq.anterior_id, etapa_eq.id,
              CASE WHEN etapa_eq.anterior_id IS NULL THEN NULL ELSE v_admin_id END,
              NOW() - ((eq.etapa_numero - etapa_eq.ordem) * 15 || ' days')::interval);
    END LOOP;

    -- RF-11/RF-12: tarefas a partir dos modelos, até a etapa seguinte à atual.
    -- Etapas já concluídas entram aprovadas; a atual e a seguinte ficam em
    -- aberto, com prazos ao redor de hoje para o calendário ter movimento.
    FOR modelo IN
      SELECT m.id, m.titulo, m.descricao, m.obrigatoria, e.numero, ee.id AS equipe_etapa_id
        FROM modelo_tarefa m
        JOIN etapa e         ON e.id = m.etapa_id
        JOIN equipe_etapa ee ON ee.etapa_id = e.id AND ee.equipe_id = v_equipe_id
       WHERE m.ativo AND e.numero <= LEAST(eq.etapa_numero + 1, 6)
       ORDER BY e.numero, m.titulo
    LOOP
      v_contador := v_contador + 1;

      IF modelo.numero < eq.etapa_numero THEN
        v_prazo  := CURRENT_DATE - ((eq.etapa_numero - modelo.numero) * 15 + (v_contador % 5));
        v_status := 'APPROVED';
      ELSIF modelo.numero = eq.etapa_numero THEN
        v_prazo  := CURRENT_DATE + (CASE v_contador % 4 WHEN 0 THEN -6 WHEN 1 THEN 0 WHEN 2 THEN 5 ELSE 12 END);
        v_status := CASE
                      WHEN v_prazo < CURRENT_DATE THEN 'OVERDUE'
                      WHEN v_contador % 3 = 0     THEN 'SUBMITTED'
                      ELSE 'PENDING'
                    END;
      ELSE
        v_prazo  := CURRENT_DATE + (14 + (v_contador % 3) * 6);
        v_status := 'PENDING';
      END IF;

      INSERT INTO tarefa (equipe_id, equipe_etapa_id, modelo_id, titulo, descricao,
                          prazo, status, obrigatoria, criado_por)
      VALUES (v_equipe_id, modelo.equipe_etapa_id, modelo.id, modelo.titulo, modelo.descricao,
              v_prazo, v_status, modelo.obrigatoria, v_admin_id)
      RETURNING id INTO v_tarefa_id;

      -- Tarefas aprovadas ou entregues têm uma entrega registrada (versão 1)
      IF v_status IN ('APPROVED', 'SUBMITTED') THEN
        INSERT INTO entrega (tarefa_id, enviado_por, tipo, url, versao, enviado_em)
        SELECT v_tarefa_id, m.usuario_id, 'LINK',
               'https://drive.google.com/demo/' || v_tarefa_id, 1,
               (v_prazo - 1 + TIME '18:00')::timestamptz
          FROM equipe_membro m
         WHERE m.equipe_id = v_equipe_id AND m.papel = 'LEADER';
      END IF;

      -- RF-17: dois lembretes por tarefa em aberto — 3 e 1 dia(s) antes, às 9h.
      -- O que já passou entra como enviado.
      IF v_status <> 'APPROVED' THEN
        INSERT INTO lembrete (tarefa_id, dias_antes, enviar_em, enviado_em)
        SELECT v_tarefa_id, dias,
               ((v_prazo - dias) + TIME '09:00')::timestamptz,
               CASE WHEN ((v_prazo - dias) + TIME '09:00')::timestamptz < NOW()
                    THEN ((v_prazo - dias) + TIME '09:00')::timestamptz END
          FROM unnest(ARRAY[3, 1]) AS dias;
      END IF;
    END LOOP;

    RAISE NOTICE '[demo] equipe "%" criada na etapa %.', eq.nome, eq.etapa_numero;
  END LOOP;

  RAISE NOTICE '[demo] % tarefa(s) criada(s).', v_contador;
END
$$;

COMMIT;

-- =====================================================================================
--  Acessos criados (senha: InfoHub@2026)
--
--    ADMIN    admin@amf.edu.br                  vê todas as equipes
--    MENTOR   ana.ramos@amf.edu.br              EcoTrack, MedConnect e AgroSmart
--    MENTOR   ricardo.ferreira@amf.edu.br       AgroSmart, EduPlay e FinanceJovem
--    ALUNO    lucas.oliveira@aluno.amf.edu.br   líder da EcoTrack
--    ALUNO    fernanda.lima@aluno.amf.edu.br    integrante da EcoTrack
-- =====================================================================================

create table projeto (
    id_projeto serial primary key,
    nome_projeto varchar(100) not null,
    nome_lider varchar(100) not null references usuario_cargo(id_usuario_cargo),
    descricao_projeto text not null,
    data_inicio date not null,
    area_projeto varchar(100) not null check (area_projeto in ('Saúde', 'Educação', 'Meio Ambiente', 'Tecnologia', 'Cultura', 'Esporte', 'Outros'))
    equipe_projeto varchar(100) not null references equipe(id_equipe)
)

create table usuario(
    id_usuario serial primary key,
    nome_usuario varchar(100) not null,
    email_usuario varchar(100) not null unique,
    telefone_usuario varchar(20) not null,
    senha_usuario varchar(100) not null
)

create table usuario_cargo(
    id_usuario_cargo serial primary key,
    id_usuario integer not null references usuario(id_usuario),
    id_cargo integer not null references cargo(id_cargo)
)

create table cargo(
    id_cargo serial primary key,
    nome_cargo varchar(100) not null check (nome_cargo in ('Aluno', 'Mentor', 'Coordenador', 'Adm','Aluno_lider'))
)


create table curso(
    id_curso serial primary key,
    nome_curso varchar(100) not null,
    semestre_curso varchar(100) not null
)

create table curso_usuario(
    id_curso integer not null references curso(id_curso),
    id_usuario integer not null references usuario(id_usuario)
)

create table equipe(
    id_equipe serial primary key,
    nome_equipe varchar(100) not null
)

create table equipe_usuario(
    id_equipe integer not null references equipe(id_equipe),
    id_usuario integer not null references usuario(id_usuario)
)

create table etapa(
    id_etapa serial primary key,
    nome_etapa varchar(100) not null,
    descricao_etapa text not null,
)

create table etapa_projeto(
    id_etapa integer not null references etapa(id_etapa),
    id_projeto integer not null references projeto(id_projeto)
)


CREATE TABLE tarefa (
    id_tarefa SERIAL PRIMARY KEY,
    projeto_id INT NOT NULL references projeto(id_projeto),
    etapa_id INT NOT NULL references etapa(id_etapa),
    titulo_tarefa VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_entrega TIMESTAMP NOT NULL, 
    status_tarefa VARCHAR(50) NOT NULL CHECK (status IN ('Pendente', 'Em andamento', 'Entregue', 'Atrasada', 'Aprovada', 'Reprovada/Ajustar')),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);

create table lembretes(
    id_lembrete serial primary key,
    tarefa_id integer not null references tarefa(id_tarefa),
    titulo_lembrete varchar(100) not null,
    dias_antecedencia integer not null check (dias_antecedencia >= 0)
    data_emissao timestamp not null default current_timestamp
    email_usuario varchar(100) not null references usuario(email_usuario)
    
)

create table log_relatorio(
    id_log serial primary key,
    tarefa_id integer not null references tarefa(id_tarefa),
    data_geracao timestamp not null default current_timestamp,
)
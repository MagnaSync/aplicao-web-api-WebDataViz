-- Arquivo de apoio para criar as tabelas usadas pela API do MagnaSync.
-- Você precisa executar os comandos no banco de dados para criar as tabelas,
-- ter este arquivo aqui não significa que a tabela em seu BD estará como abaixo!

/*
comandos para mysql server
*/

CREATE DATABASE IF NOT EXISTS magnasync;
USE magnasync;



CREATE TABLE hospital (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(150) NOT NULL,
    cnpj CHAR(14) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL
);

CREATE TABLE endereco (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cep CHAR(8) NOT NULL,
    logradouro VARCHAR(150) NOT NULL,
    numero VARCHAR(45) NOT NULL,
    complemento VARCHAR(45) NULL
);
    
CREATE TABLE cargo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    funcao VARCHAR(60) NOT NULL
);
	
CREATE TABLE funcionario (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
	senha VARCHAR(145) NOT NULL,
    hospital_id INT NOT NULL,
    cargo_id INT NOT NULL,
    FOREIGN KEY (hospital_id) REFERENCES hospital(id),
    FOREIGN KEY (cargo_id) REFERENCES cargo(id)
);

CREATE TABLE contato (
    id INT PRIMARY KEY AUTO_INCREMENT,
    telefone VARCHAR(11),
    email VARCHAR(45),
    fkFuncionario INT NOT NULL,
    FOREIGN KEY (fkFuncionario) REFERENCES funcionario(id)
);

CREATE TABLE equipamento (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fabricante VARCHAR(60) NULL,
    mac_adress CHAR(17) NOT NULL,
    hospital_id INT NOT NULL,
    FOREIGN KEY (hospital_id) REFERENCES hospital(id)
);

CREATE TABLE unidade (
    id INT PRIMARY KEY AUTO_INCREMENT,
    medida VARCHAR(45) UNIQUE not null
);

CREATE TABLE tipoComponente (
	id INT PRIMARY KEY AUTO_INCREMENT,
    tipo VARCHAR (45) unique not null
);

CREATE TABLE componente (
	id INT PRIMARY KEY AUTO_INCREMENT,
    valor bigint,
    fkTipo INT,
    fkUnidade INT,
    FOREIGN KEY (fkTipo) REFERENCES tipoComponente(id),
    FOREIGN KEY (fkUnidade) REFERENCES unidade(id)
);


CREATE TABLE comandos (
    id INT AUTO_INCREMENT,
    fkTipo INT NOT NULL,
    biblioteca VARCHAR(45),
    comando VARCHAR(45),
    descricao VARCHAR(60) NOT NULL,
    PRIMARY KEY (id, fkTipo),
    FOREIGN KEY (fkTipo) REFERENCES tipoComponente(id)
);

CREATE TABLE parametro (
    id INT,
    fkEquipamento INT NOT NULL,
    fkComponente INT NOT NULL,
    metrica INT,
    PRIMARY KEY (id, fkEquipamento, fkComponente),
    FOREIGN KEY (fkEquipamento) REFERENCES equipamento(id),
    FOREIGN KEY (fkComponente) REFERENCES componente(id)
);
CREATE TABLE leitura (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fkEquipamento INT NOT NULL,
    fkComponente INT NOT NULL,
    fkMetrica INT NOT NULL,
    valor DOUBLE NOT NULL,
    data_hora DATETIME NOT NULL,
    FOREIGN KEY (
		fkMetrica,
        fkEquipamento,
        fkComponente
    ) REFERENCES parametro (
		id,
        fkEquipamento,
        fkComponente
    )
);

CREATE TABLE categoria_alerta (
    id INT PRIMARY KEY AUTO_INCREMENT,
    classificacao VARCHAR(45) NOT NULL
);

CREATE TABLE alerta (
    id INT PRIMARY KEY AUTO_INCREMENT,
    data_hora DATETIME NOT NULL,
    leitura_id INT NOT NULL,
    categoria_alerta_id INT NOT NULL,
    FOREIGN KEY (leitura_id) REFERENCES leitura(id),
    FOREIGN KEY (categoria_alerta_id) REFERENCES categoria_alerta(id)
);

CREATE TABLE status_chamado (
    id INT PRIMARY KEY AUTO_INCREMENT,
    descricao VARCHAR(20) NOT NULL 
);


CREATE TABLE chamado (
    id INT PRIMARY KEY AUTO_INCREMENT,
    slack_canal_id VARCHAR(50) NOT NULL,
    slack_mensagem_ts VARCHAR(50) NOT NULL,
    data_abertura DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data_fim DATETIME NOT NULL,
    fkAlerta INT NOT NULL,
    fkStatus INT NOT NULL DEFAULT 1,
    FOREIGN KEY (fkAlerta) REFERENCES alerta(id),
    FOREIGN KEY (fkStatus) REFERENCES status_chamado(id)
);


-- ============================================================
-- INSERTS
-- ============================================================

INSERT INTO status_chamado (descricao) VALUES
('Aberto'),
('Em Andamento'),
('Finalizado'),
('Cancelado');

INSERT INTO unidade (medida) VALUES
('GB'),
('MB'),
('TB'),
('NucleosFisicos'),
('NucleosLogicos'),
('%'),
('Mhz'),
('MB/s'),
('ms');

INSERT INTO tipoComponente (tipo) VALUES
('Ram'),
('Disco'),
('Processador'),
('Rede - Download'),
('Rede - Upload'),
('Rede - Latência'),
('Rede - Download (%)'),
('Rede - Upload (%)');

-- Componentes de rede (valor fica NULL; fkTipo e fkUnidade vêm das tabelas acima)
INSERT INTO componente (fkTipo, fkUnidade) VALUES
(
    (SELECT id FROM tipoComponente WHERE tipo = 'Rede - Download'),
    (SELECT id FROM unidade WHERE medida = 'MB/s')
),
(
    (SELECT id FROM tipoComponente WHERE tipo = 'Rede - Upload'),
    (SELECT id FROM unidade WHERE medida = 'MB/s')
),
(
    (SELECT id FROM tipoComponente WHERE tipo = 'Rede - Latência'),
    (SELECT id FROM unidade WHERE medida = 'ms')
),
(
    (SELECT id FROM tipoComponente WHERE tipo = 'Rede - Download (%)'),
    (SELECT id FROM unidade WHERE medida = '%')
),
(
    (SELECT id FROM tipoComponente WHERE tipo = 'Rede - Upload (%)'),
    (SELECT id FROM unidade WHERE medida = '%')
);

-- Comandos de monitoramento de cada tipo (é daqui que sai o 2º menu do Python)
-- Para criar uma nova opção de monitoramento, basta dar um INSERT aqui.
-- Colunas de comandos: fkTipo, biblioteca, comando, descricao
INSERT INTO comandos (fkTipo, biblioteca, comando, descricao) VALUES
(1, 'psutil', 'virtual_memory.percent', 'Percentual de uso'),
(1, 'psutil', 'virtual_memory.total', 'Total'),
(1, 'psutil', 'virtual_memory.available', 'Disponível'),
(2, 'psutil', 'disk_usage.percent', 'Percentual de uso'),
(2, 'psutil', 'disk_usage.total', 'Total'),
(2, 'psutil', 'disk_usage.free', 'Disponível'),
(3, 'psutil', 'cpu_percent', 'Percentual de uso'),
(3, 'psutil', 'cpu_freq', 'Frequência atual'),
(3, 'psutil', 'cpu_count', 'Núcleos lógicos');

INSERT INTO cargo (funcao) VALUES
('Gerente'),
('Analista'),
('Administração');

-- Hospitais (colunas: nome, cnpj, telefone, email)
-- CEP e número ficam na tabela endereco
INSERT INTO hospital (nome, cnpj, telefone, email) VALUES
('Hospital_MagnaSync', '00000000000000', '1100000000', 'magnasync@hospital.com'),
('Hospital_das_Clinicas', '10000000000011', '1110000000', 'hospitaldasclinicas@hospital.com');

-- Endereços (colunas: cep, logradouro, numero, complemento)
-- Obs.: pela estrutura atual não existe FK entre hospital e endereco
INSERT INTO endereco (cep, logradouro, numero, complemento) VALUES
('00000000', 'Rua MagnaSync', '100', 'Sala 1'),
('00000090', 'Avenida das Clínicas', '101', NULL);

INSERT INTO categoria_alerta (classificacao) VALUES
('Atenção'),
('Crítico'),
('Bloqueio');

-- Funcionários (colunas: nome, senha, hospital_id, cargo_id)
-- E-mail e telefone ficam na tabela contato
INSERT INTO funcionario (nome, senha, hospital_id, cargo_id) VALUES
(
    'Carlos Magno',
    'sptech',
    (SELECT id FROM hospital WHERE nome = 'Hospital_MagnaSync'),
    (SELECT id FROM cargo WHERE funcao = 'Administração')
),
(
    'Bianca Silva',
    'sptech',
    (SELECT id FROM hospital WHERE nome = 'Hospital_das_Clinicas'),
    (SELECT id FROM cargo WHERE funcao = 'Gerente')
);

-- Contatos (colunas: telefone VARCHAR(11), email, fkFuncionario)
INSERT INTO contato (telefone, email, fkFuncionario) VALUES
(
    '11999990001',
    'carlosmagno@magnasync.com',
    (SELECT id FROM funcionario WHERE nome = 'Carlos Magno')
),
(
    '11999990002',
    'bianca@hospital.com',
    (SELECT id FROM funcionario WHERE nome = 'Bianca Silva')
);

-- UPDATE cargo SET funcao = 'Engenharia Clínica' WHERE funcao = 'Gerente';


-- ============================================================
-- CONSULTAS
-- ============================================================

-- Select que vê quando o alerta foi acionado
SELECT a.id, h.nome AS hospital, e.mac_adress, t.tipo AS componente,
       ca.classificacao, l.valor, a.data_hora
FROM alerta a
JOIN categoria_alerta ca ON ca.id = a.categoria_alerta_id
JOIN leitura l ON l.id = a.leitura_id
JOIN equipamento e ON e.id = l.fkEquipamento
JOIN hospital h ON h.id = e.hospital_id
JOIN componente c ON c.id = l.fkComponente
JOIN tipoComponente t ON t.id = c.fkTipo
ORDER BY a.data_hora DESC;

SELECT
    f.nome AS "Nome do funcionário",
    h.nome AS "Nome do Hospital",
    c.funcao AS "Função",
    ct.email AS "E-mail",
    ct.telefone AS "Telefone"
FROM funcionario AS f
JOIN cargo AS c ON f.cargo_id = c.id
JOIN hospital AS h ON f.hospital_id = h.id
LEFT JOIN contato AS ct ON ct.fkFuncionario = f.id;

SELECT * FROM funcionario;
SELECT * FROM contato;
SELECT * FROM hospital;
SELECT * FROM endereco;
SELECT * FROM leitura;
SELECT * FROM equipamento;
SELECT * FROM unidade;
SELECT * FROM componente;
SELECT cargo.funcao FROM magnasync.cargo;


-- View do histórico de leituras
-- A tabela comandos não tem fkUnidade, então a unidade vem só de componente.fkUnidade
CREATE OR REPLACE VIEW vw_historico_leituras AS
SELECT
    l.id AS id_leitura,
    h.nome AS hospital,
    e.id AS id_equipamento,
    e.mac_adress AS mac_address,
    tc.tipo AS componente,
    cmd.descricao AS metrica,
    ROUND(l.valor, 2) AS valor_captura,
    u.medida AS unidade,
    l.data_hora AS data_hora
FROM leitura l
JOIN parametro p
    ON l.fkMetrica = p.id
    AND l.fkEquipamento = p.fkEquipamento
    AND l.fkComponente = p.fkComponente
JOIN equipamento e
    ON l.fkEquipamento = e.id
JOIN hospital h
    ON e.hospital_id = h.id
JOIN componente c
    ON l.fkComponente = c.id
JOIN tipoComponente tc
    ON c.fkTipo = tc.id
LEFT JOIN comandos cmd
    ON p.metrica = cmd.id
    AND cmd.fkTipo = tc.id
LEFT JOIN unidade u
    ON c.fkUnidade = u.id;

SELECT * FROM vw_historico_leituras;

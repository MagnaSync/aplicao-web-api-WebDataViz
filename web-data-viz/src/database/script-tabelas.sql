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
    email VARCHAR(150) NOT NULL,
    cep CHAR(8) NOT NULL,
    numero VARCHAR(10) NOT NULL
);
    
CREATE TABLE cargo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    funcao VARCHAR(60) NOT NULL
);
	
CREATE TABLE funcionario (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    senha VARCHAR(100) NOT NULL,
    hospital_id INT NOT NULL,
    cargo_id INT NOT NULL,
    FOREIGN KEY (hospital_id) REFERENCES hospital(id),
    FOREIGN KEY (cargo_id) REFERENCES cargo(id)
);

CREATE TABLE equipamento (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fabricante VARCHAR(60) NULL,
    mac_adress CHAR(17) NOT NULL,
    hospital_id INT NOT NULL,
    FOREIGN KEY (hospital_id) REFERENCES hospital(id)
);

CREATE TABLE categoria_status (
    id INT PRIMARY KEY AUTO_INCREMENT,
    classificacao VARCHAR(45)
);

CREATE TABLE status_equipamento (
    id INT PRIMARY KEY AUTO_INCREMENT,
    data_hora DATETIME NOT NULL,
    manutencao_id INT NOT NULL,
    classificacao_status_id INT NOT NULL,
    equipamento_id INT NOT NULL,
    FOREIGN KEY (classificacao_status_id) REFERENCES categoria_status(id),
    FOREIGN KEY (equipamento_id) REFERENCES equipamento(id)
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
    fkUnidade INT NOT NULL,
    PRIMARY KEY (id, fkTipo),
    FOREIGN KEY (fkTipo) REFERENCES tipoComponente(id),
    FOREIGN KEY (fkUnidade) REFERENCES unidade(id)
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

INSERT INTO unidade (medida) VALUES ('KB/s'), ('ms');

INSERT INTO tipoComponente (tipo) VALUES
('Rede - Download'),
('Rede - Upload'),
('Rede - Latencia');

INSERT INTO componente (valor, fkTipo, fkUnidade) VALUES
(NULL, (SELECT id FROM tipoComponente WHERE tipo = 'Rede - Download'), (SELECT id FROM unidade WHERE medida = 'KB/s')),
(NULL, (SELECT id FROM tipoComponente WHERE tipo = 'Rede - Upload'),   (SELECT id FROM unidade WHERE medida = 'KB/s')),
(NULL, (SELECT id FROM tipoComponente WHERE tipo = 'Rede - Latencia'), (SELECT id FROM unidade WHERE medida = 'ms'));

INSERT INTO unidade (medida) VALUES 
('GB'),
('MB'),
('TB'),
('NucleosFisicos'),
('NucleosLogicos'),
('%'),
('Mhz');

INSERT INTO tipoComponente (tipo) VALUES
('Ram'),
('Disco'),
('Processador');


-- Comandos de monitoramento de cada tipo (é daqui que sai o 2º menu do Python)
-- Para criar uma nova opção de monitoramento, basta dar um INSERT aqui.
INSERT INTO comandos (fkTipo, biblioteca, comando, descricao, fkUnidade) VALUES
(1, 'psutil', 'virtual_memory.percent',   'Percentual de uso', 6),
(1, 'psutil', 'virtual_memory.total',     'Total',             1),
(1, 'psutil', 'virtual_memory.available', 'Disponível',        1),
(2, 'psutil', 'disk_usage.percent',       'Percentual de uso', 6),
(2, 'psutil', 'disk_usage.total',         'Total',             1),
(2, 'psutil', 'disk_usage.free',          'Disponível',        1),
(3, 'psutil', 'cpu_percent',              'Percentual de uso', 6),
(3, 'psutil', 'cpu_freq',                 'Frequência atual',  7),
(3, 'psutil', 'cpu_count',                'Núcleos lógicos',   5);


INSERT INTO status_chamado (descricao) VALUES 
('Aberto'),
('Em Andamento'),
('Finalizado'),
('Cancelado');

insert into cargo (funcao) values
 	("Enfermeiro"), 
	("Medico"),	
 	("Administração");
    
-- Hospital que está a máquina
INSERT INTO hospital (nome, cnpj, telefone, email, cep, numero)
VALUES ('Hospital_MagnaSync', '00000000000000', '1100000000', 'magnasync@hospital.com', '00000000', '100');
    
INSERT INTO categoria_alerta (classificacao) VALUES ('Atenção'), ('Crítico');
  
  -- Select que ve quando o alerta foi acionado
  
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

select * from funcionario;

select * from leitura;

select * from equipamento;

select cargo.funcao from magnasync.cargo;

update cargo set funcao = "Engenharia Clínica" where id = 1;

SELECT 
    f.nome AS "Nome do funcionário", 
    h.nome AS "Nome do Hospital", 
    c.funcao AS "Função"
FROM 
    funcionario AS f
JOIN 
    cargo AS c ON f.cargo_id = c.id
JOIN 
    hospital AS h ON f.hospital_id = h.id;


SELECT * FROM componente;

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
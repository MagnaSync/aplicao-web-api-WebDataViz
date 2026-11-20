-- ============================================================================
-- MagnaSync — Patch da Dashboard Executiva do Admin Geral (Daniel)
-- 100% compatível com o script oficial magnasync_script.sql (ZERO tabelas extras)
-- Pode ser executado várias vezes sem duplicar registros (idempotente).
-- ============================================================================
USE magnasync;

-- 0. Remove tabelas antigas de auditoria/retry caso existam de versões anteriores
DROP TABLE IF EXISTS log_tentativa_notificacao;
DROP TABLE IF EXISTS auditoria_notificacao;

-- 1. Garante categorias oficiais de alerta e status oficiais de chamado
INSERT INTO categoria_alerta (classificacao)
SELECT v.classificacao
FROM (
    SELECT 'Atenção' AS classificacao
    UNION ALL SELECT 'Crítico'
    UNION ALL SELECT 'Bloqueio'
) v
WHERE NOT EXISTS (
    SELECT 1 FROM categoria_alerta ca WHERE ca.classificacao = v.classificacao
);

INSERT INTO status_chamado (descricao)
SELECT v.descricao
FROM (
    SELECT 'Aberto' AS descricao
    UNION ALL SELECT 'Em Andamento'
    UNION ALL SELECT 'Finalizado'
    UNION ALL SELECT 'Cancelado'
) v
WHERE NOT EXISTS (
    SELECT 1 FROM status_chamado sc WHERE sc.descricao = v.descricao
);

-- 2. Garante componentes monitorados (Processador, Ram, Disco e Rede - Latência)
INSERT INTO componente (valor, fkTipo, fkUnidade)
SELECT NULL, tc.id, u.id
FROM tipoComponente tc
JOIN unidade u ON u.medida = IF(tc.tipo LIKE 'Rede - Lat%ncia', 'ms', '%')
WHERE tc.tipo IN ('Processador', 'Ram', 'Disco', 'Rede - Latência', 'Rede - Latencia')
  AND NOT EXISTS (SELECT 1 FROM componente c WHERE c.fkTipo = tc.id);

-- 3. Hospitais clientes de demonstração (compatível com ou sem a coluna hospital.cep)
DROP TEMPORARY TABLE IF EXISTS tmp_hosp_seed;
CREATE TEMPORARY TABLE tmp_hosp_seed (
    nome VARCHAR(150),
    cnpj CHAR(14),
    tel VARCHAR(20),
    email VARCHAR(150),
    cep CHAR(8),
    num VARCHAR(10)
);
INSERT INTO tmp_hosp_seed (nome, cnpj, tel, email, cep, num) VALUES
('Hospital Albert Einstein',     '60765823000130', '(11) 2151-1233', 'ti.pacs@einstein.br',        '05652900', '627'),
('Hospital Sírio-Libanês',       '61590410000124', '(11) 3394-5000', 'infra@hsl.org.br',           '01308050', '91'),
('Hospital Santa Catarina',      '60922168000186', '(11) 3016-4133', 'suporte.dicom@hsc.org.br',   '01310000', '200'),
('Hospital São Luiz Rede DOr',   '06047087000139', '(11) 3040-1100', 'noc@rededor.com.br',         '04505002', '250'),
('Hospital Oswaldo Cruz',        '60726502000189', '(11) 3549-1000', 'pacs.admin@haoc.com.br',     '01323001', '325'),
('Hospital Das Dores',           '01234567891011', '(11) 11111-1111','hospitaldasdores@gmail.com', '05548722', '7980');

SET @tem_cep = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'hospital'
      AND COLUMN_NAME = 'cep'
);
SET @sql_hosp = IF(
    @tem_cep > 0,
    'INSERT INTO hospital (nome, cnpj, telefone, email, cep, numero) SELECT t.nome, t.cnpj, t.tel, t.email, t.cep, t.num FROM tmp_hosp_seed t WHERE NOT EXISTS (SELECT 1 FROM hospital h WHERE h.cnpj = t.cnpj)',
    'INSERT INTO hospital (nome, cnpj, telefone, email, numero) SELECT t.nome, t.cnpj, t.tel, t.email, t.num FROM tmp_hosp_seed t WHERE NOT EXISTS (SELECT 1 FROM hospital h WHERE h.cnpj = t.cnpj)'
);
PREPARE stmt_hosp FROM @sql_hosp;
EXECUTE stmt_hosp;
DEALLOCATE PREPARE stmt_hosp;
DROP TEMPORARY TABLE IF EXISTS tmp_hosp_seed;

-- 4. Servidores PACS por hospital (identificados pelo MAC, sem duplicar)
INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT v.fab, v.mac, h.id
FROM (
    SELECT 'GE Centricity PACS-01' AS fab, '00:1B:44:11:3A:01' AS mac, '60765823000130' AS cnpj
    UNION ALL SELECT 'GE Centricity PACS-02',      '00:1B:44:11:3A:02', '60765823000130'
    UNION ALL SELECT 'Dell PowerEdge R750-DICOM',  '00:1B:44:11:3A:03', '60765823000130'
    UNION ALL SELECT 'HPE ProLiant DL380-Archive', '00:1B:44:11:3A:04', '60765823000130'
    UNION ALL SELECT 'GE PACS Storage-SL1',        '00:1B:44:22:4B:01', '61590410000124'
    UNION ALL SELECT 'Philips IntelliSpace-SL2',   '00:1B:44:22:4B:02', '61590410000124'
    UNION ALL SELECT 'Dell PowerEdge PACS-SL3',    '00:1B:44:22:4B:03', '61590410000124'
    UNION ALL SELECT 'GE Centricity PACS-SC1',     '00:1B:44:33:5C:01', '60922168000186'
    UNION ALL SELECT 'Lenovo ThinkSystem SR650',   '00:1B:44:33:5C:02', '60922168000186'
    UNION ALL SELECT 'Dell PACS Backup-SC3',       '00:1B:44:33:5C:03', '60922168000186'
    UNION ALL SELECT 'GE PACS Central-RD1',        '00:1B:44:44:6D:01', '06047087000139'
    UNION ALL SELECT 'HPE ProLiant PACS-RD2',      '00:1B:44:44:6D:02', '06047087000139'
    UNION ALL SELECT 'GE Centricity PACS-OC1',     '00:1B:44:55:7E:01', '60726502000189'
    UNION ALL SELECT 'Dell PACS Index-OC2',        '00:1B:44:55:7E:02', '60726502000189'
    UNION ALL SELECT 'GE PACS Legado-HD1',         '00:1B:44:66:8F:01', '01234567891011'
    UNION ALL SELECT 'GE Centricity PACS-HC1',     '00:1B:44:77:9A:01', '10000000000011'
) v
JOIN hospital h ON h.cnpj = v.cnpj
WHERE NOT EXISTS (SELECT 1 FROM equipamento e WHERE e.mac_adress = v.mac);

-- 5. Parâmetros de monitoramento (a tabela leitura exige esta chave composta)
INSERT IGNORE INTO parametro (id, fkEquipamento, fkComponente, metrica)
SELECT 1, e.id, c.id, 80
FROM equipamento e
JOIN (
    SELECT MIN(c.id) AS id
    FROM componente c
    JOIN tipoComponente tc ON tc.id = c.fkTipo
    WHERE tc.tipo IN ('Processador', 'Ram', 'Disco', 'Rede - Latência', 'Rede - Latencia')
    GROUP BY tc.tipo
) c;

-- 6. Leituras históricas de baseline (sem gerar alerta) para definir antiguidade real por hospital
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT
    e.id,
    comp.id,
    1,
    42.0,
    NOW() - INTERVAL base.dias DAY
FROM (
    SELECT '00:1B:44:77:9A:01' AS mac, 260 AS dias
    UNION ALL SELECT '00:1B:44:66:8F:01', 240
    UNION ALL SELECT '00:1B:44:55:7E:01', 195
    UNION ALL SELECT '00:1B:44:33:5C:01', 150
    UNION ALL SELECT '00:1B:44:11:3A:01', 115
    UNION ALL SELECT '00:1B:44:22:4B:01', 70
    UNION ALL SELECT '00:1B:44:44:6D:01', 28
) base
JOIN equipamento e ON e.mac_adress = base.mac
JOIN (
    SELECT MIN(c.id) AS id
    FROM componente c
    JOIN tipoComponente tc ON tc.id = c.fkTipo
    WHERE tc.tipo = 'Processador'
) comp
JOIN parametro p ON p.fkEquipamento = e.id AND p.fkComponente = comp.id AND p.id = 1
WHERE NOT EXISTS (
    SELECT 1
    FROM leitura l
    WHERE l.fkEquipamento = e.id
      AND l.data_hora < NOW() - INTERVAL 10 DAY
);

-- 7. Eventos recentes de telemetria -> alertas -> chamados (somente se ainda não houver alertas)
SET @precisa_seed = (SELECT COUNT(*) = 0 FROM alerta);
SET @agora = NOW();

DROP TEMPORARY TABLE IF EXISTS tmp_evento;
CREATE TEMPORARY TABLE tmp_evento (
    mac VARCHAR(17),
    tipo VARCHAR(45),
    valor DOUBLE,
    sev_nome VARCHAR(45),
    ch_status_nome VARCHAR(20),
    duracao_min INT,
    dt DATETIME
);

INSERT INTO tmp_evento (mac, tipo, valor, sev_nome, ch_status_nome, duracao_min, dt)
SELECT t.mac, t.tipo, t.valor, t.sev_nome, t.ch_status_nome, t.duracao_min, @agora - INTERVAL t.min_atras MINUTE
FROM (
    -- Hospital Albert Einstein (7 alertas: mais problemático; gargalo Processador)
    SELECT '00:1B:44:11:3A:01' AS mac, 'Processador' AS tipo, 99.1 AS valor, 'Bloqueio' AS sev_nome, 'Aberto' AS ch_status_nome, 120 AS duracao_min, 15 AS min_atras
    UNION ALL SELECT '00:1B:44:11:3A:02', 'Disco',           98.4, 'Bloqueio', 'Em Andamento', 120, 75
    UNION ALL SELECT '00:1B:44:11:3A:03', 'Processador',     95.6, 'Crítico',  'Aberto',       120, 145
    UNION ALL SELECT '00:1B:44:11:3A:01', 'Processador',     94.2, 'Crítico',  'Finalizado',   45,  290
    UNION ALL SELECT '00:1B:44:11:3A:04', 'Ram',             92.0, 'Crítico',  'Finalizado',   68,  470
    UNION ALL SELECT '00:1B:44:11:3A:02', 'Processador',     84.5, 'Atenção',  'Finalizado',   25,  650
    UNION ALL SELECT '00:1B:44:11:3A:03', 'Rede - Latência', 46.0, 'Atenção',  NULL,           0,   835

    -- Hospital Sírio-Libanês (5 alertas: gargalo Disco)
    UNION ALL SELECT '00:1B:44:22:4B:01', 'Disco',           97.8, 'Bloqueio', 'Em Andamento', 120, 45
    UNION ALL SELECT '00:1B:44:22:4B:02', 'Disco',           94.5, 'Crítico',  'Finalizado',   82,  230
    UNION ALL SELECT '00:1B:44:22:4B:03', 'Ram',             90.4, 'Crítico',  'Aberto',       120, 410
    UNION ALL SELECT '00:1B:44:22:4B:01', 'Disco',           86.2, 'Atenção',  'Finalizado',   34,  595
    UNION ALL SELECT '00:1B:44:22:4B:02', 'Rede - Latência', 39.5, 'Atenção',  'Cancelado',    15,  960

    -- Hospital Santa Catarina (4 alertas: gargalo Rede - Latência)
    UNION ALL SELECT '00:1B:44:33:5C:01', 'Rede - Latência', 185.0, 'Bloqueio', 'Aberto',       120, 25
    UNION ALL SELECT '00:1B:44:33:5C:02', 'Rede - Latência', 128.0, 'Crítico',  'Em Andamento', 120, 185
    UNION ALL SELECT '00:1B:44:33:5C:01', 'Rede - Latência', 62.0,  'Atenção',  'Finalizado',   54,  530
    UNION ALL SELECT '00:1B:44:33:5C:03', 'Disco',           84.0,  'Atenção',  NULL,           0,   1020

    -- Hospital São Luiz Rede DOr (3 alertas: cliente mais recente; gargalo Ram)
    UNION ALL SELECT '00:1B:44:44:6D:01', 'Ram',             93.1, 'Crítico',  'Em Andamento', 120, 110
    UNION ALL SELECT '00:1B:44:44:6D:02', 'Ram',             91.5, 'Crítico',  'Finalizado',   95,  350
    UNION ALL SELECT '00:1B:44:44:6D:01', 'Processador',     83.8, 'Atenção',  'Cancelado',    15,  775

    -- Hospital Oswaldo Cruz (3 alertas: sem críticos ativos; gargalo Processador)
    UNION ALL SELECT '00:1B:44:55:7E:01', 'Processador',     91.2, 'Crítico',  'Finalizado',   38,  710
    UNION ALL SELECT '00:1B:44:55:7E:02', 'Processador',     82.6, 'Atenção',  'Finalizado',   22,  900
    UNION ALL SELECT '00:1B:44:55:7E:01', 'Disco',           81.9, 'Atenção',  NULL,           0,   1160

    -- Hospital Das Dores (2 alertas: cliente mais antigo, estável; gargalo Disco)
    UNION ALL SELECT '00:1B:44:66:8F:01', 'Disco',           80.5, 'Atenção',  'Finalizado',   120, 1090
    UNION ALL SELECT '00:1B:44:66:8F:01', 'Ram',             78.4, 'Atenção',  NULL,           0,   1240
) t
WHERE @precisa_seed = 1;

INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, c.id, 1, t.valor, t.dt
FROM tmp_evento t
JOIN equipamento e ON e.mac_adress = t.mac
JOIN (
    SELECT MIN(c.id) AS id, tc.tipo
    FROM componente c
    JOIN tipoComponente tc ON tc.id = c.fkTipo
    GROUP BY tc.tipo
) c ON c.tipo = t.tipo
JOIN parametro p ON p.fkEquipamento = e.id AND p.fkComponente = c.id AND p.id = 1;

INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT t.dt, l.id, ca.id
FROM tmp_evento t
JOIN equipamento e ON e.mac_adress = t.mac
JOIN (
    SELECT MIN(c.id) AS id, tc.tipo
    FROM componente c
    JOIN tipoComponente tc ON tc.id = c.fkTipo
    GROUP BY tc.tipo
) c ON c.tipo = t.tipo
JOIN leitura l ON l.fkEquipamento = e.id AND l.fkComponente = c.id AND l.data_hora = t.dt AND l.valor = t.valor
JOIN categoria_alerta ca ON ca.classificacao = t.sev_nome;

INSERT INTO chamado (slack_canal_id, slack_mensagem_ts, data_abertura, data_fim, fkAlerta, fkStatus)
SELECT
    'C08MAGNASYNC',
    CONCAT(UNIX_TIMESTAMP(t.dt), '.000', LPAD(a.id, 3, '0')),
    t.dt,
    CASE
        WHEN t.ch_status_nome IN ('Finalizado', 'Cancelado') THEN t.dt + INTERVAL t.duracao_min MINUTE
        ELSE t.dt + INTERVAL 2 HOUR
    END,
    a.id,
    sc.id
FROM tmp_evento t
JOIN equipamento e ON e.mac_adress = t.mac
JOIN (
    SELECT MIN(c.id) AS id, tc.tipo
    FROM componente c
    JOIN tipoComponente tc ON tc.id = c.fkTipo
    GROUP BY tc.tipo
) c ON c.tipo = t.tipo
JOIN leitura l ON l.fkEquipamento = e.id AND l.fkComponente = c.id AND l.data_hora = t.dt AND l.valor = t.valor
JOIN alerta a ON a.leitura_id = l.id
JOIN status_chamado sc ON sc.descricao = t.ch_status_nome
WHERE t.ch_status_nome IS NOT NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_evento;

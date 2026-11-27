-- ============================================================================
-- MagnaSync — Dados de demonstração e Views da Dashboard Executiva (Daniel)
-- Execute depois de rodar o script oficial magnasync_script.sql (em um banco limpo).
-- ============================================================================
USE magnasync;

-- 1. Componentes monitorados que faltam no script oficial (1 a 5 já são de Rede)
-- IDs que vamos usar nas leituras: 3 = Rede - Latência (ms), 6 = Processador (%), 7 = Ram (%), 8 = Disco (%)
INSERT INTO componente (id, valor, fkTipo, fkUnidade) VALUES
(6, NULL, 3, 6),
(7, NULL, 1, 6),
(8, NULL, 2, 6);

-- 2. Hospitais clientes (IDs 1 e 2 já existem no script oficial)
INSERT INTO hospital (id, nome, cnpj, telefone, email) VALUES
(3, 'Hospital Albert Einstein',   '60765823000130', '(11) 2151-1233', 'ti.pacs@einstein.br'),
(4, 'Hospital Sírio-Libanês',     '61590410000124', '(11) 3394-5000', 'infra@hsl.org.br'),
(5, 'Hospital Santa Catarina',    '60922168000186', '(11) 3016-4133', 'suporte.dicom@hsc.org.br'),
(6, 'Hospital São Luiz Rede DOr', '06047087000139', '(11) 3040-1100', 'noc@rededor.com.br'),
(7, 'Hospital Oswaldo Cruz',      '60726502000189', '(11) 3549-1000', 'pacs.admin@haoc.com.br'),
(8, 'Hospital Das Dores',         '01234567891011', '(11) 11111-1111','hospitaldasdores@gmail.com');

-- 3. Servidores PACS (equipamentos) de cada hospital
INSERT INTO equipamento (id, fabricante, mac_adress, hospital_id) VALUES
(1,  'GE Centricity PACS-01',      '00:1B:44:11:3A:01', 3),
(2,  'GE Centricity PACS-02',      '00:1B:44:11:3A:02', 3),
(3,  'Dell PowerEdge R750-DICOM',  '00:1B:44:11:3A:03', 3),
(4,  'HPE ProLiant DL380-Archive', '00:1B:44:11:3A:04', 3),
(5,  'GE PACS Storage-SL1',        '00:1B:44:22:4B:01', 4),
(6,  'Philips IntelliSpace-SL2',   '00:1B:44:22:4B:02', 4),
(7,  'Dell PowerEdge PACS-SL3',    '00:1B:44:22:4B:03', 4),
(8,  'GE Centricity PACS-SC1',     '00:1B:44:33:5C:01', 5),
(9,  'Lenovo ThinkSystem SR650',   '00:1B:44:33:5C:02', 5),
(10, 'Dell PACS Backup-SC3',       '00:1B:44:33:5C:03', 5),
(11, 'GE PACS Central-RD1',        '00:1B:44:44:6D:01', 6),
(12, 'HPE ProLiant PACS-RD2',      '00:1B:44:44:6D:02', 6),
(13, 'GE Centricity PACS-OC1',     '00:1B:44:55:7E:01', 7),
(14, 'Dell PACS Index-OC2',        '00:1B:44:55:7E:02', 7),
(15, 'GE PACS Legado-HD1',         '00:1B:44:66:8F:01', 8),
(16, 'GE Centricity PACS-HC1',     '00:1B:44:77:9A:01', 2);

-- 4. Parâmetros de monitoramento (a tabela leitura exige esse cadastro antes)
INSERT INTO parametro (id, fkEquipamento, fkComponente, metrica) VALUES
(1, 1,  6, 80),
(1, 2,  6, 80),
(1, 2,  8, 80),
(1, 3,  3, 80),
(1, 3,  6, 80),
(1, 4,  7, 80),
(1, 5,  6, 80),
(1, 5,  8, 80),
(1, 6,  3, 80),
(1, 6,  8, 80),
(1, 7,  7, 80),
(1, 8,  3, 80),
(1, 8,  6, 80),
(1, 9,  3, 80),
(1, 10, 8, 80),
(1, 11, 6, 80),
(1, 11, 7, 80),
(1, 12, 7, 80),
(1, 13, 6, 80),
(1, 13, 8, 80),
(1, 14, 6, 80),
(1, 15, 6, 80),
(1, 15, 7, 80),
(1, 15, 8, 80),
(1, 16, 6, 80);

-- 5. Leituras antigas (definem há quantos dias cada hospital é cliente)
INSERT INTO leitura (id, fkEquipamento, fkComponente, fkMetrica, valor, data_hora) VALUES
(1, 16, 6, 1, 42.0, NOW() - INTERVAL 260 DAY),
(2, 15, 6, 1, 42.0, NOW() - INTERVAL 240 DAY),
(3, 13, 6, 1, 42.0, NOW() - INTERVAL 195 DAY),
(4, 8,  6, 1, 42.0, NOW() - INTERVAL 150 DAY),
(5, 1,  6, 1, 42.0, NOW() - INTERVAL 115 DAY),
(6, 5,  6, 1, 42.0, NOW() - INTERVAL 70 DAY),
(7, 11, 6, 1, 42.0, NOW() - INTERVAL 28 DAY);

-- 6. Leituras recentes que geraram alertas
INSERT INTO leitura (id, fkEquipamento, fkComponente, fkMetrica, valor, data_hora) VALUES
-- Hospital Albert Einstein
(8,  1, 6, 1, 99.1, NOW() - INTERVAL 15 MINUTE),
(9,  2, 8, 1, 98.4, NOW() - INTERVAL 75 MINUTE),
(10, 3, 6, 1, 95.6, NOW() - INTERVAL 145 MINUTE),
(11, 1, 6, 1, 94.2, NOW() - INTERVAL 290 MINUTE),
(12, 4, 7, 1, 92.0, NOW() - INTERVAL 470 MINUTE),
(13, 2, 6, 1, 84.5, NOW() - INTERVAL 650 MINUTE),
(14, 3, 3, 1, 46.0, NOW() - INTERVAL 835 MINUTE),
-- Hospital Sírio-Libanês
(15, 5, 8, 1, 97.8, NOW() - INTERVAL 45 MINUTE),
(16, 6, 8, 1, 94.5, NOW() - INTERVAL 230 MINUTE),
(17, 7, 7, 1, 90.4, NOW() - INTERVAL 410 MINUTE),
(18, 5, 8, 1, 86.2, NOW() - INTERVAL 595 MINUTE),
(19, 6, 3, 1, 39.5, NOW() - INTERVAL 960 MINUTE),
-- Hospital Santa Catarina
(20, 8,  3, 1, 185.0, NOW() - INTERVAL 25 MINUTE),
(21, 9,  3, 1, 128.0, NOW() - INTERVAL 185 MINUTE),
(22, 8,  3, 1, 62.0,  NOW() - INTERVAL 530 MINUTE),
(23, 10, 8, 1, 84.0,  NOW() - INTERVAL 1020 MINUTE),
-- Hospital São Luiz Rede DOr
(24, 11, 7, 1, 93.1, NOW() - INTERVAL 110 MINUTE),
(25, 12, 7, 1, 91.5, NOW() - INTERVAL 350 MINUTE),
(26, 11, 6, 1, 83.8, NOW() - INTERVAL 775 MINUTE),
-- Hospital Oswaldo Cruz
(27, 13, 6, 1, 91.2, NOW() - INTERVAL 710 MINUTE),
(28, 14, 6, 1, 82.6, NOW() - INTERVAL 900 MINUTE),
(29, 13, 8, 1, 81.9, NOW() - INTERVAL 1160 MINUTE),
-- Hospital Das Dores
(30, 15, 8, 1, 80.5, NOW() - INTERVAL 1090 MINUTE),
(31, 15, 7, 1, 78.4, NOW() - INTERVAL 1240 MINUTE);

-- 7. Alertas (categoria_alerta_id: 1 = Atenção, 2 = Crítico, 3 = Bloqueio)
INSERT INTO alerta (id, data_hora, leitura_id, categoria_alerta_id) VALUES
(1,  NOW() - INTERVAL 15 MINUTE,   8,  3),
(2,  NOW() - INTERVAL 75 MINUTE,   9,  3),
(3,  NOW() - INTERVAL 145 MINUTE,  10, 2),
(4,  NOW() - INTERVAL 290 MINUTE,  11, 2),
(5,  NOW() - INTERVAL 470 MINUTE,  12, 2),
(6,  NOW() - INTERVAL 650 MINUTE,  13, 1),
(7,  NOW() - INTERVAL 835 MINUTE,  14, 1),
(8,  NOW() - INTERVAL 45 MINUTE,   15, 3),
(9,  NOW() - INTERVAL 230 MINUTE,  16, 2),
(10, NOW() - INTERVAL 410 MINUTE,  17, 2),
(11, NOW() - INTERVAL 595 MINUTE,  18, 1),
(12, NOW() - INTERVAL 960 MINUTE,  19, 1),
(13, NOW() - INTERVAL 25 MINUTE,   20, 3),
(14, NOW() - INTERVAL 185 MINUTE,  21, 2),
(15, NOW() - INTERVAL 530 MINUTE,  22, 1),
(16, NOW() - INTERVAL 1020 MINUTE, 23, 1),
(17, NOW() - INTERVAL 110 MINUTE,  24, 2),
(18, NOW() - INTERVAL 350 MINUTE,  25, 2),
(19, NOW() - INTERVAL 775 MINUTE,  26, 1),
(20, NOW() - INTERVAL 710 MINUTE,  27, 2),
(21, NOW() - INTERVAL 900 MINUTE,  28, 1),
(22, NOW() - INTERVAL 1160 MINUTE, 29, 1),
(23, NOW() - INTERVAL 1090 MINUTE, 30, 1),
(24, NOW() - INTERVAL 1240 MINUTE, 31, 1);

-- 8. Chamados (fkStatus: 1 = Aberto, 2 = Em Andamento, 3 = Finalizado, 4 = Cancelado)
INSERT INTO chamado (slack_canal_id, slack_mensagem_ts, data_abertura, data_fim, fkAlerta, fkStatus) VALUES
('C08MAGNASYNC', '1700000001.0001', NOW() - INTERVAL 15 MINUTE,   NOW() + INTERVAL 2 HOUR,    1,  1),
('C08MAGNASYNC', '1700000002.0002', NOW() - INTERVAL 75 MINUTE,   NOW() + INTERVAL 2 HOUR,    2,  2),
('C08MAGNASYNC', '1700000003.0003', NOW() - INTERVAL 145 MINUTE,  NOW() + INTERVAL 2 HOUR,    3,  1),
('C08MAGNASYNC', '1700000004.0004', NOW() - INTERVAL 290 MINUTE,  NOW() - INTERVAL 245 MINUTE, 4,  3),
('C08MAGNASYNC', '1700000005.0005', NOW() - INTERVAL 470 MINUTE,  NOW() - INTERVAL 402 MINUTE, 5,  3),
('C08MAGNASYNC', '1700000006.0006', NOW() - INTERVAL 650 MINUTE,  NOW() - INTERVAL 625 MINUTE, 6,  3),
('C08MAGNASYNC', '1700000008.0008', NOW() - INTERVAL 45 MINUTE,   NOW() + INTERVAL 2 HOUR,    8,  2),
('C08MAGNASYNC', '1700000009.0009', NOW() - INTERVAL 230 MINUTE,  NOW() - INTERVAL 148 MINUTE, 9,  3),
('C08MAGNASYNC', '1700000010.0010', NOW() - INTERVAL 410 MINUTE,  NOW() + INTERVAL 2 HOUR,    10, 1),
('C08MAGNASYNC', '1700000011.0011', NOW() - INTERVAL 595 MINUTE,  NOW() - INTERVAL 561 MINUTE, 11, 3),
('C08MAGNASYNC', '1700000012.0012', NOW() - INTERVAL 960 MINUTE,  NOW() - INTERVAL 945 MINUTE, 12, 4),
('C08MAGNASYNC', '1700000013.0013', NOW() - INTERVAL 25 MINUTE,   NOW() + INTERVAL 2 HOUR,    13, 1),
('C08MAGNASYNC', '1700000014.0014', NOW() - INTERVAL 185 MINUTE,  NOW() + INTERVAL 2 HOUR,    14, 2),
('C08MAGNASYNC', '1700000015.0015', NOW() - INTERVAL 530 MINUTE,  NOW() - INTERVAL 476 MINUTE, 15, 3),
('C08MAGNASYNC', '1700000017.0017', NOW() - INTERVAL 110 MINUTE,  NOW() + INTERVAL 2 HOUR,    17, 2),
('C08MAGNASYNC', '1700000018.0018', NOW() - INTERVAL 350 MINUTE,  NOW() - INTERVAL 255 MINUTE, 18, 3),
('C08MAGNASYNC', '1700000019.0019', NOW() - INTERVAL 775 MINUTE,  NOW() - INTERVAL 760 MINUTE, 19, 4),
('C08MAGNASYNC', '1700000020.0020', NOW() - INTERVAL 710 MINUTE,  NOW() - INTERVAL 672 MINUTE, 20, 3),
('C08MAGNASYNC', '1700000021.0021', NOW() - INTERVAL 900 MINUTE,  NOW() - INTERVAL 878 MINUTE, 21, 3),
('C08MAGNASYNC', '1700000023.0023', NOW() - INTERVAL 1090 MINUTE, NOW() - INTERVAL 970 MINUTE, 23, 3);

-- 9. Views para simplificar os SELECTs da Dashboard Executiva (Daniel)
CREATE OR REPLACE VIEW vw_incidentes AS
SELECT
    a.id AS alerta_id,
    a.data_hora,
    DATE_FORMAT(a.data_hora, '%d/%m/%Y %H:%i:%s') AS horario_alerta,
    DATE_FORMAT(a.data_hora, '%Y-%m-%d %H:%i:%s') AS horario_alerta_iso,
    h.id AS hospital_id,
    h.nome AS nome_cliente,
    e.id AS equipamento_id,
    e.fabricante AS servidor_fabricante,
    e.mac_adress,
    tc.tipo AS componente,
    ROUND(l.valor, 1) AS valor_leitura,
    u.medida AS unidade_medida,
    ca.classificacao AS severidade,
    ch.id AS chamado_id,
    IFNULL(sc.descricao, 'Sem Chamado') AS status_chamado,
    IF(
        sc.descricao = 'Finalizado' AND ch.data_fim >= ch.data_abertura,
        TIMESTAMPDIFF(MINUTE, ch.data_abertura, ch.data_fim),
        NULL
    ) AS tempo_resolucao_min
FROM alerta a
JOIN categoria_alerta ca ON ca.id = a.categoria_alerta_id
JOIN leitura l ON l.id = a.leitura_id
JOIN equipamento e ON e.id = l.fkEquipamento
JOIN hospital h ON h.id = e.hospital_id
JOIN componente c ON c.id = l.fkComponente
JOIN tipoComponente tc ON tc.id = c.fkTipo
JOIN unidade u ON u.id = c.fkUnidade
LEFT JOIN chamado ch ON ch.fkAlerta = a.id
LEFT JOIN status_chamado sc ON sc.id = ch.fkStatus
WHERE h.id <> 1;

CREATE OR REPLACE VIEW vw_hospitais_base AS
SELECT
    h.id AS hospital_id,
    h.nome AS nome_cliente,
    h.cnpj,
    h.email,
    COUNT(DISTINCT e.id) AS total_maquinas,
    DATE_FORMAT(MIN(l.data_hora), '%d/%m/%Y') AS cliente_desde,
    DATE_FORMAT(MIN(l.data_hora), '%Y-%m-%d %H:%i:%s') AS cliente_desde_iso,
    DATEDIFF(NOW(), MIN(l.data_hora)) AS dias_casa
FROM hospital h
LEFT JOIN equipamento e ON e.hospital_id = h.id
LEFT JOIN leitura l ON l.fkEquipamento = e.id
WHERE h.id <> 1
GROUP BY h.id, h.nome, h.cnpj, h.email;

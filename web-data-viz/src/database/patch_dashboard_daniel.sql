-- ============================================================================
-- MagnaSync — Patch Incremental e Isolado (Dashboard Executiva e Auditoria ITIL)
-- Arquivo: src/database/patch_dashboard_daniel.sql
-- Regra: NÃO altera nem apaga tabelas ou registros existentes do grupo.
-- ============================================================================

USE magnasync;

-- 1. Criação segura da tabela auxiliar de auditoria de entrega/notificações
CREATE TABLE IF NOT EXISTS auditoria_notificacao (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fkAlerta INT NOT NULL UNIQUE,
    fkChamado INT NULL,
    canal_destino VARCHAR(60) NOT NULL DEFAULT 'Slack #alertas-pacs',
    enviado_sistema TINYINT(1) NOT NULL DEFAULT 1,
    confirmado_entrega TINYINT(1) NOT NULL DEFAULT 0,
    status_auditoria VARCHAR(30) NOT NULL,
    log_aplicacao VARCHAR(255) NOT NULL,
    dt_auditoria DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_alerta FOREIGN KEY (fkAlerta) REFERENCES alerta(id),
    CONSTRAINT fk_auditoria_chamado FOREIGN KEY (fkChamado) REFERENCES chamado(id)
);

-- 2. Garantir componentes base (Processador, Ram, Disco, Rede - Latencia) caso ainda não existam em componente
INSERT INTO componente (valor, fkTipo, fkUnidade)
SELECT NULL, tc.id, u.id
FROM tipoComponente tc
JOIN unidade u ON u.medida = '%'
WHERE tc.tipo = 'Processador'
  AND NOT EXISTS (SELECT 1 FROM componente c WHERE c.fkTipo = tc.id);

INSERT INTO componente (valor, fkTipo, fkUnidade)
SELECT NULL, tc.id, u.id
FROM tipoComponente tc
JOIN unidade u ON u.medida = '%'
WHERE tc.tipo = 'Ram'
  AND NOT EXISTS (SELECT 1 FROM componente c WHERE c.fkTipo = tc.id);

INSERT INTO componente (valor, fkTipo, fkUnidade)
SELECT NULL, tc.id, u.id
FROM tipoComponente tc
JOIN unidade u ON u.medida = '%'
WHERE tc.tipo = 'Disco'
  AND NOT EXISTS (SELECT 1 FROM componente c WHERE c.fkTipo = tc.id);

INSERT INTO componente (valor, fkTipo, fkUnidade)
SELECT NULL, tc.id, u.id
FROM tipoComponente tc
JOIN unidade u ON u.medida = 'ms'
WHERE tc.tipo = 'Rede - Latencia'
  AND NOT EXISTS (SELECT 1 FROM componente c WHERE c.fkTipo = tc.id);

-- 3. Seed incremental de Hospitais Clientes (sem sobrescrever registros existentes)
INSERT INTO hospital (nome, cnpj, telefone, email, cep, numero)
SELECT 'Hospital Albert Einstein', '60765823000130', '(11) 2151-1233', 'ti.pacs@einstein.br', '05652900', '627'
WHERE NOT EXISTS (SELECT 1 FROM hospital WHERE cnpj = '60765823000130');

INSERT INTO hospital (nome, cnpj, telefone, email, cep, numero)
SELECT 'Hospital Sírio-Libanês', '61590410000124', '(11) 3394-5000', 'infra@hsl.org.br', '01308050', '91'
WHERE NOT EXISTS (SELECT 1 FROM hospital WHERE cnpj = '61590410000124');

INSERT INTO hospital (nome, cnpj, telefone, email, cep, numero)
SELECT 'Hospital Santa Catarina', '60922168000186', '(11) 3016-4133', 'suporte.dicom@hsc.org.br', '01310000', '200'
WHERE NOT EXISTS (SELECT 1 FROM hospital WHERE cnpj = '60922168000186');

INSERT INTO hospital (nome, cnpj, telefone, email, cep, numero)
SELECT 'Hospital São Luiz Rede DOr', '06047087000139', '(11) 3040-1100', 'noc@rededor.com.br', '04505002', '250'
WHERE NOT EXISTS (SELECT 1 FROM hospital WHERE cnpj = '06047087000139');

INSERT INTO hospital (nome, cnpj, telefone, email, cep, numero)
SELECT 'Hospital Oswaldo Cruz', '60726502000189', '(11) 3549-1000', 'pacs.admin@haoc.com.br', '01323001', '325'
WHERE NOT EXISTS (SELECT 1 FROM hospital WHERE cnpj = '60726502000189');

INSERT INTO hospital (nome, cnpj, telefone, email, cep, numero)
SELECT 'Hospital Das Dores', '01234567891011', '(11) 11111-1111', 'hospitaldasdores@gmail.com', '05548722', '7980'
WHERE NOT EXISTS (SELECT 1 FROM hospital WHERE cnpj = '01234567891011');

-- 4. Seed incremental de Equipamentos (Servidores PACS) por Hospital
INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'GE Centricity PACS-01', '00:1B:44:11:3A:01', id FROM hospital WHERE cnpj = '60765823000130'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:11:3A:01') LIMIT 1;

INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'GE Centricity PACS-02', '00:1B:44:11:3A:02', id FROM hospital WHERE cnpj = '60765823000130'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:11:3A:02') LIMIT 1;

INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'Dell PowerEdge R750-DICOM', '00:1B:44:11:3A:03', id FROM hospital WHERE cnpj = '60765823000130'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:11:3A:03') LIMIT 1;

INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'HPE ProLiant DL380-Archive', '00:1B:44:11:3A:04', id FROM hospital WHERE cnpj = '60765823000130'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:11:3A:04') LIMIT 1;

INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'GE PACS Storage-SL1', '00:1B:44:22:4B:01', id FROM hospital WHERE cnpj = '61590410000124'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:22:4B:01') LIMIT 1;

INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'Philips IntelliSpace-SL2', '00:1B:44:22:4B:02', id FROM hospital WHERE cnpj = '61590410000124'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:22:4B:02') LIMIT 1;

INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'Dell PowerEdge PACS-SL3', '00:1B:44:22:4B:03', id FROM hospital WHERE cnpj = '61590410000124'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:22:4B:03') LIMIT 1;

INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'GE Centricity PACS-SC1', '00:1B:44:33:5C:01', id FROM hospital WHERE cnpj = '60922168000186'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:33:5C:01') LIMIT 1;

INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'Lenovo ThinkSystem SR650', '00:1B:44:33:5C:02', id FROM hospital WHERE cnpj = '60922168000186'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:33:5C:02') LIMIT 1;

INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'Dell PACS Backup-SC3', '00:1B:44:33:5C:03', id FROM hospital WHERE cnpj = '60922168000186'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:33:5C:03') LIMIT 1;

INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'GE PACS Central-RD1', '00:1B:44:44:6D:01', id FROM hospital WHERE cnpj = '06047087000139'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:44:6D:01') LIMIT 1;

INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'HPE ProLiant PACS-RD2', '00:1B:44:44:6D:02', id FROM hospital WHERE cnpj = '06047087000139'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:44:6D:02') LIMIT 1;

INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'GE Centricity PACS-OC1', '00:1B:44:55:7E:01', id FROM hospital WHERE cnpj = '60726502000189'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:55:7E:01') LIMIT 1;

INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'Dell PACS Index-OC2', '00:1B:44:55:7E:02', id FROM hospital WHERE cnpj = '60726502000189'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:55:7E:02') LIMIT 1;

INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT 'GE PACS Legado-HD1', '00:1B:44:66:8F:01', id FROM hospital WHERE cnpj = '01234567891011'
  AND NOT EXISTS (SELECT 1 FROM equipamento WHERE mac_adress = '00:1B:44:66:8F:01') LIMIT 1;

-- 5. Garantir parâmetros (FK composta exigida por leitura) para cada equipamento e componente monitorado
SET @comp_cpu = (SELECT MIN(c.id) FROM componente c JOIN tipoComponente tc ON tc.id = c.fkTipo WHERE tc.tipo = 'Processador');
SET @comp_ram = (SELECT MIN(c.id) FROM componente c JOIN tipoComponente tc ON tc.id = c.fkTipo WHERE tc.tipo = 'Ram');
SET @comp_disco = (SELECT MIN(c.id) FROM componente c JOIN tipoComponente tc ON tc.id = c.fkTipo WHERE tc.tipo = 'Disco');
SET @comp_rede = (SELECT MIN(c.id) FROM componente c JOIN tipoComponente tc ON tc.id = c.fkTipo WHERE tc.tipo = 'Rede - Latencia');

INSERT IGNORE INTO parametro (id, fkEquipamento, fkComponente, metrica)
SELECT 1, e.id, @comp_cpu, 80 FROM equipamento e WHERE @comp_cpu IS NOT NULL;

INSERT IGNORE INTO parametro (id, fkEquipamento, fkComponente, metrica)
SELECT 1, e.id, @comp_ram, 75 FROM equipamento e WHERE @comp_ram IS NOT NULL;

INSERT IGNORE INTO parametro (id, fkEquipamento, fkComponente, metrica)
SELECT 1, e.id, @comp_disco, 85 FROM equipamento e WHERE @comp_disco IS NOT NULL;

INSERT IGNORE INTO parametro (id, fkEquipamento, fkComponente, metrica)
SELECT 1, e.id, @comp_rede, 25 FROM equipamento e WHERE @comp_rede IS NOT NULL;

-- 6. Seed controlado de Leituras, Alertas, Chamados e Auditoria de Notificação
-- Executa apenas se auditoria_notificacao ainda estiver vazia (garantia anti-duplicidade)
SET @precisa_seed = (SELECT IF(COUNT(*) = 0, 1, 0) FROM auditoria_notificacao);
SET @cat_atencao = (SELECT MIN(id) FROM categoria_alerta WHERE classificacao = 'Atenção');
SET @cat_critico = (SELECT MIN(id) FROM categoria_alerta WHERE classificacao = 'Crítico');

-- ==================== EVENTO 01: Einstein | CPU Crítico | FALHA_ENVIO (Divergência) ====================
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_cpu, 1, 96.4, NOW() - INTERVAL 18 MINUTE
FROM equipamento e WHERE e.mac_adress = '00:1B:44:11:3A:01' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 18 MINUTE, @id_leitura, @cat_critico WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Slack #noc-einstein', 1, 0, 'FALHA_ENVIO',
       '[ERROR 504] Gateway Timeout ao aguardar confirmação de webhook Slack - Retentativa pendente',
       NOW() - INTERVAL 17 MINUTE
WHERE @precisa_seed = 1;

-- ==================== EVENTO 02: Sírio-Libanês | Disco Crítico | FALHA_ENVIO (Divergência) ====================
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_disco, 1, 94.8, NOW() - INTERVAL 42 MINUTE
FROM equipamento e WHERE e.mac_adress = '00:1B:44:22:4B:01' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 42 MINUTE, @id_leitura, @cat_critico WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Jira ITIL ServiceDesk', 1, 0, 'FALHA_ENVIO',
       '[ERROR 429] Rate Limit Exceeded na API de abertura de incidentes - Fila de reenvio retida',
       NOW() - INTERVAL 41 MINUTE
WHERE @precisa_seed = 1;

-- ==================== EVENTO 03: Einstein | RAM Crítico | FALHA_ENVIO (Divergência) ====================
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_ram, 1, 91.2, NOW() - INTERVAL 2 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:11:3A:02' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 2 HOUR, @id_leitura, @cat_critico WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Slack #noc-einstein', 1, 0, 'FALHA_ENVIO',
       '[ERROR 502] Bad Gateway no endpoint de mensageria hospitalar - Sem ACK do destinatário',
       NOW() - INTERVAL 119 MINUTE
WHERE @precisa_seed = 1;

-- ==================== EVENTO 04: Santa Catarina | Rede Crítico | FALHA_ENVIO (Divergência) ====================
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_rede, 1, 118.0, NOW() - INTERVAL 3 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:33:5C:01' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 3 HOUR, @id_leitura, @cat_critico WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Slack #pacs-santacatarina', 1, 0, 'FALHA_ENVIO',
       '[ERROR 408] Request Timeout ao validar certificado TLS do webhook externo - Divergência registrada',
       NOW() - INTERVAL 178 MINUTE
WHERE @precisa_seed = 1;

-- ==================== EVENTO 05: Sírio-Libanês | CPU Atenção | FALHA_ENVIO (Divergência) ====================
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_cpu, 1, 86.5, NOW() - INTERVAL 5 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:22:4B:02' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 5 HOUR, @id_leitura, @cat_atencao WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Slack #alertas-hsl', 1, 0, 'FALHA_ENVIO',
       '[ERROR 503] Service Unavailable no broker de notificações - Alerta emitido sem confirmação',
       NOW() - INTERVAL 298 MINUTE
WHERE @precisa_seed = 1;

-- ==================== EVENTO 06: São Luiz | Disco Crítico | FALHA_ENVIO (Divergência) ====================
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_disco, 1, 93.1, NOW() - INTERVAL 8 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:44:6D:01' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 8 HOUR, @id_leitura, @cat_critico WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Jira ITIL ServiceDesk', 1, 0, 'FALHA_ENVIO',
       '[ERROR 504] Timeout na criação automática do ticket ITIL - Aguardando reprocessamento',
       NOW() - INTERVAL 478 MINUTE
WHERE @precisa_seed = 1;

-- ==================== EVENTO 07: Einstein | Disco Crítico | CHAMADO_ABERTO ====================
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_disco, 1, 95.2, NOW() - INTERVAL 1 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:11:3A:03' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 1 HOUR, @id_leitura, @cat_critico WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO chamado (slack_canal_id, slack_mensagem_ts, data_abertura, data_fim, fkAlerta, fkStatus)
SELECT 'C08EINSTEIN01', '1731860101.000101', NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 2 HOUR, @id_alerta, 1 WHERE @precisa_seed = 1;
SET @id_chamado = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, @id_chamado, 'Slack #noc-einstein / Jira', 1, 1, 'CHAMADO_ABERTO',
       '[ITIL INCIDENT] Chamado #INC-1041 aberto e atribuído ao Nível 2 - ACK confirmado em 118ms',
       NOW() - INTERVAL 59 MINUTE
WHERE @precisa_seed = 1;

-- ==================== EVENTO 08: Einstein | CPU Crítico | CHAMADO_ABERTO ====================
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_cpu, 1, 94.0, NOW() - INTERVAL 6 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:11:3A:04' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 6 HOUR, @id_leitura, @cat_critico WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO chamado (slack_canal_id, slack_mensagem_ts, data_abertura, data_fim, fkAlerta, fkStatus)
SELECT 'C08EINSTEIN01', '1731842101.000102', NOW() - INTERVAL 6 HOUR, NOW() + INTERVAL 1 HOUR, @id_alerta, 2 WHERE @precisa_seed = 1;
SET @id_chamado = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, @id_chamado, 'Slack #noc-einstein / Jira', 1, 1, 'CHAMADO_ABERTO',
       '[ITIL INCIDENT] Chamado #INC-1038 em andamento pela Engenharia Clínica - ACK HTTP 200',
       NOW() - INTERVAL 358 MINUTE
WHERE @precisa_seed = 1;

-- ==================== EVENTO 09: Sírio-Libanês | RAM Crítico | CHAMADO_ABERTO ====================
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_ram, 1, 89.7, NOW() - INTERVAL 4 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:22:4B:03' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 4 HOUR, @id_leitura, @cat_critico WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO chamado (slack_canal_id, slack_mensagem_ts, data_abertura, data_fim, fkAlerta, fkStatus)
SELECT 'C08SIRIO02', '1731849101.000103', NOW() - INTERVAL 4 HOUR, NOW() + INTERVAL 3 HOUR, @id_alerta, 1 WHERE @precisa_seed = 1;
SET @id_chamado = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, @id_chamado, 'Slack #alertas-hsl / Jira', 1, 1, 'CHAMADO_ABERTO',
       '[ITIL INCIDENT] Chamado #INC-1039 aberto automaticamente - SLA de atendimento iniciado',
       NOW() - INTERVAL 239 MINUTE
WHERE @precisa_seed = 1;

-- ==================== EVENTO 10: Santa Catarina | CPU Crítico | CHAMADO_ABERTO ====================
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_cpu, 1, 92.3, NOW() - INTERVAL 10 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:33:5C:02' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 10 HOUR, @id_leitura, @cat_critico WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO chamado (slack_canal_id, slack_mensagem_ts, data_abertura, data_fim, fkAlerta, fkStatus)
SELECT 'C08STACAT03', '1731827101.000104', NOW() - INTERVAL 10 HOUR, NOW() + INTERVAL 2 HOUR, @id_alerta, 2 WHERE @precisa_seed = 1;
SET @id_chamado = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, @id_chamado, 'Slack #pacs-santacatarina', 1, 1, 'CHAMADO_ABERTO',
       '[ITIL INCIDENT] Chamado #INC-1035 em análise pelo suporte local - Entrega confirmada',
       NOW() - INTERVAL 598 MINUTE
WHERE @precisa_seed = 1;

-- ==================== EVENTO 11: São Luiz | RAM Atenção | CHAMADO_ABERTO ====================
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_ram, 1, 82.4, NOW() - INTERVAL 12 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:44:6D:02' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 12 HOUR, @id_leitura, @cat_atencao WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO chamado (slack_canal_id, slack_mensagem_ts, data_abertura, data_fim, fkAlerta, fkStatus)
SELECT 'C08REDEDOR04', '1731820101.000105', NOW() - INTERVAL 12 HOUR, NOW() + INTERVAL 4 HOUR, @id_alerta, 1 WHERE @precisa_seed = 1;
SET @id_chamado = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, @id_chamado, 'Jira ITIL ServiceDesk', 1, 1, 'CHAMADO_ABERTO',
       '[ITIL INCIDENT] Chamado #INC-1032 aberto na fila de infraestrutura PACS - HTTP 201 Created',
       NOW() - INTERVAL 718 MINUTE
WHERE @precisa_seed = 1;

-- ==================== EVENTO 12: Oswaldo Cruz | CPU Crítico | CHAMADO_ABERTO ====================
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_cpu, 1, 91.8, NOW() - INTERVAL 15 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:55:7E:01' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 15 HOUR, @id_leitura, @cat_critico WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO chamado (slack_canal_id, slack_mensagem_ts, data_abertura, data_fim, fkAlerta, fkStatus)
SELECT 'C08HAOC05', '1731809101.000106', NOW() - INTERVAL 15 HOUR, NOW() + INTERVAL 5 HOUR, @id_alerta, 2 WHERE @precisa_seed = 1;
SET @id_chamado = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, @id_chamado, 'Slack #pacs-haoc / Jira', 1, 1, 'CHAMADO_ABERTO',
       '[ITIL INCIDENT] Chamado #INC-1029 em tratamento preventivo de CPU - ACK confirmado',
       NOW() - INTERVAL 898 MINUTE
WHERE @precisa_seed = 1;

-- ==================== EVENTOS 13 a 24: ENTREGUE (Sucesso HTTP 200 / Finalizados) ====================
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_cpu, 1, 83.2, NOW() - INTERVAL 30 MINUTE
FROM equipamento e WHERE e.mac_adress = '00:1B:44:11:3A:01' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 30 MINUTE, @id_leitura, @cat_atencao WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Slack #noc-einstein', 1, 1, 'ENTREGUE',
       '[HTTP 200 OK] Webhook Slack entregue e confirmado pelo canal em 94ms', NOW() - INTERVAL 29 MINUTE
WHERE @precisa_seed = 1;

INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_rede, 1, 44.0, NOW() - INTERVAL 3 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:11:3A:02' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 3 HOUR, @id_leitura, @cat_atencao WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Slack #noc-einstein', 1, 1, 'ENTREGUE',
       '[HTTP 200 OK] Notificação de latência de rede entregue e validada em 112ms', NOW() - INTERVAL 179 MINUTE
WHERE @precisa_seed = 1;

INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_ram, 1, 79.5, NOW() - INTERVAL 9 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:11:3A:03' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 9 HOUR, @id_leitura, @cat_atencao WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO chamado (slack_canal_id, slack_mensagem_ts, data_abertura, data_fim, fkAlerta, fkStatus)
SELECT 'C08EINSTEIN01', '1731831101.000107', NOW() - INTERVAL 9 HOUR, NOW() - INTERVAL 7 HOUR, @id_alerta, 3 WHERE @precisa_seed = 1;
SET @id_chamado = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, @id_chamado, 'Slack #noc-einstein', 1, 1, 'ENTREGUE',
       '[HTTP 200 OK] Alerta entregue e incidente #INC-1034 encerrado dentro do SLA', NOW() - INTERVAL 539 MINUTE
WHERE @precisa_seed = 1;

INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_cpu, 1, 90.8, NOW() - INTERVAL 7 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:22:4B:01' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 7 HOUR, @id_leitura, @cat_critico WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO chamado (slack_canal_id, slack_mensagem_ts, data_abertura, data_fim, fkAlerta, fkStatus)
SELECT 'C08SIRIO02', '1731838101.000108', NOW() - INTERVAL 7 HOUR, NOW() - INTERVAL 5 HOUR, @id_alerta, 3 WHERE @precisa_seed = 1;
SET @id_chamado = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, @id_chamado, 'Slack #alertas-hsl', 1, 1, 'ENTREGUE',
       '[HTTP 200 OK] Alerta crítico entregue e mitigado pela equipe do Sírio-Libanês', NOW() - INTERVAL 419 MINUTE
WHERE @precisa_seed = 1;

INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_rede, 1, 38.4, NOW() - INTERVAL 14 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:22:4B:02' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 14 HOUR, @id_leitura, @cat_atencao WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Slack #alertas-hsl', 1, 1, 'ENTREGUE',
       '[HTTP 200 OK] Alerta preventivo entregue com sucesso (latência 38ms)', NOW() - INTERVAL 839 MINUTE
WHERE @precisa_seed = 1;

INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_disco, 1, 86.0, NOW() - INTERVAL 11 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:33:5C:03' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 11 HOUR, @id_leitura, @cat_atencao WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Slack #pacs-santacatarina', 1, 1, 'ENTREGUE',
       '[HTTP 200 OK] Webhook entregue ao canal operacional Santa Catarina em 131ms', NOW() - INTERVAL 659 MINUTE
WHERE @precisa_seed = 1;

INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_ram, 1, 78.2, NOW() - INTERVAL 18 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:33:5C:01' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 18 HOUR, @id_leitura, @cat_atencao WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Slack #pacs-santacatarina', 1, 1, 'ENTREGUE',
       '[HTTP 200 OK] Confirmação de recebimento recebida via Webhook API', NOW() - INTERVAL 1079 MINUTE
WHERE @precisa_seed = 1;

INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_cpu, 1, 84.9, NOW() - INTERVAL 16 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:44:6D:01' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 16 HOUR, @id_leitura, @cat_atencao WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Slack #noc-rededor', 1, 1, 'ENTREGUE',
       '[HTTP 200 OK] Mensagem entregue no canal Rede DOr sem falhas', NOW() - INTERVAL 959 MINUTE
WHERE @precisa_seed = 1;

INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_disco, 1, 85.4, NOW() - INTERVAL 19 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:55:7E:02' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 19 HOUR, @id_leitura, @cat_atencao WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Slack #pacs-haoc', 1, 1, 'ENTREGUE',
       '[HTTP 200 OK] Webhook Slack #pacs-haoc entregue e confirmado em 105ms', NOW() - INTERVAL 1139 MINUTE
WHERE @precisa_seed = 1;

INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_rede, 1, 31.0, NOW() - INTERVAL 21 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:55:7E:01' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 21 HOUR, @id_leitura, @cat_atencao WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Slack #pacs-haoc', 1, 1, 'ENTREGUE',
       '[HTTP 200 OK] Alerta de rede entregue ao NOC Oswaldo Cruz', NOW() - INTERVAL 1259 MINUTE
WHERE @precisa_seed = 1;

INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_cpu, 1, 81.5, NOW() - INTERVAL 20 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:66:8F:01' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 20 HOUR, @id_leitura, @cat_atencao WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Slack #suporte-geral', 1, 1, 'ENTREGUE',
       '[HTTP 200 OK] Notificação entregue ao operador Hospital Das Dores em 88ms', NOW() - INTERVAL 1199 MINUTE
WHERE @precisa_seed = 1;

INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, @comp_ram, 1, 77.6, NOW() - INTERVAL 22 HOUR
FROM equipamento e WHERE e.mac_adress = '00:1B:44:66:8F:01' AND @precisa_seed = 1 LIMIT 1;
SET @id_leitura = LAST_INSERT_ID();
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT NOW() - INTERVAL 22 HOUR, @id_leitura, @cat_atencao WHERE @precisa_seed = 1;
SET @id_alerta = LAST_INSERT_ID();
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT @id_alerta, NULL, 'Slack #suporte-geral', 1, 1, 'ENTREGUE',
       '[HTTP 200 OK] Notificação de memória RAM entregue com sucesso', NOW() - INTERVAL 1319 MINUTE
WHERE @precisa_seed = 1;

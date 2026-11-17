-- ============================================================================
-- MagnaSync — Patch incremental da Dashboard Executiva (Daniel)
-- Não altera nem apaga nada do script do grupo; pode ser executado mais de uma vez.
-- ============================================================================
USE magnasync;

-- 1. Tabela de auditoria de entrega das notificações (Slack / Jira)
CREATE TABLE IF NOT EXISTS auditoria_notificacao (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fkAlerta INT NOT NULL UNIQUE,
    fkChamado INT NULL,
    canal_destino VARCHAR(60) NOT NULL DEFAULT 'Slack #alertas-pacs',
    enviado_sistema TINYINT(1) NOT NULL DEFAULT 1,       -- 1 = o sistema marcou como enviado
    confirmado_entrega TINYINT(1) NOT NULL DEFAULT 0,    -- 1 = a API externa confirmou o recebimento
    status_auditoria VARCHAR(30) NOT NULL,               -- ENTREGUE | CHAMADO_ABERTO | FALHA_ENVIO
    log_aplicacao VARCHAR(255) NOT NULL,
    dt_auditoria DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fkAlerta) REFERENCES alerta(id),
    FOREIGN KEY (fkChamado) REFERENCES chamado(id)
);

-- 2. Componentes monitorados (só cria se ainda não existirem)
INSERT INTO componente (valor, fkTipo, fkUnidade)
SELECT NULL, tc.id, u.id
FROM tipoComponente tc
JOIN unidade u ON u.medida = IF(tc.tipo = 'Rede - Latencia', 'ms', '%')
WHERE tc.tipo IN ('Processador', 'Ram', 'Disco', 'Rede - Latencia')
  AND NOT EXISTS (SELECT 1 FROM componente c WHERE c.fkTipo = tc.id);

-- 3. Hospitais clientes (identificados pelo CNPJ, não duplica)
INSERT INTO hospital (nome, cnpj, telefone, email, cep, numero)
SELECT v.* FROM (
    SELECT 'Hospital Albert Einstein' nome, '60765823000130' cnpj, '(11) 2151-1233' tel, 'ti.pacs@einstein.br' email, '05652900' cep, '627' num
    UNION ALL SELECT 'Hospital Sírio-Libanês',     '61590410000124', '(11) 3394-5000', 'infra@hsl.org.br',         '01308050', '91'
    UNION ALL SELECT 'Hospital Santa Catarina',    '60922168000186', '(11) 3016-4133', 'suporte.dicom@hsc.org.br', '01310000', '200'
    UNION ALL SELECT 'Hospital São Luiz Rede DOr', '06047087000139', '(11) 3040-1100', 'noc@rededor.com.br',       '04505002', '250'
    UNION ALL SELECT 'Hospital Oswaldo Cruz',      '60726502000189', '(11) 3549-1000', 'pacs.admin@haoc.com.br',   '01323001', '325'
    UNION ALL SELECT 'Hospital Das Dores',         '01234567891011', '(11) 11111-1111', 'hospitaldasdores@gmail.com', '05548722', '7980'
) v
WHERE NOT EXISTS (SELECT 1 FROM hospital h WHERE h.cnpj = v.cnpj);

-- 4. Servidores PACS por hospital (identificados pelo MAC, não duplica)
INSERT INTO equipamento (fabricante, mac_adress, hospital_id)
SELECT v.fab, v.mac, h.id FROM (
    SELECT 'GE Centricity PACS-01' fab, '00:1B:44:11:3A:01' mac, '60765823000130' cnpj
    UNION ALL SELECT 'GE Centricity PACS-02',        '00:1B:44:11:3A:02', '60765823000130'
    UNION ALL SELECT 'Dell PowerEdge R750-DICOM',    '00:1B:44:11:3A:03', '60765823000130'
    UNION ALL SELECT 'HPE ProLiant DL380-Archive',   '00:1B:44:11:3A:04', '60765823000130'
    UNION ALL SELECT 'GE PACS Storage-SL1',          '00:1B:44:22:4B:01', '61590410000124'
    UNION ALL SELECT 'Philips IntelliSpace-SL2',     '00:1B:44:22:4B:02', '61590410000124'
    UNION ALL SELECT 'Dell PowerEdge PACS-SL3',      '00:1B:44:22:4B:03', '61590410000124'
    UNION ALL SELECT 'GE Centricity PACS-SC1',       '00:1B:44:33:5C:01', '60922168000186'
    UNION ALL SELECT 'Lenovo ThinkSystem SR650',     '00:1B:44:33:5C:02', '60922168000186'
    UNION ALL SELECT 'Dell PACS Backup-SC3',         '00:1B:44:33:5C:03', '60922168000186'
    UNION ALL SELECT 'GE PACS Central-RD1',          '00:1B:44:44:6D:01', '06047087000139'
    UNION ALL SELECT 'HPE ProLiant PACS-RD2',        '00:1B:44:44:6D:02', '06047087000139'
    UNION ALL SELECT 'GE Centricity PACS-OC1',       '00:1B:44:55:7E:01', '60726502000189'
    UNION ALL SELECT 'Dell PACS Index-OC2',          '00:1B:44:55:7E:02', '60726502000189'
    UNION ALL SELECT 'GE PACS Legado-HD1',           '00:1B:44:66:8F:01', '01234567891011'
) v
JOIN hospital h ON h.cnpj = v.cnpj
WHERE NOT EXISTS (SELECT 1 FROM equipamento e WHERE e.mac_adress = v.mac);

-- 5. Parâmetros de cada servidor (a tabela leitura exige essa chave composta)
INSERT IGNORE INTO parametro (id, fkEquipamento, fkComponente, metrica)
SELECT 1, e.id, c.id, 80
FROM equipamento e
JOIN (SELECT MIN(c.id) id FROM componente c JOIN tipoComponente tc ON tc.id = c.fkTipo
      WHERE tc.tipo IN ('Processador', 'Ram', 'Disco', 'Rede - Latencia') GROUP BY tc.tipo) c;

-- 6. Eventos de teste (24): leituras -> alertas -> chamados -> auditoria
-- Só roda se a auditoria ainda estiver vazia.
SET @precisa_seed = (SELECT COUNT(*) = 0 FROM auditoria_notificacao);

DROP TEMPORARY TABLE IF EXISTS tmp_evento;
CREATE TEMPORARY TABLE tmp_evento (
    mac VARCHAR(17), tipo VARCHAR(45), valor DOUBLE, sev INT,
    status_aud VARCHAR(30), entregue TINYINT, chamado_status INT,
    canal VARCHAR(60), log_app VARCHAR(255), dt DATETIME
);

-- status_aud: FALHA_ENVIO (divergência) | CHAMADO_ABERTO | ENTREGUE
-- sev: 1 = Atenção, 2 = Crítico | chamado_status: 0 = sem chamado
INSERT INTO tmp_evento (mac, tipo, valor, sev, status_aud, entregue, chamado_status, canal, log_app, dt)
SELECT t.mac, t.tipo, t.valor, t.sev, t.st, t.ent, t.ch, t.canal, t.log_app, NOW() - INTERVAL t.min MINUTE
FROM (
    -- Divergências: sistema enviou, API externa NÃO confirmou
    SELECT '00:1B:44:11:3A:01' mac, 'Processador' tipo, 96.4 valor, 2 sev, 'FALHA_ENVIO' st, 0 ent, 0 ch, 'Slack #noc-einstein' canal, '[ERROR 504] Gateway Timeout ao aguardar confirmação de webhook Slack - Retentativa pendente' log_app, 18 min
    UNION ALL SELECT '00:1B:44:22:4B:01', 'Disco',           94.8, 2, 'FALHA_ENVIO', 0, 0, 'Jira ITIL ServiceDesk',   '[ERROR 429] Rate Limit Exceeded na API de abertura de incidentes - Fila de reenvio retida', 42
    UNION ALL SELECT '00:1B:44:11:3A:02', 'Ram',             91.2, 2, 'FALHA_ENVIO', 0, 0, 'Slack #noc-einstein',     '[ERROR 502] Bad Gateway no endpoint de mensageria hospitalar - Sem ACK do destinatário', 120
    UNION ALL SELECT '00:1B:44:33:5C:01', 'Rede - Latencia', 118,  2, 'FALHA_ENVIO', 0, 0, 'Slack #pacs-santacatarina','[ERROR 408] Request Timeout ao validar certificado TLS do webhook externo - Divergência registrada', 180
    UNION ALL SELECT '00:1B:44:22:4B:02', 'Processador',     86.5, 1, 'FALHA_ENVIO', 0, 0, 'Slack #alertas-hsl',      '[ERROR 503] Service Unavailable no broker de notificações - Alerta emitido sem confirmação', 300
    UNION ALL SELECT '00:1B:44:44:6D:01', 'Disco',           93.1, 2, 'FALHA_ENVIO', 0, 0, 'Jira ITIL ServiceDesk',   '[ERROR 504] Timeout na criação automática do ticket ITIL - Aguardando reprocessamento', 480
    -- Chamados abertos (1 = Aberto, 2 = Em Andamento)
    UNION ALL SELECT '00:1B:44:11:3A:03', 'Disco',           95.2, 2, 'CHAMADO_ABERTO', 1, 1, 'Slack #noc-einstein / Jira', '[ITIL INCIDENT] Chamado #INC-1041 aberto e atribuído ao Nível 2 - ACK confirmado em 118ms', 60
    UNION ALL SELECT '00:1B:44:11:3A:04', 'Processador',     94.0, 2, 'CHAMADO_ABERTO', 1, 2, 'Slack #noc-einstein / Jira', '[ITIL INCIDENT] Chamado #INC-1038 em andamento pela Engenharia Clínica - ACK HTTP 200', 360
    UNION ALL SELECT '00:1B:44:22:4B:03', 'Ram',             89.7, 2, 'CHAMADO_ABERTO', 1, 1, 'Slack #alertas-hsl / Jira', '[ITIL INCIDENT] Chamado #INC-1039 aberto automaticamente - SLA de atendimento iniciado', 240
    UNION ALL SELECT '00:1B:44:33:5C:02', 'Processador',     92.3, 2, 'CHAMADO_ABERTO', 1, 2, 'Slack #pacs-santacatarina', '[ITIL INCIDENT] Chamado #INC-1035 em análise pelo suporte local - Entrega confirmada', 600
    UNION ALL SELECT '00:1B:44:44:6D:02', 'Ram',             82.4, 1, 'CHAMADO_ABERTO', 1, 1, 'Jira ITIL ServiceDesk',  '[ITIL INCIDENT] Chamado #INC-1032 aberto na fila de infraestrutura PACS - HTTP 201 Created', 720
    UNION ALL SELECT '00:1B:44:55:7E:01', 'Processador',     91.8, 2, 'CHAMADO_ABERTO', 1, 2, 'Slack #pacs-haoc / Jira', '[ITIL INCIDENT] Chamado #INC-1029 em tratamento preventivo de CPU - ACK confirmado', 900
    -- Entregues com sucesso (alguns com chamado já finalizado = 3)
    UNION ALL SELECT '00:1B:44:11:3A:01', 'Processador',     83.2, 1, 'ENTREGUE', 1, 0, 'Slack #noc-einstein',  '[HTTP 200 OK] Webhook Slack entregue e confirmado pelo canal em 94ms', 30
    UNION ALL SELECT '00:1B:44:11:3A:02', 'Rede - Latencia', 44,   1, 'ENTREGUE', 1, 0, 'Slack #noc-einstein',  '[HTTP 200 OK] Notificação de latência de rede entregue e validada em 112ms', 180
    UNION ALL SELECT '00:1B:44:11:3A:03', 'Ram',             79.5, 1, 'ENTREGUE', 1, 3, 'Slack #noc-einstein',  '[HTTP 200 OK] Alerta entregue e incidente #INC-1034 encerrado dentro do SLA', 540
    UNION ALL SELECT '00:1B:44:22:4B:01', 'Processador',     90.8, 2, 'ENTREGUE', 1, 3, 'Slack #alertas-hsl',   '[HTTP 200 OK] Alerta crítico entregue e mitigado pela equipe do Sírio-Libanês', 420
    UNION ALL SELECT '00:1B:44:22:4B:02', 'Rede - Latencia', 38.4, 1, 'ENTREGUE', 1, 0, 'Slack #alertas-hsl',   '[HTTP 200 OK] Alerta preventivo entregue com sucesso (latência 38ms)', 840
    UNION ALL SELECT '00:1B:44:33:5C:03', 'Disco',           86.0, 1, 'ENTREGUE', 1, 0, 'Slack #pacs-santacatarina', '[HTTP 200 OK] Webhook entregue ao canal operacional Santa Catarina em 131ms', 660
    UNION ALL SELECT '00:1B:44:33:5C:01', 'Ram',             78.2, 1, 'ENTREGUE', 1, 0, 'Slack #pacs-santacatarina', '[HTTP 200 OK] Confirmação de recebimento recebida via Webhook API', 1080
    UNION ALL SELECT '00:1B:44:44:6D:01', 'Processador',     84.9, 1, 'ENTREGUE', 1, 0, 'Slack #noc-rededor',   '[HTTP 200 OK] Mensagem entregue no canal Rede DOr sem falhas', 960
    UNION ALL SELECT '00:1B:44:55:7E:02', 'Disco',           85.4, 1, 'ENTREGUE', 1, 0, 'Slack #pacs-haoc',     '[HTTP 200 OK] Webhook Slack #pacs-haoc entregue e confirmado em 105ms', 1140
    UNION ALL SELECT '00:1B:44:55:7E:01', 'Rede - Latencia', 31.0, 1, 'ENTREGUE', 1, 0, 'Slack #pacs-haoc',     '[HTTP 200 OK] Alerta de rede entregue ao NOC Oswaldo Cruz', 1260
    UNION ALL SELECT '00:1B:44:66:8F:01', 'Processador',     81.5, 1, 'ENTREGUE', 1, 0, 'Slack #suporte-geral', '[HTTP 200 OK] Notificação entregue ao operador Hospital Das Dores em 88ms', 1200
    UNION ALL SELECT '00:1B:44:66:8F:01', 'Ram',             77.6, 1, 'ENTREGUE', 1, 0, 'Slack #suporte-geral', '[HTTP 200 OK] Notificação de memória RAM entregue com sucesso', 1320
) t
WHERE @precisa_seed = 1;

-- Leitura que originou cada alerta
INSERT INTO leitura (fkEquipamento, fkComponente, fkMetrica, valor, data_hora)
SELECT e.id, c.id, 1, t.valor, t.dt
FROM tmp_evento t
JOIN equipamento e ON e.mac_adress = t.mac
JOIN (SELECT MIN(c.id) id, tc.tipo FROM componente c JOIN tipoComponente tc ON tc.id = c.fkTipo GROUP BY tc.tipo) c ON c.tipo = t.tipo;

-- Alerta (vinculado à leitura pela combinação servidor + componente + horário)
INSERT INTO alerta (data_hora, leitura_id, categoria_alerta_id)
SELECT t.dt, l.id, t.sev
FROM tmp_evento t
JOIN equipamento e ON e.mac_adress = t.mac
JOIN leitura l ON l.fkEquipamento = e.id AND l.data_hora = t.dt AND l.valor = t.valor;

-- Chamado (somente para eventos que abriram ticket)
INSERT INTO chamado (slack_canal_id, slack_mensagem_ts, data_abertura, data_fim, fkAlerta, fkStatus)
SELECT 'C08MAGNASYNC', CONCAT(UNIX_TIMESTAMP(t.dt), '.000100'), t.dt, t.dt + INTERVAL 3 HOUR, a.id, t.chamado_status
FROM tmp_evento t
JOIN equipamento e ON e.mac_adress = t.mac
JOIN leitura l ON l.fkEquipamento = e.id AND l.data_hora = t.dt AND l.valor = t.valor
JOIN alerta a ON a.leitura_id = l.id
WHERE t.chamado_status > 0;

-- Auditoria de entrega
INSERT INTO auditoria_notificacao (fkAlerta, fkChamado, canal_destino, enviado_sistema, confirmado_entrega, status_auditoria, log_aplicacao, dt_auditoria)
SELECT a.id, ch.id, t.canal, 1, t.entregue, t.status_aud, t.log_app, t.dt + INTERVAL 1 MINUTE
FROM tmp_evento t
JOIN equipamento e ON e.mac_adress = t.mac
JOIN leitura l ON l.fkEquipamento = e.id AND l.data_hora = t.dt AND l.valor = t.valor
JOIN alerta a ON a.leitura_id = l.id
LEFT JOIN chamado ch ON ch.fkAlerta = a.id;

DROP TEMPORARY TABLE IF EXISTS tmp_evento;

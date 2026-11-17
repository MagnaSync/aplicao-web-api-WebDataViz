var database = require("../database/config");

function obterKpisGlobais() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterKpisGlobais()");
    var instrucaoSql = `
        SELECT
            (SELECT COUNT(*) FROM hospital WHERE nome <> 'Hospital_MagnaSync') AS total_clientes_ativos,
            (SELECT COUNT(*) FROM equipamento) AS parque_total_monitorado,
            (SELECT COUNT(DISTINCT e.hospital_id)
             FROM alerta a
             JOIN leitura l ON l.id = a.leitura_id
             JOIN equipamento e ON e.id = l.fkEquipamento
             JOIN categoria_alerta ca ON ca.id = a.categoria_alerta_id
             WHERE ca.classificacao = 'Crítico'
               AND a.data_hora >= NOW() - INTERVAL 7 DAY) AS clientes_estado_critico,
            (SELECT COUNT(*)
             FROM alerta
             WHERE data_hora >= NOW() - INTERVAL 24 HOUR) AS volume_chamados_24h,
            (SELECT COUNT(*)
             FROM auditoria_notificacao
             WHERE enviado_sistema = 1 AND confirmado_entrega = 0) AS divergencias_ativas;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function obterRankingIncidentes() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterRankingIncidentes()");
    var instrucaoSql = `
        SELECT
            h.id AS hospital_id,
            h.nome AS hospital_nome,
            SUM(CASE WHEN ca.classificacao = 'Crítico' THEN 1 ELSE 0 END) AS criticos,
            SUM(CASE WHEN ca.classificacao = 'Atenção' THEN 1 ELSE 0 END) AS atencao,
            COUNT(a.id) AS total_incidentes
        FROM hospital h
        JOIN equipamento e ON e.hospital_id = h.id
        JOIN leitura l ON l.fkEquipamento = e.id
        JOIN alerta a ON a.leitura_id = l.id
        JOIN categoria_alerta ca ON ca.id = a.categoria_alerta_id
        WHERE h.nome <> 'Hospital_MagnaSync'
        GROUP BY h.id, h.nome
        ORDER BY total_incidentes DESC, criticos DESC
        LIMIT 8;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function obterAlertasGeradosVsEntregues() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterAlertasGeradosVsEntregues()");
    var instrucaoSql = `
        SELECT
            DATE_FORMAT(a.data_hora, '%H:00') AS janela_hora,
            DATE_FORMAT(a.data_hora, '%Y-%m-%d %H:00:00') AS bucket_ordem,
            SUM(CASE WHEN COALESCE(an.enviado_sistema, 1) = 1 THEN 1 ELSE 0 END) AS alertas_gerados,
            SUM(CASE WHEN COALESCE(an.confirmado_entrega, 0) = 1 THEN 1 ELSE 0 END) AS alertas_entregues,
            SUM(CASE WHEN COALESCE(an.enviado_sistema, 1) = 1 AND COALESCE(an.confirmado_entrega, 0) = 0 THEN 1 ELSE 0 END) AS alertas_retidos
        FROM alerta a
        LEFT JOIN auditoria_notificacao an ON an.fkAlerta = a.id
        WHERE a.data_hora >= NOW() - INTERVAL 24 HOUR
        GROUP BY bucket_ordem, janela_hora
        ORDER BY bucket_ordem ASC;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function obterAuditoriaRosca() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterAuditoriaRosca()");
    var instrucaoSql = `
        SELECT
            COALESCE(SUM(CASE WHEN status_auditoria = 'ENTREGUE' THEN 1 ELSE 0 END), 0) AS entregues_sucesso,
            COALESCE(SUM(CASE WHEN status_auditoria = 'CHAMADO_ABERTO' THEN 1 ELSE 0 END), 0) AS chamados_abertos,
            COALESCE(SUM(CASE WHEN status_auditoria = 'FALHA_ENVIO' OR (enviado_sistema = 1 AND confirmado_entrega = 0) THEN 1 ELSE 0 END), 0) AS retidos_falha,
            COUNT(*) AS total_auditado
        FROM auditoria_notificacao;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function obterDivergenciasLogs() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterDivergenciasLogs()");
    var instrucaoSql = `
        SELECT
            a.id AS alerta_id,
            h.nome AS nome_cliente,
            e.fabricante AS servidor_fabricante,
            e.mac_adress AS mac_adress,
            tc.tipo AS componente,
            ROUND(l.valor, 1) AS valor_leitura,
            u.medida AS unidade_medida,
            ca.classificacao AS severidade,
            DATE_FORMAT(a.data_hora, '%d/%m/%Y %H:%i:%s') AS horario_alerta,
            an.canal_destino,
            an.enviado_sistema,
            an.confirmado_entrega,
            an.status_auditoria,
            an.log_aplicacao,
            DATE_FORMAT(an.dt_auditoria, '%d/%m/%Y %H:%i:%s') AS horario_auditoria
        FROM auditoria_notificacao an
        JOIN alerta a ON a.id = an.fkAlerta
        JOIN categoria_alerta ca ON ca.id = a.categoria_alerta_id
        JOIN leitura l ON l.id = a.leitura_id
        JOIN equipamento e ON e.id = l.fkEquipamento
        JOIN hospital h ON h.id = e.hospital_id
        JOIN componente c ON c.id = l.fkComponente
        JOIN tipoComponente tc ON tc.id = c.fkTipo
        JOIN unidade u ON u.id = c.fkUnidade
        ORDER BY (an.enviado_sistema = 1 AND an.confirmado_entrega = 0) DESC, a.data_hora DESC;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function obterRelatorioExecutivo() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterRelatorioExecutivo()");
    var instrucaoSql = `
        SELECT
            h.id AS hospital_id,
            h.nome AS nome_cliente,
            h.cnpj,
            h.email,
            COUNT(DISTINCT e.id) AS total_maquinas,
            COUNT(DISTINCT CASE WHEN ca.classificacao = 'Crítico' THEN a.id END) AS alertas_criticos,
            COUNT(DISTINCT CASE WHEN ca.classificacao = 'Atenção' THEN a.id END) AS alertas_atencao,
            COUNT(DISTINCT a.id) AS total_alertas,
            COUNT(DISTINCT CASE WHEN an.confirmado_entrega = 1 THEN a.id END) AS entregas_confirmadas,
            COUNT(DISTINCT CASE WHEN an.enviado_sistema = 1 AND an.confirmado_entrega = 0 THEN a.id END) AS falhas_divergencia,
            ROUND(
                COALESCE(
                    COUNT(DISTINCT CASE WHEN an.confirmado_entrega = 1 THEN a.id END) * 100.0 / NULLIF(COUNT(DISTINCT a.id), 0),
                    100.0
                ),
                1
            ) AS taxa_entrega_pct
        FROM hospital h
        LEFT JOIN equipamento e ON e.hospital_id = h.id
        LEFT JOIN leitura l ON l.fkEquipamento = e.id
        LEFT JOIN alerta a ON a.leitura_id = l.id
        LEFT JOIN categoria_alerta ca ON ca.id = a.categoria_alerta_id
        LEFT JOIN auditoria_notificacao an ON an.fkAlerta = a.id
        WHERE h.nome <> 'Hospital_MagnaSync'
        GROUP BY h.id, h.nome, h.cnpj, h.email
        ORDER BY falhas_divergencia DESC, alertas_criticos DESC, total_alertas DESC, h.nome ASC;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

module.exports = {
    obterKpisGlobais,
    obterRankingIncidentes,
    obterAlertasGeradosVsEntregues,
    obterAuditoriaRosca,
    obterDivergenciasLogs,
    obterRelatorioExecutivo
};

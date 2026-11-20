var database = require("../database/config");

// KPIs do topo da dashboard (somente tabelas oficiais de magnasync_script.sql)
function obterKpisGlobais() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterKpisGlobais()");
    var instrucaoSql = `
        SELECT
            (SELECT COUNT(*) FROM hospital WHERE id <> 1) AS total_clientes_ativos,
            (SELECT COUNT(*)
               FROM equipamento e
               JOIN hospital h ON h.id = e.hospital_id
              WHERE h.id <> 1) AS parque_total_monitorado,
            (SELECT COUNT(*)
               FROM chamado ch
               JOIN status_chamado sc ON sc.id = ch.fkStatus
               JOIN alerta a ON a.id = ch.fkAlerta
               JOIN leitura l ON l.id = a.leitura_id
               JOIN equipamento e ON e.id = l.fkEquipamento
              WHERE e.hospital_id <> 1
                AND sc.descricao = 'Finalizado') AS chamados_finalizados,
            (SELECT COUNT(*)
               FROM chamado ch
               JOIN alerta a ON a.id = ch.fkAlerta
               JOIN leitura l ON l.id = a.leitura_id
               JOIN equipamento e ON e.id = l.fkEquipamento
              WHERE e.hospital_id <> 1) AS total_chamados,
            (SELECT COALESCE(ROUND(
                SUM(CASE WHEN sc.descricao = 'Finalizado' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(ch.id), 0)
            , 0), 0)
               FROM chamado ch
               JOIN status_chamado sc ON sc.id = ch.fkStatus
               JOIN alerta a ON a.id = ch.fkAlerta
               JOIN leitura l ON l.id = a.leitura_id
               JOIN equipamento e ON e.id = l.fkEquipamento
              WHERE e.hospital_id <> 1) AS taxa_resolucao_pct,
            (SELECT COUNT(*)
               FROM chamado ch
               JOIN status_chamado sc ON sc.id = ch.fkStatus
               JOIN alerta a ON a.id = ch.fkAlerta
               JOIN leitura l ON l.id = a.leitura_id
               JOIN equipamento e ON e.id = l.fkEquipamento
              WHERE e.hospital_id <> 1
                AND sc.descricao IN ('Aberto', 'Em Andamento')) AS chamados_abertos,
            (SELECT COALESCE(ROUND(AVG(TIMESTAMPDIFF(MINUTE, ch.data_abertura, ch.data_fim)), 0), 0)
               FROM chamado ch
               JOIN status_chamado sc ON sc.id = ch.fkStatus
               JOIN alerta a ON a.id = ch.fkAlerta
               JOIN leitura l ON l.id = a.leitura_id
               JOIN equipamento e ON e.id = l.fkEquipamento
              WHERE e.hospital_id <> 1
                AND sc.descricao = 'Finalizado'
                AND ch.data_fim >= ch.data_abertura) AS mttr_minutos;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Gráfico: Ranking de clientes com mais problemas (Bloqueio, Crítico e Atenção)
function obterRankingIncidentes() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterRankingIncidentes()");
    var instrucaoSql = `
        SELECT
            h.id AS hospital_id,
            h.nome AS hospital_nome,
            COUNT(DISTINCT CASE WHEN ca.classificacao = 'Bloqueio' THEN a.id END) AS bloqueio,
            COUNT(DISTINCT CASE WHEN ca.classificacao = 'Crítico' THEN a.id END) AS criticos,
            COUNT(DISTINCT CASE WHEN ca.classificacao = 'Atenção' THEN a.id END) AS atencao,
            COUNT(DISTINCT a.id) AS total_incidentes,
            (
                COUNT(DISTINCT CASE WHEN ca.classificacao = 'Bloqueio' THEN a.id END) * 3 +
                COUNT(DISTINCT CASE WHEN ca.classificacao = 'Crítico' THEN a.id END) * 2 +
                COUNT(DISTINCT CASE WHEN ca.classificacao = 'Atenção' THEN a.id END)
            ) AS indice_criticidade,
            COUNT(DISTINCT CASE WHEN sc.descricao IN ('Aberto', 'Em Andamento') THEN ch.id END) AS chamados_abertos,
            COUNT(DISTINCT e.id) AS servidores_afetados,
            COALESCE(MAX(eq_tot.total_servidores), 0) AS total_servidores,
            MAX(garg.principal_gargalo) AS principal_gargalo,
            COALESCE(MAX(garg.gargalo_qtd), 0) AS gargalo_qtd
        FROM hospital h
        JOIN equipamento e ON e.hospital_id = h.id
        JOIN leitura l ON l.fkEquipamento = e.id
        JOIN alerta a ON a.leitura_id = l.id
        JOIN categoria_alerta ca ON ca.id = a.categoria_alerta_id
        LEFT JOIN chamado ch ON ch.fkAlerta = a.id
        LEFT JOIN status_chamado sc ON sc.id = ch.fkStatus
        LEFT JOIN (
            SELECT hospital_id, COUNT(*) AS total_servidores
            FROM equipamento
            GROUP BY hospital_id
        ) eq_tot ON eq_tot.hospital_id = h.id
        LEFT JOIN (
            SELECT hospital_id, tipo AS principal_gargalo, qtd AS gargalo_qtd
            FROM (
                SELECT
                    e2.hospital_id,
                    tc2.tipo,
                    COUNT(a2.id) AS qtd,
                    ROW_NUMBER() OVER (PARTITION BY e2.hospital_id ORDER BY COUNT(a2.id) DESC, tc2.tipo ASC) AS rn
                FROM equipamento e2
                JOIN leitura l2 ON l2.fkEquipamento = e2.id
                JOIN alerta a2 ON a2.leitura_id = l2.id
                JOIN componente c2 ON c2.id = l2.fkComponente
                JOIN tipoComponente tc2 ON tc2.id = c2.fkTipo
                GROUP BY e2.hospital_id, tc2.tipo
            ) ranked
            WHERE ranked.rn = 1
        ) garg ON garg.hospital_id = h.id
        WHERE h.id <> 1
        GROUP BY h.id, h.nome
        ORDER BY indice_criticidade DESC, total_incidentes DESC, bloqueio DESC, criticos DESC
        LIMIT 8;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Gráfico: Alertas Gerados vs. Chamados Resolvidos nas últimas 24h
function obterAlertasVsResolvidos() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterAlertasVsResolvidos()");
    var instrucaoSql = `
        SELECT
            DATE_FORMAT(a.data_hora, '%H:00') AS janela_hora,
            DATE_FORMAT(a.data_hora, '%Y-%m-%d %H:00:00') AS bucket_ordem,
            COUNT(DISTINCT a.id) AS alertas_gerados,
            COUNT(DISTINCT CASE WHEN sc.descricao = 'Finalizado' THEN ch.id END) AS chamados_resolvidos
        FROM alerta a
        JOIN leitura l ON l.id = a.leitura_id
        JOIN equipamento e ON e.id = l.fkEquipamento
        LEFT JOIN chamado ch ON ch.fkAlerta = a.id
        LEFT JOIN status_chamado sc ON sc.id = ch.fkStatus
        WHERE e.hospital_id <> 1
          AND a.data_hora >= (SELECT MAX(data_hora) - INTERVAL 24 HOUR FROM alerta)
        GROUP BY bucket_ordem, janela_hora
        ORDER BY bucket_ordem;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Gráfico de Rosca + Saúde Global da Carteira: Situação dos Chamados e Parque
function obterSituacaoChamados() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterSituacaoChamados()");
    var instrucaoSql = `
        SELECT
            COALESCE(SUM(CASE WHEN sc.descricao = 'Aberto' THEN 1 ELSE 0 END), 0) AS abertos,
            COALESCE(SUM(CASE WHEN sc.descricao = 'Em Andamento' THEN 1 ELSE 0 END), 0) AS em_andamento,
            COALESCE(SUM(CASE WHEN sc.descricao = 'Finalizado' THEN 1 ELSE 0 END), 0) AS finalizados,
            COALESCE(SUM(CASE WHEN sc.descricao = 'Cancelado' THEN 1 ELSE 0 END), 0) AS cancelados,
            COUNT(ch.id) AS total_chamados,
            COALESCE(ROUND(AVG(CASE WHEN sc.descricao = 'Finalizado' AND ch.data_fim >= ch.data_abertura THEN TIMESTAMPDIFF(MINUTE, ch.data_abertura, ch.data_fim) END), 0), 0) AS mttr_minutos,
            (SELECT COUNT(DISTINCT e2.id)
               FROM alerta a2
               JOIN leitura l2 ON l2.id = a2.leitura_id
               JOIN equipamento e2 ON e2.id = l2.fkEquipamento
               JOIN categoria_alerta ca2 ON ca2.id = a2.categoria_alerta_id
               LEFT JOIN chamado ch2 ON ch2.fkAlerta = a2.id
               LEFT JOIN status_chamado sc2 ON sc2.id = ch2.fkStatus
              WHERE e2.hospital_id <> 1
                AND ca2.classificacao IN ('Crítico', 'Bloqueio')
                AND a2.data_hora >= (SELECT MAX(data_hora) - INTERVAL 7 DAY FROM alerta)
                AND (ch2.id IS NULL OR sc2.descricao IN ('Aberto', 'Em Andamento'))) AS servidores_criticos,
            (SELECT COUNT(*) FROM equipamento WHERE hospital_id <> 1) AS total_servidores
        FROM chamado ch
        JOIN status_chamado sc ON sc.id = ch.fkStatus
        JOIN alerta a ON a.id = ch.fkAlerta
        JOIN leitura l ON l.id = a.leitura_id
        JOIN equipamento e ON e.id = l.fkEquipamento
        WHERE e.hospital_id <> 1;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Relatório (Card 1): Carteira de clientes com antiguidade, incidentes, gargalo e MTTR
function obterRelatorioCarteira() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterRelatorioCarteira()");
    var instrucaoSql = `
        SELECT
            h.id AS hospital_id,
            h.nome AS nome_cliente,
            h.cnpj,
            h.email,
            DATE_FORMAT(MIN(l.data_hora), '%d/%m/%Y') AS cliente_desde,
            DATE_FORMAT(MIN(l.data_hora), '%Y-%m-%d %H:%i:%s') AS cliente_desde_iso,
            DATEDIFF(NOW(), MIN(l.data_hora)) AS dias_casa,
            COUNT(DISTINCT e.id) AS total_maquinas,
            COUNT(DISTINCT CASE
                WHEN ca.classificacao IN ('Crítico', 'Bloqueio')
                 AND a.data_hora >= max_alerta.ref_7d
                 AND (ch.id IS NULL OR sc.descricao IN ('Aberto', 'Em Andamento'))
                THEN e.id
            END) AS servidores_criticos,
            COUNT(DISTINCT CASE WHEN ca.classificacao = 'Bloqueio' THEN a.id END) AS alertas_bloqueio,
            COUNT(DISTINCT CASE WHEN ca.classificacao = 'Crítico' THEN a.id END) AS alertas_criticos,
            COUNT(DISTINCT CASE WHEN ca.classificacao = 'Atenção' THEN a.id END) AS alertas_atencao,
            COUNT(DISTINCT a.id) AS total_alertas,
            COUNT(DISTINCT CASE WHEN sc.descricao IN ('Aberto', 'Em Andamento') THEN ch.id END) AS chamados_abertos,
            COUNT(DISTINCT CASE WHEN sc.descricao = 'Aberto' THEN ch.id END) AS chamados_somente_abertos,
            COUNT(DISTINCT CASE WHEN sc.descricao = 'Em Andamento' THEN ch.id END) AS chamados_em_andamento,
            COUNT(DISTINCT CASE WHEN sc.descricao = 'Finalizado' THEN ch.id END) AS chamados_finalizados,
            COUNT(DISTINCT CASE WHEN sc.descricao = 'Cancelado' THEN ch.id END) AS chamados_cancelados,
            ROUND(AVG(CASE
                WHEN sc.descricao = 'Finalizado' AND ch.data_fim >= ch.data_abertura
                THEN TIMESTAMPDIFF(MINUTE, ch.data_abertura, ch.data_fim)
            END), 0) AS mttr_minutos,
            (
                COUNT(DISTINCT CASE WHEN ca.classificacao = 'Bloqueio' THEN a.id END) * 3 +
                COUNT(DISTINCT CASE WHEN ca.classificacao = 'Crítico' THEN a.id END) * 2 +
                COUNT(DISTINCT CASE WHEN ca.classificacao = 'Atenção' THEN a.id END)
            ) AS indice_criticidade,
            MAX(garg.principal_gargalo) AS principal_gargalo,
            COALESCE(MAX(garg.gargalo_qtd), 0) AS gargalo_qtd
        FROM hospital h
        CROSS JOIN (
            SELECT COALESCE(MAX(data_hora) - INTERVAL 7 DAY, NOW() - INTERVAL 7 DAY) AS ref_7d
            FROM alerta
        ) max_alerta
        LEFT JOIN equipamento e ON e.hospital_id = h.id
        LEFT JOIN leitura l ON l.fkEquipamento = e.id
        LEFT JOIN alerta a ON a.leitura_id = l.id
        LEFT JOIN categoria_alerta ca ON ca.id = a.categoria_alerta_id
        LEFT JOIN chamado ch ON ch.fkAlerta = a.id
        LEFT JOIN status_chamado sc ON sc.id = ch.fkStatus
        LEFT JOIN (
            SELECT hospital_id, tipo AS principal_gargalo, qtd AS gargalo_qtd
            FROM (
                SELECT
                    e2.hospital_id,
                    tc2.tipo,
                    COUNT(a2.id) AS qtd,
                    ROW_NUMBER() OVER (PARTITION BY e2.hospital_id ORDER BY COUNT(a2.id) DESC, tc2.tipo ASC) AS rn
                FROM equipamento e2
                JOIN leitura l2 ON l2.fkEquipamento = e2.id
                JOIN alerta a2 ON a2.leitura_id = l2.id
                JOIN componente c2 ON c2.id = l2.fkComponente
                JOIN tipoComponente tc2 ON tc2.id = c2.fkTipo
                GROUP BY e2.hospital_id, tc2.tipo
            ) ranked
            WHERE ranked.rn = 1
        ) garg ON garg.hospital_id = h.id
        WHERE h.id <> 1
        GROUP BY h.id, h.nome, h.cnpj, h.email, max_alerta.ref_7d
        ORDER BY indice_criticidade DESC, alertas_bloqueio DESC, alertas_criticos DESC, h.nome ASC;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Relatório (Card 2): Histórico recente de incidentes e chamados da carteira
function obterHistoricoIncidentes() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterHistoricoIncidentes()");
    var instrucaoSql = `
        SELECT
            a.id AS alerta_id,
            DATE_FORMAT(a.data_hora, '%d/%m/%Y %H:%i:%s') AS horario_alerta,
            DATE_FORMAT(a.data_hora, '%Y-%m-%d %H:%i:%s') AS horario_alerta_iso,
            h.nome AS nome_cliente,
            e.fabricante AS servidor_fabricante,
            e.mac_adress,
            tc.tipo AS componente,
            ROUND(l.valor, 1) AS valor_leitura,
            u.medida AS unidade_medida,
            ca.classificacao AS severidade,
            ch.id AS chamado_id,
            COALESCE(sc.descricao, 'Sem Chamado') AS status_chamado,
            CASE
                WHEN sc.descricao = 'Finalizado' AND ch.data_fim >= ch.data_abertura
                THEN TIMESTAMPDIFF(MINUTE, ch.data_abertura, ch.data_fim)
                ELSE NULL
            END AS tempo_resolucao_min
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
        WHERE h.id <> 1
        ORDER BY a.data_hora DESC, a.id DESC
        LIMIT 300;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

module.exports = {
    obterKpisGlobais,
    obterRankingIncidentes,
    obterAlertasVsResolvidos,
    obterSituacaoChamados,
    obterRelatorioCarteira,
    obterHistoricoIncidentes
};

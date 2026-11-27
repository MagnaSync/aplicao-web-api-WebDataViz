var database = require("../database/config");

// Total de hospitais clientes (exclui matriz id = 1)
function contarClientesAtivos() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function contarClientesAtivos()");
    var instrucaoSql = `
        SELECT COUNT(*) AS total
        FROM hospital
        WHERE id <> 1;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Total de servidores PACS monitorados dos clientes
function contarEquipamentos() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function contarEquipamentos()");
    var instrucaoSql = `
        SELECT COUNT(*) AS total
        FROM equipamento
        WHERE hospital_id <> 1;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Resumo global de chamados por status + MTTR (usado nas KPIs e na Rosca)
function obterResumoChamados() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterResumoChamados()");
    var instrucaoSql = `
        SELECT
            status_chamado,
            COUNT(DISTINCT chamado_id) AS qtd,
            ROUND(AVG(tempo_resolucao_min), 0) AS mttr_minutos
        FROM vw_incidentes
        WHERE chamado_id IS NOT NULL
        GROUP BY status_chamado;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Quantidade de servidores com alerta crítico/bloqueio ainda sem conclusão nos últimos 7 dias
function contarServidoresCriticos() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function contarServidoresCriticos()");
    var instrucaoSql = `
        SELECT COUNT(DISTINCT equipamento_id) AS servidores_criticos
        FROM vw_incidentes
        WHERE severidade IN ('Crítico', 'Bloqueio')
          AND status_chamado IN ('Sem Chamado', 'Aberto', 'Em Andamento')
          AND data_hora >= (SELECT MAX(data_hora) - INTERVAL 7 DAY FROM alerta);
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Gráfico: Alertas Gerados vs. Chamados Resolvidos nas últimas 24h
function obterAlertasVsResolvidos() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterAlertasVsResolvidos()");
    var instrucaoSql = `
        SELECT
            DATE_FORMAT(data_hora, '%H:00') AS janela_hora,
            DATE_FORMAT(data_hora, '%Y-%m-%d %H:00:00') AS bucket_ordem,
            COUNT(DISTINCT alerta_id) AS alertas_gerados,
            COUNT(DISTINCT IF(status_chamado = 'Finalizado', chamado_id, NULL)) AS chamados_resolvidos
        FROM vw_incidentes
        WHERE data_hora >= (SELECT MAX(data_hora) - INTERVAL 24 HOUR FROM alerta)
        GROUP BY bucket_ordem, janela_hora
        ORDER BY bucket_ordem;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Relatório (Card 2): Histórico recente de incidentes e chamados da carteira
function obterHistoricoIncidentes() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterHistoricoIncidentes()");
    var instrucaoSql = `
        SELECT *
        FROM vw_incidentes
        ORDER BY data_hora DESC, alerta_id DESC
        LIMIT 300;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Dados base e antiguidade de cada hospital cliente
function listarHospitaisBase() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function listarHospitaisBase()");
    var instrucaoSql = `
        SELECT *
        FROM vw_hospitais_base;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Contagem de alertas por hospital e severidade
function obterSeveridadesPorHospital() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterSeveridadesPorHospital()");
    var instrucaoSql = `
        SELECT
            hospital_id,
            severidade,
            COUNT(DISTINCT alerta_id) AS qtd
        FROM vw_incidentes
        GROUP BY hospital_id, severidade;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Contagem de chamados e MTTR por hospital e status
function obterChamadosPorHospital() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterChamadosPorHospital()");
    var instrucaoSql = `
        SELECT
            hospital_id,
            status_chamado,
            COUNT(DISTINCT chamado_id) AS qtd,
            ROUND(AVG(tempo_resolucao_min), 0) AS mttr_minutos
        FROM vw_incidentes
        WHERE chamado_id IS NOT NULL
        GROUP BY hospital_id, status_chamado;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Componentes com mais alertas por hospital (o primeiro de cada hospital é o gargalo principal)
function obterGargalosPorHospital() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function obterGargalosPorHospital()");
    var instrucaoSql = `
        SELECT
            hospital_id,
            componente,
            COUNT(DISTINCT alerta_id) AS qtd
        FROM vw_incidentes
        GROUP BY hospital_id, componente
        ORDER BY hospital_id, qtd DESC, componente ASC;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Total de servidores que já tiveram algum alerta por hospital
function contarServidoresAfetadosPorHospital() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function contarServidoresAfetadosPorHospital()");
    var instrucaoSql = `
        SELECT
            hospital_id,
            COUNT(DISTINCT equipamento_id) AS servidores_afetados
        FROM vw_incidentes
        GROUP BY hospital_id;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Servidores em situação crítica nos últimos 7 dias por hospital
function contarServidoresCriticosPorHospital() {
    console.log("ACESSEI O DASHBOARD DANIEL MODEL - function contarServidoresCriticosPorHospital()");
    var instrucaoSql = `
        SELECT
            hospital_id,
            COUNT(DISTINCT equipamento_id) AS servidores_criticos
        FROM vw_incidentes
        WHERE severidade IN ('Crítico', 'Bloqueio')
          AND status_chamado IN ('Sem Chamado', 'Aberto', 'Em Andamento')
          AND data_hora >= (SELECT MAX(data_hora) - INTERVAL 7 DAY FROM alerta)
        GROUP BY hospital_id;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

module.exports = {
    contarClientesAtivos,
    contarEquipamentos,
    obterResumoChamados,
    contarServidoresCriticos,
    obterAlertasVsResolvidos,
    obterHistoricoIncidentes,
    listarHospitaisBase,
    obterSeveridadesPorHospital,
    obterChamadosPorHospital,
    obterGargalosPorHospital,
    contarServidoresAfetadosPorHospital,
    contarServidoresCriticosPorHospital
};

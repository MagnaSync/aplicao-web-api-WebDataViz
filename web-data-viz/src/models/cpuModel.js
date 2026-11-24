var database = require("../database/config");


function historicoDados(id_equipamento) {
    var instrucaoSql = `
        SELECT
            data_hora,
            valor_captura AS valor
        FROM vw_historico_leituras
            WHERE componente = 'Processador'
                AND id_equipamento = ${id_equipamento}
                AND data_hora >= NOW() - INTERVAL 60 MINUTE
                AND data_hora <= NOW()
        ORDER BY data_hora ASC;
    `;

    return database.executar(instrucaoSql);
}


function alertasCpu7dias(id_equipamento) {
    console.log("ACESSEI O CPU MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function dados()");
    var instrucao = `
        SELECT COUNT(a.id) AS Total_Alertas
        FROM alerta a
            JOIN categoria_alerta ca ON ca.id = a.categoria_alerta_id
            JOIN leitura l ON l.id = a.leitura_id
            JOIN equipamento e ON e.id = l.fkEquipamento
            JOIN hospital h ON h.id = e.hospital_id
            JOIN componente c ON c.id = l.fkComponente
            JOIN tipoComponente t ON t.id = c.fkTipo
                WHERE t.tipo = "Processador"
                    AND l.fkEquipamento = ${id_equipamento} AND a.data_hora >= NOW() - INTERVAL 7 DAY;`
    return database.executar(instrucao);
}

function usoMedioCpu(id_equipamento) {
    console.log("ACESSEI O CPU MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function dados()");
    var instrucao = `
       SELECT
        ROUND(AVG(valor_captura), 2) AS usoMedio
    FROM vw_historico_leituras
        WHERE componente = 'Processador'
            AND id_equipamento = ${id_equipamento}
            AND data_hora >= NOW() - INTERVAL 60 MINUTE;`
    return database.executar(instrucao);
}

function picoCpu(id_equipamento){
    console.log("ACESSEI O CPU MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function dados()");
    var instrucao = `
        SELECT ROUND(MAX(valor_captura), 1) as Pico_Leituras 
            FROM vw_historico_leituras 
                WHERE componente = "Processador" 
                    AND id_equipamento = ${id_equipamento}
                    AND data_hora >= NOW() - INTERVAL 60 MINUTE
                    AND data_hora <= NOW();`
    return database.executar(instrucao);
}

function rankingCpu(id_equipamento) {
    console.log("ACESSEI O CPU MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function dados()");
    var instrucao = `
        SELECT 
            DATE_FORMAT(
                DATE_ADD(data_hora, INTERVAL -MINUTE(data_hora) % 30 MINUTE), 
                '%Y-%m-%d %H:%i'
            ) AS intervalo_30_min,
            componente,
            metrica,
            unidade,
            ROUND(AVG(valor_captura), 2) AS media_uso,
            DENSE_RANK() OVER (
                PARTITION BY metrica 
                ORDER BY AVG(valor_captura) DESC
            ) AS ranking
        FROM 
            vw_historico_leituras
        WHERE 
            componente = 'Processador' AND id_equipamento = ${id_equipamento} AND data_hora >= NOW() - INTERVAL 7 DAY
        GROUP BY 
            intervalo_30_min,
            componente,
            metrica,
            unidade
        ORDER BY 
            metrica, 
            ranking ASC
        LIMIT 5;`
    return database.executar(instrucao);
}

function histogramaCpu(id_equipamento) {
    console.log("ACESSEI O CPU MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function dados()");
    var instrucao = `
        SELECT 
            FLOOR(valor_captura / 10) * 10 AS inicio_intervalo,
            COUNT(*) AS numero_leituras
        FROM 
            vw_historico_leituras
        WHERE 
            componente LIKE '%Processador%' 
            AND valor_captura BETWEEN 0 AND 100 AND id_equipamento = ${id_equipamento} AND data_hora >= NOW() - INTERVAL 7 DAY
        GROUP BY 
            inicio_intervalo
        ORDER BY 
            inicio_intervalo ASC;`
    return database.executar(instrucao);
}

function alertasPorDia(id_equipamento) {
    var instrucao = `
        SELECT
            DATE_FORMAT(a.data_hora, '%Y-%m-%d') AS dia,
            COUNT(a.id) AS quantidade_alertas
        FROM alerta a
        JOIN leitura l ON l.id = a.leitura_id
        JOIN componente c ON c.id = l.fkComponente
        JOIN tipoComponente t ON t.id = c.fkTipo
        WHERE t.tipo = 'Processador'
            AND l.fkEquipamento = ${id_equipamento}
            AND a.data_hora >= CURDATE() - INTERVAL 6 DAY
            AND a.data_hora <= NOW()
        GROUP BY dia
        ORDER BY dia ASC;
    `;

    return database.executar(instrucao);
}

function tempoAcumuladoAlerta(id_equipamento) {
    var instrucao = `
        SELECT
            COUNT(DISTINCT DATE_FORMAT(l.data_hora, '%Y-%m-%d %H:%i'))
                AS minutosEmAlerta
        FROM alerta a
        JOIN leitura l ON l.id = a.leitura_id
        JOIN componente c ON c.id = l.fkComponente
        JOIN tipoComponente t ON t.id = c.fkTipo
        WHERE t.tipo = 'Processador'
            AND l.fkEquipamento = ${id_equipamento}
            AND l.data_hora >= CURDATE() - INTERVAL 6 DAY
            AND l.data_hora <= NOW();
    `;

    return database.executar(instrucao);
}

module.exports = {
    historicoDados,
    alertasCpu7dias,
    usoMedioCpu,
    picoCpu,
    rankingCpu,
    histogramaCpu,
    alertasPorDia,
    tempoAcumuladoAlerta
}
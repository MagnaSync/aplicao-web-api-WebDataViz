var database = require("../database/config")

function recepcao(id_equipamento){
    console.log("ACESSO REDE MODEL");
        var instrucaoSql = `
            SELECT valor_captura FROM vw_historico_leituras WHERE componente = "Rede - Download" AND id_equipamento = ${id_equipamento} ORDER BY id_leitura DESC LIMIT 1;
        `;
        console.log("Executando a instrução SQL: \n" + instrucaoSql);
        return database.executar(instrucaoSql);
}

function envio(id_equipamento){
    console.log("ENVIO REDE MODEL");
        var instrucaoSql = `
            SELECT valor_captura FROM vw_historico_leituras WHERE componente = "Rede - Upload" AND id_equipamento = ${id_equipamento} ORDER BY id_leitura DESC LIMIT 1;
        `;
        console.log("Executando a instrução SQL: \n" + instrucaoSql);
        return database.executar(instrucaoSql);
}

function utilizacaoBanda(id_equipamento){
    console.log("UTILIZAÇÃO BANDA MODEL");
        var instrucaoSql = `
            SELECT valor_captura FROM vw_historico_leituras WHERE componente = "Rede - Download (%)" AND id_equipamento = ${id_equipamento} ORDER BY id_leitura DESC LIMIT 1;
        `;
        console.log("Executando a instrução SQL: \n" + instrucaoSql);
        return database.executar(instrucaoSql);
}

function alertasAtivosRede(id_equipamento){
    console.log("ALERTAS REDE MODEL");
        var instrucaoSql = `
            SELECT valor_captura FROM vw_historico_leituras WHERE componente = "Rede - Download (%)" AND id_equipamento = ${id_equipamento} ORDER BY id_leitura DESC LIMIT 1;
        `;
        console.log("Executando a instrução SQL: \n" + instrucaoSql);
        return database.executar(instrucaoSql);
}
//alertasAtivosRede ainda não está pronta! Falta as métricas serem definidas para o Java inserir

function historicoTrafego(id_equipamento){
    console.log("HISTÓRICO REDE MODEL");
        var instrucaoSql = `
            SELECT componente, valor_captura, data_hora FROM vw_historico_leituras WHERE componente IN ("Rede - Download", "Rede - Upload") AND id_equipamento = ${id_equipamento} AND data_hora >= NOW() - INTERVAL 60 minute AND data_hora <= NOW() ORDER BY data_hora ASC;
        `;
        console.log("Executando a instrução SQL: \n" + instrucaoSql);
        return database.executar(instrucaoSql);
}

function previsaoLatencia(id_equipamento){
    console.log("PREVISÃO LATÊNCIA MODEL");
        var instrucaoSql = `
            SELECT componente, valor_captura, data_hora FROM vw_historico_leituras WHERE componente = "Rede - Latência" AND id_equipamento = ${id_equipamento} AND data_hora >= NOW() - INTERVAL 60 minute AND data_hora <= NOW() ORDER BY data_hora ASC;
        `;
        console.log("Executando a instrução SQL: \n" + instrucaoSql);
        return database.executar(instrucaoSql);
}
// adicionar cálculo da previsão! 

function rankingLatencia(id_equipamento){
    console.log("RANKING LATÊNCIA MODEL");
        var instrucaoSql = `
            SELECT 
            DATE_FORMAT(
            DATE_ADD(data_hora, INTERVAL -MINUTE(data_hora) % 60 MINUTE), '%Y-%m-%d %H:%i') AS intervalo_60_min,
            componente, metrica, unidade, ROUND(MAX(valor_captura)), DENSE_RANK() OVER (PARTITION BY metrica ORDER BY MAX(valor_captura) DESC) AS ranking FROM vw_historico_leituras WHERE componente = 'Rede - Latência' AND id_equipamento = ${id_equipamento} GROUP BY intervalo_60_min, componente, metrica, unidade ORDER BY metrica, ranking ASC LIMIT 8;
        `;
        console.log("Executando a instrução SQL: \n" + instrucaoSql);
        return database.executar(instrucaoSql);
}

module.exports={
    recepcao,
    envio,
    utilizacaoBanda,
    alertasAtivosRede,
    historicoTrafego,
    previsaoLatencia,
    rankingLatencia
}
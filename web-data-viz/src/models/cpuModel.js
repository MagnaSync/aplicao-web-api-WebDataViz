var database = require("../database/config");


function dados() {
    console.log("ACESSEI O CPU MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function dados()");
    var instrucao = `
        SELECT * FROM vw_historico_leituras 
            WHERE componente = "Processador";`
    return database.executar(instrucao);
}

module.exports = {
    dados
}
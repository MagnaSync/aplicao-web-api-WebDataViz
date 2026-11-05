var database = require("../database/config");

function cadastrar(nome, cnpj, telefone, email, cep, numero) {
    console.log("ACESSEI O HOSPITAL MODEL - function cadastrar():", nome, cnpj, telefone, email, cep, numero);
    var instrucaoSql = `
        INSERT INTO hospital (nome, cnpj, telefone, email, cep, numero) VALUES ('${nome}', '${cnpj}', '${telefone}', '${email}', '${cep}', '${numero}');
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

module.exports = {
    cadastrar
};

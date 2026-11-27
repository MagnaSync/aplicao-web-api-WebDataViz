var database = require("../database/config");

function cadastrar(nome, cnpj, telefone, email, cep, numero) {
    console.log("ACESSEI O HOSPITAL MODEL - function cadastrar():", nome, cnpj, telefone, email, cep, numero);
    var instrucaoSql = `
        INSERT INTO hospital (nome, cnpj, telefone, email, cep, numero) VALUES ('${nome}', '${cnpj}', '${telefone}', '${email}', '${cep}', '${numero}');
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function listar() {
    console.log("ACESSEI O HOSPITAL MODEL - function listar()");
    var instrucaoSql = `
        SELECT id, nome, cnpj, telefone, email, cep, numero 
        FROM hospital 
        WHERE id != 1;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function editar(id, nome, cnpj, telefone, email, cep, numero) {
    console.log("ACESSEI O HOSPITAL MODEL - function editar():", id, nome);
    var instrucaoSql = `
        UPDATE hospital 
        SET nome = '${nome}', cnpj = '${cnpj}', telefone = '${telefone}', 
            email = '${email}', cep = '${cep}', numero = '${numero}'
        WHERE id = ${id};
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function deletar(id) {
    console.log("ACESSEI O HOSPITAL MODEL - function deletar():", id);
    var instrucaoSql = `
        DELETE FROM hospital WHERE id = ${id};
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

module.exports = {
    cadastrar,
    listar,
    editar,
    deletar
};

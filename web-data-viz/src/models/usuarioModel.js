var database = require("../database/config");

function autenticar(email, senha) {
    console.log("ACESSEI O USUARIO MODEL - function autenticar():", email);
    var instrucaoSql = `
        SELECT 
            f.id, 
            f.nome, 
            f.email, 
            f.hospital_id AS hospital, 
            h.nome AS nome_hospital,
            c.funcao AS cargo 
        FROM funcionario f
        JOIN cargo c ON f.cargo_id = c.id
        JOIN hospital h ON f.hospital_id = h.id
        WHERE f.email = '${email}' AND f.senha = '${senha}';
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function cadastrar(nome, email, senha, hospital_id, cargo_id) {
    console.log("ACESSEI O USUARIO MODEL - function cadastrar():", nome, email, hospital_id, cargo_id);
    var instrucaoSql = `
        INSERT INTO funcionario (nome, email, senha, hospital_id, cargo_id) VALUES ('${nome}', '${email}', '${senha}', '${hospital_id}', ${cargo_id});
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function listarCargos() {
    console.log("ACESSEI O USUARIO MODEL - function listarCargos()");
    var instrucaoSql = `
        SELECT id, funcao FROM cargo;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function listarFuncionarios() {
    console.log("ACESSEI O USUARIO MODEL - function listarFuncionarios()");
    var instrucaoSql = `
        SELECT 
            f.nome AS "Nome do funcionário", 
            f.email AS "Email",
            h.nome AS "Nome do Hospital", 
            c.funcao AS "Função"
        FROM funcionario AS f
        JOIN cargo AS c ON f.cargo_id = c.id
        JOIN hospital AS h ON f.hospital_id = h.id;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

module.exports = {
    autenticar,
    listarCargos,
    listarFuncionarios,
    cadastrar
};

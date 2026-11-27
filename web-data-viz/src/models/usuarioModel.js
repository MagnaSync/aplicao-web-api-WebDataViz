var database = require("../database/config");

function autenticar(email, senha) {
    console.log("ACESSEI O USUARIO MODEL - function autenticar()");

    var instrucaoSql = `
        SELECT
            f.id,
            f.nome,
            ct.email,
            f.hospital_id AS hospital,
            h.nome AS nome_hospital,
            c.funcao AS cargo
        FROM funcionario AS f
        JOIN contato AS ct ON ct.fkFuncionario = f.id
        JOIN hospital AS h ON f.hospital_id = h.id
        JOIN cargo AS c ON f.cargo_id = c.id
        WHERE ct.email = '${email}'
        AND f.senha = '${senha}';
    `;

    return database.executar(instrucaoSql);
}

function cadastrar(nome, email, senha, hospital_id, cargo_id) {
    console.log("ACESSEI O USUARIO MODEL - function cadastrar()");

    var instrucaoSql = `
        INSERT INTO funcionario (nome, senha, hospital_id, cargo_id)
        VALUES ('${nome}', '${senha}', ${hospital_id}, ${cargo_id});
    `;

    return database.executar(instrucaoSql)
        .then(function (resultado) {

            var idFuncionario = resultado.insertId;

            var instrucaoContato = `
                INSERT INTO contato (email, fkFuncionario)
                VALUES ('${email}', ${idFuncionario});
            `;

            return database.executar(instrucaoContato);
        });
}

function listarCargos() {
    console.log("ACESSEI O USUARIO MODEL - function listarCargos()");

    var instrucaoSql = `
        SELECT id, funcao FROM cargo;
    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function listarFuncionarios(idHospital) {
    console.log("ACESSEI O USUARIO MODEL - function listarFuncionarios()");

    var filtroHospital = idHospital
        ? `WHERE f.hospital_id = ${idHospital}`
        : "";

    var instrucaoSql = `
        SELECT
            f.id,
            f.cargo_id,
            f.nome AS "Nome do funcionário",
            ct.email AS "Email",
            ct.telefone AS "Telefone",
            h.nome AS "Nome do Hospital",
            c.funcao AS "Função"
        FROM funcionario AS f
        JOIN cargo AS c ON f.cargo_id = c.id
        JOIN hospital AS h ON f.hospital_id = h.id
        LEFT JOIN contato AS ct ON ct.fkFuncionario = f.id
        ${filtroHospital};
    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function editar(id, nome, email, cargo_id, senha) {
    console.log("ACESSEI O USUARIO MODEL - function editar()");

    // Se a senha estiver preenchida, atualiza.
    // Caso contrário, mantém a senha atual.
    var trechoSenha = senha ? `, f.senha = '${senha}'` : "";

    var instrucaoSql = `
        UPDATE funcionario AS f
        JOIN contato AS ct ON ct.fkFuncionario = f.id
        SET
            f.nome = '${nome}',
            ct.email = '${email}',
            f.cargo_id = ${cargo_id}
            ${trechoSenha}
        WHERE f.id = ${id};
    `;

    return database.executar(instrucaoSql);
}

function deletar(id) {
    console.log("ACESSEI O USUARIO MODEL - function deletar():", id);

    var instrucaoSql = `
        DELETE FROM contato
        WHERE fkFuncionario = ${id};
    `;

    return database.executar(instrucaoSql)
        .then(function () {

            var instrucaoFuncionario = `
                DELETE FROM funcionario
                WHERE id = ${id};
            `;

            return database.executar(instrucaoFuncionario);
        });
}

function cadastrarCargo(funcao) {
    console.log("ACESSEI O USUARIO MODEL - function cadastrarCargo()");

    var instrucaoSql = `
        INSERT INTO cargo (funcao)
        VALUES ('${funcao}');
    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function editarCargo(id, funcao) {
    console.log("ACESSEI O USUARIO MODEL - function editarCargo():", id, funcao);

    var instrucaoSql = `
        UPDATE cargo
        SET funcao = '${funcao}'
        WHERE id = ${id};
    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function deletarCargo(id) {
    console.log("ACESSEI O USUARIO MODEL - function deletarCargo():", id);

    var instrucaoSql = `
        DELETE FROM cargo
        WHERE id = ${id};
    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function redefinirSenha(email, novaSenha) {
    console.log("ACESSEI O USUARIO MODEL - function redefinirSenha():", email);

    var instrucaoSql = `
        UPDATE funcionario AS f
        JOIN contato AS ct ON ct.fkFuncionario = f.id
        SET f.senha = '${novaSenha}'
        WHERE ct.email = '${email}';
    `;

    return database.executar(instrucaoSql);
}

module.exports = {
    autenticar,
    listarCargos,
    listarFuncionarios,
    editar,
    deletar,
    cadastrar,
    cadastrarCargo,
    editarCargo,
    deletarCargo,
    redefinirSenha
};
var hospitalModel = require("../models/hospitalModel");

function cadastrar(req, res) {
    // Crie uma variável que vá recuperar os valores do arquivo cadastro.html
    var nome = req.body.nomeServer;
    var cnpj = req.body.cnpjServer;
    var telefone = req.body.telefoneServer;
    var email = req.body.emailServer;
    var cep = req.body.cepServer;
    var numero = req.body.numeroServer;

    // Faça as validações dos valores
    if (nome == undefined) {
        res.status(400).send("Seu nome está undefined!");
    } else if (cnpj == undefined) {
        res.status(400).send("Seu cnpj está undefined!");
    } else if (telefone == undefined) {
        res.status(400).send("Seu telefone está undefined!");
    } else if (email == undefined) {
        res.status(400).send("Seu email está undefined!");
    } else if (cep == undefined) {
        res.status(400).send("Seu cep está undefined!");
    } else if (numero == undefined) {
        res.status(400).send("Seu numero está undefined!");
    } else if (String(nome).trim() == "" || String(telefone).trim() == "" || String(numero).trim() == "") {
        res.status(400).send("Preencha todos os campos!");
    } else if (!/^\d{14}$/.test(cnpj)) {
        res.status(400).send("CNPJ inválido! Informe 14 números.");
    } else if (!/^\d{8}$/.test(cep)) {
        res.status(400).send("CEP inválido! Informe 8 números.");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).send("E-mail inválido!");
    } else {

        // Passe os valores como parâmetro e vá para o arquivo hospitalModel.js
        hospitalModel.cadastrar(nome, cnpj, telefone, email, cep, numero)
            .then(
                function (resultado) {
                    res.json(resultado);
                }
            ).catch(
                function (erro) {
                    console.log(erro);
                    console.log(
                        "\nHouve um erro ao realizar o cadastro! Erro: ",
                        erro.sqlMessage
                    );
                    res.status(500).json(erro.sqlMessage);
                }
            );
    }
}       

module.exports = {
    cadastrar
}   
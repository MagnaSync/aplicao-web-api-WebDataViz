var hospitalModel = require("../models/hospitalModel");

function cadastrar(req, res) {
    var nome = req.body.nomeServer;
    var cnpj = req.body.cnpjServer;
    var telefone = req.body.telefoneServer;
    var email = req.body.emailServer;
    var cep = req.body.cepServer;
    var numero = req.body.numeroServer;

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

function listar(req, res) {
    hospitalModel.listar()
        .then(function (resultado) {
            res.json(resultado);
        })
        .catch(function (erro) {
            console.log(erro);
            res.status(500).json(erro.sqlMessage);
        });
}

function editar(req, res) {
    var id = req.params.id;
    var nome = req.body.nomeServer;
    var cnpj = req.body.cnpjServer;
    var telefone = req.body.telefoneServer;
    var email = req.body.emailServer;
    var cep = req.body.cepServer;
    var numero = req.body.numeroServer;

    if (!id || !nome || !cnpj || !telefone || !email || !cep || !numero) {
        res.status(400).send("Preencha todos os campos obrigatórios!");
    } else if (!/^\d{14}$/.test(cnpj)) {
        res.status(400).send("CNPJ inválido! Informe 14 números.");
    } else if (!/^\d{8}$/.test(cep)) {
        res.status(400).send("CEP inválido! Informe 8 números.");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).send("E-mail inválido!");
    } else {
        hospitalModel.editar(id, nome, cnpj, telefone, email, cep, numero)
            .then(function (resultado) {
                res.json(resultado);
            })
            .catch(function (erro) {
                console.log(erro);
                res.status(500).json(erro.sqlMessage);
            });
    }
}

function deletar(req, res) {
    var id = req.params.id;

    if (!id || id == 1) {
        res.status(400).send("ID de hospital inválido para exclusão!");
    } else {
        hospitalModel.deletar(id)
            .then(function (resultado) {
                res.json(resultado);
            })
            .catch(function (erro) {
                console.log(erro);
                if (erro.code === "ER_ROW_IS_REFERENCED_2") {
                    res.status(409).send("Não é possível excluir: há funcionários ou equipamentos vinculados a este hospital.");
                } else {
                    res.status(500).json(erro.sqlMessage);
                }
            });
    }
}

module.exports = {
    cadastrar,
    listar,
    editar,
    deletar
};

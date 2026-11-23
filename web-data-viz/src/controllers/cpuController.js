var cpuModel = require("../models/cpuModel");

function historicoDados(req, res) {
    var id_equipamento = Number(req.params.id_equipamento);

    if (!Number.isSafeInteger(id_equipamento) || id_equipamento <= 0) {
        return res.status(400).json({
            erro: "ID do equipamento inválido"
        });
    }

    cpuModel.historicoDados(id_equipamento)
        .then(
            function (resultado) {
                res.json(resultado);
            }
        ).catch(
            function (erro) {
                console.log(erro);
                console.log("\nHouve um erro ao buscar os dados do CPU! Erro: ", erro.sqlMessage);
                res.status(500).json(erro.sqlMessage);
            }
        );
}

function alertasCpu7dias(req, res) {
    var id_equipamento = req.params.id_equipamento;

    cpuModel.alertasCpu7dias(id_equipamento)
        .then(
            function (resultado) {
                res.json(resultado);
            }
        ).catch(
            function (erro){
                console.log(erro);
                console.log("\nHouve um erro ao buscar os dados do CPU! Erro: ", erro.sqlMessage);
                res.status(500).json(erro.sqlMessage);
            }
        );
}

function usoMedioCpu(req, res){
    var id_equipamento = req.params.id_equipamento;


    cpuModel.usoMedioCpu(id_equipamento)
        .then(
            function (resultado){
                res.json(resultado);
            }
        ).catch(
            function(erro){
                console.log(erro);
                console.log("\nHouve um erro ao buscar os dados do CPU! Erro: ", erro.sqlMessage);
                res.status(500).json(erro.sqlMessage);
            }
        );
}

function picoCpu(req, res){
    var id_equipamento = req.params.id_equipamento;

    cpuModel.picoCpu(id_equipamento)
        .then(
            function (resultado){
                res.json(resultado);
            }
        ).catch(
            function(erro){
                console.log(erro);
                console.log("\nHouve um erro ao buscar os dados do CPU! Erro: ", erro.sqlMessage);
                res.status(500).json(erro.sqlMessage);
            }
        );
}

function rankingCpu(req, res){
    var id_equipamento = req.params.id_equipamento;

        cpuModel.rankingCpu(id_equipamento)
        .then(
            function (resultado){
                res.json(resultado);
            }
        ).catch(
            function(erro){
                console.log(erro);
                console.log("\nHouve um erro ao buscar os dados do CPU! Erro: ", erro.sqlMessage);
                res.status(500).json(erro.sqlMessage);
            }
        );
}

function histogramaCpu(req, res){
    var id_equipamento = req.params.id_equipamento;

        cpuModel.histogramaCpu(id_equipamento)
        .then(
            function (resultado){
                res.json(resultado);
            }
        ).catch(
            function(erro){
                console.log(erro);
                console.log("\nHouve um erro ao buscar os dados do CPU! Erro: ", erro.sqlMessage);
                res.status(500).json(erro.sqlMessage);
            }
        );
}


module.exports = {
    historicoDados,
    alertasCpu7dias,
    usoMedioCpu,
    picoCpu,
    rankingCpu,
    histogramaCpu
}
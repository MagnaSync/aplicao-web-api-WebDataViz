var cpuModel = require("../models/cpuModel");

function historicoDados(req, res) {
    cpuModel.historicoDados()
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
    cpuModel.alertasCpu7dias()
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
    cpuModel.usoMedioCpu()
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
    cpuModel.picoCpu()
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
        cpuModel.rankingCpu()
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
        cpuModel.histogramaCpu()
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
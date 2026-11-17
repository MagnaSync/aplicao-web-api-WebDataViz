var dashboardDanielModel = require("../models/dashboardDanielModel");

function obterKpisGlobais(req, res) {
    dashboardDanielModel.obterKpisGlobais()
        .then(function (resultado) {
            if (resultado.length > 0) {
                res.status(200).json(resultado[0]);
            } else {
                res.status(204).send("Nenhum resultado encontrado para KPIs globais.");
            }
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar as KPIs globais! Erro: ", erro.sqlMessage);
            res.status(500).json(erro.sqlMessage);
        });
}

function obterRankingIncidentes(req, res) {
    dashboardDanielModel.obterRankingIncidentes()
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar o ranking de incidentes! Erro: ", erro.sqlMessage);
            res.status(500).json(erro.sqlMessage);
        });
}

function obterAlertasGeradosVsEntregues(req, res) {
    dashboardDanielModel.obterAlertasGeradosVsEntregues()
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar alertas gerados vs entregues! Erro: ", erro.sqlMessage);
            res.status(500).json(erro.sqlMessage);
        });
}

function obterAuditoriaRosca(req, res) {
    dashboardDanielModel.obterAuditoriaRosca()
        .then(function (resultado) {
            if (resultado.length > 0) {
                res.status(200).json(resultado[0]);
            } else {
                res.status(200).json({
                    entregues_sucesso: 0,
                    chamados_abertos: 0,
                    retidos_falha: 0,
                    total_auditado: 0
                });
            }
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar a auditoria de rosca! Erro: ", erro.sqlMessage);
            res.status(500).json(erro.sqlMessage);
        });
}

function obterDivergenciasLogs(req, res) {
    dashboardDanielModel.obterDivergenciasLogs()
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar logs de divergência! Erro: ", erro.sqlMessage);
            res.status(500).json(erro.sqlMessage);
        });
}

function obterRelatorioExecutivo(req, res) {
    dashboardDanielModel.obterRelatorioExecutivo()
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar o relatório executivo! Erro: ", erro.sqlMessage);
            res.status(500).json(erro.sqlMessage);
        });
}

module.exports = {
    obterKpisGlobais,
    obterRankingIncidentes,
    obterAlertasGeradosVsEntregues,
    obterAuditoriaRosca,
    obterDivergenciasLogs,
    obterRelatorioExecutivo
};

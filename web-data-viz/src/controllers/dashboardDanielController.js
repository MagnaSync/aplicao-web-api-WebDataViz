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

function obterAlertasVsResolvidos(req, res) {
    dashboardDanielModel.obterAlertasVsResolvidos()
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar alertas gerados vs resolvidos! Erro: ", erro.sqlMessage);
            res.status(500).json(erro.sqlMessage);
        });
}

function obterSituacaoChamados(req, res) {
    dashboardDanielModel.obterSituacaoChamados()
        .then(function (resultado) {
            if (resultado.length > 0) {
                res.status(200).json(resultado[0]);
            } else {
                res.status(200).json({
                    abertos: 0,
                    em_andamento: 0,
                    finalizados: 0,
                    cancelados: 0,
                    total_chamados: 0,
                    mttr_minutos: 0,
                    servidores_criticos: 0,
                    total_servidores: 0
                });
            }
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar a situação dos chamados! Erro: ", erro.sqlMessage);
            res.status(500).json(erro.sqlMessage);
        });
}

function obterRelatorioCarteira(req, res) {
    dashboardDanielModel.obterRelatorioCarteira()
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar o relatório da carteira! Erro: ", erro.sqlMessage);
            res.status(500).json(erro.sqlMessage);
        });
}

function obterHistoricoIncidentes(req, res) {
    dashboardDanielModel.obterHistoricoIncidentes()
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar o histórico de incidentes! Erro: ", erro.sqlMessage);
            res.status(500).json(erro.sqlMessage);
        });
}

module.exports = {
    obterKpisGlobais,
    obterRankingIncidentes,
    obterAlertasVsResolvidos,
    obterSituacaoChamados,
    obterRelatorioCarteira,
    obterHistoricoIncidentes
};

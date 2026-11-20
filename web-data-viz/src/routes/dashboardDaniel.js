var express = require("express");
var router = express.Router();

var dashboardDanielController = require("../controllers/dashboardDanielController");

router.get("/kpis", function (req, res) {
    dashboardDanielController.obterKpisGlobais(req, res);
});

router.get("/ranking-incidentes", function (req, res) {
    dashboardDanielController.obterRankingIncidentes(req, res);
});

router.get("/alertas-vs-resolvidos", function (req, res) {
    dashboardDanielController.obterAlertasVsResolvidos(req, res);
});

router.get("/situacao-chamados", function (req, res) {
    dashboardDanielController.obterSituacaoChamados(req, res);
});

router.get("/relatorio-carteira", function (req, res) {
    dashboardDanielController.obterRelatorioCarteira(req, res);
});

router.get("/historico-incidentes", function (req, res) {
    dashboardDanielController.obterHistoricoIncidentes(req, res);
});

module.exports = router;

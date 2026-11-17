var express = require("express");
var router = express.Router();

var dashboardDanielController = require("../controllers/dashboardDanielController");

router.get("/kpis", function (req, res) {
    dashboardDanielController.obterKpisGlobais(req, res);
});

router.get("/ranking-incidentes", function (req, res) {
    dashboardDanielController.obterRankingIncidentes(req, res);
});

router.get("/alertas-gerados-vs-entregues", function (req, res) {
    dashboardDanielController.obterAlertasGeradosVsEntregues(req, res);
});

router.get("/auditoria-rosca", function (req, res) {
    dashboardDanielController.obterAuditoriaRosca(req, res);
});

router.get("/divergencias-logs", function (req, res) {
    dashboardDanielController.obterDivergenciasLogs(req, res);
});

router.get("/relatorio-executivo", function (req, res) {
    dashboardDanielController.obterRelatorioExecutivo(req, res);
});

module.exports = router;

var express = require("express");
var router = express.Router();

var cpuController = require("../controllers/cpuController");

router.get("/historicoDados/:id_equipamento", function (req, res) {
    cpuController.historicoDados(req, res);
})

router.get("/alertasCpu7dias/:id_equipamento", function (req, res) {
    cpuController.alertasCpu7dias(req, res);
})

router.get("/usoMedioCpu/:id_equipamento", function (req, res){
    cpuController.usoMedioCpu(req, res);
})

router.get("/picoCpu/:id_equipamento", function (req, res){
    cpuController.picoCpu(req, res);
})

router.get("/rankingCpu/:id_equipamento", function (req, res){
    cpuController.rankingCpu(req, res);
})

router.get("/histogramaCpu/:id_equipamento", function (req, res){
    cpuController.histogramaCpu(req, res);
})

router.get("/tempoAcumuladoAlerta/:id_equipamento", function (req, res){
    cpuController.tempoAcumuladoAlerta(req, res);
})

router.get("/alertasPorDia/:id_equipamento", function (req, res){
    cpuController.alertasPorDia(req, res);
})

module.exports = router;
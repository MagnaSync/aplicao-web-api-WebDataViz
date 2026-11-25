var express = require("express");
var router = express.Router();

var dashboardRedeController = require("../controllers/dashboardRedeController");

router.get("/recepcao/:id_equipamento", function(req, res){
    dashboardRedeController.recepcao(req, res);
});

router.get("/envio/:id_equipamento", function (req, res){
    dashboardRedeController.envio(req, res);
});

router.get("/utilizacaoBanda/:id_equipamento",function (req, res){
    dashboardRedeController.utilizacaoBanda(req, res);
});

router.get("/alertasAtivosRede/:id_equipamento", function(req, res){
    dashboardRedeController.alertasAtivosRede(req, res);
});

router.get("/historicoTrafego/:id_equipamento", function(req, res){
    dashboardRedeController.historicoTrafego(req, res);
});

router.get("/previsaoLatencia/:id_equipamento", function(req, res){
    dashboardRedeController.previsaoLatencia(req, res);
});

router.get("/rankingLatencia/:id_equipamento", function(req, res){
    dashboardRedeController.rankingLatencia(req, res);
})

module.exports = router;
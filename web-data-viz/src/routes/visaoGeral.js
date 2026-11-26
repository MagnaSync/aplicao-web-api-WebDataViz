var express = require("express");
var router = express.Router();

var visaoGeralController = require("../controllers/visaoGeralController");

router.get("/ultimoIncidente", function(req, res){
    visaoGeralController.ultimoIncidente(req, res);
});

router.get("/qtdAlertas", function(req, res){
    visaoGeralController.qtdAlertas(req, res);
});

router.get("/usoCpu", function(req, res){
    visaoGeralController.usoCpu(req, res);
});

router.get("/usoRam", function(req, res){
    visaoGeralController.usoRam(req, res);
});

router.get("/usoDisco", function(req, res){
    visaoGeralController.usoDisco(req, res);
});

router.get("/trafegoRede", function(req, res){
    visaoGeralController.trafegoRede(req, res);
});

router.get("/indiceIntegridade", function(req, res){
    visaoGeralController.indiceIntegridade(req, res);
});

module.exports = router;
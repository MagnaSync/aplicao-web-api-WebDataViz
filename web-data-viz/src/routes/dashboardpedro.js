var express = require("express");
var router = express.Router();

var dashboardpedroController = require("../controllers/dashboardpedroController");
var { exigirLogin } = require("../middlewares/dashboardpedroAuth");

// Todas as rotas exigem apenas que a pessoa esteja logada (qualquer cargo)
router.get("/servidores", exigirLogin, dashboardpedroController.listarServidores);
router.get("/ram/:equipamentoId", exigirLogin, dashboardpedroController.dadosRam);

module.exports = router;
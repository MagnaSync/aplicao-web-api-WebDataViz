var express = require("express");
var router = express.Router();

var dashboardpedroController = require("../controllers/dashboardpedroController");
var { exigirAnalista } = require("../middlewares/dashboardpedroAuth");

// Todas as rotas exigem cargo Analista
router.get("/servidores", exigirAnalista, dashboardpedroController.listarServidores);
router.get("/ram/:equipamentoId", exigirAnalista, dashboardpedroController.dadosRam);

module.exports = router;
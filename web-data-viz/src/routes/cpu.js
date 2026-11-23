var express = require("express");
var router = express.Router();

var cpuController = require("../controllers/cpuController");

router.get("/dadosCpu", function (req, res) {
    cpuController.dados(req, res);
})

module.exports = router;
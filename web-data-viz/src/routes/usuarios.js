var express = require("express");
var router = express.Router();

var usuarioController = require("../controllers/usuarioController");

router.post("/cadastrar", function (req, res) {
    usuarioController.cadastrar(req, res);
});

router.post("/autenticar", function (req, res) {
    usuarioController.autenticar(req, res);
});

router.get("/listarCargos", function (req, res) {
    usuarioController.listarCargos(req, res);
});

router.get("/listarFuncionarios", function (req, res) {
    usuarioController.listarFuncionarios(req, res);
});

module.exports = router;

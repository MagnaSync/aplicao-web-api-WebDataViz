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

router.post("/cadastrarCargo", function (req, res) {
    usuarioController.cadastrarCargo(req, res);
});

router.put("/editarCargo/:id", function (req, res) {
    usuarioController.editarCargo(req, res);
});

router.delete("/deletarCargo/:id", function (req, res) {
    usuarioController.deletarCargo(req, res);
});

module.exports = router;

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

router.put("/editar/:id", function (req, res) {
    usuarioController.editar(req, res);
});

router.delete("/deletar/:id", function (req, res) {
    usuarioController.deletar(req, res);
});

router.put("/redefinirSenha", function (req, res) {
    usuarioController.redefinirSenha(req, res);
});

module.exports = router;

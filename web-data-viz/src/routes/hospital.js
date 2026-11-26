var express = require("express");
var router = express.Router();

var hospitalController = require("../controllers/hospitalController");

router.post("/cadastrarHospital", function (req, res) {
    hospitalController.cadastrar(req, res);
})

router.get("/listar", function (req, res) {
    hospitalController.listar(req, res);
});

router.put("/editar/:id", function (req, res) {
    hospitalController.editar(req, res);
});

router.delete("/deletar/:id", function (req, res) {
    hospitalController.deletar(req, res);
});

module.exports = router;
// Middleware: exige que a pessoa esteja logada (funcionário existente no banco).
// NÃO restringe por cargo: qualquer funcionário logado acessa.
// Também descobre o hospital do funcionário, para ele ver só as máquinas do próprio hospital.
var database = require("../database/config");

async function exigirLogin(req, res, next) {
    var id = Number(req.get("x-funcionario-id"));

    // só inteiro positivo entra na consulta (por isso é seguro montar o SQL abaixo)
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(401).json({ erro: "Sessão não identificada. Faça login novamente." });
    }

    try {
        var linhas = await database.executar(
            "SELECT f.id, f.hospital_id FROM funcionario f WHERE f.id = " + id
        );

        if (linhas.length === 0) {
            return res.status(401).json({ erro: "Funcionário não encontrado." });
        }

        req.funcionario = { id: linhas[0].id, hospitalId: linhas[0].hospital_id };
        next();
    } catch (erro) {
        console.error("dashboardpedroAuth:", erro);
        res.status(500).json({ erro: "Falha ao validar o acesso." });
    }
}

module.exports = { exigirLogin };
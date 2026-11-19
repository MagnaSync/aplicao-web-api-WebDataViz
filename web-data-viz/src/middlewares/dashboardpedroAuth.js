// Middleware: só deixa passar quem é funcionário com cargo "Analista".
// O front manda o id do funcionário (guardado no login) no cabeçalho x-funcionario-id;
// aqui conferimos NO BANCO qual é o cargo desse id e de qual hospital ele é.
var database = require("../database/config");

var CARGO_PERMITIDO = "Analista";

function normalizar(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

async function exigirAnalista(req, res, next) {
    var id = Number(req.get("x-funcionario-id"));

    // só inteiro positivo entra na consulta (por isso é seguro montar o SQL abaixo)
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(401).json({ erro: "Sessão não identificada. Faça login novamente." });
    }

    try {
        var linhas = await database.executar(
            "SELECT f.id, f.hospital_id, c.funcao " +
            "FROM funcionario f JOIN cargo c ON c.id = f.cargo_id " +
            "WHERE f.id = " + id
        );

        if (linhas.length === 0) {
            return res.status(401).json({ erro: "Funcionário não encontrado." });
        }

        if (normalizar(linhas[0].funcao) !== normalizar(CARGO_PERMITIDO)) {
            return res.status(403).json({ erro: "Esta dashboard é exclusiva para o cargo Analista." });
        }

        req.funcionario = { id: linhas[0].id, hospitalId: linhas[0].hospital_id };
        next();
    } catch (erro) {
        console.error("dashboardpedroAuth:", erro);
        res.status(500).json({ erro: "Falha ao validar o acesso." });
    }
}

module.exports = { exigirAnalista };
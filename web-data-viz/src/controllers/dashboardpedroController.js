var model = require("../models/dashboardpedroModel");

function arredondar(valor, casas) {
    var fator = Math.pow(10, casas);
    return Math.round(valor * fator) / fator;
}

// ids da tabela categoria_alerta (iguais ao CATEGORIAS do python/dashboardpedro.py)
var CATEGORIA_POR_ID = { 1: "atencao", 2: "critico", 3: "bloqueio" };

// GET /dashboardpedro/servidores  -> máquinas do hospital do analista logado
async function listarServidores(req, res) {
    try {
        var servidores = await model.listarServidores(req.funcionario.hospitalId);
        res.json(servidores);
    } catch (erro) {
        console.error("listarServidores:", erro);
        res.status(500).json({ erro: "Falha ao listar os servidores." });
    }
}

// GET /dashboardpedro/ram/:equipamentoId  -> tudo que a tela de RAM precisa, num JSON só
async function dadosRam(req, res) {
    var equipamentoId = Number(req.params.equipamentoId);
    if (!Number.isInteger(equipamentoId) || equipamentoId <= 0) {
        return res.status(400).json({ erro: "Equipamento inválido." });
    }

    try {
        // o analista só enxerga máquinas do próprio hospital
        var dono = await model.equipamentoDoHospital(equipamentoId, req.funcionario.hospitalId);
        if (dono.length === 0) {
            return res.status(404).json({ erro: "Servidor não encontrado para o seu hospital." });
        }

        var resultados = await Promise.all([
            model.ultimaLeitura(equipamentoId),
            model.totalRamGb(equipamentoId),
            model.historico(equipamentoId),
            model.pico(equipamentoId),
            model.processos(equipamentoId),
            model.alertas(equipamentoId)
        ]);
        var ultima = resultados[0], totalGb = resultados[1], historico = resultados[2],
            pico = resultados[3], processos = resultados[4], linhasAlerta = resultados[5];

        var alertas = { atencao: 0, critico: 0, bloqueio: 0 };
        linhasAlerta.forEach(function (linha) {
            var chave = CATEGORIA_POR_ID[linha.categoria];
            if (chave) alertas[chave] = Number(linha.qtd);
        });

        // ainda não chegou nenhuma leitura de percentual desta máquina
        if (ultima.length === 0) {
            return res.json({ sem_dados: true, limites: model.LIMITES_RAM, alertas: alertas });
        }

        var percentual = Number(ultima[0].valor);
        var usadaGb = totalGb === null ? null : arredondar(totalGb * percentual / 100, 1);

        res.json({
            limites: model.LIMITES_RAM,
            total_gb: totalGb === null ? null : arredondar(totalGb, 1),
            usada_gb: usadaGb,
            disponivel_gb: usadaGb === null ? null : arredondar(totalGb - usadaGb, 1),
            percentual: percentual,
            pico: pico.length > 0
                ? { valor: Number(pico[0].valor), hora: pico[0].hora }
                : { valor: percentual, hora: ultima[0].hora.slice(0, 5) },
            historico: historico.map(function (p) { return { hora: p.hora, valor: Number(p.valor) }; }),
            processos: processos.map(function (p) {
                return { nome: p.nome, pid: p.pid, instancias: p.instancias, mb: Number(p.mb) };
            }),
            alertas: alertas,
            ultima_leitura: ultima[0].hora,
            segundos_desde_ultima_leitura: Number(ultima[0].segundos)
        });
    } catch (erro) {
        console.error("dadosRam:", erro);
        res.status(500).json({ erro: "Falha ao buscar os dados de RAM." });
    }
}

module.exports = { listarServidores, dadosRam };
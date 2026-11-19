var database = require("../database/config");

// Mesmos limites do agente Python (função classificar em python/dashboardpedro.py)
var LIMITES_RAM = { atencao: 75, critico: 85, bloqueio: 90 };

// Todos os ids que entram nos SQLs abaixo chegam já validados como inteiros
// (controller e middleware), então a montagem por texto é segura aqui.

function listarServidores(hospitalId) {
    return database.executar(
        "SELECT e.id, " +
        "COALESCE(NULLIF(e.nome, ''), CONCAT('Equipamento ', e.id, ' – ', e.mac_adress)) AS nome " +
        "FROM equipamento e WHERE e.hospital_id = " + hospitalId + " ORDER BY e.id"
    );
}

function equipamentoDoHospital(equipamentoId, hospitalId) {
    return database.executar(
        "SELECT id FROM equipamento WHERE id = " + equipamentoId +
        " AND hospital_id = " + hospitalId
    );
}

// Última leitura de percentual de uso + quantos segundos faz que ela chegou
function ultimaLeitura(equipamentoId) {
    return database.executar(
        "SELECT l.valor, DATE_FORMAT(l.data_hora, '%H:%i:%s') AS hora, " +
        "TIMESTAMPDIFF(SECOND, l.data_hora, NOW()) AS segundos " +
        "FROM leitura l JOIN comandos cm ON cm.id = l.fkComando " +
        "WHERE l.fkEquipamento = " + equipamentoId + " AND cm.comando = 'virtual_memory.percent' " +
        "ORDER BY l.data_hora DESC, l.id DESC LIMIT 1"
    );
}

// Total de RAM em GB: leitura exata de virtual_memory.total, se existir;
// senão, o valor (arredondado) do componente cadastrado pelo Python.
async function totalRamGb(equipamentoId) {
    var exata = await database.executar(
        "SELECT l.valor FROM leitura l JOIN comandos cm ON cm.id = l.fkComando " +
        "WHERE l.fkEquipamento = " + equipamentoId + " AND cm.comando = 'virtual_memory.total' " +
        "ORDER BY l.data_hora DESC, l.id DESC LIMIT 1"
    );
    if (exata.length > 0) return Number(exata[0].valor);

    var componente = await database.executar(
        "SELECT c.valor FROM parametro pa " +
        "JOIN componente c ON c.id = pa.fkComponente " +
        "JOIN tipoComponente t ON t.id = c.fkTipo " +
        "WHERE pa.fkEquipamento = " + equipamentoId + " AND t.tipo = 'Ram' " +
        "ORDER BY pa.id DESC LIMIT 1"
    );
    return componente.length > 0 ? Number(componente[0].valor) : null;
}

// Média por minuto dos últimos 60 minutos
function historico(equipamentoId) {
    return database.executar(
        "SELECT DATE_FORMAT(l.data_hora, '%Y-%m-%d %H:%i') AS minuto, " +
        "DATE_FORMAT(l.data_hora, '%H:%i') AS hora, ROUND(AVG(l.valor), 1) AS valor " +
        "FROM leitura l JOIN comandos cm ON cm.id = l.fkComando " +
        "WHERE l.fkEquipamento = " + equipamentoId + " AND cm.comando = 'virtual_memory.percent' " +
        "AND l.data_hora >= NOW() - INTERVAL 60 MINUTE " +
        "GROUP BY minuto, hora ORDER BY minuto"
    );
}

function pico(equipamentoId) {
    return database.executar(
        "SELECT l.valor, DATE_FORMAT(l.data_hora, '%H:%i') AS hora " +
        "FROM leitura l JOIN comandos cm ON cm.id = l.fkComando " +
        "WHERE l.fkEquipamento = " + equipamentoId + " AND cm.comando = 'virtual_memory.percent' " +
        "AND l.data_hora >= NOW() - INTERVAL 60 MINUTE " +
        "ORDER BY l.valor DESC, l.data_hora DESC LIMIT 1"
    );
}

// Último lote de processos gravado pelo agente Python
function processos(equipamentoId) {
    return database.executar(
        "SELECT nome, pid, instancias, mb FROM processo_ram " +
        "WHERE fkEquipamento = " + equipamentoId + " " +
        "AND data_hora = (SELECT MAX(data_hora) FROM processo_ram WHERE fkEquipamento = " + equipamentoId + ") " +
        "ORDER BY mb DESC LIMIT 5"
    );
}

// Alertas dos últimos 7 dias, de componentes do tipo Ram.
// Agrupa pelo id da categoria (1 Atenção, 2 Crítico, 3 Bloqueio): os mesmos ids do dict
// CATEGORIAS do Python. Assim acento/charset do texto não atrapalha.
function alertas(equipamentoId) {
    return database.executar(
        "SELECT ca.id AS categoria, COUNT(*) AS qtd " +
        "FROM alerta a " +
        "JOIN categoria_alerta ca ON ca.id = a.categoria_alerta_id " +
        "JOIN leitura l ON l.id = a.leitura_id " +
        "JOIN componente c ON c.id = l.fkComponente " +
        "JOIN tipoComponente t ON t.id = c.fkTipo " +
        "WHERE l.fkEquipamento = " + equipamentoId + " AND t.tipo = 'Ram' " +
        "AND a.data_hora >= NOW() - INTERVAL 7 DAY " +
        "GROUP BY ca.id"
    );
}

module.exports = {
    LIMITES_RAM,
    listarServidores,
    equipamentoDoHospital,
    ultimaLeitura,
    totalRamGb,
    historico,
    pico,
    processos,
    alertas
};
var dashboardDanielModel = require("../models/dashboardDanielModel");

// Soma quantidades de chamados por status e extrai o MTTR dos finalizados
function resumirStatusChamados(linhas) {
    var resumo = {
        abertos: 0,
        em_andamento: 0,
        finalizados: 0,
        cancelados: 0,
        total_chamados: 0,
        chamados_abertos: 0,
        mttr_minutos: null
    };

    // Percorre os status retornados do banco e soma a quantidade de cada um
    for (var i = 0; i < linhas.length; i++) {
        var row = linhas[i];
        var qtd = Number(row.qtd || 0);

        if (row.status_chamado === "Aberto") {
            resumo.abertos += qtd;
        } else if (row.status_chamado === "Em Andamento") {
            resumo.em_andamento += qtd;
        } else if (row.status_chamado === "Finalizado") {
            resumo.finalizados += qtd;
            if (row.mttr_minutos != null) {
                resumo.mttr_minutos = Number(row.mttr_minutos);
            }
        } else if (row.status_chamado === "Cancelado") {
            resumo.cancelados += qtd;
        }
    }

    resumo.total_chamados = resumo.abertos + resumo.em_andamento + resumo.finalizados + resumo.cancelados;
    resumo.chamados_abertos = resumo.abertos + resumo.em_andamento;
    return resumo;
}

// Preenche totais de alertas por severidade e calcula o índice de criticidade do hospital
function preencherAlertas(hosp, severidades) {
    hosp.alertas_bloqueio = 0;
    hosp.alertas_criticos = 0;
    hosp.alertas_atencao = 0;
    hosp.total_alertas = 0;

    // Soma os alertas deste hospital separando por severidade (Bloqueio, Crítico e Atenção)
    for (var i = 0; i < severidades.length; i++) {
        var s = severidades[i];
        if (Number(s.hospital_id) !== hosp.hospital_id) continue;

        var qtd = Number(s.qtd || 0);
        if (s.severidade === "Bloqueio") {
            hosp.alertas_bloqueio += qtd;
        } else if (s.severidade === "Crítico") {
            hosp.alertas_criticos += qtd;
        } else if (s.severidade === "Atenção") {
            hosp.alertas_atencao += qtd;
        }
        hosp.total_alertas += qtd;
    }

    hosp.indice_criticidade =
        (hosp.alertas_bloqueio * 3) +
        (hosp.alertas_criticos * 2) +
        hosp.alertas_atencao;
}

// Preenche totais de chamados por status e o MTTR do hospital
function preencherChamados(hosp, chamados) {
    var doHospital = [];
    // Separa somente os registros de chamados que pertencem a este hospital
    for (var i = 0; i < chamados.length; i++) {
        if (Number(chamados[i].hospital_id) === hosp.hospital_id) {
            doHospital.push(chamados[i]);
        }
    }

    var resumo = resumirStatusChamados(doHospital);
    hosp.chamados_somente_abertos = resumo.abertos;
    hosp.chamados_em_andamento = resumo.em_andamento;
    hosp.chamados_finalizados = resumo.finalizados;
    hosp.chamados_cancelados = resumo.cancelados;
    hosp.chamados_abertos = resumo.chamados_abertos;
    hosp.mttr_minutos = resumo.mttr_minutos;
}

// O SELECT já vem ordenado por maior quantidade; o primeiro registro do hospital é o gargalo principal
function preencherGargalo(hosp, gargalos) {
    hosp.principal_gargalo = null;
    hosp.gargalo_qtd = 0;

    // Procura o primeiro componente do hospital (já vem ordenado do maior para o menor)
    for (var i = 0; i < gargalos.length; i++) {
        if (Number(gargalos[i].hospital_id) === hosp.hospital_id) {
            hosp.principal_gargalo = gargalos[i].componente;
            hosp.gargalo_qtd = Number(gargalos[i].qtd || 0);
            break;
        }
    }
}

// Preenche quantidade de servidores afetados e servidores em estado crítico
function preencherServidores(hosp, afetados, criticos) {
    hosp.servidores_afetados = 0;
    hosp.servidores_criticos = 0;

    // Procura quantos servidores deste hospital já tiveram alertas
    for (var i = 0; i < afetados.length; i++) {
        if (Number(afetados[i].hospital_id) === hosp.hospital_id) {
            hosp.servidores_afetados = Number(afetados[i].servidores_afetados || 0);
            break;
        }
    }

    // Procura quantos servidores deste hospital estão em estado crítico agora
    for (var j = 0; j < criticos.length; j++) {
        if (Number(criticos[j].hospital_id) === hosp.hospital_id) {
            hosp.servidores_criticos = Number(criticos[j].servidores_criticos || 0);
            break;
        }
    }
}

// Monta a carteira completa de hospitais juntando os SELECTs simples por hospital
function montarCarteira() {
    return Promise.all([
        dashboardDanielModel.listarHospitaisBase(),
        dashboardDanielModel.obterSeveridadesPorHospital(),
        dashboardDanielModel.obterChamadosPorHospital(),
        dashboardDanielModel.obterGargalosPorHospital(),
        dashboardDanielModel.contarServidoresAfetadosPorHospital(),
        dashboardDanielModel.contarServidoresCriticosPorHospital()
    ]).then(function (resultados) {
        var hospitais = resultados[0];
        var severidades = resultados[1];
        var chamados = resultados[2];
        var gargalos = resultados[3];
        var afetados = resultados[4];
        var criticos = resultados[5];

        // Percorre cada hospital para preencher alertas, chamados, gargalo e servidores
        for (var i = 0; i < hospitais.length; i++) {
            var hosp = hospitais[i];
            hosp.hospital_id = Number(hosp.hospital_id);
            hosp.total_maquinas = Number(hosp.total_maquinas || 0);
            hosp.dias_casa = hosp.dias_casa != null ? Number(hosp.dias_casa) : null;
            hosp.cliente_desde = hosp.cliente_desde || null;
            hosp.cliente_desde_iso = hosp.cliente_desde_iso || null;

            preencherAlertas(hosp, severidades);
            preencherChamados(hosp, chamados);
            preencherGargalo(hosp, gargalos);
            preencherServidores(hosp, afetados, criticos);
        }

        hospitais.sort(function (x, y) {
            return (y.indice_criticidade - x.indice_criticidade) ||
                (y.alertas_bloqueio - x.alertas_bloqueio) ||
                (y.alertas_criticos - x.alertas_criticos) ||
                String(x.nome_cliente || "").localeCompare(String(y.nome_cliente || ""), "pt-BR");
        });

        return hospitais;
    });
}

function obterKpisGlobais(req, res) {
    Promise.all([
        dashboardDanielModel.contarClientesAtivos(),
        dashboardDanielModel.contarEquipamentos(),
        dashboardDanielModel.obterResumoChamados()
    ])
        .then(function (resultados) {
            var totalClientes = resultados[0].length > 0 ? Number(resultados[0][0].total || 0) : 0;
            var totalMaquinas = resultados[1].length > 0 ? Number(resultados[1][0].total || 0) : 0;
            var resumo = resumirStatusChamados(resultados[2]);
            var taxaResolucao = resumo.total_chamados > 0
                ? Math.round((resumo.finalizados * 100) / resumo.total_chamados)
                : 0;

            res.status(200).json({
                total_clientes_ativos: totalClientes,
                parque_total_monitorado: totalMaquinas,
                chamados_finalizados: resumo.finalizados,
                total_chamados: resumo.total_chamados,
                taxa_resolucao_pct: taxaResolucao,
                chamados_abertos: resumo.chamados_abertos,
                mttr_minutos: resumo.mttr_minutos || 0
            });
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar as KPIs globais! Erro: ", erro.sqlMessage || erro.message);
            res.status(500).json(erro.sqlMessage || erro.message);
        });
}

function obterRankingIncidentes(req, res) {
    montarCarteira()
        .then(function (carteira) {
            var ranking = carteira
                .filter(function (item) {
                    return item.total_alertas > 0;
                })
                .sort(function (a, b) {
                    return (b.indice_criticidade - a.indice_criticidade) ||
                        (b.total_alertas - a.total_alertas) ||
                        (b.alertas_bloqueio - a.alertas_bloqueio) ||
                        (b.alertas_criticos - a.alertas_criticos);
                })
                .slice(0, 8)
                .map(function (item) {
                    return {
                        hospital_id: item.hospital_id,
                        hospital_nome: item.nome_cliente,
                        bloqueio: item.alertas_bloqueio,
                        criticos: item.alertas_criticos,
                        atencao: item.alertas_atencao,
                        total_incidentes: item.total_alertas,
                        indice_criticidade: item.indice_criticidade,
                        chamados_abertos: item.chamados_abertos,
                        servidores_afetados: item.servidores_afetados,
                        total_servidores: item.total_maquinas,
                        principal_gargalo: item.principal_gargalo,
                        gargalo_qtd: item.gargalo_qtd
                    };
                });

            res.status(200).json(ranking);
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar o ranking de incidentes! Erro: ", erro.sqlMessage || erro.message);
            res.status(500).json(erro.sqlMessage || erro.message);
        });
}

function obterAlertasVsResolvidos(req, res) {
    dashboardDanielModel.obterAlertasVsResolvidos()
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar alertas gerados vs resolvidos! Erro: ", erro.sqlMessage || erro.message);
            res.status(500).json(erro.sqlMessage || erro.message);
        });
}

function obterSituacaoChamados(req, res) {
    Promise.all([
        dashboardDanielModel.obterResumoChamados(),
        dashboardDanielModel.contarServidoresCriticos(),
        dashboardDanielModel.contarEquipamentos()
    ])
        .then(function (resultados) {
            var resumo = resumirStatusChamados(resultados[0]);
            var servidoresCriticos = resultados[1].length > 0 ? Number(resultados[1][0].servidores_criticos || 0) : 0;
            var totalServidores = resultados[2].length > 0 ? Number(resultados[2][0].total || 0) : 0;

            res.status(200).json({
                abertos: resumo.abertos,
                em_andamento: resumo.em_andamento,
                finalizados: resumo.finalizados,
                cancelados: resumo.cancelados,
                total_chamados: resumo.total_chamados,
                mttr_minutos: resumo.mttr_minutos || 0,
                servidores_criticos: servidoresCriticos,
                total_servidores: totalServidores
            });
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar a situação dos chamados! Erro: ", erro.sqlMessage || erro.message);
            res.status(500).json(erro.sqlMessage || erro.message);
        });
}

function obterRelatorioCarteira(req, res) {
    montarCarteira()
        .then(function (carteira) {
            res.status(200).json(carteira);
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar o relatório da carteira! Erro: ", erro.sqlMessage || erro.message);
            res.status(500).json(erro.sqlMessage || erro.message);
        });
}

function obterHistoricoIncidentes(req, res) {
    dashboardDanielModel.obterHistoricoIncidentes()
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar o histórico de incidentes! Erro: ", erro.sqlMessage || erro.message);
            res.status(500).json(erro.sqlMessage || erro.message);
        });
}

module.exports = {
    obterKpisGlobais,
    obterRankingIncidentes,
    obterAlertasVsResolvidos,
    obterSituacaoChamados,
    obterRelatorioCarteira,
    obterHistoricoIncidentes
};

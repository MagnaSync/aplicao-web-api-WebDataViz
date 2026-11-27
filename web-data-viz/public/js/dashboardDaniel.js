// ============================================================================
// SEÇÃO 1 — VARIÁVEIS GLOBAIS E FUNÇÕES AUXILIARES
// ============================================================================
var escopoAtual = "todos";
var kpisGlobais = null;
var rankingGlobal = [];
var timelineGlobal = [];
var situacaoGlobal = null;
var dadosCarteira = [];
var historicoIncidentes = [];
var hospitalModalId = null;
var ultimoSeletorHospitais = "";

var rankingChart = null;
var timelineChart = null;
var roscaChart = null;

function definirTexto(id, texto) {
    var el = document.getElementById(id);
    if (el) el.innerText = texto;
}

function formatarMinutos(minutos) {
    if (minutos == null || isNaN(minutos) || Number(minutos) <= 0) return "--";
    var m = Math.round(Number(minutos));
    if (m < 60) return `${m} min`;
    var h = Math.floor(m / 60);
    var resto = m % 60;
    return resto > 0 ? `${h}h ${resto}min` : `${h}h`;
}

function formatarHorarioCurto(horario) {
    var partes = String(horario || "").split(" ");
    if (partes.length < 2) return horario || "--";
    return `${partes[0].slice(0, 5)} ${partes[1].slice(0, 5)}`;
}

function atualizarPerfilSidebar() {
    var nome = sessionStorage.NOME_USUARIO || "Admin Geral MagnaSync";
    var cargo = sessionStorage.CARGO_USUARIO || "Governança Multi-Cliente";
    definirTexto("sidebar-user-name", nome);
    definirTexto("sidebar-user-role", cargo);

    var partes = nome.trim().split(" ");
    var iniciais = partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "");
    definirTexto("sidebar-user-avatar", iniciais.toUpperCase());
}

// ============================================================================
// SEÇÃO 2 — NAVEGAÇÃO ENTRE TELAS E SELETOR DE HOSPITAL
// ============================================================================
function trocarTela(alvo) {
    var telas = ["overview", "relatorio", "cadastrarHospital"];
    if (telas.indexOf(alvo) === -1) alvo = "overview";

    // Mostra apenas a tela selecionada e esconde as outras duas
    for (var i = 0; i < telas.length; i++) {
        var viewEl = document.getElementById(`view-${telas[i]}`);
        if (viewEl) viewEl.style.display = telas[i] === alvo ? "flex" : "none";
    }

    var links = document.querySelectorAll(".sidebar-nav .nav-link");
    // Destaca no menu lateral o link da tela atual
    for (var j = 0; j < links.length; j++) {
        links[j].classList.toggle("active", links[j].getAttribute("href") === `#${alvo}`);
    }

    if (alvo === "overview") {
        if (rankingChart) rankingChart.resize();
        if (timelineChart) timelineChart.resize();
        if (roscaChart) roscaChart.resize();
    }
}

function atualizarSeletorHospitais() {
    var seletor = document.getElementById("hospital-selector");
    if (!seletor) return;

    var nomes = [];
    // Pega o nome de cada hospital para colocar no filtro do topo
    for (var i = 0; i < dadosCarteira.length; i++) {
        nomes.push(dadosCarteira[i].nome_cliente);
    }
    nomes.sort();

    var assinatura = nomes.join("|");
    if (assinatura === ultimoSeletorHospitais) return;
    ultimoSeletorHospitais = assinatura;

    var html = '<option value="todos">Todos os Hospitais – Visão Global</option>';
    // Monta as opções <option> do select com cada hospital
    for (var j = 0; j < nomes.length; j++) {
        html += `<option value="${nomes[j]}">${nomes[j]}</option>`;
    }
    seletor.innerHTML = html;

    if (nomes.indexOf(escopoAtual) === -1) escopoAtual = "todos";
    seletor.value = escopoAtual;
}

function aplicarFiltroHospital() {
    var seletor = document.getElementById("hospital-selector");
    escopoAtual = seletor ? seletor.value : "todos";
    definirTexto("topbar-escopo-titulo", escopoAtual === "todos" ? "Todos os Hospitais – Visão Global" : escopoAtual);

    atualizarTelaOverview();
    exibirTabelaCarteira();
}

// ============================================================================
// SEÇÃO 3 — BUSCA DE DADOS NO BANCO (FETCH)
// ============================================================================
function buscarDados(rota, aoReceber) {
    fetch(rota)
        .then(function (resposta) {
            if (resposta.ok) resposta.json().then(aoReceber);
        })
        .catch(function (erro) {
            console.error(`Erro ao buscar ${rota}:`, erro);
        });
}

function buscarKpis() {
    buscarDados("/dashboardDaniel/kpis", function (dados) {
        kpisGlobais = dados;
        atualizarTelaOverview();
    });
}

function buscarRanking() {
    buscarDados("/dashboardDaniel/ranking-incidentes", function (dados) {
        rankingGlobal = dados;
        atualizarTelaOverview();
    });
}

function buscarAlertasVsResolvidos() {
    buscarDados("/dashboardDaniel/alertas-vs-resolvidos", function (dados) {
        timelineGlobal = dados;
        atualizarTelaOverview();
    });
}

function buscarSituacaoChamados() {
    buscarDados("/dashboardDaniel/situacao-chamados", function (dados) {
        situacaoGlobal = dados;
        atualizarTelaOverview();
    });
}

function buscarRelatorioCarteira() {
    buscarDados("/dashboardDaniel/relatorio-carteira", function (dados) {
        dadosCarteira = dados;
        atualizarSeletorHospitais();
        atualizarTelaOverview();
        exibirTabelaCarteira();
        if (hospitalModalId != null) abrirModalHospital(hospitalModalId);
    });
}

function buscarHistoricoIncidentes() {
    buscarDados("/dashboardDaniel/historico-incidentes", function (dados) {
        historicoIncidentes = dados;
        atualizarTelaOverview();
        if (hospitalModalId != null) abrirModalHospital(hospitalModalId);
    });
}

function carregarDashboard() {
    buscarKpis();
    buscarRanking();
    buscarAlertasVsResolvidos();
    buscarSituacaoChamados();
    buscarRelatorioCarteira();
    buscarHistoricoIncidentes();
}

// ============================================================================
// SEÇÃO 4 — TELA 1: KPIs E SAÚDE GLOBAL DA CARTEIRA
// ============================================================================
function buscarHospitalSelecionado() {
    // Procura na carteira os dados do hospital selecionado no filtro
    for (var i = 0; i < dadosCarteira.length; i++) {
        if (dadosCarteira[i].nome_cliente === escopoAtual) return dadosCarteira[i];
    }
    return null;
}

function montarTimelineDoHospital(nomeHospital) {
    var mapaHoras = {};
    var ordemHoras = [];

    // Percorre o histórico do mais antigo ao mais novo para contar alertas e resolvidos por hora
    for (var i = historicoIncidentes.length - 1; i >= 0; i--) {
        var r = historicoIncidentes[i];
        if (r.nome_cliente !== nomeHospital) continue;

        var hora = `${(String(r.horario_alerta || "").split(" ")[1] || "00:00:00").slice(0, 2)}:00`;
        if (!mapaHoras[hora]) {
            mapaHoras[hora] = { janela_hora: hora, alertas_gerados: 0, chamados_resolvidos: 0 };
            ordemHoras.push(hora);
        }
        mapaHoras[hora].alertas_gerados += 1;
        if (r.status_chamado === "Finalizado") mapaHoras[hora].chamados_resolvidos += 1;
    }

    var serie = [];
    // Junta os valores agrupados por hora na ordem cronológica
    for (var j = 0; j < ordemHoras.length; j++) serie.push(mapaHoras[ordemHoras[j]]);
    return serie;
}

function atualizarTelaOverview() {
    var global = escopoAtual === "todos";
    var hosp = global ? null : buscarHospitalSelecionado();
    definirTexto("topbar-escopo-titulo", global ? "Todos os Hospitais – Visão Global" : escopoAtual);

    if (global || !hosp) {
        exibirKpis(kpisGlobais);
        plotarAlertasVsResolvidos(timelineGlobal);
        plotarRanking(rankingGlobal);
        plotarRoscaChamados(situacaoGlobal);

        if (situacaoGlobal) {
            var ativos = Number(situacaoGlobal.abertos || 0) + Number(situacaoGlobal.em_andamento || 0);
            exibirSaudeGlobal(Number(situacaoGlobal.servidores_criticos || 0), Number(situacaoGlobal.total_servidores || 0), ativos, Number(situacaoGlobal.mttr_minutos || 0));
        }
        return;
    }

    var ab = Number(hosp.chamados_somente_abertos || 0);
    var em = Number(hosp.chamados_em_andamento || 0);
    var fin = Number(hosp.chamados_finalizados || 0);
    var canc = Number(hosp.chamados_cancelados || 0);
    var totalCh = ab + em + fin + canc;
    var mttrHosp = hosp.mttr_minutos != null ? Number(hosp.mttr_minutos) : 0;

    exibirKpis({
        total_clientes_ativos: 1,
        parque_total_monitorado: Number(hosp.total_maquinas || 0),
        chamados_finalizados: fin,
        total_chamados: totalCh,
        chamados_abertos: Number(hosp.chamados_abertos || 0),
        mttr_minutos: mttrHosp
    });

    plotarAlertasVsResolvidos(montarTimelineDoHospital(escopoAtual));

    var rankingFiltrado = [];
    // Filtra o ranking para mostrar somente o hospital selecionado
    for (var i = 0; i < rankingGlobal.length; i++) {
        if (rankingGlobal[i].hospital_nome === escopoAtual) rankingFiltrado.push(rankingGlobal[i]);
    }
    plotarRanking(rankingFiltrado.length > 0 ? rankingFiltrado : rankingGlobal);

    plotarRoscaChamados({ abertos: ab, em_andamento: em, finalizados: fin, cancelados: canc, total_chamados: totalCh });
    exibirSaudeGlobal(Number(hosp.servidores_criticos || 0), Number(hosp.total_maquinas || 0), ab + em, mttrHosp);
}

function exibirKpis(kpis) {
    if (!kpis) return;
    var finalizados = Number(kpis.chamados_finalizados || 0);
    var totalChamados = Number(kpis.total_chamados || 0);
    var taxa = totalChamados > 0 ? Math.round((finalizados / totalChamados) * 100) : null;
    var mttr = Number(kpis.mttr_minutos || 0);

    definirTexto("kpi-clientes-ativos", Number(kpis.total_clientes_ativos || 0));
    definirTexto("kpi-parque-total", Number(kpis.parque_total_monitorado || 0));
    definirTexto("kpi-taxa-resolucao", taxa != null ? `${taxa}%` : "--");
    definirTexto("kpi-chamados-abertos", Number(kpis.chamados_abertos || 0));

    var badgeResolucao = document.getElementById("kpi-resolucao-badge");
    if (badgeResolucao) {
        badgeResolucao.innerText = totalChamados > 0 ? `${finalizados} de ${totalChamados} resolvidos` : "Sem chamados";
        badgeResolucao.className = taxa == null ? "kpi-badge normal" : (taxa >= 75 ? "kpi-badge up" : (taxa >= 45 ? "kpi-badge warn" : "kpi-badge critical"));
    }

    var badgeMttr = document.getElementById("kpi-mttr-badge");
    if (badgeMttr) {
        badgeMttr.innerText = `MTTR: ${formatarMinutos(mttr)}`;
        badgeMttr.className = mttr === 0 ? "kpi-badge normal" : (mttr <= 60 ? "kpi-badge up" : (mttr <= 120 ? "kpi-badge warn" : "kpi-badge critical"));
    }
}

function exibirSaudeGlobal(servCriticos, totalServidores, chamadosAtivos, mttr) {
    var score = totalServidores > 0 ? Math.max(0, Math.round(((totalServidores - servCriticos) / totalServidores) * 100)) : 100;
    var scoreEl = document.getElementById("gauge-score");
    var labelEl = document.getElementById("gauge-label");
    if (scoreEl) scoreEl.innerHTML = `${score}<small>%</small>`;

    if (labelEl) {
        if (servCriticos === 0 && score >= 85) {
            labelEl.innerText = "Limite Seguro";
            labelEl.className = "gauge-label";
        } else if (score >= 60) {
            labelEl.innerText = "Requer Atenção";
            labelEl.className = "gauge-label warn";
        } else {
            labelEl.innerText = "Estado Crítico";
            labelEl.className = "gauge-label critical";
        }
    }

    var parqueDot = document.getElementById("health-parque-dot");
    if (parqueDot) parqueDot.className = servCriticos === 0 ? "status-dot emerald" : (score >= 60 ? "status-dot amber" : "status-dot crimson");
    definirTexto("health-parque-status", `${totalServidores} ativo(s) · ${servCriticos} crítico(s)`);

    var chamadosDot = document.getElementById("health-chamados-dot");
    if (chamadosDot) chamadosDot.className = chamadosAtivos === 0 ? "status-dot emerald" : (chamadosAtivos <= 5 ? "status-dot amber" : "status-dot crimson");
    definirTexto("health-chamados-status", `${chamadosAtivos} em aberto ou andamento`);

    var mttrDot = document.getElementById("health-mttr-dot");
    if (mttrDot) mttrDot.className = (mttr === 0 || mttr <= 60) ? "status-dot emerald" : (mttr <= 120 ? "status-dot amber" : "status-dot crimson");
    definirTexto("health-mttr-status", mttr > 0 ? `${formatarMinutos(mttr)} de resolução média` : "Sem chamados finalizados");
}

// ============================================================================
// SEÇÃO 5 — TELA 1: GRÁFICOS (CHART.JS)
// ============================================================================
function plotarRanking(lista) {
    var canvas = document.getElementById("chartRankingIncidentes");
    if (!canvas || typeof Chart === "undefined") return;

    var labels = [], bloqueios = [], criticos = [], atencao = [];
    // Separa os nomes e quantidades de alertas de cada hospital para o gráfico
    for (var i = 0; i < lista.length; i++) {
        labels.push(lista[i].hospital_nome);
        bloqueios.push(Number(lista[i].bloqueio || 0));
        criticos.push(Number(lista[i].criticos || 0));
        atencao.push(Number(lista[i].atencao || 0));
    }

    if (!rankingChart) {
        rankingChart = new Chart(canvas.getContext("2d"), {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    { label: "Bloqueio", data: bloqueios, backgroundColor: "#7f1d1d", borderRadius: 4 },
                    { label: "Crítico", data: criticos, backgroundColor: "#dc2626", borderRadius: 4 },
                    { label: "Atenção", data: atencao, backgroundColor: "#f59e0b", borderRadius: 4 }
                ]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }, y: { stacked: true, grid: { display: false } } }
            }
        });
    } else {
        rankingChart.data.labels = labels;
        rankingChart.data.datasets[0].data = bloqueios;
        rankingChart.data.datasets[1].data = criticos;
        rankingChart.data.datasets[2].data = atencao;
        rankingChart.update("none");
    }
}

function plotarAlertasVsResolvidos(lista) {
    var canvas = document.getElementById("chartAlertasVsResolvidos");
    if (!canvas || typeof Chart === "undefined") return;

    var labels = [], gerados = [], resolvidos = [];
    // Separa as horas e os totais de alertas gerados e chamados resolvidos
    for (var i = 0; i < lista.length; i++) {
        labels.push(lista[i].janela_hora);
        gerados.push(Number(lista[i].alertas_gerados || 0));
        resolvidos.push(Number(lista[i].chamados_resolvidos || 0));
    }

    if (!timelineChart) {
        timelineChart = new Chart(canvas.getContext("2d"), {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    { label: "Alertas Gerados", data: gerados, borderColor: "#1A4A87", backgroundColor: "rgba(26, 74, 135, 0.15)", fill: true, tension: 0.35 },
                    { label: "Chamados Resolvidos", data: resolvidos, borderColor: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.15)", fill: true, tension: 0.35 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    } else {
        timelineChart.data.labels = labels;
        timelineChart.data.datasets[0].data = gerados;
        timelineChart.data.datasets[1].data = resolvidos;
        timelineChart.update("none");
    }
}

function plotarRoscaChamados(situacao) {
    if (!situacao) return;
    var finalizados = Number(situacao.finalizados || 0);
    var emAndamento = Number(situacao.em_andamento || 0);
    var abertos = Number(situacao.abertos || 0);
    var cancelados = Number(situacao.cancelados || 0);
    var total = Number(situacao.total_chamados || (finalizados + emAndamento + abertos + cancelados));

    definirTexto("donut-total-chamados", total);

    var itens = [
        { label: "Finalizados", valor: finalizados, cor: "#10b981" },
        { label: "Em Andamento", valor: emAndamento, cor: "#1A4A87" },
        { label: "Abertos", valor: abertos, cor: "#dc2626" },
        { label: "Cancelados", valor: cancelados, cor: "#94a3b8" }
    ];

    var legenda = document.getElementById("chamados-donut-legend");
    if (legenda) {
        var html = "";
        // Monta os itens da legenda ao lado do gráfico de rosca
        for (var i = 0; i < itens.length; i++) {
            html += `<li><span><i style="background:${itens[i].cor}"></i>${itens[i].label}</span><b>${itens[i].valor}</b></li>`;
        }
        legenda.innerHTML = html;
    }

    var canvas = document.getElementById("chartSituacaoChamados");
    if (!canvas || typeof Chart === "undefined") return;

    var valores = [finalizados, emAndamento, abertos, cancelados];
    if (!roscaChart) {
        roscaChart = new Chart(canvas.getContext("2d"), {
            type: "doughnut",
            data: {
                labels: ["Finalizados", "Em Andamento", "Abertos", "Cancelados"],
                datasets: [{ data: valores, backgroundColor: ["#10b981", "#1A4A87", "#dc2626", "#94a3b8"], borderColor: "#ffffff", borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: false } } }
        });
    } else {
        roscaChart.data.datasets[0].data = valores;
        roscaChart.update("none");
    }
}

// ============================================================================
// SEÇÃO 6 — TELA 2: RELATÓRIOS (CARTEIRA E HISTÓRICO)
// ============================================================================
function obterCarteiraFiltrada() {
    var ipt = document.getElementById("ipt-busca-hospital");
    var busca = ipt ? ipt.value.trim().toLowerCase() : "";
    var filtrados = [];

    // Filtra a carteira pelo hospital selecionado no topo e pelo campo de busca
    for (var i = 0; i < dadosCarteira.length; i++) {
        var item = dadosCarteira[i];
        if (escopoAtual !== "todos" && item.nome_cliente !== escopoAtual) continue;
        if (busca && !`${item.nome_cliente} ${item.cnpj} ${item.principal_gargalo || ""}`.toLowerCase().includes(busca)) continue;
        filtrados.push(item);
    }

    return filtrados;
}

function exibirTabelaCarteira() {
    var tbody = document.getElementById("tbody-relatorio-carteira");
    if (!tbody) return;

    var lista = obterCarteiraFiltrada();
    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhum hospital encontrado.</td></tr>';
        return;
    }

    var html = "";
    // Cria uma linha <tr> na tabela para cada hospital da lista filtrada
    for (var i = 0; i < lista.length; i++) {
        var item = lista[i];
        var graves = Number(item.alertas_bloqueio || 0) + Number(item.alertas_criticos || 0);
        var chAbertos = Number(item.chamados_abertos || 0);
        var gargalo = Number(item.total_alertas || 0) > 0 ? (item.principal_gargalo || "Monitoramento") : "Estável";
        var linhaCritica = graves > 0;

        html += `
            <tr class="${linhaCritica ? "row-divergencia " : ""}row-clickable" onclick="abrirModalHospital(${item.hospital_id})" title="Clique para ver detalhes">
                <td><strong>${item.nome_cliente}</strong></td>
                <td>${item.cliente_desde || "Recém-cadastrado"}</td>
                <td>${Number(item.total_maquinas || 0)}</td>
                <td><span class="kpi-badge ${graves > 0 ? "critical" : "up"}">${graves}</span></td>
                <td><span class="kpi-badge ${chAbertos > 0 ? "warn" : "up"}">${chAbertos}</span></td>
                <td>${Number(item.total_alertas || 0) > 0 ? `<span class="gargalo-tag">${gargalo}</span>` : '<span class="status-pill delivered">Estável</span>'}</td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}

function badgeSeveridade(sev) {
    if (sev === "Bloqueio") return '<span class="kpi-badge bloqueio">Bloqueio</span>';
    if (sev === "Crítico") return '<span class="kpi-badge critical">Crítico</span>';
    return `<span class="kpi-badge warn">${sev || "Atenção"}</span>`;
}

function badgeStatusChamado(status, tempoMin) {
    if (status === "Finalizado") {
        var tempo = formatarMinutos(tempoMin);
        return `<span class="status-pill delivered">${tempo !== "--" ? `Finalizado (${tempo})` : "Finalizado"}</span>`;
    }
    if (status === "Em Andamento") return '<span class="status-pill in-progress">Em Andamento</span>';
    if (status === "Aberto") return '<span class="status-pill open-ticket">Aberto</span>';
    if (status === "Cancelado") return '<span class="status-pill canceled">Cancelado</span>';
    return '<span class="status-pill none">Sem chamado</span>';
}

// ============================================================================
// SEÇÃO 7 — MODAL DE DETALHES DO HOSPITAL
// ============================================================================
function abrirModalHospital(hospitalId) {
    var modal = document.getElementById("modal-hospital");
    var hosp = null;
    // Procura o hospital clicado pelo ID dentro da carteira
    for (var i = 0; i < dadosCarteira.length; i++) {
        if (Number(dadosCarteira[i].hospital_id) === Number(hospitalId)) {
            hosp = dadosCarteira[i];
            break;
        }
    }
    if (!hosp || !modal) return;
    hospitalModalId = Number(hosp.hospital_id);

    var desde = hosp.cliente_desde ? `Monitorado desde ${hosp.cliente_desde}` : "Recém-cadastrado";
    var graves = Number(hosp.alertas_bloqueio || 0) + Number(hosp.alertas_criticos || 0);

    definirTexto("modal-hosp-nome", hosp.nome_cliente);
    definirTexto("modal-hosp-meta", `${hosp.email || "Sem e-mail"} · ${desde}`);
    definirTexto("modal-hosp-maquinas", Number(hosp.total_maquinas || 0));
    definirTexto("modal-hosp-alertas", graves);
    definirTexto("modal-hosp-abertos", Number(hosp.chamados_abertos || 0));
    definirTexto("modal-hosp-mttr", formatarMinutos(hosp.mttr_minutos));

    var tbodyModal = document.getElementById("tbody-modal-hospital-incidentes");
    if (tbodyModal) {
        var html = "";
        // Monta as linhas da tabela do modal apenas com os incidentes deste hospital
        for (var j = 0; j < historicoIncidentes.length; j++) {
            var r = historicoIncidentes[j];
            if (r.nome_cliente !== hosp.nome_cliente) continue;
            html += `
                <tr>
                    <td>${formatarHorarioCurto(r.horario_alerta)}</td>
                    <td><strong>${r.servidor_fabricante || "Servidor PACS"}</strong></td>
                    <td>${r.componente} (${Number(r.valor_leitura || 0)}${r.unidade_medida || ""})</td>
                    <td>${badgeSeveridade(r.severidade)}</td>
                    <td>${badgeStatusChamado(r.status_chamado, r.tempo_resolucao_min)}</td>
                </tr>
            `;
        }
        tbodyModal.innerHTML = html || '<tr><td colspan="5" class="table-empty">Nenhum incidente registrado para este hospital.</td></tr>';
    }
    modal.style.display = "flex";
}

function fecharModalHospital() {
    hospitalModalId = null;
    var modal = document.getElementById("modal-hospital");
    if (modal) modal.style.display = "none";
}

// ============================================================================
// SEÇÃO 8 — EXPORTAÇÃO (CSV)
// ============================================================================
function baixarCsv(nomeArquivo, linhasTexto) {
    var link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + linhasTexto.join("\n"));
    link.download = nomeArquivo;
    link.click();
}

function exportarCarteiraCsv() {
    var lista = obterCarteiraFiltrada();
    if (lista.length === 0) return;

    var linhas = ["Hospital;Monitorado Desde;Servidores PACS;Alertas Criticos;Chamados Abertos;Principal Gargalo"];
    // Transforma cada hospital da lista em uma linha separada por ponto e vírgula para o CSV
    for (var i = 0; i < lista.length; i++) {
        var r = lista[i];
        var graves = Number(r.alertas_bloqueio || 0) + Number(r.alertas_criticos || 0);
        var gargalo = Number(r.total_alertas || 0) > 0 ? (r.principal_gargalo || "Monitoramento") : "Estável";
        linhas.push([
            r.nome_cliente,
            r.cliente_desde || "Recém-cadastrado",
            Number(r.total_maquinas || 0),
            graves,
            Number(r.chamados_abertos || 0),
            gargalo
        ].join(";"));
    }
    baixarCsv("relatorio-carteira-magnasync.csv", linhas);
}

// ============================================================================
// SEÇÃO 9 — TELA 3: CADASTRO DE HOSPITAL
// ============================================================================
function mostrarFeedbackHospital(texto, tipo) {
    var box = document.getElementById("hospital-feedback");
    if (!box) return;
    box.className = `feedback-box ${tipo}`;
    box.innerText = texto;
    box.style.display = "flex";
}

function limparFormularioHospital() {
    var ids = ["hosp-nome", "hosp-cnpj", "hosp-telefone", "hosp-email", "hosp-cep", "hosp-numero", "hosp-representante", "hosp-senha"];
    // Limpa o texto de todos os campos do formulário de cadastro
    for (var i = 0; i < ids.length; i++) {
        var campo = document.getElementById(ids[i]);
        if (campo) campo.value = "";
    }
}

function alternarVisibilidadeSenha() {
    var input = document.getElementById("hosp-senha");
    var btn = document.getElementById("toggle-hosp-senha");
    if (!input || !btn) return;
    var mostrar = input.type === "password";
    input.type = mostrar ? "text" : "password";
    btn.innerHTML = mostrar ? "&#128584;" : "&#128065;";
}

function cadastrarHospital() {
    var nome = document.getElementById("hosp-nome").value.trim();
    var cnpj = document.getElementById("hosp-cnpj").value.trim();
    var telefone = document.getElementById("hosp-telefone").value.trim();
    var email = document.getElementById("hosp-email").value.trim();
    var cep = document.getElementById("hosp-cep").value.trim();
    var numero = document.getElementById("hosp-numero").value.trim();
    var representante = document.getElementById("hosp-representante").value.trim();
    var senha = document.getElementById("hosp-senha").value;

    if (!nome || !cnpj || !telefone || !email || !cep || !numero || !representante || !senha) return mostrarFeedbackHospital("Preencha todos os campos obrigatórios.", "error");
    if (cnpj.length != 14 || isNaN(cnpj)) return mostrarFeedbackHospital("CNPJ inválido: digite os 14 números.", "error");
    if (!email.includes("@")) return mostrarFeedbackHospital("Informe um e-mail válido.", "error");
    if (cep.length != 8 || isNaN(cep)) return mostrarFeedbackHospital("CEP inválido: digite os 8 números.", "error");
    if (senha.length < 6) return mostrarFeedbackHospital("A senha deve ter no mínimo 6 caracteres.", "error");

    fetch("/hospital/cadastrarHospital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomeServer: nome, cnpjServer: cnpj, telefoneServer: telefone, emailServer: email, cepServer: cep, numeroServer: numero })
    })
        .then(function (resposta) {
            if (!resposta.ok) throw new Error("Erro ao cadastrar hospital.");
            return resposta.json();
        })
        .then(function (dadosHospital) {
            return fetch("/usuarios/cadastrar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nomeServer: representante, emailServer: email, senhaServer: senha, idHospitalVincularServer: dadosHospital.insertId, cargoServer: 3 })
            });
        })
        .then(function (respUsuario) {
            if (!respUsuario.ok) throw new Error("Hospital cadastrado, mas houve erro ao vincular o representante.");
            limparFormularioHospital();
            mostrarFeedbackHospital("Hospital e representante cadastrados com sucesso!", "success");
            carregarDashboard();
        })
        .catch(function (erro) {
            console.error(erro);
            mostrarFeedbackHospital(erro.message || "Não foi possível cadastrar o hospital.", "error");
        });
}

// ============================================================================
// SEÇÃO 10 — INICIALIZAÇÃO E EVENTOS
// ============================================================================
function iniciarDashboard() {
    var links = document.querySelectorAll(".sidebar-nav .nav-link");
    // Adiciona o clique de troca de tela em cada item do menu lateral
    for (var i = 0; i < links.length; i++) {
        links[i].addEventListener("click", function (e) {
            e.preventDefault();
            var alvo = this.getAttribute("href").substring(1);
            window.location.hash = alvo;
            trocarTela(alvo);
        });
    }

    window.addEventListener("hashchange", function () { trocarTela(window.location.hash.replace("#", "")); });
    document.getElementById("hospital-selector").addEventListener("change", aplicarFiltroHospital);
    document.getElementById("ipt-busca-hospital").addEventListener("input", exibirTabelaCarteira);

    document.getElementById("btn-fechar-modal").addEventListener("click", fecharModalHospital);
    document.getElementById("modal-hospital").addEventListener("click", function (e) {
        if (e.target === this) fecharModalHospital();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") fecharModalHospital(); });

    document.getElementById("btn-exportar-csv").addEventListener("click", exportarCarteiraCsv);
    document.getElementById("toggle-hosp-senha").addEventListener("click", alternarVisibilidadeSenha);
    document.getElementById("btn-cadastrar-hospital").addEventListener("click", cadastrarHospital);
    document.getElementById("btn-limpar-hospital").addEventListener("click", limparFormularioHospital);

    atualizarPerfilSidebar();
    trocarTela(window.location.hash.replace("#", ""));
    carregarDashboard();
    setInterval(carregarDashboard, 5000);
}

document.addEventListener("DOMContentLoaded", iniciarDashboard);

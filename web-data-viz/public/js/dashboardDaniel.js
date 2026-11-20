/**
 * MagnaSync — Dashboard Executiva Multi-Cliente & SLA (Admin Geral / Daniel)
 * Consome /dashboardDaniel/* (MySQL oficial magnasync_script.sql) e controla:
 *   #overview (KPIs, gráficos 2x2, Saúde Global da Carteira e filtro por hospital)
 *   #relatorio (Carteira ordenada por criticidade/antiguidade/chamados/servidores + histórico de incidentes)
 *   #cadastrarHospital (Cadastro de novo hospital na mesma página)
 */
document.addEventListener('DOMContentLoaded', function () {
  var INTERVALO_MS = 5000;

  var rankingChart = null;
  var timelineChart = null;
  var roscaChart = null;

  var escopoAtual = 'todos';
  var kpisGlobais = null;
  var rankingGlobal = [];
  var timelineGlobal = [];
  var situacaoGlobal = null;
  var historicoIncidentes = [];
  var dadosCarteira = [];
  var filtroIncidenteAtual = 'criticos';
  var ordenacaoCarteiraAtual = 'problematicos';
  var rankingExibidoAtual = [];

  // ------------------------------------------------------------------
  // Utilitários
  // ------------------------------------------------------------------
  function escaparHtml(valor) {
    return String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buscarJson(url) {
    return fetch(url).then(function (resposta) {
      if (!resposta.ok) {
        throw new Error('HTTP ' + resposta.status + ' em ' + url);
      }
      return resposta.json();
    });
  }

  function definirTexto(id, texto) {
    var el = document.getElementById(id);
    if (el) el.textContent = texto;
  }

  function formatarMinutos(minutos) {
    if (minutos == null || isNaN(Number(minutos))) return '--';
    var m = Math.round(Number(minutos));
    if (m <= 0) return '--';
    if (m < 60) return m + ' min';
    var horas = Math.floor(m / 60);
    var resto = m % 60;
    return resto > 0 ? (horas + 'h ' + resto + 'min') : (horas + 'h');
  }

  function formatarHorarioCurto(horarioStr) {
    var partes = String(horarioStr || '').split(' ');
    if (partes.length < 2) return horarioStr || '--';
    return partes[0].slice(0, 5) + ' ' + partes[1].slice(0, 5);
  }

  var opcoesLegenda = {
    position: 'top',
    align: 'end',
    labels: {
      usePointStyle: true,
      pointStyle: 'circle',
      boxWidth: 8,
      boxHeight: 8,
      color: '#273E63',
      font: { family: "'Inter', sans-serif", size: 11.5, weight: '600' }
    }
  };

  // ------------------------------------------------------------------
  // Perfil da sidebar
  // ------------------------------------------------------------------
  function atualizarPerfilSidebar() {
    var nome = sessionStorage.getItem('NOME_USUARIO') || 'Admin Geral MagnaSync';
    var cargo = sessionStorage.getItem('CARGO_USUARIO') || 'Governança Multi-Cliente';
    definirTexto('sidebar-user-name', nome);
    definirTexto('sidebar-user-role', cargo);
    var partes = nome.trim().split(/\s+/);
    var iniciais = (partes[0][0] || 'A') + (partes.length > 1 ? partes[partes.length - 1][0] : '');
    definirTexto('sidebar-user-avatar', iniciais.toUpperCase());
  }

  // ------------------------------------------------------------------
  // Navegação entre as 3 telas (sidebar única)
  // ------------------------------------------------------------------
  var views = {
    overview: document.getElementById('view-overview'),
    relatorio: document.getElementById('view-relatorio'),
    cadastrarHospital: document.getElementById('view-cadastrarHospital')
  };
  var navLinks = document.querySelectorAll('.sidebar-nav .nav-link');

  function switchView(alvo) {
    if (!views[alvo]) alvo = 'overview';
    Object.keys(views).forEach(function (k) {
      views[k].style.display = k === alvo ? 'flex' : 'none';
    });
    navLinks.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('href') === '#' + alvo);
    });
    if (alvo === 'overview') {
      [rankingChart, timelineChart, roscaChart].forEach(function (g) {
        if (g) g.resize();
      });
    }
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var alvo = link.getAttribute('href').substring(1);
      window.location.hash = alvo;
      switchView(alvo);
    });
  });
  window.addEventListener('hashchange', function () {
    switchView(window.location.hash.replace('#', ''));
  });

  // ------------------------------------------------------------------
  // Seletor de escopo no topo (Todos os Hospitais x Hospital específico)
  // ------------------------------------------------------------------
  var hospitalSelector = document.getElementById('hospital-selector');
  var listaNomesHospitaisAnterior = '';

  function atualizarOpcoesSeletor() {
    if (!hospitalSelector) return;
    var nomesAtuais = dadosCarteira
      .map(function (h) { return h.nome_cliente; })
      .sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
    var assinatura = JSON.stringify(nomesAtuais);
    if (assinatura === listaNomesHospitaisAnterior) return;
    listaNomesHospitaisAnterior = assinatura;

    var selecionadoAntes = escopoAtual;
    hospitalSelector.innerHTML = '<option value="todos">Todos os Hospitais – Visão Global</option>';
    nomesAtuais.forEach(function (nome) {
      var opt = document.createElement('option');
      opt.value = nome;
      opt.textContent = nome;
      hospitalSelector.appendChild(opt);
    });
    var existe = nomesAtuais.indexOf(selecionadoAntes) !== -1;
    escopoAtual = existe ? selecionadoAntes : 'todos';
    hospitalSelector.value = escopoAtual;
  }

  if (hospitalSelector) {
    hospitalSelector.addEventListener('change', function () {
      escopoAtual = hospitalSelector.value || 'todos';
      aplicarEscopoOverview();
      renderizarRelatorioCarteira();
      renderizarHistoricoIncidentes();
    });
  }

  // ------------------------------------------------------------------
  // TELA 1 — Aplicação do escopo (Global ou Hospital selecionado)
  // ------------------------------------------------------------------
  function montarTimelineFiltrada(incidentesFiltrados) {
    var porHora = {};
    var ordemHoras = [];
    var reverso = incidentesFiltrados.slice().reverse();

    reverso.forEach(function (r) {
      var parteHora = String(r.horario_alerta || '').split(' ')[1] || '00:00:00';
      var hora = parteHora.slice(0, 2) + ':00';
      if (!porHora[hora]) {
        porHora[hora] = { janela_hora: hora, alertas_gerados: 0, chamados_resolvidos: 0 };
        ordemHoras.push(hora);
      }
      var bucket = porHora[hora];
      bucket.alertas_gerados += 1;
      if (r.status_chamado === 'Finalizado') {
        bucket.chamados_resolvidos += 1;
      }
    });

    return ordemHoras.map(function (h) {
      return porHora[h];
    });
  }

  function aplicarEscopoOverview() {
    var isGlobal = escopoAtual === 'todos';
    definirTexto(
      'topbar-escopo-titulo',
      isGlobal ? 'Todos os Hospitais – Visão Global' : escopoAtual
    );

    var hosp = null;
    for (var i = 0; i < dadosCarteira.length; i++) {
      if (dadosCarteira[i].nome_cliente === escopoAtual) {
        hosp = dadosCarteira[i];
        break;
      }
    }

    var incidentesEscopo = isGlobal
      ? historicoIncidentes
      : historicoIncidentes.filter(function (r) {
          return r.nome_cliente === escopoAtual;
        });

    // 1. KPIs do topo
    if (isGlobal || !hosp) {
      renderizarKpis(kpisGlobais);
    } else {
      var abHosp = Number(hosp.chamados_somente_abertos || 0);
      var emHosp = Number(hosp.chamados_em_andamento || 0);
      var finHosp = Number(hosp.chamados_finalizados || 0);
      var cancHosp = Number(hosp.chamados_cancelados || 0);
      var totalChHosp = abHosp + emHosp + finHosp + cancHosp;
      var taxaChHosp = totalChHosp > 0 ? Math.round((finHosp / totalChHosp) * 100) : 0;
      renderizarKpis({
        total_clientes_ativos: 1,
        parque_total_monitorado: Number(hosp.total_maquinas || 0),
        chamados_finalizados: finHosp,
        total_chamados: totalChHosp,
        taxa_resolucao_pct: taxaChHosp,
        chamados_abertos: Number(hosp.chamados_abertos || 0),
        mttr_minutos: hosp.mttr_minutos != null ? Number(hosp.mttr_minutos) : 0
      });
    }

    // 2. Linha Dupla (Alertas Gerados vs. Chamados Resolvidos)
    var serie = isGlobal ? timelineGlobal : montarTimelineFiltrada(incidentesEscopo);
    renderizarAlertasVsResolvidos(serie);

    // 3. Ranking de Clientes com Mais Problemas
    var rankingExibido = isGlobal
      ? rankingGlobal
      : rankingGlobal.filter(function (r) {
          return r.hospital_nome === escopoAtual;
        });
    renderizarRanking(rankingExibido.length ? rankingExibido : rankingGlobal);

    // 4. Rosca (Situação dos Chamados) + Saúde Global da Carteira
    var situacaoExibida = situacaoGlobal;
    if (!isGlobal && hosp) {
      var ab = Number(hosp.chamados_somente_abertos || 0);
      var em = Number(hosp.chamados_em_andamento || 0);
      var fin = Number(hosp.chamados_finalizados || 0);
      var canc = Number(hosp.chamados_cancelados || 0);
      situacaoExibida = {
        abertos: ab,
        em_andamento: em,
        finalizados: fin,
        cancelados: canc,
        total_chamados: ab + em + fin + canc,
        mttr_minutos: hosp.mttr_minutos != null ? Number(hosp.mttr_minutos) : 0,
        servidores_criticos: Number(hosp.servidores_criticos || 0),
        total_servidores: Number(hosp.total_maquinas || 0)
      };
    }

    renderizarRoscaChamados(situacaoExibida);

    var servCrit = Number((situacaoExibida && situacaoExibida.servidores_criticos) || 0);
    var totalServ = Number((situacaoExibida && situacaoExibida.total_servidores) || 0);
    var chamadosAtivos = Number((situacaoExibida && situacaoExibida.abertos) || 0) +
      Number((situacaoExibida && situacaoExibida.em_andamento) || 0);
    var mttrMin = Number((situacaoExibida && situacaoExibida.mttr_minutos) || 0);

    renderizarSaudeGlobal(servCrit, totalServ, chamadosAtivos, mttrMin);
  }

  function renderizarKpis(kpis) {
    if (!kpis) return;
    var finalizados = Number(kpis.chamados_finalizados || 0);
    var totalChamados = Number(kpis.total_chamados || 0);
    var taxaResolucao = totalChamados > 0
      ? Math.round((finalizados / totalChamados) * 100)
      : null;
    var chamadosAbertos = Number(kpis.chamados_abertos || 0);
    var mttr = Number(kpis.mttr_minutos || 0);

    definirTexto('kpi-clientes-ativos', Number(kpis.total_clientes_ativos || 0));
    definirTexto('kpi-parque-total', Number(kpis.parque_total_monitorado || 0));
    definirTexto('kpi-taxa-resolucao', taxaResolucao != null ? (taxaResolucao + '%') : '--');
    definirTexto('kpi-chamados-abertos', chamadosAbertos);

    var badgeResolucao = document.getElementById('kpi-resolucao-badge');
    if (badgeResolucao) {
      badgeResolucao.textContent = totalChamados > 0
        ? (finalizados + ' de ' + totalChamados + ' resolvidos')
        : 'Sem chamados';
      if (taxaResolucao == null) {
        badgeResolucao.className = 'kpi-badge normal';
      } else if (taxaResolucao >= 75) {
        badgeResolucao.className = 'kpi-badge up';
      } else if (taxaResolucao >= 45) {
        badgeResolucao.className = 'kpi-badge warn';
      } else {
        badgeResolucao.className = 'kpi-badge critical';
      }
    }

    var badgeMttr = document.getElementById('kpi-mttr-badge');
    if (badgeMttr) {
      var textoMttr = formatarMinutos(mttr);
      badgeMttr.textContent = 'MTTR: ' + textoMttr;
      if (mttr === 0) {
        badgeMttr.className = 'kpi-badge normal';
      } else if (mttr <= 60) {
        badgeMttr.className = 'kpi-badge up';
      } else if (mttr <= 120) {
        badgeMttr.className = 'kpi-badge warn';
      } else {
        badgeMttr.className = 'kpi-badge critical';
      }
    }
  }

  // ------------------------------------------------------------------
  // TELA 1 — Saúde Global da Carteira (Score % + 3 indicadores)
  // ------------------------------------------------------------------
  function renderizarSaudeGlobal(servidoresCriticos, totalServidores, chamadosAtivos, mttrMinutos) {
    var score = totalServidores > 0
      ? Math.max(0, Math.round(((totalServidores - servidoresCriticos) / totalServidores) * 100))
      : 100;

    var scoreEl = document.getElementById('gauge-score');
    var labelEl = document.getElementById('gauge-label');
    if (scoreEl) scoreEl.innerHTML = score + '<small>%</small>';

    if (labelEl) {
      if (servidoresCriticos === 0 && score >= 85) {
        labelEl.textContent = 'Limite Seguro';
        labelEl.className = 'gauge-label';
      } else if (score >= 60) {
        labelEl.textContent = 'Requer Atenção';
        labelEl.className = 'gauge-label warn';
      } else {
        labelEl.textContent = 'Estado Crítico';
        labelEl.className = 'gauge-label critical';
      }
    }

    var parqueDot = document.getElementById('health-parque-dot');
    if (parqueDot) {
      parqueDot.className = servidoresCriticos === 0
        ? 'status-dot emerald'
        : (score >= 60 ? 'status-dot amber' : 'status-dot crimson');
    }
    definirTexto('health-parque-status', totalServidores + ' ativo(s) · ' + servidoresCriticos + ' crítico(s)');

    var chamadosDot = document.getElementById('health-chamados-dot');
    if (chamadosDot) {
      chamadosDot.className = chamadosAtivos === 0
        ? 'status-dot emerald'
        : (chamadosAtivos <= 5 ? 'status-dot amber' : 'status-dot crimson');
    }
    definirTexto('health-chamados-status', chamadosAtivos + ' em aberto ou andamento');

    var mttrDot = document.getElementById('health-mttr-dot');
    if (mttrDot) {
      mttrDot.className = (mttrMinutos === 0 || mttrMinutos <= 60)
        ? 'status-dot emerald'
        : (mttrMinutos <= 120 ? 'status-dot amber' : 'status-dot crimson');
    }
    definirTexto(
      'health-mttr-status',
      mttrMinutos > 0 ? (formatarMinutos(mttrMinutos) + ' de resolução média') : 'Sem chamados finalizados'
    );
  }

  // ------------------------------------------------------------------
  // TELA 1 — Gráficos Chart.js
  // ------------------------------------------------------------------
  function renderizarRanking(lista) {
    var canvas = document.getElementById('chartRankingIncidentes');
    if (!canvas || typeof Chart === 'undefined') return;

    rankingExibidoAtual = lista.slice();

    var labels = lista.map(function (i) {
      return i.hospital_nome;
    });
    var bloqueios = lista.map(function (i) {
      return Number(i.bloqueio || 0);
    });
    var criticos = lista.map(function (i) {
      return Number(i.criticos || 0);
    });
    var atencao = lista.map(function (i) {
      return Number(i.atencao || 0);
    });

    if (!rankingChart) {
      rankingChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            { label: 'Bloqueio', data: bloqueios, backgroundColor: '#7f1d1d', borderRadius: 4, barPercentage: 0.72 },
            { label: 'Crítico', data: criticos, backgroundColor: '#dc2626', borderRadius: 4, barPercentage: 0.72 },
            { label: 'Atenção', data: atencao, backgroundColor: '#f59e0b', borderRadius: 4, barPercentage: 0.72 }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: opcoesLegenda,
            tooltip: {
              backgroundColor: '#0B192C',
              padding: 10,
              cornerRadius: 6,
              callbacks: {
                afterBody: function (items) {
                  if (!items || !items.length) return [];
                  var item = rankingExibidoAtual[items[0].dataIndex];
                  if (!item) return [];
                  var pts = item.indice_criticidade != null
                    ? Number(item.indice_criticidade)
                    : ((Number(item.bloqueio || 0) * 3) + (Number(item.criticos || 0) * 2) + Number(item.atencao || 0));
                  var tot = Number(item.total_incidentes || 0);
                  var gQtd = Number(item.gargalo_qtd || 0);
                  var pct = tot > 0 && gQtd > 0 ? Math.round((gQtd / tot) * 100) : 0;
                  return [
                    'Índice de Criticidade: ' + pts + ' pts',
                    'Causa principal: ' + (item.principal_gargalo || 'N/A') +
                      (gQtd > 0 ? (' (' + gQtd + ' de ' + tot + ' alertas — ' + pct + '%)') : ''),
                    'Chamados abertos: ' + Number(item.chamados_abertos || 0) +
                      ' · PACS afetados: ' + Number(item.servidores_afetados || 0) + '/' + Number(item.total_servidores || 0)
                  ];
                }
              }
            }
          },
          scales: {
            x: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, color: '#8a9dbf', font: { size: 11 } }, grid: { color: 'rgba(39, 62, 99, 0.08)' } },
            y: { stacked: true, ticks: { color: '#273E63', font: { size: 11, weight: '600' } }, grid: { display: false } }
          }
        }
      });
    } else {
      rankingChart.data.labels = labels;
      rankingChart.data.datasets[0].data = bloqueios;
      rankingChart.data.datasets[1].data = criticos;
      rankingChart.data.datasets[2].data = atencao;
      rankingChart.update('none');
    }
  }

  function renderizarAlertasVsResolvidos(serie) {
    var canvas = document.getElementById('chartAlertasVsResolvidos');
    if (!canvas || typeof Chart === 'undefined') return;

    var labels = serie.map(function (i) {
      return i.janela_hora;
    });
    var gerados = serie.map(function (i) {
      return Number(i.alertas_gerados || 0);
    });
    var resolvidos = serie.map(function (i) {
      return Number(i.chamados_resolvidos || 0);
    });

    if (!timelineChart) {
      var ctx = canvas.getContext('2d');
      var gradGerados = ctx.createLinearGradient(0, 0, 0, 230);
      gradGerados.addColorStop(0, 'rgba(26, 74, 135, 0.28)');
      gradGerados.addColorStop(1, 'rgba(26, 74, 135, 0)');
      var gradResolvidos = ctx.createLinearGradient(0, 0, 0, 230);
      gradResolvidos.addColorStop(0, 'rgba(16, 185, 129, 0.24)');
      gradResolvidos.addColorStop(1, 'rgba(16, 185, 129, 0)');

      function estiloLinha(cor, grad, label, dados) {
        return {
          label: label,
          data: dados,
          borderColor: cor,
          backgroundColor: grad,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3.5,
          pointBackgroundColor: cor,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5
        };
      }

      timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            estiloLinha('#1A4A87', gradGerados, 'Alertas Gerados', gerados),
            estiloLinha('#10b981', gradResolvidos, 'Chamados Resolvidos', resolvidos)
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: opcoesLegenda,
            tooltip: { backgroundColor: '#0B192C', padding: 10, cornerRadius: 6 }
          },
          scales: {
            x: { ticks: { color: '#8a9dbf', font: { size: 11 }, maxRotation: 0, autoSkip: true }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { stepSize: 1, color: '#8a9dbf', font: { size: 11 } }, grid: { color: 'rgba(39, 62, 99, 0.08)' } }
          }
        }
      });
    } else {
      timelineChart.data.labels = labels;
      timelineChart.data.datasets[0].data = gerados;
      timelineChart.data.datasets[1].data = resolvidos;
      timelineChart.update('none');
    }
  }

  function renderizarRoscaChamados(situacao) {
    if (!situacao) return;
    var finalizados = Number(situacao.finalizados || 0);
    var emAndamento = Number(situacao.em_andamento || 0);
    var abertos = Number(situacao.abertos || 0);
    var cancelados = Number(situacao.cancelados || 0);
    var total = Number(situacao.total_chamados || (finalizados + emAndamento + abertos + cancelados));

    definirTexto('donut-total-chamados', total);

    var itens = [
      { label: 'Finalizados', valor: finalizados, cor: '#10b981' },
      { label: 'Em Andamento', valor: emAndamento, cor: '#1A4A87' },
      { label: 'Abertos', valor: abertos, cor: '#dc2626' },
      { label: 'Cancelados', valor: cancelados, cor: '#94a3b8' }
    ];

    var legenda = document.getElementById('chamados-donut-legend');
    if (legenda) {
      legenda.innerHTML = itens
        .map(function (i) {
          return '<li><span><i style="background:' + i.cor + '"></i>' + i.label + '</span><b>' + i.valor + '</b></li>';
        })
        .join('');
    }

    var canvas = document.getElementById('chartSituacaoChamados');
    if (!canvas || typeof Chart === 'undefined') return;
    var valores = [finalizados, emAndamento, abertos, cancelados];

    if (!roscaChart) {
      roscaChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: itens.map(function (i) { return i.label; }),
          datasets: [{ data: valores, backgroundColor: itens.map(function (i) { return i.cor; }), borderColor: '#ffffff', borderWidth: 2, hoverOffset: 5 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0B192C', padding: 10, cornerRadius: 6 } }
        }
      });
    } else {
      roscaChart.data.datasets[0].data = valores;
      roscaChart.update('none');
    }
  }

  // ------------------------------------------------------------------
  // TELA 2 — Card 1: Carteira de Clientes (Ordenação, Busca e Modal)
  // ------------------------------------------------------------------
  function calcularPesoProblemas(item) {
    if (item.indice_criticidade != null) return Number(item.indice_criticidade);
    return (Number(item.alertas_bloqueio || 0) * 3) +
      (Number(item.alertas_criticos || 0) * 2) +
      Number(item.alertas_atencao || 0);
  }

  function montarDiagnosticoCliente(item) {
    var bloqueios = Number(item.alertas_bloqueio || 0);
    var criticos = Number(item.alertas_criticos || 0);
    var atencao = Number(item.alertas_atencao || 0);
    var totalAlertas = Number(item.total_alertas || 0);
    var chamadosAbertos = Number(item.chamados_abertos || 0);
    var servidoresCriticos = Number(item.servidores_criticos || 0);
    var totalMaquinas = Number(item.total_maquinas || 0);
    var gargalo = item.principal_gargalo || 'Monitoramento';
    var gargaloQtd = Number(item.gargalo_qtd || 0);
    var pontos = calcularPesoProblemas(item);
    var pctGargalo = totalAlertas > 0 && gargaloQtd > 0
      ? Math.round((gargaloQtd / totalAlertas) * 100)
      : 0;

    var nivel = 'estavel';
    var selo = 'Estável';
    var titulo = 'Operação estável';
    var detalhe = '';

    if (totalMaquinas === 0 && totalAlertas === 0) {
      nivel = 'sem-dados';
      selo = 'Sem dados';
      titulo = 'Sem servidores monitorados';
      detalhe = 'Aguardando equipamentos PACS';
    } else if (totalAlertas === 0) {
      nivel = 'estavel';
      selo = 'Estável';
      titulo = 'Operação estável';
      detalhe = totalMaquinas + ' servidor(es) PACS sem alertas';
    } else if (bloqueios > 0 || servidoresCriticos > 0 || (criticos >= 2 && chamadosAbertos > 0)) {
      nivel = 'alto';
      selo = 'Problemático';
      titulo = 'Foco em ' + gargalo + (gargaloQtd > 0 ? (' (' + gargaloQtd + ' de ' + totalAlertas + ' alertas — ' + pctGargalo + '%)') : '');
      var partesAlto = [];
      if (bloqueios > 0) partesAlto.push(bloqueios + ' bloqueio' + (bloqueios === 1 ? '' : 's'));
      if (criticos > 0) partesAlto.push(criticos + ' crítico' + (criticos === 1 ? '' : 's'));
      if (chamadosAbertos > 0) partesAlto.push(chamadosAbertos + ' chamado' + (chamadosAbertos === 1 ? '' : 's') + ' aberto' + (chamadosAbertos === 1 ? '' : 's'));
      if (servidoresCriticos > 0) partesAlto.push(servidoresCriticos + '/' + totalMaquinas + ' PACS afetado' + (servidoresCriticos === 1 ? '' : 's'));
      detalhe = partesAlto.join(' · ');
    } else if (criticos > 0 || chamadosAbertos > 0) {
      nivel = 'medio';
      selo = 'Atenção';
      titulo = 'Incidentes em ' + gargalo + (gargaloQtd > 0 ? (' (' + gargaloQtd + ' de ' + totalAlertas + ' alertas — ' + pctGargalo + '%)') : '');
      if (chamadosAbertos === 0 && servidoresCriticos === 0) {
        detalhe = criticos + ' crítico(s) já resolvido(s) · Sem fila aberta';
      } else {
        var partesMedio = [];
        if (criticos > 0) partesMedio.push(criticos + ' crítico(s)');
        if (chamadosAbertos > 0) partesMedio.push(chamadosAbertos + ' chamado(s) aberto(s)');
        detalhe = partesMedio.join(' · ');
      }
    } else {
      nivel = 'estavel';
      selo = 'Estável';
      titulo = 'Alertas preventivos (' + gargalo + ')';
      detalhe = 'Sem bloqueios ou chamados pendentes';
    }

    return {
      nivel: nivel,
      selo: selo,
      titulo: titulo,
      detalhe: detalhe,
      pontos: pontos,
      pctGargalo: pctGargalo,
      textoCsv: titulo + ' - ' + detalhe
    };
  }

  function ordenarListaCarteira(lista) {
    var copia = lista.slice();
    copia.sort(function (a, b) {
      if (ordenacaoCarteiraAtual === 'antigos') {
        var temA = a.dias_casa != null;
        var temB = b.dias_casa != null;
        if (temA !== temB) return temA ? -1 : 1;
        if (temA && temB) {
          var diffDias = Number(b.dias_casa) - Number(a.dias_casa);
          if (diffDias !== 0) return diffDias;
        }
        return Number(a.hospital_id) - Number(b.hospital_id);
      }

      if (ordenacaoCarteiraAtual === 'chamados') {
        var diffCh = Number(b.chamados_abertos || 0) - Number(a.chamados_abertos || 0);
        if (diffCh !== 0) return diffCh;
        var diffTot = Number(b.total_alertas || 0) - Number(a.total_alertas || 0);
        if (diffTot !== 0) return diffTot;
        return String(a.nome_cliente || '').localeCompare(String(b.nome_cliente || ''), 'pt-BR');
      }

      if (ordenacaoCarteiraAtual === 'servidores') {
        var diffSrv = Number(b.total_maquinas || 0) - Number(a.total_maquinas || 0);
        if (diffSrv !== 0) return diffSrv;
        return String(a.nome_cliente || '').localeCompare(String(b.nome_cliente || ''), 'pt-BR');
      }

      // Padrão: Mais problemáticos
      var diffPeso = calcularPesoProblemas(b) - calcularPesoProblemas(a);
      if (diffPeso !== 0) return diffPeso;
      var diffBloq = Number(b.alertas_bloqueio || 0) - Number(a.alertas_bloqueio || 0);
      if (diffBloq !== 0) return diffBloq;
      var diffCrit = Number(b.alertas_criticos || 0) - Number(a.alertas_criticos || 0);
      if (diffCrit !== 0) return diffCrit;
      return String(a.nome_cliente || '').localeCompare(String(b.nome_cliente || ''), 'pt-BR');
    });
    return copia;
  }

  function obterCarteiraFiltradaEOrdenada() {
    var iptEl = document.getElementById('ipt-busca-hospital');
    var busca = (iptEl ? iptEl.value : '').trim().toLowerCase();
    var filtrados = dadosCarteira.filter(function (item) {
      if (escopoAtual !== 'todos' && item.nome_cliente !== escopoAtual) return false;
      if (busca) {
        var texto = [
          item.nome_cliente,
          item.cnpj,
          item.principal_gargalo
        ].join(' ').toLowerCase();
        if (texto.indexOf(busca) === -1) return false;
      }
      return true;
    });
    return ordenarListaCarteira(filtrados);
  }

  function formatarBadgeAntiguidade(item) {
    if (!item.cliente_desde) {
      return '<span class="cell-primary">Sem telemetria</span><span class="cell-sub">Recém-cadastrado</span>';
    }
    var dias = Number(item.dias_casa || 0);
    return '<span class="cell-primary">' + escaparHtml(item.cliente_desde) + '</span>' +
      '<span class="cell-sub">há ' + dias + ' dia' + (dias === 1 ? '' : 's') + '</span>';
  }

  function renderizarRelatorioCarteira() {
    var tbody = document.getElementById('tbody-relatorio-carteira');
    if (!tbody) return;

    var lista = obterCarteiraFiltradaEOrdenada();
    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Nenhum hospital encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = lista
      .map(function (item) {
        var nomeEsc = escaparHtml(item.nome_cliente);
        var bloqueios = Number(item.alertas_bloqueio || 0);
        var criticos = Number(item.alertas_criticos || 0);
        var atencao = Number(item.alertas_atencao || 0);
        var chamadosAbertos = Number(item.chamados_abertos || 0);
        var totalAlertasHosp = Number(item.total_alertas || 0);
        var diag = montarDiagnosticoCliente(item);
        var motivoHtml = totalAlertasHosp > 0
          ? '<div class="motivo-top">' +
              '<span class="gargalo-tag">' + escaparHtml(diag.titulo) + '</span>' +
              '<span class="motivo-score ' + diag.nivel + '">' + totalAlertasHosp + ' alerta' + (totalAlertasHosp === 1 ? '' : 's') + ' · ' + diag.pontos + ' pts</span>' +
            '</div>' +
            '<span class="cell-sub">' + escaparHtml(diag.detalhe) + '</span>'
          : '<div class="motivo-top">' +
              '<span class="status-pill ' + (diag.nivel === 'estavel' ? 'delivered' : 'none') + '">' + escaparHtml(diag.selo) + '</span>' +
            '</div>' +
            '<span class="cell-sub">' + escaparHtml(diag.detalhe) + '</span>';
        var mttrTexto = formatarMinutos(item.mttr_minutos);
        var linhaCritica = (bloqueios > 0 || Number(item.servidores_criticos || 0) > 0);

        return (
          '<tr class="' + (linhaCritica ? 'row-divergencia ' : '') + 'row-clickable" data-hospital="' + nomeEsc + '" title="Clique para ver detalhes e chamados deste hospital">' +
            '<td><strong>' + nomeEsc + '</strong><span class="cell-sub">' + escaparHtml(item.email || '--') + '</span></td>' +
            '<td>' + formatarBadgeAntiguidade(item) + '</td>' +
            '<td>' + Number(item.total_maquinas || 0) + '</td>' +
            '<td>' +
              '<span class="kpi-badge ' + (bloqueios > 0 ? 'bloqueio' : 'up') + '">' + bloqueios + ' Bloq.</span> ' +
              '<span class="kpi-badge ' + (criticos > 0 ? 'critical' : 'up') + '">' + criticos + ' Crít.</span>' +
            '</td>' +
            '<td>' + atencao + '</td>' +
            '<td><span class="kpi-badge ' + (chamadosAbertos > 0 ? 'warn' : 'up') + '">' + chamadosAbertos + '</span></td>' +
            '<td>' + motivoHtml + '</td>' +
            '<td><strong>' + escaparHtml(mttrTexto) + '</strong></td>' +
          '</tr>'
        );
      })
      .join('');
  }

  // ------------------------------------------------------------------
  // TELA 2 — Card 2: Histórico de Incidentes & Chamados da Carteira
  // ------------------------------------------------------------------
  function obterIncidentesNoEscopo() {
    return escopoAtual === 'todos'
      ? historicoIncidentes
      : historicoIncidentes.filter(function (r) {
          return r.nome_cliente === escopoAtual;
        });
  }

  function obterIncidentesFiltrados() {
    var noEscopo = obterIncidentesNoEscopo();
    var iptBuscaEl = document.getElementById('ipt-busca-incidente');
    var busca = (iptBuscaEl ? iptBuscaEl.value : '').trim().toLowerCase();

    return noEscopo.filter(function (r) {
      if (filtroIncidenteAtual === 'criticos' && r.severidade !== 'Crítico' && r.severidade !== 'Bloqueio') {
        return false;
      }
      if (filtroIncidenteAtual === 'abertos' && r.status_chamado !== 'Aberto' && r.status_chamado !== 'Em Andamento') {
        return false;
      }
      if (filtroIncidenteAtual === 'finalizados' && r.status_chamado !== 'Finalizado') {
        return false;
      }

      if (busca) {
        var texto = [
          '#' + r.alerta_id,
          r.chamado_id ? ('#' + r.chamado_id) : '',
          r.nome_cliente,
          r.servidor_fabricante,
          r.mac_adress,
          r.componente,
          r.severidade,
          r.status_chamado
        ].join(' ').toLowerCase();
        if (texto.indexOf(busca) === -1) return false;
      }
      return true;
    });
  }

  function renderizarBadgeSeveridade(severidade) {
    if (severidade === 'Bloqueio') {
      return '<span class="kpi-badge bloqueio">Bloqueio</span>';
    }
    if (severidade === 'Crítico') {
      return '<span class="kpi-badge critical">Crítico</span>';
    }
    return '<span class="kpi-badge warn">' + escaparHtml(severidade || 'Atenção') + '</span>';
  }

  function renderizarPillStatusChamado(status, chamadoId) {
    var prefixo = chamadoId ? ('#' + Number(chamadoId) + ' · ') : '';
    if (status === 'Finalizado') {
      return '<span class="status-pill delivered">' + prefixo + 'Finalizado</span>';
    }
    if (status === 'Em Andamento') {
      return '<span class="status-pill in-progress">' + prefixo + 'Em Andamento</span>';
    }
    if (status === 'Aberto') {
      return '<span class="status-pill open-ticket">' + prefixo + 'Aberto</span>';
    }
    if (status === 'Cancelado') {
      return '<span class="status-pill canceled">' + prefixo + 'Cancelado</span>';
    }
    return '<span class="status-pill none">Sem Chamado</span>';
  }

  function formatarResolucaoSla(r) {
    if (r.status_chamado === 'Finalizado') {
      return '<span class="cell-primary">' + escaparHtml(formatarMinutos(r.tempo_resolucao_min)) + '</span>' +
        '<span class="cell-sub">Encerrado</span>';
    }
    if (r.status_chamado === 'Aberto' || r.status_chamado === 'Em Andamento') {
      return '<span class="cell-primary">Em atendimento</span>' +
        '<span class="cell-sub">Alerta #' + Number(r.alerta_id) + '</span>';
    }
    if (r.status_chamado === 'Cancelado') {
      return '<span class="cell-sub">Chamado cancelado</span>';
    }
    return '<span class="cell-sub">Monitoramento preventivo</span>';
  }

  function renderizarHistoricoIncidentes() {
    var tbody = document.getElementById('tbody-historico-incidentes');
    if (!tbody) return;

    var filtrados = obterIncidentesFiltrados();
    if (filtrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhum incidente encontrado com os filtros atuais.</td></tr>';
      return;
    }

    tbody.innerHTML = filtrados
      .map(function (r) {
        var destaqueCritico = (r.severidade === 'Bloqueio' || r.severidade === 'Crítico') &&
          (r.status_chamado === 'Aberto' || r.status_chamado === 'Em Andamento' || r.status_chamado === 'Sem Chamado');
        return (
          '<tr class="' + (destaqueCritico ? 'row-divergencia' : '') + '">' +
            '<td>' + escaparHtml(formatarHorarioCurto(r.horario_alerta)) + '</td>' +
            '<td>' +
              '<span class="cell-primary">' + escaparHtml(r.nome_cliente || '--') + '</span>' +
              '<span class="cell-sub">' + escaparHtml(r.servidor_fabricante || 'PACS') + ' · ' + escaparHtml(r.mac_adress || '') + '</span>' +
            '</td>' +
            '<td>' +
              '<span class="cell-primary">' + escaparHtml(r.componente || '--') + '</span>' +
              '<span class="cell-sub">Leitura: ' + Number(r.valor_leitura || 0) + escaparHtml(r.unidade_medida || '') + '</span>' +
            '</td>' +
            '<td>' + renderizarBadgeSeveridade(r.severidade) + '</td>' +
            '<td>' + renderizarPillStatusChamado(r.status_chamado, r.chamado_id) + '</td>' +
            '<td>' + formatarResolucaoSla(r) + '</td>' +
          '</tr>'
        );
      })
      .join('');
  }

  var tbodyRelatorio = document.getElementById('tbody-relatorio-carteira');
  if (tbodyRelatorio) {
    tbodyRelatorio.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-hospital]');
      if (tr) abrirModalHospital(tr.dataset.hospital);
    });
  }

  var selOrdenarCarteira = document.getElementById('sel-ordenar-carteira');
  if (selOrdenarCarteira) {
    selOrdenarCarteira.addEventListener('change', function () {
      ordenacaoCarteiraAtual = selOrdenarCarteira.value || 'problematicos';
      renderizarRelatorioCarteira();
    });
  }

  var iptBuscaHospital = document.getElementById('ipt-busca-hospital');
  if (iptBuscaHospital) iptBuscaHospital.addEventListener('input', renderizarRelatorioCarteira);

  document.querySelectorAll('[data-filtro-incidente]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      filtroIncidenteAtual = btn.dataset.filtroIncidente || 'criticos';
      document.querySelectorAll('[data-filtro-incidente]').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      renderizarHistoricoIncidentes();
    });
  });

  var iptBuscaIncidente = document.getElementById('ipt-busca-incidente');
  if (iptBuscaIncidente) iptBuscaIncidente.addEventListener('input', renderizarHistoricoIncidentes);

  // ------------------------------------------------------------------
  // Modal de detalhes do hospital
  // ------------------------------------------------------------------
  var modalOverlay = document.getElementById('modal-hospital');
  var hospitalAbertoNoModal = null;

  function abrirModalHospital(nomeHospital) {
    var hosp = null;
    for (var i = 0; i < dadosCarteira.length; i++) {
      if (dadosCarteira[i].nome_cliente === nomeHospital) {
        hosp = dadosCarteira[i];
        break;
      }
    }
    if (!hosp || !modalOverlay) return;
    hospitalAbertoNoModal = nomeHospital;

    var desdeTxt = hosp.cliente_desde
      ? ('Monitorado desde ' + hosp.cliente_desde + ' (' + Number(hosp.dias_casa || 0) + ' dias)')
      : 'Sem telemetria histórica';
    var gargaloTxt = hosp.principal_gargalo ? (' · Gargalo: ' + hosp.principal_gargalo) : '';

    var totalAlertasModal = Number(hosp.total_alertas || 0);
    var servCritModal = Number(hosp.servidores_criticos || 0);
    var bloqModal = Number(hosp.alertas_bloqueio || 0);
    var critModal = Number(hosp.alertas_criticos || 0);
    var atenModal = Number(hosp.alertas_atencao || 0);
    var chSomAberto = Number(hosp.chamados_somente_abertos || 0);
    var chAndamento = Number(hosp.chamados_em_andamento || 0);
    var chFin = Number(hosp.chamados_finalizados || 0);
    var chCanc = Number(hosp.chamados_cancelados || 0);
    var totalChamadosHosp = chSomAberto + chAndamento + chFin + chCanc;

    definirTexto('modal-hosp-nome', hosp.nome_cliente);
    definirTexto('modal-hosp-meta', 'CNPJ: ' + (hosp.cnpj || '--') + ' · ' + desdeTxt + gargaloTxt);
    definirTexto('modal-hosp-maquinas', Number(hosp.total_maquinas || 0));
    definirTexto('modal-hosp-maquinas-sub', servCritModal > 0 ? (servCritModal + ' com incidente ativo') : 'Operação normal');
    definirTexto('modal-hosp-alertas', totalAlertasModal);
    definirTexto('modal-hosp-alertas-sub', totalAlertasModal > 0 ? (bloqModal + ' Bloq · ' + critModal + ' Crít · ' + atenModal + ' Aten') : 'Sem alertas');
    definirTexto('modal-hosp-abertos', totalChamadosHosp);
    if (totalChamadosHosp === 0) {
      definirTexto('modal-hosp-chamados-sub', 'Nenhum chamado registrado');
    } else {
      var resumoCh = [
        chSomAberto + ' Aberto' + (chSomAberto === 1 ? '' : 's'),
        chAndamento + ' Em Andamento',
        chFin + ' Finalizado' + (chFin === 1 ? '' : 's')
      ];
      if (chCanc > 0) {
        resumoCh.push(chCanc + ' Cancelado' + (chCanc === 1 ? '' : 's'));
      }
      definirTexto('modal-hosp-chamados-sub', resumoCh.join(' · '));
    }
    definirTexto('modal-hosp-mttr', formatarMinutos(hosp.mttr_minutos));
    definirTexto('modal-hosp-mttr-sub', chFin > 0 ? (chFin + ' chamado(s) finalizado(s)') : 'Sem finalizados');

    var diagModal = montarDiagnosticoCliente(hosp);
    var boxDiagModal = document.getElementById('modal-hosp-diagnostico');
    if (boxDiagModal) {
      boxDiagModal.className = 'modal-diagnostico-box ' + diagModal.nivel;
      boxDiagModal.innerHTML =
        '<div>' +
          '<strong>' + escaparHtml(diagModal.selo) + ' — ' + escaparHtml(diagModal.titulo) + '</strong>' +
          '<small>' + escaparHtml(diagModal.detalhe) + '</small>' +
        '</div>' +
        '<span class="motivo-score ' + diagModal.nivel + '">' + totalAlertasModal + ' alertas · Índice: ' + diagModal.pontos + ' pts (Bloq×3 + Crít×2 + Aten×1)</span>';
      boxDiagModal.style.display = 'flex';
    }

    var incidentesHosp = historicoIncidentes.filter(function (r) {
      return r.nome_cliente === nomeHospital;
    });
    var tbodyModal = document.getElementById('tbody-modal-hospital-incidentes');

    if (tbodyModal) {
      if (incidentesHosp.length === 0) {
        tbodyModal.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhum alerta ou chamado registrado para este hospital.</td></tr>';
      } else {
        tbodyModal.innerHTML = incidentesHosp
          .map(function (r) {
            return (
              '<tr>' +
                '<td>' + escaparHtml(formatarHorarioCurto(r.horario_alerta)) + '</td>' +
                '<td>' +
                  '<span class="cell-primary">' + escaparHtml(r.servidor_fabricante || 'PACS') + ' (' + escaparHtml(r.componente) + ')</span>' +
                  '<span class="cell-sub">Alerta #' + Number(r.alerta_id) + ' · ' + escaparHtml(r.mac_adress) + ' · ' + Number(r.valor_leitura || 0) + escaparHtml(r.unidade_medida || '') + '</span>' +
                '</td>' +
                '<td>' + renderizarBadgeSeveridade(r.severidade) + '</td>' +
                '<td>' + renderizarPillStatusChamado(r.status_chamado, r.chamado_id) + '</td>' +
                '<td>' + formatarResolucaoSla(r) + '</td>' +
              '</tr>'
            );
          })
          .join('');
      }
    }

    modalOverlay.style.display = 'flex';
  }

  function fecharModalHospital() {
    hospitalAbertoNoModal = null;
    if (modalOverlay) modalOverlay.style.display = 'none';
  }

  var btnFecharModal = document.getElementById('btn-fechar-modal');
  if (btnFecharModal) btnFecharModal.addEventListener('click', fecharModalHospital);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) fecharModalHospital();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') fecharModalHospital();
  });

  // ------------------------------------------------------------------
  // TELA 2 — Exportações (CSV e PDF)
  // ------------------------------------------------------------------
  function csvCelula(valor) {
    return '"' + String(valor == null ? '' : valor).replace(/"/g, '""') + '"';
  }

  function baixarCsv(nomeArquivo, cabecalho, linhas) {
    var todasLinhas = [cabecalho].concat(linhas);
    var conteudo = '\uFEFF' + todasLinhas.map(function (l) { return l.join(';'); }).join('\n');
    var url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8;' }));
    var link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  document.getElementById('btn-exportar-csv').addEventListener('click', function () {
    var listaExportar = obterCarteiraFiltradaEOrdenada();
    if (!listaExportar.length) return;

    var cabecalho = [
      'Hospital',
      'CNPJ',
      'Email',
      'Monitorado Desde',
      'Dias de Casa',
      'Servidores PACS',
      'Bloqueio',
      'Criticos',
      'Atencao',
      'Total Alertas',
      'Chamados Abertos',
      'Chamados Finalizados',
      'Principal Gargalo',
      'Indice Criticidade',
      'Motivo Principal',
      'MTTR (min)'
    ];
    var linhas = listaExportar.map(function (r) {
      var diagCsv = montarDiagnosticoCliente(r);
      return [
        csvCelula(r.nome_cliente),
        '"\'' + (r.cnpj || '') + '"',
        csvCelula(r.email),
        csvCelula(r.cliente_desde || 'Sem telemetria'),
        r.dias_casa != null ? Number(r.dias_casa) : '',
        Number(r.total_maquinas || 0),
        Number(r.alertas_bloqueio || 0),
        Number(r.alertas_criticos || 0),
        Number(r.alertas_atencao || 0),
        Number(r.total_alertas || 0),
        Number(r.chamados_abertos || 0),
        Number(r.chamados_finalizados || 0),
        csvCelula(r.principal_gargalo || 'Sem alertas'),
        diagCsv.pontos,
        csvCelula(diagCsv.textoCsv),
        r.mttr_minutos != null ? Number(r.mttr_minutos) : ''
      ];
    });

    baixarCsv('relatorio-carteira-magnasync-' + new Date().toISOString().slice(0, 10) + '.csv', cabecalho, linhas);
  });

  var btnExportarIncidentesCsv = document.getElementById('btn-exportar-incidentes-csv');
  if (btnExportarIncidentesCsv) {
    btnExportarIncidentesCsv.addEventListener('click', function () {
      var listaIncidentes = obterIncidentesFiltrados();
      if (!listaIncidentes.length) return;

      var cabecalho = [
        'Horario',
        'AlertaId',
        'Hospital',
        'Servidor',
        'MAC',
        'Componente',
        'Valor',
        'Unidade',
        'Severidade',
        'ChamadoId',
        'StatusChamado',
        'TempoResolucaoMin'
      ];
      var linhas = listaIncidentes.map(function (r) {
        return [
          csvCelula(r.horario_alerta),
          Number(r.alerta_id),
          csvCelula(r.nome_cliente),
          csvCelula(r.servidor_fabricante),
          csvCelula(r.mac_adress),
          csvCelula(r.componente),
          Number(r.valor_leitura || 0),
          csvCelula(r.unidade_medida || ''),
          csvCelula(r.severidade),
          r.chamado_id != null ? Number(r.chamado_id) : '',
          csvCelula(r.status_chamado || 'Sem Chamado'),
          r.tempo_resolucao_min != null ? Number(r.tempo_resolucao_min) : ''
        ];
      });

      baixarCsv('historico-incidentes-magnasync-' + new Date().toISOString().slice(0, 10) + '.csv', cabecalho, linhas);
    });
  }

  document.getElementById('btn-imprimir-pdf').addEventListener('click', function () {
    definirTexto('print-timestamp', 'Emitido em ' + new Date().toLocaleString('pt-BR') + ' · Admin Geral MagnaSync');
    window.print();
  });

  // ------------------------------------------------------------------
  // TELA 3 — Cadastrar hospital + representante (POST /hospital + /usuarios)
  // ------------------------------------------------------------------
  var campos = {
    nome: document.getElementById('hosp-nome'),
    cnpj: document.getElementById('hosp-cnpj'),
    telefone: document.getElementById('hosp-telefone'),
    email: document.getElementById('hosp-email'),
    cep: document.getElementById('hosp-cep'),
    numero: document.getElementById('hosp-numero'),
    representante: document.getElementById('hosp-representante'),
    senha: document.getElementById('hosp-senha')
  };
  var timerFeedback = null;

  function configurarToggleSenha(botaoId, inputEl) {
    var btn = document.getElementById(botaoId);
    if (!btn || !inputEl) return;
    btn.addEventListener('click', function () {
      var mostrar = inputEl.getAttribute('type') === 'password';
      inputEl.setAttribute('type', mostrar ? 'text' : 'password');
      btn.innerHTML = mostrar ? '&#128584;' : '&#128065;';
    });
  }

  function mostrarFeedbackHospital(texto, tipo) {
    var box = document.getElementById('hospital-feedback');
    box.className = 'feedback-box ' + tipo;
    box.textContent = texto;
    box.style.display = 'flex';
    clearTimeout(timerFeedback);
    timerFeedback = setTimeout(function () {
      box.style.display = 'none';
    }, 5000);
  }

  function limparFormularioHospital() {
    Object.keys(campos).forEach(function (k) {
      if (campos[k]) campos[k].value = '';
    });
  }

  function cadastrarHospital() {
    var v = {};
    Object.keys(campos).forEach(function (k) {
      var val = campos[k] ? campos[k].value : '';
      v[k] = k === 'senha' ? val : val.trim();
    });

    if (!v.nome || !v.cnpj || !v.telefone || !v.email || !v.cep || !v.numero || !v.representante || !v.senha) {
      return mostrarFeedbackHospital('Preencha todos os campos obrigatórios.', 'error');
    }
    if (!/^\d{14}$/.test(v.cnpj)) return mostrarFeedbackHospital('CNPJ inválido: digite os 14 números.', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return mostrarFeedbackHospital('Informe um e-mail válido.', 'error');
    if (!/^\d{8}$/.test(v.cep)) return mostrarFeedbackHospital('CEP inválido: digite os 8 números.', 'error');
    if (v.senha.length < 6) return mostrarFeedbackHospital('A senha deve ter no mínimo 6 caracteres.', 'error');

    fetch('/hospital/cadastrarHospital', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nomeServer: v.nome,
        cnpjServer: v.cnpj,
        telefoneServer: v.telefone,
        emailServer: v.email,
        cepServer: v.cep,
        numeroServer: v.numero
      })
    })
      .then(function (respHospital) {
        if (!respHospital.ok) {
          return respHospital.text().then(function (txt) {
            throw new Error(txt || ('HTTP ' + respHospital.status));
          });
        }
        return respHospital.json();
      })
      .then(function (dadosHospital) {
        if (dadosHospital && dadosHospital.insertId) {
          return fetch('/usuarios/cadastrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nomeServer: v.representante,
              emailServer: v.email,
              senhaServer: v.senha,
              idHospitalVincularServer: dadosHospital.insertId,
              cargoServer: 3
            })
          }).then(function (respUsuario) {
            if (!respUsuario.ok) {
              throw new Error('Hospital cadastrado, mas houve erro ao vincular o representante.');
            }
          });
        }
      })
      .then(function () {
        limparFormularioHospital();
        mostrarFeedbackHospital('Hospital e representante cadastrados com sucesso!', 'success');
        carregarDashboard();
      })
      .catch(function (erro) {
        console.error(erro);
        mostrarFeedbackHospital(erro.message || 'Não foi possível cadastrar o hospital. Tente novamente.', 'error');
      });
  }

  configurarToggleSenha('toggle-hosp-senha', campos.senha);
  document.getElementById('btn-cadastrar-hospital').addEventListener('click', cadastrarHospital);
  document.getElementById('btn-limpar-hospital').addEventListener('click', limparFormularioHospital);

  // ------------------------------------------------------------------
  // Carregamento periódico (dados reais do MySQL)
  // ------------------------------------------------------------------
  function carregarDashboard() {
    return Promise.all([
      buscarJson('/dashboardDaniel/kpis'),
      buscarJson('/dashboardDaniel/ranking-incidentes'),
      buscarJson('/dashboardDaniel/alertas-vs-resolvidos'),
      buscarJson('/dashboardDaniel/situacao-chamados'),
      buscarJson('/dashboardDaniel/relatorio-carteira'),
      buscarJson('/dashboardDaniel/historico-incidentes')
    ])
      .then(function (resultados) {
        kpisGlobais = resultados[0];
        rankingGlobal = Array.isArray(resultados[1]) ? resultados[1] : [];
        timelineGlobal = Array.isArray(resultados[2]) ? resultados[2] : [];
        situacaoGlobal = resultados[3];
        dadosCarteira = Array.isArray(resultados[4]) ? resultados[4] : [];
        historicoIncidentes = Array.isArray(resultados[5]) ? resultados[5] : [];

        atualizarOpcoesSeletor();
        aplicarEscopoOverview();
        renderizarRelatorioCarteira();
        renderizarHistoricoIncidentes();
        if (hospitalAbertoNoModal) abrirModalHospital(hospitalAbertoNoModal);
      })
      .catch(function (erro) {
        console.error('Erro ao carregar a dashboard:', erro);
      });
  }

  atualizarPerfilSidebar();
  switchView(window.location.hash.replace('#', ''));
  carregarDashboard();
  setInterval(carregarDashboard, INTERVALO_MS);
});

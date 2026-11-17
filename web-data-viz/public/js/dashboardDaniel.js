/**
 * MagnaSync — Dashboard Executiva e de Auditoria ITIL (Admin Geral)
 * Arquivo: public/js/dashboardDaniel.js
 * Consome exclusivamente os endpoints /dashboardDaniel/* conectados ao MySQL.
 */

document.addEventListener('DOMContentLoaded', () => {
  const INTERVALO_MS = 5000;

  let rankingChart = null;
  let timelineChart = null;
  let roscaChart = null;

  let registrosAuditoria = [];
  let dadosRelatorio = [];
  let filtroAtual = 'todos';

  // -------------------------------------------------------------------------
  // Perfil na Sidebar (compatível com sessionStorage do login)
  // -------------------------------------------------------------------------
  function atualizarPerfilSidebar() {
    const nomeUsuario = sessionStorage.getItem('NOME_USUARIO') || 'Admin Geral MagnaSync';
    const cargoUsuario = sessionStorage.getItem('CARGO_USUARIO') || 'Governança SaaS & ITIL';

    const elNome = document.getElementById('sidebar-user-name');
    const elCargo = document.getElementById('sidebar-user-role');
    const elAvatar = document.getElementById('sidebar-user-avatar');

    if (elNome) elNome.textContent = nomeUsuario;
    if (elCargo) elCargo.textContent = cargoUsuario;
    if (elAvatar) {
      const partes = nomeUsuario.trim().split(/\s+/);
      const iniciais = (partes[0][0] || 'A') + (partes.length > 1 ? partes[partes.length - 1][0] : '');
      elAvatar.textContent = iniciais.toUpperCase();
    }
  }

  // -------------------------------------------------------------------------
  // Navegação entre Views (#overview e #relatorio)
  // -------------------------------------------------------------------------
  const views = {
    overview: document.getElementById('view-overview'),
    relatorio: document.getElementById('view-relatorio')
  };
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');

  function switchView(targetView) {
    if (!views[targetView]) {
      targetView = 'overview';
    }

    Object.keys(views).forEach((key) => {
      if (views[key]) {
        views[key].style.display = key === targetView ? 'flex' : 'none';
      }
    });

    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        link.classList.toggle('active', href === `#${targetView}`);
      }
    });
  }

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = href.substring(1);
        window.location.hash = target;
        switchView(target);
      });
    }
  });

  function syncHash() {
    const rawHash = (window.location.hash || '').replace('#', '').trim();
    switchView(views[rawHash] ? rawHash : 'overview');
  }

  window.addEventListener('hashchange', syncHash);

  // Escapa textos vindos do banco antes de injetar via innerHTML
  function escaparHtml(valor) {
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizarLinha(linha) {
    const copia = {};
    Object.keys(linha).forEach((chave) => {
      copia[chave] = typeof linha[chave] === 'string' ? escaparHtml(linha[chave]) : linha[chave];
    });
    return copia;
  }

  // -------------------------------------------------------------------------
  // Helper Fetch JSON
  // -------------------------------------------------------------------------
  async function buscarJson(url) {
    const resposta = await fetch(url);
    if (!resposta.ok) {
      throw new Error(`Erro HTTP ${resposta.status} ao consultar ${url}`);
    }
    return resposta.json();
  }

  // -------------------------------------------------------------------------
  // 1. Renderizar 4 KPIs Globais
  // -------------------------------------------------------------------------
  function renderizarKpis(kpis) {
    if (!kpis) return;

    const clientesAtivos = Number(kpis.total_clientes_ativos || 0);
    const parqueTotal = Number(kpis.parque_total_monitorado || 0);
    const clientesCriticos = Number(kpis.clientes_estado_critico || 0);
    const volume24h = Number(kpis.volume_chamados_24h || 0);
    const divergencias = Number(kpis.divergencias_ativas || 0);

    document.getElementById('kpi-clientes-ativos').textContent = clientesAtivos;
    document.getElementById('kpi-parque-total').textContent = parqueTotal;
    document.getElementById('kpi-clientes-criticos').textContent = clientesCriticos;
    document.getElementById('kpi-volume-24h').textContent = volume24h;

    const badgeCriticos = document.getElementById('kpi-criticos-badge');
    if (badgeCriticos) {
      if (clientesCriticos > 0) {
        badgeCriticos.textContent = 'Crítico';
        badgeCriticos.className = 'kpi-badge critical';
      } else {
        badgeCriticos.textContent = 'Estável';
        badgeCriticos.className = 'kpi-badge up';
      }
    }

    const badgeDivergencias = document.getElementById('kpi-divergencias-badge');
    if (badgeDivergencias) {
      badgeDivergencias.textContent = `${divergencias} divergência${divergencias === 1 ? '' : 's'}`;
      badgeDivergencias.className = divergencias > 0 ? 'kpi-badge critical' : 'kpi-badge up';
    }
  }

  // -------------------------------------------------------------------------
  // 2. Gráfico 1: Ranking de Clientes por Incidentes (Barras Horizontais)
  // -------------------------------------------------------------------------
  function renderizarRankingIncidentes(lista) {
    const canvas = document.getElementById('chartRankingIncidentes');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = lista.map((item) => item.hospital_nome);
    const criticos = lista.map((item) => Number(item.criticos || 0));
    const atencao = lista.map((item) => Number(item.atencao || 0));

    if (!rankingChart) {
      rankingChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Crítico',
              data: criticos,
              backgroundColor: '#dc2626',
              borderRadius: 4,
              barPercentage: 0.72
            },
            {
              label: 'Atenção',
              data: atencao,
              backgroundColor: '#f59e0b',
              borderRadius: 4,
              barPercentage: 0.72
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
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
            },
            tooltip: {
              backgroundColor: '#0B192C',
              padding: 10,
              cornerRadius: 6
            }
          },
          scales: {
            x: {
              stacked: true,
              beginAtZero: true,
              ticks: { stepSize: 1, color: '#8a9dbf', font: { size: 11 } },
              grid: { color: 'rgba(39, 62, 99, 0.08)' }
            },
            y: {
              stacked: true,
              ticks: { color: '#273E63', font: { size: 11, weight: '600' } },
              grid: { display: false }
            }
          }
        }
      });
    } else {
      rankingChart.data.labels = labels;
      rankingChart.data.datasets[0].data = criticos;
      rankingChart.data.datasets[1].data = atencao;
      rankingChart.update('none');
    }
  }

  // -------------------------------------------------------------------------
  // 3. Gráfico 2: Alertas Gerados vs. Entregues com Sucesso (Linha Dupla)
  // -------------------------------------------------------------------------
  function renderizarGeradosVsEntregues(serie) {
    const canvas = document.getElementById('chartGeradosVsEntregues');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = serie.map((item) => item.janela_hora);
    const gerados = serie.map((item) => Number(item.alertas_gerados || 0));
    const entregues = serie.map((item) => Number(item.alertas_entregues || 0));

    if (!timelineChart) {
      const ctx = canvas.getContext('2d');
      const gradGerados = ctx.createLinearGradient(0, 0, 0, 230);
      gradGerados.addColorStop(0, 'rgba(26, 74, 135, 0.28)');
      gradGerados.addColorStop(1, 'rgba(26, 74, 135, 0.0)');

      const gradEntregues = ctx.createLinearGradient(0, 0, 0, 230);
      gradEntregues.addColorStop(0, 'rgba(16, 185, 129, 0.24)');
      gradEntregues.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

      timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Alertas Gerados no Sistema',
              data: gerados,
              borderColor: '#1A4A87',
              backgroundColor: gradGerados,
              fill: true,
              tension: 0.35,
              borderWidth: 2.5,
              pointRadius: 3.5,
              pointBackgroundColor: '#1A4A87',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 1.5
            },
            {
              label: 'Entregues com Sucesso',
              data: entregues,
              borderColor: '#10b981',
              backgroundColor: gradEntregues,
              fill: true,
              tension: 0.35,
              borderWidth: 2.5,
              pointRadius: 3.5,
              pointBackgroundColor: '#10b981',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 1.5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
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
            },
            tooltip: {
              backgroundColor: '#0B192C',
              padding: 10,
              cornerRadius: 6
            }
          },
          scales: {
            x: {
              ticks: { color: '#8a9dbf', font: { size: 11 } },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, color: '#8a9dbf', font: { size: 11 } },
              grid: { color: 'rgba(39, 62, 99, 0.08)' }
            }
          }
        }
      });
    } else {
      timelineChart.data.labels = labels;
      timelineChart.data.datasets[0].data = gerados;
      timelineChart.data.datasets[1].data = entregues;
      timelineChart.update('none');
    }
  }

  // -------------------------------------------------------------------------
  // 4. Gráfico 3: Auditoria de Chamados e Notificações (Rosca)
  // -------------------------------------------------------------------------
  function renderizarAuditoriaRosca(rosca) {
    if (!rosca) return;

    const entregues = Number(rosca.entregues_sucesso || 0);
    const abertos = Number(rosca.chamados_abertos || 0);
    const falhas = Number(rosca.retidos_falha || 0);
    const total = Number(rosca.total_auditado || entregues + abertos + falhas);

    const elTotal = document.getElementById('donut-total-auditoria');
    if (elTotal) elTotal.textContent = total;

    const itensLegenda = [
      { label: 'Entregues com Sucesso', valor: entregues, cor: '#10b981' },
      { label: 'Chamados em Aberto', valor: abertos, cor: '#1A4A87' },
      { label: 'Retidos por Falha/Divergência', valor: falhas, cor: '#dc2626' }
    ];

    const legendaEl = document.getElementById('auditoria-donut-legend');
    if (legendaEl) {
      legendaEl.innerHTML = itensLegenda
        .map(
          (item) =>
            `<li><span><i style="background:${item.cor}"></i>${item.label}</span><b>${item.valor}</b></li>`
        )
        .join('');
    }

    const canvas = document.getElementById('chartAuditoriaRosca');
    if (!canvas || typeof Chart === 'undefined') return;

    const valores = [entregues, abertos, falhas];

    if (!roscaChart) {
      roscaChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: itensLegenda.map((i) => i.label),
          datasets: [
            {
              data: valores,
              backgroundColor: itensLegenda.map((i) => i.cor),
              borderColor: '#ffffff',
              borderWidth: 2,
              hoverOffset: 5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: '#0B192C', padding: 10, cornerRadius: 6 }
          }
        }
      });
    } else {
      roscaChart.data.datasets[0].data = valores;
      roscaChart.update('none');
    }
  }

  // -------------------------------------------------------------------------
  // 5. Tabela de Auditoria de Divergências e Logs da Aplicação
  // -------------------------------------------------------------------------
  function ehDivergencia(registro) {
    return (
      Number(registro.enviado_sistema) === 1 && Number(registro.confirmado_entrega) === 0
    ) || registro.status_auditoria === 'FALHA_ENVIO';
  }

  function renderizarTabelaAuditoria() {
    const tbody = document.getElementById('tbody-auditoria-logs');
    if (!tbody) return;

    const termoBusca = (document.getElementById('ipt-busca-auditoria')?.value || '').trim().toLowerCase();

    const totalTodos = registrosAuditoria.length;
    const totalDivergencias = registrosAuditoria.filter(ehDivergencia).length;
    const totalEntregues = registrosAuditoria.filter((r) => !ehDivergencia(r)).length;

    const elCountTodos = document.getElementById('count-todos');
    const elCountDiv = document.getElementById('count-divergencias');
    const elCountEnt = document.getElementById('count-entregues');
    if (elCountTodos) elCountTodos.textContent = totalTodos;
    if (elCountDiv) elCountDiv.textContent = totalDivergencias;
    if (elCountEnt) elCountEnt.textContent = totalEntregues;

    const filtrados = registrosAuditoria.filter((item) => {
      const isDiv = ehDivergencia(item);
      if (filtroAtual === 'divergencias' && !isDiv) return false;
      if (filtroAtual === 'entregues' && isDiv) return false;

      if (!termoBusca) return true;
      const textoConcatenado = [
        item.alerta_id,
        item.nome_cliente,
        item.servidor_fabricante,
        item.mac_adress,
        item.componente,
        item.status_auditoria,
        item.log_aplicacao
      ]
        .join(' ')
        .toLowerCase();
      return textoConcatenado.includes(termoBusca);
    });

    if (filtrados.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="table-empty">Nenhum registro encontrado para o filtro selecionado.</td></tr>';
      return;
    }

    tbody.innerHTML = filtrados
      .map((item) => {
        const divergente = ehDivergencia(item);
        const statusSistemaBadge =
          Number(item.enviado_sistema) === 1
            ? '<span class="status-pill sent">Enviado (Sistema)</span>'
            : '<span class="status-pill failed">Não Enviado</span>';

        let statusRealBadge = '<span class="status-pill delivered">Entregue (ACK)</span>';
        let logClass = 'log-code log-ok';

        if (divergente) {
          statusRealBadge = '<span class="status-pill failed">Divergência / Falha</span>';
          logClass = 'log-code log-error';
        } else if (item.status_auditoria === 'CHAMADO_ABERTO') {
          statusRealBadge = '<span class="status-pill open-ticket">Chamado Aberto</span>';
          logClass = 'log-code log-ticket';
        }

        const badgeSeveridade =
          item.severidade === 'Crítico'
            ? '<span class="kpi-badge critical">Crítico</span>'
            : '<span class="kpi-badge warn">Atenção</span>';

        return `
          <tr class="${divergente ? 'row-divergencia' : ''}">
            <td>
              <span class="cell-primary">#${item.alerta_id}</span>
              ${badgeSeveridade}
            </td>
            <td>
              <span class="cell-primary">${item.nome_cliente}</span>
              <span class="cell-sub">${item.canal_destino || 'Slack / Jira'}</span>
            </td>
            <td>
              <span class="cell-primary">${item.servidor_fabricante || 'Servidor PACS'} (${item.componente})</span>
              <span class="cell-sub">${item.mac_adress} &middot; ${item.valor_leitura}${item.unidade_medida || ''}</span>
            </td>
            <td>
              <span class="cell-primary">${item.horario_alerta}</span>
              <span class="cell-sub">Auditado: ${item.horario_auditoria}</span>
            </td>
            <td>${statusSistemaBadge}</td>
            <td>${statusRealBadge}</td>
            <td><code class="${logClass}">${item.log_aplicacao}</code></td>
          </tr>
        `;
      })
      .join('');
  }

  // Eventos dos filtros da tabela de auditoria
  document.querySelectorAll('.filter-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filtroAtual = btn.dataset.filter || 'todos';
      renderizarTabelaAuditoria();
    });
  });

  const iptBusca = document.getElementById('ipt-busca-auditoria');
  if (iptBusca) {
    iptBusca.addEventListener('input', renderizarTabelaAuditoria);
  }

  // -------------------------------------------------------------------------
  // 6. Seção Relatório Executivo ITIL + Exportação CSV / PDF
  // -------------------------------------------------------------------------
  function renderizarRelatorioExecutivo(lista) {
    dadosRelatorio = Array.isArray(lista) ? lista : [];

    const totalMaquinas = dadosRelatorio.reduce((acc, r) => acc + Number(r.total_maquinas || 0), 0);
    const totalCriticos = dadosRelatorio.reduce((acc, r) => acc + Number(r.alertas_criticos || 0), 0);
    const totalAlertas = dadosRelatorio.reduce((acc, r) => acc + Number(r.total_alertas || 0), 0);
    const totalEntregas = dadosRelatorio.reduce((acc, r) => acc + Number(r.entregas_confirmadas || 0), 0);
    const totalDivergencias = dadosRelatorio.reduce((acc, r) => acc + Number(r.falhas_divergencia || 0), 0);

    const taxaMedia = totalAlertas > 0 ? ((totalEntregas / totalAlertas) * 100).toFixed(1) : '100.0';

    document.getElementById('rel-taxa-entrega').textContent = `${taxaMedia}%`;
    document.getElementById('rel-total-maquinas').textContent = totalMaquinas;
    document.getElementById('rel-total-criticos').textContent = totalCriticos;
    document.getElementById('rel-total-divergencias').textContent = totalDivergencias;

    const tbody = document.getElementById('tbody-relatorio-executivo');
    if (tbody) {
      if (dadosRelatorio.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="table-empty">Sem dados consolidados para exibir.</td></tr>';
      } else {
        tbody.innerHTML = dadosRelatorio
          .map((item) => {
            const taxa = Number(item.taxa_entrega_pct || 100);
            const falhas = Number(item.falhas_divergencia || 0);
            const badgeTaxa =
              taxa >= 90
                ? `<span class="kpi-badge up">${taxa}%</span>`
                : taxa >= 75
                  ? `<span class="kpi-badge warn">${taxa}%</span>`
                  : `<span class="kpi-badge critical">${taxa}%</span>`;

            return `
              <tr class="${falhas > 0 ? 'row-divergencia' : ''}">
                <td>
                  <span class="cell-primary">${item.nome_cliente}</span>
                  <span class="cell-sub">${item.email}</span>
                </td>
                <td>${item.cnpj}</td>
                <td><strong>${item.total_maquinas}</strong></td>
                <td><span class="kpi-badge ${Number(item.alertas_criticos) > 0 ? 'critical' : 'up'}">${item.alertas_criticos}</span></td>
                <td>${item.alertas_atencao}</td>
                <td><strong>${item.total_alertas}</strong></td>
                <td>${item.entregas_confirmadas}</td>
                <td><span class="kpi-badge ${falhas > 0 ? 'critical' : 'up'}">${falhas}</span></td>
                <td>${badgeTaxa}</td>
              </tr>
            `;
          })
          .join('');
      }
    }

    // Tabela resumida de falhas de comunicação para Gestão de Problemas
    const tbodyFalhas = document.getElementById('tbody-relatorio-falhas');
    if (tbodyFalhas) {
      const falhasAtivas = registrosAuditoria.filter(ehDivergencia);
      if (falhasAtivas.length === 0) {
        tbodyFalhas.innerHTML =
          '<tr><td colspan="5" class="table-empty">Nenhuma divergência de comunicação registrada.</td></tr>';
      } else {
        tbodyFalhas.innerHTML = falhasAtivas
          .map(
            (f) => `
              <tr class="row-divergencia">
                <td><strong>#${f.alerta_id}</strong></td>
                <td>${f.nome_cliente}</td>
                <td>${f.canal_destino || 'Slack / Jira'}</td>
                <td>${f.horario_alerta}</td>
                <td><code class="log-code log-error">${f.log_aplicacao}</code></td>
              </tr>
            `
          )
          .join('');
      }
    }
  }

  function exportarCsvRelatorio() {
    if (!dadosRelatorio.length) return;

    const cabecalho = [
      'Hospital Cliente',
      'CNPJ',
      'Email',
      'Servidores PACS',
      'Alertas Criticos',
      'Alertas Atencao',
      'Total Alertas',
      'Entregas Confirmadas',
      'Divergencias',
      'Taxa Entrega (%)'
    ];

    const linhas = dadosRelatorio.map((r) => [
      `"${String(r.nome_cliente || '').replace(/"/g, '""')}"`,
      `"'${r.cnpj || ''}"`,
      `"${r.email || ''}"`,
      r.total_maquinas,
      r.alertas_criticos,
      r.alertas_atencao,
      r.total_alertas,
      r.entregas_confirmadas,
      r.falhas_divergencia,
      r.taxa_entrega_pct
    ]);

    const conteudo = '\uFEFF' + [cabecalho.join(';'), ...linhas.map((l) => l.join(';'))].join('\n');
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-executivo-magnasync-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const btnCsv = document.getElementById('btn-exportar-csv');
  if (btnCsv) btnCsv.addEventListener('click', exportarCsvRelatorio);

  const btnPdf = document.getElementById('btn-imprimir-pdf');
  if (btnPdf) {
    btnPdf.addEventListener('click', () => {
      const elPrintTs = document.getElementById('print-timestamp');
      if (elPrintTs) {
        elPrintTs.textContent = `Emitido em ${new Date().toLocaleString('pt-BR')} · Governança Admin Geral MagnaSync`;
      }
      window.print();
    });
  }

  // -------------------------------------------------------------------------
  // Orquestrador de Carregamento Periódico (Fetch real do MySQL a cada 5s)
  // -------------------------------------------------------------------------
  async function carregarDashboardCompleta() {
    const syncText = document.getElementById('status-sync-texto');
    try {
      const [kpis, ranking, timeline, rosca, logs, relatorio] = await Promise.all([
        buscarJson('/dashboardDaniel/kpis'),
        buscarJson('/dashboardDaniel/ranking-incidentes'),
        buscarJson('/dashboardDaniel/alertas-gerados-vs-entregues'),
        buscarJson('/dashboardDaniel/auditoria-rosca'),
        buscarJson('/dashboardDaniel/divergencias-logs'),
        buscarJson('/dashboardDaniel/relatorio-executivo')
      ]);

      registrosAuditoria = Array.isArray(logs) ? logs.map(sanitizarLinha) : [];

      renderizarKpis(kpis);
      renderizarRankingIncidentes(Array.isArray(ranking) ? ranking : []);
      renderizarGeradosVsEntregues(Array.isArray(timeline) ? timeline : []);
      renderizarAuditoriaRosca(rosca);
      renderizarTabelaAuditoria();
      renderizarRelatorioExecutivo(Array.isArray(relatorio) ? relatorio.map(sanitizarLinha) : []);

      const agoraStr = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const elAtualizacao = document.getElementById('ultima-atualizacao-label');
      if (elAtualizacao) elAtualizacao.textContent = `Última leitura: ${agoraStr}`;
      if (syncText) syncText.textContent = 'Conectado ao MySQL (5s)';
    } catch (erro) {
      console.error('Erro ao carregar Dashboard Daniel:', erro);
      if (syncText) syncText.textContent = 'Erro de conexão com API';
    }
  }

  const btnAtualizar = document.getElementById('btn-atualizar-agora');
  if (btnAtualizar) {
    btnAtualizar.addEventListener('click', carregarDashboardCompleta);
  }

  atualizarPerfilSidebar();
  syncHash();
  carregarDashboardCompleta();
  setInterval(carregarDashboardCompleta, INTERVALO_MS);
});

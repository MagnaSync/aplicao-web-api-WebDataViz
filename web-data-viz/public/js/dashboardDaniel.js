/**
 * MagnaSync — Dashboard Executiva do Admin Geral (Daniel)
 * Consome /dashboardDaniel/* (MySQL) e controla:
 *   #overview (KPIs, gráficos 2x2, Saúde Global e filtro por hospital)
 *   #relatorio (Resumo por Hospital + Modal de detalhes/logs)
 *   #cadastrarHospital (Cadastro de novo hospital na mesma página)
 */
document.addEventListener('DOMContentLoaded', () => {
  const INTERVALO_MS = 5000;

  let rankingChart = null;
  let timelineChart = null;
  let roscaChart = null;

  let escopoAtual = 'todos';
  let kpisGlobais = null;
  let rankingGlobal = [];
  let timelineGlobal = [];
  let roscaGlobal = null;
  let registrosAuditoria = [];
  let dadosRelatorio = [];

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

  async function buscarJson(url) {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${url}`);
    return resposta.json();
  }

  function definirTexto(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
  }

  const opcoesLegenda = {
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
    const nome = sessionStorage.getItem('NOME_USUARIO') || 'Admin Geral MagnaSync';
    const cargo = sessionStorage.getItem('CARGO_USUARIO') || 'Governança SaaS & ITIL';
    definirTexto('sidebar-user-name', nome);
    definirTexto('sidebar-user-role', cargo);
    const partes = nome.trim().split(/\s+/);
    definirTexto('sidebar-user-avatar', ((partes[0][0] || 'A') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase());
  }

  // ------------------------------------------------------------------
  // Navegação entre as 3 telas (sidebar única)
  // ------------------------------------------------------------------
  const views = {
    overview: document.getElementById('view-overview'),
    relatorio: document.getElementById('view-relatorio'),
    cadastrarHospital: document.getElementById('view-cadastrarHospital')
  };
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');

  function switchView(alvo) {
    if (!views[alvo]) alvo = 'overview';
    Object.keys(views).forEach((k) => {
      views[k].style.display = k === alvo ? 'flex' : 'none';
    });
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${alvo}`);
    });
    if (alvo === 'overview') {
      [rankingChart, timelineChart, roscaChart].forEach((g) => g && g.resize());
    }
  }

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const alvo = link.getAttribute('href').substring(1);
      window.location.hash = alvo;
      switchView(alvo);
    });
  });
  window.addEventListener('hashchange', () => switchView(window.location.hash.replace('#', '')));

  // ------------------------------------------------------------------
  // Seletor de escopo no topo (Todos os Hospitais x Hospital específico)
  // ------------------------------------------------------------------
  const hospitalSelector = document.getElementById('hospital-selector');
  let listaNomesHospitaisAnterior = '';

  function atualizarOpcoesSeletor() {
    if (!hospitalSelector) return;
    const nomesAtuais = dadosRelatorio.map((h) => h.nome_cliente);
    const assinatura = JSON.stringify(nomesAtuais);
    if (assinatura === listaNomesHospitaisAnterior) return;
    listaNomesHospitaisAnterior = assinatura;

    const selecionadoAntes = escopoAtual;
    hospitalSelector.innerHTML = '<option value="todos">Todos os Hospitais – Visão Global</option>';
    nomesAtuais.forEach((nome) => {
      const opt = document.createElement('option');
      opt.value = nome;
      opt.textContent = nome;
      hospitalSelector.appendChild(opt);
    });
    const existe = nomesAtuais.includes(selecionadoAntes);
    escopoAtual = existe ? selecionadoAntes : 'todos';
    hospitalSelector.value = escopoAtual;
  }

  if (hospitalSelector) {
    hospitalSelector.addEventListener('change', () => {
      escopoAtual = hospitalSelector.value || 'todos';
      aplicarEscopoOverview();
      renderizarRelatorio();
    });
  }

  // ------------------------------------------------------------------
  // TELA 1 — Aplicação do escopo (Global ou Hospital selecionado)
  // ------------------------------------------------------------------
  function ehDivergencia(r) {
    return Number(r.enviado_sistema) === 1 && Number(r.confirmado_entrega) === 0;
  }

  function taxaDe(item) {
    return item.taxa_entrega_pct == null ? 100 : Number(item.taxa_entrega_pct);
  }

  function montarTimelineFiltrada(logsFiltrados) {
    const porHora = new Map();
    [...logsFiltrados].reverse().forEach((r) => {
      const parteHora = String(r.horario_alerta || '').split(' ')[1] || '00:00:00';
      const hora = `${parteHora.slice(0, 2)}:00`;
      if (!porHora.has(hora)) porHora.set(hora, { janela_hora: hora, alertas_gerados: 0, alertas_entregues: 0 });
      const bucket = porHora.get(hora);
      bucket.alertas_gerados += 1;
      if (Number(r.confirmado_entrega) === 1) bucket.alertas_entregues += 1;
    });
    return Array.from(porHora.values());
  }

  function aplicarEscopoOverview() {
    const isGlobal = escopoAtual === 'todos';
    definirTexto(
      'topbar-escopo-titulo',
      isGlobal ? 'Todos os Hospitais – Visão Global' : escopoAtual
    );

    const hosp = dadosRelatorio.find((h) => h.nome_cliente === escopoAtual);
    const logsDoEscopo = isGlobal
      ? registrosAuditoria
      : registrosAuditoria.filter((r) => r.nome_cliente === escopoAtual);

    // 1. KPIs do topo
    if (isGlobal || !hosp) {
      renderizarKpis(kpisGlobais);
    } else {
      const criticos = Number(hosp.alertas_criticos || 0);
      renderizarKpis({
        total_clientes_ativos: 1,
        parque_total_monitorado: Number(hosp.total_maquinas || 0),
        clientes_estado_critico: criticos > 0 ? 1 : 0,
        volume_chamados_24h: Number(hosp.total_alertas || 0),
        divergencias_ativas: Number(hosp.falhas_divergencia || 0)
      });
    }

    // 2. Linha Dupla
    const serie = isGlobal ? timelineGlobal : montarTimelineFiltrada(logsDoEscopo);
    renderizarGeradosVsEntregues(serie);

    // 3. Ranking
    const rankingExibido = isGlobal
      ? rankingGlobal
      : rankingGlobal.filter((r) => r.hospital_nome === escopoAtual);
    renderizarRanking(rankingExibido.length ? rankingExibido : rankingGlobal);

    // 4. Rosca + Saúde Global
    let roscaExibida = roscaGlobal;
    if (!isGlobal) {
      const entregues = logsDoEscopo.filter((r) => r.status_auditoria === 'ENTREGUE').length;
      const abertos = logsDoEscopo.filter((r) => r.status_auditoria === 'CHAMADO_ABERTO').length;
      const falhas = logsDoEscopo.filter(ehDivergencia).length;
      roscaExibida = {
        entregues_sucesso: entregues,
        chamados_abertos: abertos,
        retidos_falha: falhas,
        total_auditado: logsDoEscopo.length
      };
    }
    renderizarRosca(roscaExibida);

    const maquinas = isGlobal
      ? Number(kpisGlobais?.parque_total_monitorado || 0)
      : Number(hosp?.total_maquinas || 0);
    renderizarSaudeGlobal(roscaExibida, maquinas);
  }

  function renderizarKpis(kpis) {
    if (!kpis) return;
    const criticos = Number(kpis.clientes_estado_critico || 0);
    const divergencias = Number(kpis.divergencias_ativas || 0);

    definirTexto('kpi-clientes-ativos', Number(kpis.total_clientes_ativos || 0));
    definirTexto('kpi-parque-total', Number(kpis.parque_total_monitorado || 0));
    definirTexto('kpi-clientes-criticos', criticos);
    definirTexto('kpi-volume-24h', Number(kpis.volume_chamados_24h || 0));

    const badgeCriticos = document.getElementById('kpi-criticos-badge');
    if (badgeCriticos) {
      badgeCriticos.textContent = criticos > 0 ? 'Crítico' : 'Estável';
      badgeCriticos.className = criticos > 0 ? 'kpi-badge critical' : 'kpi-badge up';
    }

    const badgeDiv = document.getElementById('kpi-divergencias-badge');
    if (badgeDiv) {
      badgeDiv.textContent = `${divergencias} divergência${divergencias === 1 ? '' : 's'}`;
      badgeDiv.className = divergencias > 0 ? 'kpi-badge critical' : 'kpi-badge up';
    }
  }

  // ------------------------------------------------------------------
  // TELA 1 — Saúde Global da Plataforma (Score % + 3 bolinhas)
  // ------------------------------------------------------------------
  function renderizarSaudeGlobal(rosca, totalMaquinas) {
    const entregues = Number(rosca?.entregues_sucesso || 0) + Number(rosca?.chamados_abertos || 0);
    const abertos = Number(rosca?.chamados_abertos || 0);
    const falhas = Number(rosca?.retidos_falha || 0);
    const total = Number(rosca?.total_auditado || entregues + falhas);
    const taxaEntrega = total > 0 ? Math.round((entregues / total) * 100) : 100;

    const scoreEl = document.getElementById('gauge-score');
    const labelEl = document.getElementById('gauge-label');
    if (scoreEl) scoreEl.innerHTML = `${taxaEntrega}<small>%</small>`;

    if (labelEl) {
      if (falhas === 0 && taxaEntrega >= 90) {
        labelEl.textContent = 'Limite Seguro';
        labelEl.className = 'gauge-label';
      } else if (taxaEntrega >= 75) {
        labelEl.textContent = 'Requer Atenção';
        labelEl.className = 'gauge-label warn';
      } else {
        labelEl.textContent = 'Estado Crítico';
        labelEl.className = 'gauge-label critical';
      }
    }

    const parqueDot = document.getElementById('health-parque-dot');
    if (parqueDot) parqueDot.className = totalMaquinas > 0 ? 'status-dot emerald' : 'status-dot amber';
    definirTexto('health-parque-status', `${totalMaquinas} servidor(es) ativo(s)`);

    const slackDot = document.getElementById('health-slack-dot');
    if (slackDot) slackDot.className = falhas === 0 ? 'status-dot emerald' : taxaEntrega >= 75 ? 'status-dot amber' : 'status-dot crimson';
    definirTexto('health-slack-status', `${entregues} de ${total} confirmados`);

    const falhasDot = document.getElementById('health-falhas-dot');
    if (falhasDot) falhasDot.className = falhas === 0 ? 'status-dot emerald' : 'status-dot crimson';
    definirTexto('health-falhas-status', `${falhas} falha(s) · ${abertos} chamado(s) aberto(s)`);
  }

  // ------------------------------------------------------------------
  // TELA 1 — Gráficos Chart.js
  // ------------------------------------------------------------------
  function renderizarRanking(lista) {
    const canvas = document.getElementById('chartRankingIncidentes');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = lista.map((i) => i.hospital_nome);
    const criticos = lista.map((i) => Number(i.criticos || 0));
    const atencao = lista.map((i) => Number(i.atencao || 0));

    if (!rankingChart) {
      rankingChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels,
          datasets: [
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
            tooltip: { backgroundColor: '#0B192C', padding: 10, cornerRadius: 6 }
          },
          scales: {
            x: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, color: '#8a9dbf', font: { size: 11 } }, grid: { color: 'rgba(39, 62, 99, 0.08)' } },
            y: { stacked: true, ticks: { color: '#273E63', font: { size: 11, weight: '600' } }, grid: { display: false } }
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

  function renderizarGeradosVsEntregues(serie) {
    const canvas = document.getElementById('chartGeradosVsEntregues');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = serie.map((i) => i.janela_hora);
    const gerados = serie.map((i) => Number(i.alertas_gerados || 0));
    const entregues = serie.map((i) => Number(i.alertas_entregues || 0));

    if (!timelineChart) {
      const ctx = canvas.getContext('2d');
      const gradGerados = ctx.createLinearGradient(0, 0, 0, 230);
      gradGerados.addColorStop(0, 'rgba(26, 74, 135, 0.28)');
      gradGerados.addColorStop(1, 'rgba(26, 74, 135, 0)');
      const gradEntregues = ctx.createLinearGradient(0, 0, 0, 230);
      gradEntregues.addColorStop(0, 'rgba(16, 185, 129, 0.24)');
      gradEntregues.addColorStop(1, 'rgba(16, 185, 129, 0)');

      const estiloLinha = (cor, grad, label, dados) => ({
        label,
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
      });

      timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            estiloLinha('#1A4A87', gradGerados, 'Gerados no Sistema', gerados),
            estiloLinha('#10b981', gradEntregues, 'Entregues com Sucesso', entregues)
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
      timelineChart.data.datasets[1].data = entregues;
      timelineChart.update('none');
    }
  }

  function renderizarRosca(rosca) {
    if (!rosca) return;
    const entregues = Number(rosca.entregues_sucesso || 0);
    const abertos = Number(rosca.chamados_abertos || 0);
    const falhas = Number(rosca.retidos_falha || 0);

    definirTexto('donut-total-auditoria', Number(rosca.total_auditado || 0));

    const itens = [
      { label: 'Entregues com Sucesso', valor: entregues, cor: '#10b981' },
      { label: 'Chamados em Aberto', valor: abertos, cor: '#1A4A87' },
      { label: 'Retidos por Falha/Divergência', valor: falhas, cor: '#dc2626' }
    ];

    const legenda = document.getElementById('auditoria-donut-legend');
    if (legenda) {
      legenda.innerHTML = itens
        .map((i) => `<li><span><i style="background:${i.cor}"></i>${i.label}</span><b>${i.valor}</b></li>`)
        .join('');
    }

    const canvas = document.getElementById('chartAuditoriaRosca');
    if (!canvas || typeof Chart === 'undefined') return;
    const valores = [entregues, abertos, falhas];

    if (!roscaChart) {
      roscaChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: itens.map((i) => i.label),
          datasets: [{ data: valores, backgroundColor: itens.map((i) => i.cor), borderColor: '#ffffff', borderWidth: 2, hoverOffset: 5 }]
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
  // TELA 2 — Resumo por Hospital + Modal de Detalhes
  // ------------------------------------------------------------------
  function obterRelatorioFiltrado() {
    const busca = (document.getElementById('ipt-busca-hospital')?.value || '').trim().toLowerCase();
    return dadosRelatorio.filter((item) => {
      if (escopoAtual !== 'todos' && item.nome_cliente !== escopoAtual) return false;
      if (busca && !String(item.nome_cliente || '').toLowerCase().includes(busca)) return false;
      return true;
    });
  }

  function renderizarRelatorio() {
    const tbody = document.getElementById('tbody-relatorio-executivo');
    if (!tbody) return;

    const filtrados = obterRelatorioFiltrado();

    if (filtrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhum hospital encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = filtrados
      .map((item) => {
        const taxa = taxaDe(item);
        const criticos = Number(item.alertas_criticos || 0);
        const atencao = Number(item.alertas_atencao || 0);
        const falhas = Number(item.falhas_divergencia || 0);
        const classeTaxa = taxa >= 90 ? 'up' : taxa >= 75 ? 'warn' : 'critical';
        const nomeEsc = escaparHtml(item.nome_cliente);
        return `
          <tr class="${falhas > 0 ? 'row-divergencia ' : ''}row-clickable" data-hospital="${nomeEsc}" title="Clique para ver detalhes e logs deste hospital">
            <td><strong>${nomeEsc}</strong></td>
            <td>${Number(item.total_maquinas || 0)}</td>
            <td><span class="kpi-badge ${criticos > 0 ? 'critical' : 'up'}">${criticos}</span></td>
            <td>${atencao}</td>
            <td><span class="kpi-badge ${falhas > 0 ? 'critical' : 'up'}">${falhas}</span></td>
            <td><span class="kpi-badge ${classeTaxa}">${taxa}%</span></td>
          </tr>`;
      })
      .join('');
  }

  const tbodyRelatorio = document.getElementById('tbody-relatorio-executivo');
  if (tbodyRelatorio) {
    tbodyRelatorio.addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-hospital]');
      if (tr) abrirModalHospital(tr.dataset.hospital);
    });
  }

  const iptBuscaHospital = document.getElementById('ipt-busca-hospital');
  if (iptBuscaHospital) iptBuscaHospital.addEventListener('input', renderizarRelatorio);

  // Modal de detalhes
  const modalOverlay = document.getElementById('modal-hospital');

  function formatarHorarioCurto(horarioStr) {
    const partes = String(horarioStr || '').split(' ');
    if (partes.length < 2) return horarioStr || '--';
    return `${partes[0].slice(0, 5)} ${partes[1].slice(0, 5)}`;
  }

  function abrirModalHospital(nomeHospital) {
    const hosp = dadosRelatorio.find((h) => h.nome_cliente === nomeHospital);
    if (!hosp || !modalOverlay) return;

    definirTexto('modal-hosp-nome', hosp.nome_cliente);
    definirTexto('modal-hosp-meta', `CNPJ: ${hosp.cnpj || '--'} · E-mail: ${hosp.email || '--'}`);
    definirTexto('modal-hosp-maquinas', Number(hosp.total_maquinas || 0));
    definirTexto('modal-hosp-alertas', Number(hosp.total_alertas || 0));
    definirTexto('modal-hosp-falhas', Number(hosp.falhas_divergencia || 0));
    definirTexto('modal-hosp-taxa', `${taxaDe(hosp)}%`);

    const logsHosp = registrosAuditoria.filter((r) => r.nome_cliente === nomeHospital);
    const tbodyModal = document.getElementById('tbody-modal-hospital-logs');

    if (tbodyModal) {
      if (logsHosp.length === 0) {
        tbodyModal.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhum alerta ou log registrado para este hospital.</td></tr>';
      } else {
        tbodyModal.innerHTML = logsHosp
          .map((r) => {
            const divergente = ehDivergencia(r);
            let situacao = '<span class="status-pill delivered">Entregue</span>';
            let classeLog = 'log-code log-ok';
            if (divergente) {
              situacao = '<span class="status-pill failed">Falha no Envio</span>';
              classeLog = 'log-code log-error';
            } else if (r.status_auditoria === 'CHAMADO_ABERTO') {
              situacao = '<span class="status-pill open-ticket">Chamado Aberto</span>';
              classeLog = 'log-code log-ticket';
            }
            const sevBadge = r.severidade === 'Crítico'
              ? '<span class="kpi-badge critical">Crítico</span>'
              : '<span class="kpi-badge warn">Atenção</span>';

            return `
              <tr class="${divergente ? 'row-divergencia' : ''}">
                <td>${escaparHtml(formatarHorarioCurto(r.horario_alerta))}</td>
                <td>
                  <span class="cell-primary">${escaparHtml(r.servidor_fabricante || 'PACS')} (${escaparHtml(r.componente)})</span>
                  <span class="cell-sub">${escaparHtml(r.mac_adress)} · ${r.valor_leitura}${escaparHtml(r.unidade_medida || '')}</span>
                </td>
                <td>${sevBadge}</td>
                <td>${situacao}</td>
                <td><code class="${classeLog}">${escaparHtml(r.log_aplicacao)}</code></td>
              </tr>`;
          })
          .join('');
      }
    }

    modalOverlay.style.display = 'flex';
  }

  function fecharModalHospital() {
    if (modalOverlay) modalOverlay.style.display = 'none';
  }

  const btnFecharModal = document.getElementById('btn-fechar-modal');
  if (btnFecharModal) btnFecharModal.addEventListener('click', fecharModalHospital);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) fecharModalHospital();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModalHospital();
  });

  // ------------------------------------------------------------------
  // TELA 2 — Exportações (CSV e PDF)
  // ------------------------------------------------------------------
  document.getElementById('btn-exportar-csv').addEventListener('click', () => {
    const listaExportar = obterRelatorioFiltrado();
    if (!listaExportar.length) return;

    const cabecalho = ['Hospital', 'CNPJ', 'Email', 'Servidores PACS', 'Alertas Criticos', 'Alertas Atencao', 'Total Alertas', 'Entregas Confirmadas', 'Falhas de Envio', 'Taxa Entrega (%)'];
    const linhas = listaExportar.map((r) => [
      `"${String(r.nome_cliente || '').replace(/"/g, '""')}"`,
      `"'${r.cnpj || ''}"`,
      `"${r.email || ''}"`,
      r.total_maquinas,
      r.alertas_criticos,
      r.alertas_atencao,
      r.total_alertas,
      r.entregas_confirmadas,
      r.falhas_divergencia,
      taxaDe(r)
    ]);

    const conteudo = '\uFEFF' + [cabecalho, ...linhas].map((l) => l.join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-carteira-magnasync-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-imprimir-pdf').addEventListener('click', () => {
    definirTexto('print-timestamp', `Emitido em ${new Date().toLocaleString('pt-BR')} · Admin Geral MagnaSync`);
    window.print();
  });

  // ------------------------------------------------------------------
  // TELA 3 — Cadastrar hospital (POST /hospital/cadastrarHospital)
  // ------------------------------------------------------------------
  const campos = {
    nome: document.getElementById('hosp-nome'),
    cnpj: document.getElementById('hosp-cnpj'),
    telefone: document.getElementById('hosp-telefone'),
    email: document.getElementById('hosp-email'),
    cep: document.getElementById('hosp-cep'),
    numero: document.getElementById('hosp-numero')
  };
  let timerFeedback = null;

  function mostrarFeedbackHospital(texto, tipo) {
    const box = document.getElementById('hospital-feedback');
    box.className = `feedback-box ${tipo}`;
    box.textContent = texto;
    box.style.display = 'flex';
    clearTimeout(timerFeedback);
    timerFeedback = setTimeout(() => { box.style.display = 'none'; }, 5000);
  }

  function limparFormularioHospital() {
    Object.values(campos).forEach((c) => { c.value = ''; });
  }

  async function cadastrarHospital() {
    const v = {};
    Object.keys(campos).forEach((k) => { v[k] = campos[k].value.trim(); });

    if (Object.values(v).some((x) => x === '')) {
      return mostrarFeedbackHospital('Preencha todos os campos obrigatórios.', 'error');
    }
    if (!/^\d{14}$/.test(v.cnpj)) return mostrarFeedbackHospital('CNPJ inválido: digite os 14 números.', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return mostrarFeedbackHospital('Informe um e-mail válido.', 'error');
    if (!/^\d{8}$/.test(v.cep)) return mostrarFeedbackHospital('CEP inválido: digite os 8 números.', 'error');

    try {
      const resposta = await fetch('/hospital/cadastrarHospital', {
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
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      limparFormularioHospital();
      mostrarFeedbackHospital('Hospital cadastrado com sucesso!', 'success');
      carregarDashboard();
    } catch (erro) {
      console.error(erro);
      mostrarFeedbackHospital('Não foi possível cadastrar o hospital. Tente novamente.', 'error');
    }
  }

  document.getElementById('btn-cadastrar-hospital').addEventListener('click', cadastrarHospital);
  document.getElementById('btn-limpar-hospital').addEventListener('click', limparFormularioHospital);

  // ------------------------------------------------------------------
  // Carregamento periódico (dados reais do MySQL)
  // ------------------------------------------------------------------
  async function carregarDashboard() {
    try {
      const [kpis, ranking, timeline, rosca, logs, relatorio] = await Promise.all([
        buscarJson('/dashboardDaniel/kpis'),
        buscarJson('/dashboardDaniel/ranking-incidentes'),
        buscarJson('/dashboardDaniel/alertas-gerados-vs-entregues'),
        buscarJson('/dashboardDaniel/auditoria-rosca'),
        buscarJson('/dashboardDaniel/divergencias-logs'),
        buscarJson('/dashboardDaniel/relatorio-executivo')
      ]);

      kpisGlobais = kpis;
      rankingGlobal = Array.isArray(ranking) ? ranking : [];
      timelineGlobal = Array.isArray(timeline) ? timeline : [];
      roscaGlobal = rosca;
      registrosAuditoria = Array.isArray(logs) ? logs : [];
      dadosRelatorio = Array.isArray(relatorio) ? relatorio : [];

      atualizarOpcoesSeletor();
      aplicarEscopoOverview();
      renderizarRelatorio();
    } catch (erro) {
      console.error('Erro ao carregar a dashboard:', erro);
    }
  }

  atualizarPerfilSidebar();
  switchView(window.location.hash.replace('#', ''));
  carregarDashboard();
  setInterval(carregarDashboard, INTERVALO_MS);
});

/**
 * MagnaSync — Dashboard Executiva do Admin Geral (Daniel)
 * Consome os endpoints /dashboardDaniel/* (MySQL) e controla as 3 telas:
 *   #overview (KPIs + gráficos) | #relatorio (carteira + auditoria) | #cadastrarHospital
 */
document.addEventListener('DOMContentLoaded', () => {
  const INTERVALO_MS = 5000;

  let rankingChart = null;
  let timelineChart = null;
  let roscaChart = null;

  let registrosAuditoria = [];
  let dadosRelatorio = [];
  let filtroAtual = 'todos';

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

  function sanitizarLinha(linha) {
    const copia = {};
    Object.keys(linha).forEach((chave) => {
      copia[chave] = typeof linha[chave] === 'string' ? escaparHtml(linha[chave]) : linha[chave];
    });
    return copia;
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
  // Navegação entre as 3 telas (a sidebar nunca muda)
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
    // O Chart.js precisa recalcular o tamanho quando a tela volta a ficar visível
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
  // TELA 1 — KPIs
  // ------------------------------------------------------------------
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
  // TELA 1 — Gráficos
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
  // TELA 2 — Bloco 1: Saúde da carteira
  // ------------------------------------------------------------------
  function taxaDe(item) {
    return item.taxa_entrega_pct == null ? 100 : Number(item.taxa_entrega_pct);
  }

  function renderizarRelatorio(lista) {
    dadosRelatorio = lista;

    const soma = (campo) => lista.reduce((acc, r) => acc + Number(r[campo] || 0), 0);
    const totalAlertas = soma('total_alertas');
    const taxaMedia = totalAlertas > 0 ? ((soma('entregas_confirmadas') / totalAlertas) * 100).toFixed(1) : '100.0';

    definirTexto('rel-taxa-entrega', `${taxaMedia}%`);
    definirTexto('rel-total-maquinas', soma('total_maquinas'));
    definirTexto('rel-total-criticos', soma('alertas_criticos'));
    definirTexto('rel-total-divergencias', soma('falhas_divergencia'));

    const tbody = document.getElementById('tbody-relatorio-executivo');
    if (!tbody) return;

    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="table-empty">Nenhum cliente cadastrado.</td></tr>';
      return;
    }

    tbody.innerHTML = lista
      .map((item) => {
        const taxa = taxaDe(item);
        const falhas = Number(item.falhas_divergencia || 0);
        const classeTaxa = taxa >= 90 ? 'up' : taxa >= 75 ? 'warn' : 'critical';
        return `
          <tr class="${falhas > 0 ? 'row-divergencia' : ''}">
            <td><span class="cell-primary">${item.nome_cliente}</span><span class="cell-sub">${item.email}</span></td>
            <td>${item.cnpj}</td>
            <td><strong>${item.total_maquinas}</strong></td>
            <td><span class="kpi-badge ${Number(item.alertas_criticos) > 0 ? 'critical' : 'up'}">${item.alertas_criticos}</span></td>
            <td>${item.alertas_atencao}</td>
            <td><strong>${item.total_alertas}</strong></td>
            <td>${item.entregas_confirmadas}</td>
            <td><span class="kpi-badge ${falhas > 0 ? 'critical' : 'up'}">${falhas}</span></td>
            <td><span class="kpi-badge ${classeTaxa}">${taxa}%</span></td>
          </tr>`;
      })
      .join('');
  }

  // ------------------------------------------------------------------
  // TELA 2 — Bloco 2: Auditoria de divergências
  // ------------------------------------------------------------------
  function ehDivergencia(r) {
    return Number(r.enviado_sistema) === 1 && Number(r.confirmado_entrega) === 0;
  }

  function renderizarAuditoria() {
    const tbody = document.getElementById('tbody-auditoria-logs');
    if (!tbody) return;

    definirTexto('count-todos', registrosAuditoria.length);
    definirTexto('count-divergencias', registrosAuditoria.filter(ehDivergencia).length);
    definirTexto('count-entregues', registrosAuditoria.filter((r) => !ehDivergencia(r)).length);

    const busca = (document.getElementById('ipt-busca-auditoria').value || '').trim().toLowerCase();

    const filtrados = registrosAuditoria.filter((r) => {
      if (filtroAtual === 'divergencias' && !ehDivergencia(r)) return false;
      if (filtroAtual === 'entregues' && ehDivergencia(r)) return false;
      if (!busca) return true;
      return [r.alerta_id, r.nome_cliente, r.servidor_fabricante, r.mac_adress, r.componente, r.log_aplicacao]
        .join(' ')
        .toLowerCase()
        .includes(busca);
    });

    if (filtrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Nenhum registro para o filtro selecionado.</td></tr>';
      return;
    }

    tbody.innerHTML = filtrados
      .map((r) => {
        const divergente = ehDivergencia(r);
        let statusReal = '<span class="status-pill delivered">Entregue (ACK)</span>';
        let classeLog = 'log-code log-ok';
        if (divergente) {
          statusReal = '<span class="status-pill failed">Divergência / Falha</span>';
          classeLog = 'log-code log-error';
        } else if (r.status_auditoria === 'CHAMADO_ABERTO') {
          statusReal = '<span class="status-pill open-ticket">Chamado Aberto</span>';
          classeLog = 'log-code log-ticket';
        }
        const severidade = r.severidade === 'Crítico'
          ? '<span class="kpi-badge critical">Crítico</span>'
          : '<span class="kpi-badge warn">Atenção</span>';

        return `
          <tr class="${divergente ? 'row-divergencia' : ''}">
            <td><span class="cell-primary">#${r.alerta_id}</span>${severidade}</td>
            <td><span class="cell-primary">${r.nome_cliente}</span><span class="cell-sub">${r.canal_destino || ''}</span></td>
            <td><span class="cell-primary">${r.servidor_fabricante || 'Servidor PACS'} (${r.componente})</span><span class="cell-sub">${r.mac_adress} &middot; ${r.valor_leitura}${r.unidade_medida || ''}</span></td>
            <td><span class="cell-primary">${r.horario_alerta}</span><span class="cell-sub">Auditado: ${r.horario_auditoria}</span></td>
            <td><span class="status-pill sent">Enviado (Sistema)</span></td>
            <td>${statusReal}</td>
            <td><code class="${classeLog}">${r.log_aplicacao}</code></td>
          </tr>`;
      })
      .join('');
  }

  document.querySelectorAll('.filter-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filtroAtual = btn.dataset.filter || 'todos';
      renderizarAuditoria();
    });
  });
  document.getElementById('ipt-busca-auditoria').addEventListener('input', renderizarAuditoria);

  // ------------------------------------------------------------------
  // TELA 2 — Exportações
  // ------------------------------------------------------------------
  function textoPuro(valor) {
    const div = document.createElement('div');
    div.innerHTML = valor == null ? '' : String(valor); // desfaz o escape para o arquivo
    return div.textContent;
  }

  document.getElementById('btn-exportar-csv').addEventListener('click', () => {
    if (!dadosRelatorio.length) return;

    const cabecalho = ['Hospital', 'CNPJ', 'Email', 'Servidores PACS', 'Alertas Criticos', 'Alertas Atencao', 'Total Alertas', 'Entregas Confirmadas', 'Divergencias', 'Taxa Entrega (%)'];
    const linhas = dadosRelatorio.map((r) => [
      `"${textoPuro(r.nome_cliente).replace(/"/g, '""')}"`,
      `"'${r.cnpj}"`,
      `"${textoPuro(r.email)}"`,
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
      carregarDashboard(); // atualiza KPIs e relatórios com o novo cliente
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

      registrosAuditoria = Array.isArray(logs) ? logs.map(sanitizarLinha) : [];

      renderizarKpis(kpis);
      renderizarRanking(Array.isArray(ranking) ? ranking : []);
      renderizarGeradosVsEntregues(Array.isArray(timeline) ? timeline : []);
      renderizarRosca(rosca);
      renderizarRelatorio(Array.isArray(relatorio) ? relatorio.map(sanitizarLinha) : []);
      renderizarAuditoria();

      definirTexto('ultima-atualizacao-label', `Última leitura: ${new Date().toLocaleTimeString('pt-BR')}`);
      definirTexto('status-sync-texto', 'Conectado ao banco (5s)');
    } catch (erro) {
      console.error('Erro ao carregar a dashboard:', erro);
      definirTexto('status-sync-texto', 'Erro de conexão com a API');
    }
  }

  document.getElementById('btn-atualizar-agora').addEventListener('click', carregarDashboard);

  atualizarPerfilSidebar();
  switchView(window.location.hash.replace('#', ''));
  carregarDashboard();
  setInterval(carregarDashboard, INTERVALO_MS);
});

/**
 * MagnaSync — Telemetry Dashboard Interactive Scripts & Chart.js Integration
 */

document.addEventListener('DOMContentLoaded', () => {
  // Regras oficiais de classificação de métricas (Fonte: GE HealthCare / Documentação MagnaSync)
  function classificarDisco(pct) {
    if (pct >= 95) return { nivel: 3, texto: 'Bloqueio', badgeClass: 'kpi-badge block', dotClass: 'status-dot darkred' };
    if (pct >= 90) return { nivel: 2, texto: 'Crítico', badgeClass: 'kpi-badge critical', dotClass: 'status-dot crimson' };
    if (pct >= 80) return { nivel: 1, texto: 'Atenção', badgeClass: 'kpi-badge warn', dotClass: 'status-dot amber' };
    return { nivel: 0, texto: 'Seguro', badgeClass: 'kpi-badge up', dotClass: 'status-dot emerald' };
  }

  function classificarRam(pct) {
    if (pct >= 90) return { nivel: 3, texto: 'Bloqueio', badgeClass: 'kpi-badge block', dotClass: 'status-dot darkred' };
    if (pct >= 85) return { nivel: 2, texto: 'Crítico', badgeClass: 'kpi-badge critical', dotClass: 'status-dot crimson' };
    if (pct >= 75) return { nivel: 1, texto: 'Atenção', badgeClass: 'kpi-badge warn', dotClass: 'status-dot amber' };
    return { nivel: 0, texto: 'Seguro', badgeClass: 'kpi-badge up', dotClass: 'status-dot emerald' };
  }

  function classificarCpu(pct) {
    if (pct >= 98) return { nivel: 3, texto: 'Bloqueio', badgeClass: 'kpi-badge block', dotClass: 'status-dot darkred' };
    if (pct >= 90) return { nivel: 2, texto: 'Crítico', badgeClass: 'kpi-badge critical', dotClass: 'status-dot crimson' };
    if (pct >= 80) return { nivel: 1, texto: 'Atenção', badgeClass: 'kpi-badge warn', dotClass: 'status-dot amber' };
    return { nivel: 0, texto: 'Seguro', badgeClass: 'kpi-badge up', dotClass: 'status-dot emerald' };
  }

  function classificarRede(latenciaMs, perdaPct, indisponivel) {
    if (indisponivel) return { nivel: 3, texto: 'Indisponível', badgeClass: 'kpi-badge block', dotClass: 'status-dot darkred' };
    if (perdaPct > 0 || latenciaMs >= 80) return { nivel: 2, texto: 'Crítico', badgeClass: 'kpi-badge critical', dotClass: 'status-dot crimson' };
    if (latenciaMs > 25) return { nivel: 1, texto: 'Atenção', badgeClass: 'kpi-badge warn', dotClass: 'status-dot amber' };
    return { nivel: 0, texto: 'Estável', badgeClass: 'kpi-badge up', dotClass: 'status-dot emerald' };
  }

  // Servidores PACS e dados simulados de telemetria (CPU, RAM, disco, rede)
  const servidoresPacsData = {
    'pacs-01': {
      labels: ['18:15', '18:20', '18:25', '18:30', '18:35', '18:40', '18:45', '18:50', '18:55', '19:00', '19:05', '19:15'],
      cpu: [18, 22, 29, 25, 34, 28, 20, 22, 31, 26, 23, 24],
      ram: [60, 61, 63, 62, 65, 68, 67, 65, 66, 64, 63, 64],
      disco: [62, 62, 62, 63, 63, 63, 63, 63, 63, 64, 63, 63],
      metricas: {
        cpuPct: 24,
        ramPct: 64,
        discoPct: 63,
        redeTaxa: '450 MB/s',
        latenciaMs: 12,
        perdaPct: 0,
        saudeScore: 98
      }
    },
    'pacs-02': {
      labels: ['18:15', '18:20', '18:25', '18:30', '18:35', '18:40', '18:45', '18:50', '18:55', '19:00', '19:05', '19:15'],
      cpu: [30, 32, 45, 41, 39, 44, 38, 36, 40, 42, 37, 38],
      ram: [50, 52, 51, 54, 53, 55, 52, 53, 51, 52, 53, 52],
      disco: [47, 47, 47, 48, 48, 48, 48, 48, 48, 49, 48, 48],
      metricas: {
        cpuPct: 38,
        ramPct: 52,
        discoPct: 48,
        redeTaxa: '320 MB/s',
        latenciaMs: 9,
        perdaPct: 0,
        saudeScore: 99
      }
    },
    'pacs-03': {
      labels: ['18:15', '18:20', '18:25', '18:30', '18:35', '18:40', '18:45', '18:50', '18:55', '19:00', '19:05', '19:15'],
      cpu: [42, 48, 56, 65, 59, 62, 58, 60, 54, 57, 53, 55],
      ram: [70, 72, 74, 78, 77, 79, 76, 75, 77, 78, 75, 76],
      disco: [70, 70, 70, 71, 71, 71, 71, 72, 71, 71, 71, 71],
      metricas: {
        cpuPct: 55,
        ramPct: 76,
        discoPct: 71,
        redeTaxa: '680 MB/s',
        latenciaMs: 18,
        perdaPct: 0,
        saudeScore: 91
      }
    }
  };

  // Inicialização do Gráfico de Performance (Chart.js)
  const canvas = document.getElementById('chartPerformance');
  let performanceChart = null;

  if (canvas && typeof Chart !== 'undefined') {
    const ctx = canvas.getContext('2d');

    const gradientCPU = ctx.createLinearGradient(0, 0, 0, 260);
    gradientCPU.addColorStop(0, 'rgba(26, 74, 135, 0.35)');
    gradientCPU.addColorStop(1, 'rgba(26, 74, 135, 0.0)');

    const gradientRAM = ctx.createLinearGradient(0, 0, 0, 260);
    gradientRAM.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
    gradientRAM.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    const gradientDisco = ctx.createLinearGradient(0, 0, 0, 260);
    gradientDisco.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
    gradientDisco.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const initialData = servidoresPacsData['pacs-01'];

    performanceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: initialData.labels,
        datasets: [
          {
            label: 'Uso de CPU (%)',
            data: initialData.cpu,
            borderColor: '#1A4A87',
            backgroundColor: gradientCPU,
            fill: true,
            tension: 0.38,
            borderWidth: 2.5,
            pointBackgroundColor: '#1A4A87',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 3.5,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#1A4A87',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2
          },
          {
            label: 'Uso de Memória RAM (%)',
            data: initialData.ram,
            borderColor: '#f59e0b',
            backgroundColor: gradientRAM,
            fill: true,
            tension: 0.38,
            borderWidth: 2.5,
            pointBackgroundColor: '#f59e0b',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 3.5,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#f59e0b',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2
          },
          {
            label: 'Uso de Disco (%)',
            data: initialData.disco,
            borderColor: '#10b981',
            backgroundColor: gradientDisco,
            fill: true,
            tension: 0.38,
            borderWidth: 2.5,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 3.5,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#10b981',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              boxHeight: 8,
              padding: 10,
              color: '#273E63',
              font: {
                family: "'Inter', sans-serif",
                size: 12.5,
                weight: '600'
              }
            }
          },
          tooltip: {
            backgroundColor: '#0B192C',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            usePointStyle: true,
            cornerRadius: 6,
            titleFont: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 13,
              weight: '700'
            },
            bodyFont: {
              family: "'Inter', sans-serif",
              size: 12
            },
            callbacks: {
              label: function (context) {
                return ` ${context.dataset.label}: ${context.parsed.y}%`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              color: '#8a9dbf',
              font: {
                family: "'Inter', sans-serif",
                size: 11
              }
            }
          },
          y: {
            min: 0,
            max: 100,
            grid: {
              color: 'rgba(39, 62, 99, 0.08)',
              drawBorder: false
            },
            ticks: {
              stepSize: 20,
              color: '#8a9dbf',
              font: {
                family: "'Inter', sans-serif",
                size: 11
              },
              callback: function (value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }

  // Gráfico de Donut: alertas enviados por tipo (dados simulados por Servidor PACS)
  const alertasPorServidor = {
    'pacs-01': { 'CPU': 2, 'RAM': 3, 'Disco': 1, 'Rede': 1 },
    'pacs-02': { 'CPU': 1, 'RAM': 1, 'Disco': 0, 'Rede': 2 },
    'pacs-03': { 'CPU': 4, 'RAM': 5, 'Disco': 2, 'Rede': 1 }
  };
  const coresAlertas = { 'CPU': '#1A4A87', 'RAM': '#f59e0b', 'Disco': '#10b981', 'Rede': '#6366f1' };
  let alertasChart = null;

  function atualizarDonutAlertas(servidorId) {
    const dados = alertasPorServidor[servidorId] || alertasPorServidor['pacs-01'];
    const tipos = Object.keys(dados);
    const valores = tipos.map((t) => dados[t]);
    const total = valores.reduce((a, b) => a + b, 0);

    const elTotal = document.getElementById('donut-total');
    if (elTotal) elTotal.textContent = total;

    const elKpiAlertas = document.getElementById('live-timer');
    if (elKpiAlertas) elKpiAlertas.textContent = total;

    const legenda = document.getElementById('donut-legend');
    if (legenda) {
      legenda.innerHTML = tipos
        .map((t) => `<li><span><i style="background:${coresAlertas[t]}"></i>${t}</span><b>${dados[t]}</b></li>`)
        .join('');
    }

    if (alertasChart) {
      alertasChart.data.labels = tipos;
      alertasChart.data.datasets[0].data = valores;
      alertasChart.update();
    }
  }

  const canvasDonut = document.getElementById('chartAlertasDonut');
  if (canvasDonut && typeof Chart !== 'undefined') {
    alertasChart = new Chart(canvasDonut.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(alertasPorServidor['pacs-01']),
        datasets: [{
          data: Object.values(alertasPorServidor['pacs-01']),
          backgroundColor: Object.keys(alertasPorServidor['pacs-01']).map((t) => coresAlertas[t]),
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: { legend: { display: false } }
      }
    });
  }
  atualizarDonutAlertas('pacs-01');

  // Seletor de Servidor PACS (atualiza todos os cards, KPIs e gráficos segundo a tabela GE HealthCare)
  const unitSelector = document.getElementById('unit-selector');

  function sincronizarServidorInicial() {
    if (unitSelector) unitSelector.dispatchEvent(new Event('change'));
  }

  if (unitSelector) {
    unitSelector.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      const selectedName = e.target.options[e.target.selectedIndex].text;

      const unitTitle = document.querySelector('.unit-badge strong');
      if (unitTitle) {
        unitTitle.textContent = selectedName;
      }

      const data = servidoresPacsData[selectedId];
      atualizarDonutAlertas(selectedId);
      if (!data) return;

      const m = data.metricas;
      const statusCpu = classificarCpu(m.cpuPct);
      const statusRam = classificarRam(m.ramPct);
      const statusDisco = classificarDisco(m.discoPct);
      const statusRede = classificarRede(m.latenciaMs, m.perdaPct, false);

      // 1. Mini-KPIs (CPU, RAM, Disco, Rede)
      const cpuVal = document.getElementById('kpi-cpu-val');
      const cpuBadge = document.getElementById('kpi-cpu-badge');
      const ramVal = document.getElementById('kpi-ram-val');
      const ramBadge = document.getElementById('kpi-ram-badge');
      const discoVal = document.getElementById('kpi-disco-val');
      const discoBadge = document.getElementById('kpi-disco-badge');
      const redeVal = document.getElementById('kpi-rede-val');
      const redeBadge = document.getElementById('kpi-rede-badge');

      if (cpuVal) cpuVal.textContent = `${m.cpuPct}%`;
      if (cpuBadge) {
        cpuBadge.textContent = statusCpu.texto;
        cpuBadge.className = statusCpu.badgeClass;
      }

      if (ramVal) ramVal.textContent = `${m.ramPct}%`;
      if (ramBadge) {
        ramBadge.textContent = statusRam.texto;
        ramBadge.className = statusRam.badgeClass;
      }

      const discoOcupado = Math.min(100, Math.max(0, m.discoPct));
      const discoLivre = +(100 - discoOcupado).toFixed(2);
      const discoLivreEl = document.getElementById('kpi-disco-livre');

      if (discoVal) discoVal.textContent = `${discoOcupado}%`;
      if (discoLivreEl) discoLivreEl.textContent = `${discoLivre}%`;
      if (discoBadge) {
        discoBadge.textContent = statusDisco.texto;
        discoBadge.className = statusDisco.badgeClass;
      }

      if (redeVal) redeVal.textContent = m.redeTaxa;
      if (redeBadge) {
        redeBadge.textContent = statusRede.texto;
        redeBadge.className = statusRede.badgeClass;
      }

      // 2. Painel de Saúde Global do Servidor PACS
      const gaugeScore = document.getElementById('gauge-score');
      const gaugeLabel = document.getElementById('gauge-label');
      const healthDiscoDot = document.getElementById('health-disco-dot');
      const healthDiscoStatus = document.getElementById('health-disco-status');
      const healthRedeDot = document.getElementById('health-rede-dot');
      const healthRedeStatus = document.getElementById('health-rede-status');
      const healthCpuRamDot = document.getElementById('health-cpu-ram-dot');
      const healthCpuRamStatus = document.getElementById('health-cpu-ram-status');

      if (gaugeScore) {
        gaugeScore.innerHTML = `${m.saudeScore}<small>%</small>`;
      }

      const piorNivelGeral = Math.max(statusCpu.nivel, statusRam.nivel, statusDisco.nivel, statusRede.nivel);
      if (gaugeLabel) {
        if (piorNivelGeral >= 2) {
          gaugeLabel.textContent = 'Estado Crítico';
          gaugeLabel.className = 'gauge-label critical';
        } else if (piorNivelGeral === 1) {
          gaugeLabel.textContent = 'Requer Atenção';
          gaugeLabel.className = 'gauge-label warn';
        } else {
          gaugeLabel.textContent = 'Limite Seguro';
          gaugeLabel.className = 'gauge-label';
        }
      }

      if (healthDiscoDot) healthDiscoDot.className = statusDisco.dotClass;
      if (healthDiscoStatus) {
        healthDiscoStatus.textContent = `${statusDisco.texto} (${discoOcupado}% ocupado)`;
      }

      if (healthRedeDot) healthRedeDot.className = statusRede.dotClass;
      if (healthRedeStatus) {
        healthRedeStatus.textContent = `${m.latenciaMs} ms · ${m.perdaPct}% perda (${statusRede.texto})`;
      }

      const piorCpuRam = statusRam.nivel >= statusCpu.nivel ? statusRam : statusCpu;
      if (healthCpuRamDot) healthCpuRamDot.className = piorCpuRam.dotClass;
      if (healthCpuRamStatus) {
        healthCpuRamStatus.textContent = `CPU ${m.cpuPct}% · RAM ${m.ramPct}% (${piorCpuRam.texto})`;
      }

      // 3. Gráfico de Performance (Chart.js)
      if (performanceChart) {
        performanceChart.data.labels = data.labels;
        performanceChart.data.datasets[0].data = data.cpu;
        performanceChart.data.datasets[1].data = data.ram;
        performanceChart.data.datasets[2].data = data.disco;
        performanceChart.update();
      }
    });
  }

  // Perfil do usuário autenticado no rodapé da barra lateral
  function atualizarPerfilSidebar() {
    const nomeUsuarioSessao = sessionStorage.getItem('NOME_USUARIO') || 'Visitante';
    const cargoUsuarioSessao = sessionStorage.getItem('CARGO_USUARIO') || 'TI Hospitalar';

    const elUserName = document.getElementById('sidebar-user-name');
    const elUserRole = document.getElementById('sidebar-user-role');
    const elUserAvatar = document.getElementById('sidebar-user-avatar');

    if (elUserName) elUserName.textContent = nomeUsuarioSessao;
    if (elUserRole) elUserRole.textContent = cargoUsuarioSessao;
    if (elUserAvatar) {
      const partes = nomeUsuarioSessao.trim().split(' ');
      elUserAvatar.textContent = (
        partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')
      ).toUpperCase();
    }
  }

  atualizarPerfilSidebar();
  sincronizarServidorInicial();

  // =========================================================================
  // NAVEGAÇÃO ENTRE VISÕES DO DASHBOARD (#overview, #cadastro, #relatorio, #suporte)
  // =========================================================================
  const views = {
    overview: document.getElementById('view-overview'),
    cadastro: document.getElementById('view-cadastro'),
    relatorio: document.getElementById('view-relatorio'),
    suporte: document.getElementById('view-suporte')
  };

  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');

  window.switchView = function (targetView) {
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
      if (href === `#${targetView}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    if (targetView === 'cadastro' && typeof listarFuncionarios === 'function') {
      listarFuncionarios();
    }
  };

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const viewName = href.substring(1);
        window.location.hash = viewName;
        window.switchView(viewName);
      }
    });
  });

  function handleUrlHash() {
    const rawHash = (window.location.hash || '').replace('#', '').trim();
    if (rawHash && views[rawHash]) {
      window.switchView(rawHash);
    } else {
      window.switchView('overview');
    }
  }

  window.addEventListener('hashchange', handleUrlHash);
  handleUrlHash();
});

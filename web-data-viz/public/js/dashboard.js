/**
 * MagnaSync — Telemetry Dashboard Interactive Scripts & Chart.js Integration
 */

document.addEventListener('DOMContentLoaded', () => {
  // Time filter buttons (if present)
  const timeButtons = document.querySelectorAll('.time-btn');
  timeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      timeButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Equipamentos e dados simulados de telemetria
  const consolesData = {
    'rm-01': {
      labels: ['18:15', '18:20', '18:25', '18:30', '18:35', '18:40', '18:45', '18:50', '18:55', '19:00', '19:05', '19:15'],
      cpu: [18, 22, 29, 25, 34, 28, 20, 22, 31, 26, 23, 24],
      ram: [60, 61, 63, 62, 65, 68, 67, 65, 66, 64, 63, 64],
      disco: [62, 62, 62, 63, 63, 63, 63, 63, 63, 64, 63, 63],
      kpis: {
        cpu: '24%',
        cpuBadge: 'Normal',
        cpuBadgeClass: 'kpi-badge normal',
        ram: '64%',
        ramBadge: 'Atenção',
        ramBadgeClass: 'kpi-badge warn',
        disco: '63%',
        discoBadge: 'Estável',
        discoBadgeClass: 'kpi-badge up',
        rede: '450 MB/s',
        redeBadge: 'Excelente',
        redeBadgeClass: 'kpi-badge normal'
      }
    },
    'rm-02': {
      labels: ['18:15', '18:20', '18:25', '18:30', '18:35', '18:40', '18:45', '18:50', '18:55', '19:00', '19:05', '19:15'],
      cpu: [30, 32, 45, 41, 39, 44, 38, 36, 40, 42, 37, 38],
      ram: [50, 52, 51, 54, 53, 55, 52, 53, 51, 52, 53, 52],
      disco: [47, 47, 47, 48, 48, 48, 48, 48, 48, 49, 48, 48],
      kpis: {
        cpu: '38%',
        cpuBadge: 'Normal',
        cpuBadgeClass: 'kpi-badge normal',
        ram: '52%',
        ramBadge: 'Normal',
        ramBadgeClass: 'kpi-badge normal',
        disco: '48%',
        discoBadge: 'Estável',
        discoBadgeClass: 'kpi-badge up',
        rede: '320 MB/s',
        redeBadge: 'Excelente',
        redeBadgeClass: 'kpi-badge normal'
      }
    },
    'rm-03': {
      labels: ['18:15', '18:20', '18:25', '18:30', '18:35', '18:40', '18:45', '18:50', '18:55', '19:00', '19:05', '19:15'],
      cpu: [42, 48, 56, 65, 59, 62, 58, 60, 54, 57, 53, 55],
      ram: [70, 72, 74, 78, 77, 79, 76, 75, 77, 78, 75, 76],
      disco: [70, 70, 70, 71, 71, 71, 71, 72, 71, 71, 71, 71],
      kpis: {
        cpu: '55%',
        cpuBadge: 'Atenção',
        cpuBadgeClass: 'kpi-badge warn',
        ram: '76%',
        ramBadge: 'Crítico',
        ramBadgeClass: 'kpi-badge warn',
        disco: '71%',
        discoBadge: 'Atenção',
        discoBadgeClass: 'kpi-badge warn',
        rede: '680 MB/s',
        redeBadge: 'Intenso',
        redeBadgeClass: 'kpi-badge normal'
      }
    }
  };

  // Inicialização do Gráfico Chart.js
  const canvas = document.getElementById('chartPerformance');
  let performanceChart = null;

  if (canvas && typeof Chart !== 'undefined') {
    const ctx = canvas.getContext('2d');

    // Gradientes elegantes para os datasets
    const gradientCPU = ctx.createLinearGradient(0, 0, 0, 260);
    gradientCPU.addColorStop(0, 'rgba(26, 74, 135, 0.35)');
    gradientCPU.addColorStop(1, 'rgba(26, 74, 135, 0.0)');

    const gradientRAM = ctx.createLinearGradient(0, 0, 0, 260);
    gradientRAM.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
    gradientRAM.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    const gradientDisco = ctx.createLinearGradient(0, 0, 0, 260);
    gradientDisco.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
    gradientDisco.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const initialData = consolesData['rm-01'];

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

  // Seletor de Equipamento (atualiza KPIs do card e dados do gráfico)
  const unitSelector = document.getElementById('unit-selector');
  if (unitSelector) {
    unitSelector.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      const selectedName = e.target.options[e.target.selectedIndex].text;

      // Atualiza o badge superior
      const unitTitle = document.querySelector('.unit-badge strong');
      if (unitTitle) {
        unitTitle.textContent = selectedName;
      }

      // Atualiza as Mini-KPIs dentro do dash-card
      const data = consolesData[selectedId];
      if (data) {
        const cpuVal = document.getElementById('kpi-cpu-val');
        const cpuBadge = document.getElementById('kpi-cpu-badge');
        const ramVal = document.getElementById('kpi-ram-val');
        const ramBadge = document.getElementById('kpi-ram-badge');
        const discoVal = document.getElementById('kpi-disco-val');
        const discoBadge = document.getElementById('kpi-disco-badge');
        const redeVal = document.getElementById('kpi-rede-val');
        const redeBadge = document.getElementById('kpi-rede-badge');

        if (cpuVal) cpuVal.textContent = data.kpis.cpu;
        if (cpuBadge) {
          cpuBadge.textContent = data.kpis.cpuBadge;
          cpuBadge.className = data.kpis.cpuBadgeClass;
        }

        if (ramVal) ramVal.textContent = data.kpis.ram;
        if (ramBadge) {
          ramBadge.textContent = data.kpis.ramBadge;
          ramBadge.className = data.kpis.ramBadgeClass;
        }

        if (discoVal) discoVal.textContent = data.kpis.disco;
        if (discoBadge) {
          discoBadge.textContent = data.kpis.discoBadge;
          discoBadge.className = data.kpis.discoBadgeClass;
        }

        if (redeVal) redeVal.textContent = data.kpis.rede;
        if (redeBadge) {
          redeBadge.textContent = data.kpis.redeBadge;
          redeBadge.className = data.kpis.redeBadgeClass;
        }

        // Atualiza os dados no gráfico Chart.js
        if (performanceChart) {
          performanceChart.data.labels = data.labels;
          performanceChart.data.datasets[0].data = data.cpu;
          performanceChart.data.datasets[1].data = data.ram;
          performanceChart.data.datasets[2].data = data.disco;
          performanceChart.update();
        }
      }
    });
  }
});

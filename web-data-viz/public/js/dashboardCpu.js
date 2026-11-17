/**
 * MagnaSync — Tela "Visão CPU"
 * Arquivo: dashboardCpu.js
 *
 * Organização:
 *   1. Configuração (limites, cores, tema do Chart.js)
 *   2. CAMADA DE DADOS  -> funções obterXxx(). SÃO AS ÚNICAS A TROCAR PELA API.
 *   3. Renderização     -> KPIs, ranking e gráficos (só recebem dados prontos)
 *   4. Inicialização    -> sidebar, seletor de servidor e carga da tela
 *
 * Os dados abaixo são MOCKADOS. Nenhuma rota/API existente foi alterada.
 */

/* ==========================================================================
   1. CONFIGURAÇÃO
   ========================================================================== */

// Limites oficiais de CPU (mesmos de classificarCpu em dashboard.js)
const LIMITES_CPU = { atencao: 80, critico: 90, bloqueio: 98 };

// Paleta MagnaSync (mesmas cores do dashboard.css)
const COR = {
  azul: '#1A4A87',
  azulEscuro: '#273E63',
  navy: '#0B192C',
  cinza: '#8a9dbf',
  verde: '#10b981',
  ambar: '#f59e0b',
  vermelho: '#ef4444',
  grade: 'rgba(39, 62, 99, 0.08)'
};

// Tema global do Chart.js (tipografia igual à do dashboard)
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = COR.azulEscuro;

// Guarda as instâncias para atualizar (e não duplicar) ao trocar de servidor
const graficos = {};

/** Classificação de CPU — mesma regra do dashboard.js (badge do KPI). */
function classificarCpu(pct) {
  if (pct >= LIMITES_CPU.bloqueio) return { texto: 'Bloqueio', badge: 'kpi-badge block' };
  if (pct >= LIMITES_CPU.critico)  return { texto: 'Crítico',  badge: 'kpi-badge critical' };
  if (pct >= LIMITES_CPU.atencao)  return { texto: 'Atenção',  badge: 'kpi-badge warn' };
  return { texto: 'Seguro', badge: 'kpi-badge up' };
}

/* ==========================================================================
   2. CAMADA DE DADOS (MOCK)
   --------------------------------------------------------------------------
   Cada função devolve uma Promise, como um fetch() real faria.
   PARA INTEGRAR: troque o corpo pelo fetch da sua rota e mantenha o
   formato de retorno descrito no @returns.
   ========================================================================== */

// Pequena variação por servidor só para o seletor parecer "vivo" no mock
const AJUSTE_MOCK = { 'pacs-01': 0, 'pacs-02': 8, 'pacs-03': -6 };
const ajuste = (id) => AJUSTE_MOCK[id] ?? 0;
const limitar = (v) => Math.max(1, Math.min(100, Math.round(v)));

/**
 * KPIs do topo.
 * @returns {Promise<{alertas7d:number, usoMedio:number, pico:number, minutosEmAlerta:number}>}
 */
async function obterKpis(servidorId) {
  // TODO API: const r = await fetch(`/cpu/kpis/${servidorId}`); return r.json();
  const a = ajuste(servidorId);
  return { alertas7d: 14 + a, usoMedio: limitar(47 + a), pico: limitar(96 + a / 2), minutosEmAlerta: 205 + a * 6 };
}

/**
 * Histórico de uso de CPU (gráfico de linhas).
 * @returns {Promise<{labels:string[], valores:number[]}>}  valores em %
 */
async function obterHistoricoCpu(servidorId) {
  // TODO API: const r = await fetch(`/cpu/historico/${servidorId}`); return r.json();
  const base = [32, 28, 25, 24, 27, 35, 48, 61, 74, 82, 91, 94, 88, 79, 72, 85, 93, 87, 70, 58, 49, 42, 38, 34];
  return {
    labels: base.map((_, h) => `${String(h).padStart(2, '0')}h`),
    valores: base.map((v) => limitar(v + ajuste(servidorId)))
  };
}

/**
 * Top períodos com maior sobrecarga (ranking).
 * @returns {Promise<Array<{data:string, horaInicio:number, horaFim:number, usoMedio:number}>>}
 *          data no formato ISO (YYYY-MM-DD), ordenado do maior para o menor usoMedio
 */
async function obterRankingSobrecarga(servidorId) {
  // TODO API: const r = await fetch(`/cpu/ranking/${servidorId}`); return r.json();
  const a = ajuste(servidorId);
  return [
    { data: '2026-11-11', horaInicio: 10, horaFim: 11, usoMedio: limitar(94.2 + a / 2) },
    { data: '2026-11-12', horaInicio: 14, horaFim: 15, usoMedio: limitar(91.7 + a / 2) },
    { data: '2026-11-16', horaInicio: 16, horaFim: 17, usoMedio: limitar(89.3 + a / 2) }
  ];
}

/**
 * Distribuição por faixa (histograma). Faixas de 10 em 10 pontos percentuais.
 * @returns {Promise<{faixas:string[], quantidades:number[]}>}
 */
async function obterDistribuicaoCpu(servidorId) {
  // TODO API: const r = await fetch(`/cpu/distribuicao/${servidorId}`); return r.json();
  const faixas = ['0-10', '10-20', '20-30', '30-40', '40-50', '50-60', '60-70', '70-80', '80-90', '90-100'];
  const quantidades = [12, 48, 96, 134, 112, 86, 64, 38, 21, 9];
  // Mock: desloca a distribuição conforme o servidor
  const desloc = Math.round(ajuste(servidorId) / 8);
  const ajustadas = quantidades.map((_, i) => quantidades[Math.max(0, Math.min(9, i - desloc))]);
  return { faixas, quantidades: ajustadas };
}

/**
 * Alertas por dia (gráfico de barras).
 * @returns {Promise<{labels:string[], valores:number[]}>}
 */
async function obterAlertasPorDia(servidorId) {
  // TODO API: const r = await fetch(`/cpu/alertas-por-dia/${servidorId}`); return r.json();
  const a = Math.round(ajuste(servidorId) / 4);
  return {
    labels: ['10/11', '11/11', '12/11', '13/11', '14/11', '15/11', '16/11'],
    valores: [1, 3, 4, 0, 1, 2, 3].map((v) => Math.max(0, v + a))
  };
}

/* ==========================================================================
   3. RENDERIZAÇÃO
   ========================================================================== */

/** Formata minutos como "3h 25min". */
function formatarDuracao(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`;
}

/** "2026-11-11" -> "11/11/2026" */
function formatarData(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Preenche os 4 KPIs do topo. */
function renderizarKpis(k) {
  document.getElementById('kpi-alertas').textContent = k.alertas7d;
  document.getElementById('kpi-tempo-alerta').textContent = formatarDuracao(k.minutosEmAlerta);

  const preencher = (idValor, idBadge, pct) => {
    const c = classificarCpu(pct);
    document.getElementById(idValor).textContent = `${pct}%`;
    const badge = document.getElementById(idBadge);
    badge.textContent = c.texto;
    badge.className = c.badge;
  };
  preencher('kpi-uso-medio', 'kpi-uso-medio-badge', k.usoMedio);
  preencher('kpi-pico', 'kpi-pico-badge', k.pico);
}

/** Preenche o destaque (%) e a lista de períodos do ranking. */
function renderizarRanking(lista) {
  const ul = document.getElementById('ranking-lista');
  ul.innerHTML = '';

  if (!lista.length) {
    ul.innerHTML = '<li class="ranking-vazio">Sem períodos de sobrecarga registrados.</li>';
    document.getElementById('ranking-destaque').textContent = '--%';
    return;
  }

  document.getElementById('ranking-destaque').textContent = `${lista[0].usoMedio}%`;

  lista.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'ranking-item';
    li.innerHTML = `
      <span class="pos">${i + 1}</span>
      <span class="periodo">${formatarData(item.data)} &middot; ${item.horaInicio}h – ${item.horaFim}h</span>
      <span class="valor">${item.usoMedio}%</span>`;
    ul.appendChild(li);
  });
}

/** Cria o gráfico na primeira vez; nas próximas só troca os dados. */
function criarOuAtualizar(chave, canvasId, config) {
  if (graficos[chave]) {
    graficos[chave].data = config.data;
    graficos[chave].update();
    return;
  }
  graficos[chave] = new Chart(document.getElementById(canvasId).getContext('2d'), config);
}

/** Opções comuns de eixos (grade leve, sem borda). */
const escalaY = (titulo, max) => ({
  beginAtZero: true,
  max,
  title: { display: !!titulo, text: titulo },
  grid: { color: COR.grade },
  border: { display: false }
});

/** GRÁFICO DE LINHAS — histórico de uso de CPU + linhas de limite. */
function renderizarHistorico({ labels, valores }) {
  const limite = (valor, cor, nome) => ({
    label: nome,
    data: labels.map(() => valor),
    borderColor: cor,
    borderDash: [6, 4],
    borderWidth: 1.2,
    pointRadius: 0
  });

  criarOuAtualizar('historico', 'chartHistoricoCpu', {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Uso de CPU (%)',
          data: valores,
          borderColor: COR.azul,
          backgroundColor: 'rgba(26, 74, 135, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 2,
          pointHoverRadius: 5
        },
        limite(LIMITES_CPU.atencao, COR.ambar, 'Atenção (80%)'),
        limite(LIMITES_CPU.critico, COR.vermelho, 'Crítico (90%)')
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
      scales: { x: { grid: { display: false } }, y: escalaY('%', 100) }
    }
  });
}

/** HISTOGRAMA — barras coladas, cor por faixa de severidade. */
function renderizarHistograma({ faixas, quantidades }) {
  // Cor da barra conforme o limite inferior da faixa (80 = atenção, 90 = crítico)
  const cores = faixas.map((f) => {
    const inicio = parseInt(f, 10);
    if (inicio >= LIMITES_CPU.critico) return COR.vermelho;
    if (inicio >= LIMITES_CPU.atencao) return COR.ambar;
    return COR.azul;
  });

  criarOuAtualizar('histograma', 'chartHistograma', {
    type: 'bar',
    data: {
      labels: faixas.map((f) => `${f}%`),
      datasets: [{ label: 'Leituras', data: quantidades, backgroundColor: cores, borderRadius: 2,
                   barPercentage: 1, categoryPercentage: 0.98 }] // barras coladas = histograma
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, title: { display: true, text: 'Faixa de uso de CPU' } },
        y: escalaY('Nº de leituras')
      }
    }
  });
}

/** GRÁFICO DE BARRAS — alertas por dia. */
function renderizarAlertasPorDia({ labels, valores }) {
  criarOuAtualizar('alertas', 'chartAlertasDia', {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Alertas', data: valores, backgroundColor: COR.azul, borderRadius: 4, maxBarThickness: 36 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { ...escalaY(null), ticks: { precision: 0 } } // contagem: só números inteiros
      }
    }
  });
}

/* ==========================================================================
   4. INICIALIZAÇÃO
   ========================================================================== */

/** Busca todos os dados em paralelo e renderiza a tela. */
async function carregarTela(servidorId) {
  try {
    const [kpis, historico, ranking, distribuicao, alertasDia] = await Promise.all([
      obterKpis(servidorId),
      obterHistoricoCpu(servidorId),
      obterRankingSobrecarga(servidorId),
      obterDistribuicaoCpu(servidorId),
      obterAlertasPorDia(servidorId)
    ]);

    renderizarKpis(kpis);
    renderizarRanking(ranking);
    renderizarHistorico(historico);
    renderizarHistograma(distribuicao);
    renderizarAlertasPorDia(alertasDia);
  } catch (erro) {
    console.error('Erro ao carregar a Visão CPU:', erro);
  }
}

/** Sidebar: nome, cargo e iniciais vindos do sessionStorage (mesmas chaves do dashboard.js). */
function preencherUsuarioSidebar() {
  const nome = sessionStorage.getItem('NOME_USUARIO') || 'Visitante';
  const cargo = sessionStorage.getItem('CARGO_USUARIO') || 'TI Hospitalar';
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

  document.getElementById('sidebar-user-name').textContent = nome;
  document.getElementById('sidebar-user-role').textContent = cargo;
  document.getElementById('sidebar-user-avatar').textContent = iniciais;
}

document.addEventListener('DOMContentLoaded', () => {
  preencherUsuarioSidebar();

  const seletor = document.getElementById('unit-selector');
  const titulo = document.getElementById('servidor-nome');

  // Trocar o servidor atualiza o cabeçalho e recarrega todos os widgets
  seletor.addEventListener('change', () => {
    titulo.textContent = seletor.options[seletor.selectedIndex].text;
    carregarTela(seletor.value);
  });

  carregarTela(seletor.value);
});
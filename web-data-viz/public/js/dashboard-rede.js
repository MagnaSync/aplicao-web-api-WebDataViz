/**
 * MagnaSync — Visão Rede
 * Arquivo: dashboard-rede.js
 *
 * Monitoramento de Fluxo DICOM e Tráfego de Rede em Tempo Real.
 * Gráficos: Chart.js (carregado via CDN no HTML).
 *
 * ORGANIZAÇÃO DO ARQUIVO
 *   1. CONFIGURAÇÃO ............ constantes ajustáveis
 *   2. REGRAS DE CLASSIFICAÇÃO . status de banda e de latência
 *   3. CAMADA DE DADOS ......... ◄ AQUI VOCÊ CONECTA A API (4 funções)
 *   4. DADOS MOCKADOS .......... ◄ REMOVER depois de integrar a API
 *   5. RENDERIZAÇÃO ............ KPIs, gráficos e ranking (não depende da origem dos dados)
 *   6. INICIALIZAÇÃO ........... eventos e carga inicial
 *
 * COMO INTEGRAR A API
 *   Na seção 3, cada função `obter...` hoje devolve dados mockados. Para integrar,
 *   basta trocar o `return mock...` pelo `fetch` (há um exemplo comentado em cada
 *   uma) mantendo o FORMATO do objeto retornado, descrito no JSDoc de cada função.
 *   A seção 5 (renderização) não precisa ser alterada.
 */

(() => {
  'use strict';

  /* ========================================================================
   * 1. CONFIGURAÇÃO
   * ====================================================================== */
  const CONFIG = {
    // Servidor exibido ao abrir a tela (deve existir no <select id="unit-selector">)
    servidorInicial: 'pacs-01',

    // Quantidade de linhas exibidas no ranking de picos de latência
    tamanhoRanking: 5,

    // Atualização automática (polling) em milissegundos. 0 = desativado.
    // Para "tempo real", use por exemplo 5000 (recarrega tudo a cada 5 segundos).
    intervaloAtualizacaoMs: 0,

    // Limiares de utilização da banda (%).
    // O de 85% é o limiar crítico citado no relatório da Sprint 3 (tabela `parametro`);
    // o de 70% (Atenção) é uma sugestão — ajuste para os valores do seu banco.
    bandaAtencaoPct: 70,
    bandaCriticoPct: 80   
  };

  /* ========================================================================
   * 2. REGRAS DE CLASSIFICAÇÃO
   * ====================================================================== */

  /**
   * Status da utilização da banda (%).
   * @param {number} pct
   * @returns {{texto:string, badgeClass:string}}
   */
  function classificarBanda(pct) {
    if (pct >= CONFIG.bandaCriticoPct) return { texto: 'Crítico', badgeClass: 'kpi-badge critical' };
    if (pct >= CONFIG.bandaAtencaoPct) return { texto: 'Atenção', badgeClass: 'kpi-badge warn' };
    return { texto: 'Normal', badgeClass: 'kpi-badge up' };
  }

  /**
   * Status da latência (ms). Cópia das faixas de latência de classificarRede()
   * do dashboard.js, que não é carregado nesta página. Se mudarem lá, altere aqui.
   * @param {number} ms
   * @returns {{texto:string, badgeClass:string}}
   */
  function classificarLatencia(ms) {
    if (ms >= 80) return { texto: 'Crítico', badgeClass: 'kpi-badge critical' };
    if (ms > 25) return { texto: 'Atenção', badgeClass: 'kpi-badge warn' };
    return { texto: 'Estável', badgeClass: 'kpi-badge up' };
  }

  /* ========================================================================
   * 3. CAMADA DE DADOS  ◄◄◄ PONTO DE INTEGRAÇÃO COM A API
   *
   *    Todas as funções são assíncronas e recebem o id do servidor selecionado
   *    ("pacs-01", "pacs-02"...). Ajuste este id para o que a sua API espera
   *    (por exemplo, o idServidor do banco).
   *
   *    As rotas nos exemplos comentados são ILUSTRATIVAS — use as suas.
   * ====================================================================== */

  /**
   * KPIs do topo da tela.
   *
   * Formato esperado:
   * {
   *   rxMbps: 712,                // vazão de recepção atual (Mbps)
   *   txMbps: 384,                // vazão de envio atual (Mbps)
   *   utilizacaoBandaPct: 72,     // ocupação do link (%) — calculada no back-end
   *   capacidadeMbps: 1000,       // capacidade do link (ex.: 1000 = 1 Gbps)
   *   alertasAtivos24h: 2         // incidentes de sobrecarga de tráfego nas últimas 24h
   * }
   *
   * @param {string} servidorId
   * @returns {Promise<object>}
   */
  async function obterKpisRede(servidorId) {
    // const resposta = await fetch(`/rede/kpis/${servidorId}`);
    // if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    // return await resposta.json();
    return mockKpisRede(servidorId);
  }

  /**
   * Série temporal Rx x Tx (últimos 30 minutos).
   * Os três arrays devem ter o MESMO tamanho, do mais antigo ao mais novo.
   *
   * Formato esperado:
   * {
   *   labels: ["14:31", "14:32", ...],  // eixo X (texto já formatado)
   *   rxMbps: [690, 702, ...],          // linha 1 — recepção
   *   txMbps: [370, 381, ...],          // linha 2 — envio
   *   capacidadeMbps: 1000              // define o teto do eixo Y
   * }
   *
   * @param {string} servidorId
   * @returns {Promise<object>}
   */
  async function obterTrafegoRxTx(servidorId) {
    // const resposta = await fetch(`/rede/trafego/${servidorId}`);
    // if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    // return await resposta.json();
    return mockTrafegoRxTx(servidorId);
  }

  /**
   * Latência medida + previsão para os próximos minutos.
   * `historicoLabels`/`historicoMs` têm o mesmo tamanho; `previsaoLabels`/`previsaoMs` também.
   * A página liga visualmente o último ponto medido ao primeiro da previsão.
   *
   * Formato esperado:
   * {
   *   historicoLabels: ["14:16", ..., "14:30"],  // medido
   *   historicoMs: [12, 13, ...],
   *   previsaoLabels: ["14:31", ..., "14:40"],   // previsto (saída do modelo)
   *   previsaoMs: [15, 16, ...]
   * }
   *
   * @param {string} servidorId
   * @returns {Promise<object>}
   */
  async function obterPrevisaoLatencia(servidorId) {
    // const resposta = await fetch(`/rede/latencia/previsao/${servidorId}`);
    // if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    // return await resposta.json();
    return mockPrevisaoLatencia(servidorId);
  }

  /**
   * Ranking dos maiores picos de latência (um registro por intervalo de 1h).
   * Pode vir ordenado ou não: a renderização ordena por `latenciaMs` (maior primeiro)
   * e corta em CONFIG.tamanhoRanking.
   *
   * Formato esperado:
   * {
   *   picos: [
   *     { inicio: "2026-11-16T14:00:00", fim: "2026-11-16T15:00:00", latenciaMs: 64 },
   *     ...
   *   ]
   * }
   *
   * @param {string} servidorId
   * @returns {Promise<object>}
   */
  async function obterRankingPicosLatencia(servidorId) {
    // const resposta = await fetch(`/rede/latencia/ranking/${servidorId}`);
    // if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    // return await resposta.json();
    return mockRankingPicosLatencia(servidorId);
  }

  /* ========================================================================
   * 4. DADOS MOCKADOS  ◄◄◄ REMOVER ESTA SEÇÃO AO INTEGRAR A API
   *    Valores fictícios e determinísticos (sempre iguais para o mesmo servidor).
   * ====================================================================== */

  const MOCK_PONTOS_TRAFEGO = 30;   // 30 pontos x 1 min = 30 min
  const MOCK_PONTOS_LAT_HIST = 15;  // 15 min medidos
  const MOCK_PONTOS_LAT_PREV = 10;  // 10 min previstos
  const MOCK_CAPACIDADE_MBPS = 1000;

  // Perfil fictício de cada servidor
  const MOCK_PERFIS = {
    'pacs-01': {
      semente: 11, rxBase: 700, txBase: 380, oscilacao: 55, alertas: 2,
      latBase: 14, latOscilacao: 4, latTendencia: 0.9,
      ranking: [[1, 14, 64], [2, 10, 52], [4, 16, 41], [5, 9, 33], [6, 15, 27]] // [diasAtrás, hora, ms]
    },
    'pacs-02': {
      semente: 23, rxBase: 320, txBase: 210, oscilacao: 40, alertas: 0,
      latBase: 9, latOscilacao: 2, latTendencia: 0.2,
      ranking: [[1, 9, 38], [3, 11, 31], [4, 15, 26], [6, 8, 21], [7, 13, 18]]
    },
    'pacs-03': {
      semente: 37, rxBase: 880, txBase: 450, oscilacao: 45, alertas: 5,
      latBase: 46, latOscilacao: 12, latTendencia: 3.2,
      ranking: [[0, 16, 112], [1, 13, 96], [2, 10, 84], [4, 14, 71], [5, 9, 58]]
    }
  };

  const mockPerfil = (id) => MOCK_PERFIS[id] || MOCK_PERFIS[CONFIG.servidorInicial];
  const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

  /** Gerador pseudo-aleatório determinístico (mulberry32). */
  function criarGerador(semente) {
    let s = semente >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Rótulos HH:MM de `quantidade` minutos, começando `offsetMin` minutos a partir de agora. */
  function mockRotulosMinutos(quantidade, offsetMin) {
    const agoraMin = Math.floor(Date.now() / 60000);
    return Array.from({ length: quantidade }, (_, i) =>
      new Date((agoraMin + offsetMin + i) * 60000)
        .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );
  }

  async function mockTrafegoRxTx(servidorId) {
    const perfil = mockPerfil(servidorId);
    const aleatorio = criarGerador(perfil.semente);
    const variar = (base) =>
      Math.round(limitar(base + (aleatorio() * 2 - 1) * perfil.oscilacao, 0, MOCK_CAPACIDADE_MBPS));

    const rxMbps = [];
    const txMbps = [];
    for (let i = 0; i < MOCK_PONTOS_TRAFEGO; i++) {
      rxMbps.push(variar(perfil.rxBase));
      txMbps.push(variar(perfil.txBase));
    }

    return {
      // termina no minuto atual: offset = -(N - 1)
      labels: mockRotulosMinutos(MOCK_PONTOS_TRAFEGO, -(MOCK_PONTOS_TRAFEGO - 1)),
      rxMbps,
      txMbps,
      capacidadeMbps: MOCK_CAPACIDADE_MBPS
    };
  }

  async function mockKpisRede(servidorId) {
    const perfil = mockPerfil(servidorId);
    const { rxMbps, txMbps, capacidadeMbps } = await mockTrafegoRxTx(servidorId);
    const rx = rxMbps[rxMbps.length - 1];
    const tx = txMbps[txMbps.length - 1];

    return {
      rxMbps: rx,
      txMbps: tx,
      utilizacaoBandaPct: Math.round((Math.max(rx, tx) / capacidadeMbps) * 100),
      capacidadeMbps,
      alertasAtivos24h: perfil.alertas
    };
  }

  async function mockPrevisaoLatencia(servidorId) {
    const perfil = mockPerfil(servidorId);
    const aleatorio = criarGerador(perfil.semente + 100);

    const historicoMs = Array.from({ length: MOCK_PONTOS_LAT_HIST }, () =>
      Math.round(Math.max(1, perfil.latBase + (aleatorio() * 2 - 1) * perfil.latOscilacao)));

    // Previsão fictícia: continua a partir do último valor medido com a tendência do perfil
    const ultimo = historicoMs[historicoMs.length - 1];
    const previsaoMs = Array.from({ length: MOCK_PONTOS_LAT_PREV }, (_, i) =>
      Math.round(Math.max(1, ultimo + perfil.latTendencia * (i + 1) + (aleatorio() * 2 - 1))));

    return {
      historicoLabels: mockRotulosMinutos(MOCK_PONTOS_LAT_HIST, -(MOCK_PONTOS_LAT_HIST - 1)),
      historicoMs,
      previsaoLabels: mockRotulosMinutos(MOCK_PONTOS_LAT_PREV, 1),
      previsaoMs
    };
  }

  async function mockRankingPicosLatencia(servidorId) {
    const perfil = mockPerfil(servidorId);
    return {
      picos: perfil.ranking.map(([diasAtras, hora, latenciaMs]) => {
        const inicio = new Date();
        inicio.setDate(inicio.getDate() - diasAtras);
        inicio.setHours(hora, 0, 0, 0);
        const fim = new Date(inicio.getTime() + 60 * 60 * 1000);
        return { inicio: inicio.toISOString(), fim: fim.toISOString(), latenciaMs };
      })
    };
  }

  /* ========================================================================
   * 5. RENDERIZAÇÃO (independe da origem dos dados)
   * ====================================================================== */

  let graficoTrafego = null;
  let graficoLatencia = null;
  let totalPontosMedidos = 0; // usado pelo tooltip do gráfico de previsão

  /* ---------- Utilitários de DOM ---------- */

  /** Cria um elemento com classe e texto. Usa textContent (seguro contra XSS com dados da API). */
  function criarElemento(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function definirTexto(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
  }

  function definirBadge(id, texto, badgeClass) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = texto;
    el.className = badgeClass;
  }

  function mostrarErro(mensagem) {
    const caixa = document.getElementById('rede-feedback');
    if (!caixa) return;
    caixa.textContent = mensagem;
    caixa.style.display = mensagem ? 'flex' : 'none';
  }

  const formatarMbps = (v) => `${Number(v).toLocaleString('pt-BR')} Mbps`;

  /* ---------- Padrões visuais do Chart.js (identidade MagnaSync) ---------- */

  function configurarPadroesChart() {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#8a9dbf';
  }

  const COR_RX = '#1A4A87';
  const COR_TX = '#6366f1';

  const TOOLTIP_PADRAO = {
    backgroundColor: '#0B192C',
    titleColor: '#ffffff',
    bodyColor: '#e2e8f0',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    padding: 10,
    boxPadding: 4,
    usePointStyle: true,
    cornerRadius: 6,
    titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: '700' },
    bodyFont: { family: "'Inter', sans-serif", size: 12 }
  };

  const LEGENDA_PADRAO = {
    position: 'top',
    align: 'end',
    labels: {
      usePointStyle: true,
      pointStyle: 'circle',
      boxWidth: 8,
      boxHeight: 8,
      padding: 10,
      color: '#273E63',
      font: { family: "'Inter', sans-serif", size: 12.5, weight: '600' }
    }
  };

  const GRADE_Y = { color: 'rgba(39, 62, 99, 0.08)' };
  const TICKS = { color: '#8a9dbf', font: { family: "'Inter', sans-serif", size: 11 } };
  const TICKS_X = { ...TICKS, maxTicksLimit: 8, maxRotation: 0 }; // evita rótulos apertados

  /** Degradê sob a linha; calculado a partir da área do gráfico para acompanhar o redimensionamento. */
  function degrade(corRgb) {
    return (contexto) => {
      const { chart } = contexto;
      const { ctx, chartArea } = chart;
      if (!chartArea) return 'transparent'; // primeira passada, antes do layout
      const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      g.addColorStop(0, `rgba(${corRgb}, 0.28)`);
      g.addColorStop(1, `rgba(${corRgb}, 0)`);
      return g;
    };
  }

  const estiloLinha = (cor) => ({
    borderColor: cor,
    tension: 0.38,
    borderWidth: 2.5,
    pointBackgroundColor: cor,
    pointBorderColor: '#ffffff',
    pointBorderWidth: 2,
    pointRadius: 2.5,
    pointHoverRadius: 6
  });

  /* ---------- Criação dos gráficos (uma única vez) ---------- */

  /** Gráfico 1 — Linhas duplas: Rx x Tx (Mbps). */
  function criarGraficoTrafego() {
    const canvas = document.getElementById('chartTrafegoRxTx');
    if (!canvas) return;

    graficoTrafego = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Recepção (Rx)',
            data: [],
            ...estiloLinha(COR_RX),
            backgroundColor: degrade('26, 74, 135'),
            fill: true
          },
          {
            label: 'Envio (Tx)',
            data: [],
            ...estiloLinha(COR_TX),
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: LEGENDA_PADRAO,
          tooltip: {
            ...TOOLTIP_PADRAO,
            callbacks: {
              label: (c) => ` ${c.dataset.label}: ${formatarMbps(c.parsed.y)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: TICKS_X },
          y: {
            beginAtZero: true,
            suggestedMax: MOCK_CAPACIDADE_MBPS, // sobrescrito com capacidadeMbps da API
            grid: GRADE_Y,
            ticks: TICKS,
            title: { display: true, text: 'Mbps', color: '#8a9dbf', font: { size: 11 } }
          }
        }
      }
    });
  }

  /** Gráfico 2 — Latência medida (linha cheia) + previsão (tracejada). */
  function criarGraficoLatencia() {
    const canvas = document.getElementById('chartPrevisaoLatencia');
    if (!canvas) return;

    graficoLatencia = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Latência medida',
            data: [],
            ...estiloLinha(COR_RX),
            backgroundColor: degrade('26, 74, 135'),
            fill: true
          },
          {
            label: 'Previsão',
            data: [],
            ...estiloLinha(COR_TX),
            borderDash: [6, 4], // tracejada: deixa claro que é estimativa
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: LEGENDA_PADRAO,
          tooltip: {
            ...TOOLTIP_PADRAO,
            // O último ponto medido é repetido na série de previsão só para ligar as linhas;
            // aqui escondemos essa duplicata do tooltip.
            filter: (item) => !(item.datasetIndex === 1 && item.dataIndex === totalPontosMedidos - 1),
            callbacks: {
              label: (c) => ` ${c.dataset.label}: ${c.parsed.y} ms`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: TICKS_X },
          y: {
            beginAtZero: true,
            grid: GRADE_Y,
            ticks: { ...TICKS, callback: (v) => `${v} ms` }
          }
        }
      }
    });
  }

  /* ---------- Atualização dos componentes com os dados recebidos ---------- */

  /** @param {object} d Resultado de obterKpisRede() */
  function renderizarKpis(d) {
    definirTexto('kpi-rx', formatarMbps(d.rxMbps));
    definirTexto('kpi-tx', formatarMbps(d.txMbps));

    const banda = classificarBanda(d.utilizacaoBandaPct);
    definirTexto('kpi-banda', `${d.utilizacaoBandaPct}%`);
    definirBadge('kpi-banda-badge', banda.texto, banda.badgeClass);

    // Capacidade do link no tooltip do card (ex.: "72% de 1.000 Mbps")
    const cardBanda = document.getElementById('kpi-banda')?.closest('.kpi-card');
    if (cardBanda && d.capacidadeMbps) {
      cardBanda.title = `${d.utilizacaoBandaPct}% de ${formatarMbps(d.capacidadeMbps)}`;
    }

    definirTexto('kpi-alertas', String(d.alertasAtivos24h));
    if (d.alertasAtivos24h > 0) {
      definirBadge('kpi-alertas-badge', 'Relatados', 'kpi-badge warn');
    } else {
      definirBadge('kpi-alertas-badge', 'Nenhum', 'kpi-badge up');
    }
  }

  /** @param {object} d Resultado de obterTrafegoRxTx() */
  function renderizarTrafego(d) {
    if (!graficoTrafego) return;
    graficoTrafego.data.labels = d.labels;
    graficoTrafego.data.datasets[0].data = d.rxMbps;
    graficoTrafego.data.datasets[1].data = d.txMbps;
    if (d.capacidadeMbps) graficoTrafego.options.scales.y.suggestedMax = d.capacidadeMbps;
    graficoTrafego.update();
  }

  /** @param {object} d Resultado de obterPrevisaoLatencia() */
  function renderizarLatencia(d) {
    if (!graficoLatencia) return;

    totalPontosMedidos = d.historicoMs.length;
    const vazioMedido = new Array(d.previsaoMs.length).fill(null);
    const vazioPrevisto = new Array(Math.max(0, totalPontosMedidos - 1)).fill(null);
    const ultimoMedido = d.historicoMs[totalPontosMedidos - 1];

    graficoLatencia.data.labels = [...d.historicoLabels, ...d.previsaoLabels];
    // série 1: medido + vazio no trecho previsto
    graficoLatencia.data.datasets[0].data = [...d.historicoMs, ...vazioMedido];
    // série 2: vazio no trecho medido, exceto o último ponto (liga as linhas) + previsão
    graficoLatencia.data.datasets[1].data = [...vazioPrevisto, ultimoMedido, ...d.previsaoMs];
    graficoLatencia.update();
  }

  /** "2026-11-16T14:00:00" -> "16/11/2026" */
  const formatarData = (iso) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  /** "2026-11-16T14:00:00" -> "14h" */
  const formatarHora = (iso) => `${new Date(iso).getHours()}h`;

  /** @param {object} d Resultado de obterRankingPicosLatencia() */
  function renderizarRanking(d) {
    const lista = document.getElementById('ranking-rede-lista');
    if (!lista) return;
    lista.replaceChildren();

    const picos = [...d.picos]
      .sort((a, b) => b.latenciaMs - a.latenciaMs)
      .slice(0, CONFIG.tamanhoRanking);

    if (picos.length === 0) {
      const vazio = criarElemento('li', 'empty-state');
      vazio.appendChild(criarElemento('p', '', 'Nenhum pico registrado no período.'));
      lista.appendChild(vazio);
      return;
    }

    picos.forEach((pico, indice) => {
      const status = classificarLatencia(pico.latenciaMs);

      const item = criarElemento('li', 'ranking-item');
      item.appendChild(criarElemento('span', 'ranking-pos', String(indice + 1)));

      const quando = criarElemento('div', 'ranking-when');
      quando.appendChild(criarElemento('strong', '', formatarData(pico.inicio)));
      quando.appendChild(criarElemento('small', '', `${formatarHora(pico.inicio)} – ${formatarHora(pico.fim)}`));
      item.appendChild(quando);

      const valor = criarElemento('div', 'ranking-value');
      valor.appendChild(criarElemento('strong', '', `${pico.latenciaMs} ms`));
      valor.appendChild(criarElemento('span', status.badgeClass, status.texto));
      item.appendChild(valor);

      lista.appendChild(item);
    });
  }

  /* ========================================================================
   * 6. INICIALIZAÇÃO
   * ====================================================================== */

  // Evita que uma resposta antiga sobrescreva a de uma troca de servidor mais recente
  let ultimaRequisicao = 0;

  /** Busca todos os dados do servidor e atualiza a tela. */
  async function carregarPainel(servidorId) {
    const requisicao = ++ultimaRequisicao;

    try {
      const [kpis, trafego, latencia, ranking] = await Promise.all([
        obterKpisRede(servidorId),
        obterTrafegoRxTx(servidorId),
        obterPrevisaoLatencia(servidorId),
        obterRankingPicosLatencia(servidorId)
      ]);

      if (requisicao !== ultimaRequisicao) return; // resposta obsoleta

      mostrarErro('');
      renderizarKpis(kpis);
      renderizarTrafego(trafego);
      renderizarLatencia(latencia);
      renderizarRanking(ranking);
    } catch (erro) {
      console.error('[Visão Rede] Falha ao carregar os dados:', erro);
      if (requisicao === ultimaRequisicao) {
        mostrarErro('Não foi possível carregar os dados de rede. Verifique a conexão e tente novamente.');
      }
    }
  }

  /** Nome e cargo do usuário logado (mesma fonte usada no dashboard.js). */
  function atualizarPerfilSidebar() {
    const nome = sessionStorage.getItem('NOME_USUARIO') || 'Visitante';
    const cargo = sessionStorage.getItem('CARGO_USUARIO') || 'TI Hospitalar';

    definirTexto('sidebar-user-name', nome);
    definirTexto('sidebar-user-role', cargo);

    const partes = nome.trim().split(' ');
    const iniciais = partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '');
    definirTexto('sidebar-user-avatar', iniciais.toUpperCase());
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof Chart === 'undefined') {
      mostrarErro('Não foi possível carregar a biblioteca de gráficos (Chart.js). Verifique sua conexão.');
      return;
    }

    configurarPadroesChart();
    criarGraficoTrafego();
    criarGraficoLatencia();
    atualizarPerfilSidebar();

    // Troca de servidor: atualiza o título da topbar e recarrega todos os dados
    const seletor = document.getElementById('unit-selector');
    if (seletor) {
      seletor.value = CONFIG.servidorInicial;
      seletor.addEventListener('change', () => {
        definirTexto('unit-title', seletor.options[seletor.selectedIndex].text);
        carregarPainel(seletor.value);
      });
    }

    const servidorAtual = () => (seletor ? seletor.value : CONFIG.servidorInicial);

    carregarPainel(servidorAtual());

    if (CONFIG.intervaloAtualizacaoMs > 0) {
      setInterval(() => carregarPainel(servidorAtual()), CONFIG.intervaloAtualizacaoMs);
    }
  });
})();

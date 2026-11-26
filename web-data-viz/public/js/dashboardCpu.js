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

// Janela do histórico (em minutos). Cada ponto = 1 leitura por minuto.
const JANELA_HISTORICO_MIN = 60;

// Duração de cada período do ranking de sobrecarga (em minutos)
const PERIODO_RANKING_MIN = 30;

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
let proximaAtualizacao;

const AJUSTE_MOCK = { '1': 0, '2': 8, '3': -6 };
const ajuste = (id) => AJUSTE_MOCK[id] ?? 0;
const limitar = (v) => Math.max(1, Math.min(100, Math.round(v)));

/**
 * KPIs do topo.
 * @returns {Promise<{alertas7d:number, usoMedio:number, Pico_Leituras:number, minutosEmAlerta:number}>}
 */
async function obterKpis(id_equipamento) {
    const a = ajuste(id_equipamento);

    const [respostaAlertas, respostaMedia, respostaPico, respostaTempo] = await Promise.all([
        obterAlertasCpu7dias(id_equipamento),
        obterUsoMedio(id_equipamento),
        obterPicoCpu(id_equipamento),
        obterTempoAcumuladoAlerta(id_equipamento)
    ]);

    return {
        alertas7d: Number(respostaAlertas[0]?.Total_Alertas ?? 0),
        usoMedio: Number(respostaMedia[0]?.usoMedio ?? 0),
        pico: Number(respostaPico[0]?.Pico_Leituras ?? 0),
        minutosEmAlerta: Number(respostaTempo[0]?.minutosEmAlerta ?? 0)
    };
}

async function obterUsoMedio(id_equipamento) {
  const response = await fetch(
    `/cpu/usoMedioCpu/${id_equipamento}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error(`Erro HTTP ${response.status}`);
  }

  const resposta = await response.json();

  return resposta;
}

async function obterPicoCpu(id_equipamento) {
    const response = await fetch(
        `/cpu/picoCpu/${id_equipamento}`,
        { cache: 'no-store' }
    );

    if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
    }

    return await response.json();
}

async function obterAlertasCpu7dias(id_equipamento) {
    const response = await fetch(
        `/cpu/alertasCpu7dias/${id_equipamento}`,
        { cache: 'no-store' }
    );

    if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
    }

    return await response.json();
}

async function obterTempoAcumuladoAlerta(id_equipamento) {
    const response = await fetch(
        `/cpu/tempoAcumuladoAlerta/${id_equipamento}`,
        { cache: 'no-store' }
    );

    if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
    }

    return await response.json();
}



/**
 * Histórico de uso de CPU (gráfico de linhas) — 1 leitura por minuto.
 * Mesmo formato da tabela `leitura` (data_hora + valor), então a resposta do
 * banco pode ser repassada direto, sem mapeamento.
 * @returns {Promise<Array<{data_hora:string, valor:number}>>}
 *          data_hora = momento da captura (DATETIME/ISO), em ordem crescente; valor = % de CPU
 */


async function obterHistoricoCpu(id_equipamento) {
    const response = await fetch(
        `/cpu/historicoDados/${id_equipamento}`,
        { cache: "no-store" }
    );

    if (!response.ok) {
        throw new Error(
            `Erro HTTP ${response.status} ao buscar histórico da CPU`
        );
    }

    const resposta = await response.json();

    if (!Array.isArray(resposta)) {
        throw new Error("A API não retornou um array de leituras");
    }

    return resposta;
}

/**
 * Top períodos com maior sobrecarga (ranking) — janelas de PERIODO_RANKING_MIN (30 min).
 * @returns {Promise<Array<{data:string, inicio:string, fim:string, usoMedio:number}>>}
 *          data ISO (YYYY-MM-DD); inicio/fim "HH:MM"; ordenado do maior para o menor usoMedio
 */
async function obterRanking(id_equipamento) {
    const response = await fetch(
        `/cpu/rankingCpu/${id_equipamento}`,
        { cache: 'no-store' }
    );

    if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
    }

    const resposta = await response.json();

    return resposta.map((registro) => {
        const [data, inicio] = registro.intervalo_30_min.split(' ');

        const [hora, minuto] = inicio.split(':').map(Number);

        const minutosFim = hora * 60 + minuto + 30;

        const horaFim = Math.floor(minutosFim / 60) % 24;
        const minutoFim = minutosFim % 60;

        const fim =
            String(horaFim).padStart(2, '0') + ':' +
            String(minutoFim).padStart(2, '0');

        return {
            data: data,
            inicio: inicio,
            fim: fim,
            usoMedio: Number(registro.media_uso)
        };
    });
}

/**
 * Distribuição por faixa (histograma). Faixas de 10 em 10 pontos percentuais.
 * @returns {Promise<{faixas:string[], quantidades:number[]}>}
 */
async function obterDistribuicaoCpu(id_equipamento) {
    const response = await fetch(
        `/cpu/histogramaCpu/${id_equipamento}`,
        { cache: 'no-store' }
    );

    if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
    }

    const resposta = await response.json();

    const faixas = [
        '0-10', '10-20', '20-30', '30-40',
        '40-50', '50-60', '60-70', '70-80',
        '80-90', '90-100'
    ];

    const quantidades = Array(10).fill(0);

    resposta.forEach((registro) => {
        const indice = Number(registro.inicio_intervalo) / 10;

        quantidades[indice] = Number(registro.numero_leituras);
    });

    console.log("Dados do histograma:", resposta);
    console.log("Faixas:", faixas);
    console.log("Quantidades:", quantidades);

    return { faixas, quantidades };
}

/**
 * Alertas por dia (gráfico de barras).
 * @returns {Promise<{labels:string[], valores:number[]}>}
 */
async function obterAlertasPorDia(id_equipamento) {
    const response = await fetch(
        `/cpu/alertasPorDia/${id_equipamento}`,
        { cache: 'no-store' }
    );

    if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
    }

    const resposta = await response.json();

    const labels = [];
    const valores = [];

    for (let i = 6; i >= 0; i--) {
        const data = new Date();

        data.setDate(data.getDate() - i);

        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');

        const dataCompleta = `${ano}-${mes}-${dia}`;

        const registro = resposta.find(
            (r) => r.dia === dataCompleta
        );

        labels.push(`${dia}/${mes}`);

        valores.push(
            registro ? Number(registro.quantidade_alertas) : 0
        );
    }

    console.log("Alertas por dia:", resposta);
    console.log("Labels:", labels);
    console.log("Valores:", valores);

    return { labels, valores };
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
      <span class="periodo">${formatarData(item.data)} &middot; ${item.inicio} – ${item.fim}</span>
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

/** "2026-11-16T19:05:00" -> "19:05" (hora da captura, no fuso do navegador) */
function formatarHoraCaptura(dataHora) {
  return new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** GRÁFICO DE LINHAS — uso de CPU a cada 1 min + linhas de limite. */
function renderizarHistorico(resposta) {

    if (!Array.isArray(resposta) || resposta.length === 0) {
        console.warn("Nenhuma leitura de CPU encontrada.");
        return;
    }

    // Transformando os dados recebidos do MySQL
    const labels = resposta.map((leitura) =>
        formatarHoraCaptura(leitura.data_hora)
    );

    const valores = resposta.map((leitura) =>
        Number(leitura.valor)
    );

    // Exibindo os dados no console
    console.log("--------------------------------");
    console.log("Dados recebidos do backend:", resposta);
    console.log("Horários das leituras:", labels);
    console.log("Valores de CPU:", valores);
    console.log("--------------------------------");

    // Função para criar as linhas de limite
    const limite = (valor, cor, nome) => ({
        label: nome,
        data: labels.map(() => valor),
        borderColor: cor,
        borderDash: [6, 4],
        borderWidth: 1.2,
        pointRadius: 0
    });

    // Criando ou atualizando o gráfico
    criarOuAtualizar('historico', 'chartHistoricoCpu', {

        type: 'line',

        data: {
            labels: labels,

            datasets: [
                {
                    label: 'Uso de CPU (%)',
                    data: valores,
                    borderColor: COR.azul,
                    backgroundColor: 'rgba(26, 74, 135, 0.12)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointHoverRadius: 5
                },

                limite(
                    LIMITES_CPU.atencao,
                    COR.ambar,
                    'Atenção (80%)'
                ),

                limite(
                    LIMITES_CPU.critico,
                    COR.vermelho,
                    'Crítico (90%)'
                )
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
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 12,
                        maxRotation: 0
                    }
                },

                y: escalaY('%', 100)
            }
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
async function carregarTela(id_equipamento) {
  try {
    const [kpis, historico, ranking, distribuicao, alertasDia] = await Promise.all([
      obterKpis(id_equipamento),
      obterHistoricoCpu(id_equipamento),
      obterRanking(id_equipamento),
      obterDistribuicaoCpu(id_equipamento),
      obterAlertasPorDia(id_equipamento)
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

  setInterval(() => {
    carregarTela(seletor.value);
}, 60000);
});

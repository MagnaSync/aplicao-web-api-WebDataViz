/* ==========================================================================
   MagnaSync — Dashboard de Memória RAM
   Arquivo: dashboard-ram.js

   Etapa atual: FRONT-END com dados simulados (mock).
   Para ligar no back-end depois, basta trocar o corpo de `obterDadosRam()`
   por um fetch na rota Python (veja o comentário dentro da função).
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. CONFIGURAÇÃO
   -------------------------------------------------------------------------- */
const RAM_CONFIG = {
  // Chaves do sessionStorage gravadas no login — AJUSTE para as chaves reais do grupo
  CHAVE_NOME: 'NOME_USUARIO',
  CHAVE_CARGO: 'CARGO_USUARIO',

  // Limites de alerta (batem com categoria_alerta: Atenção / Crítico)
  LIMITE_ATENCAO: 70,
  LIMITE_CRITICO: 85,

  // Atualização automática (ms)
  INTERVALO_ATUALIZACAO: 5000,

  // true = usa dados simulados. Mudar para false quando a rota do back existir.
  USAR_MOCK: true,

  // Só para desenvolvimento: se não houver sessão, simula o Carlos (Analista).
  // DESLIGUE (false) antes de entregar.
  MODO_DEV: true
};

/* --------------------------------------------------------------------------
   2. SESSÃO (validação de cargo removida temporariamente)
   -------------------------------------------------------------------------- */
function normalizarTexto(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function obterSessao() {
  let nome = sessionStorage.getItem(RAM_CONFIG.CHAVE_NOME);
  let cargo = sessionStorage.getItem(RAM_CONFIG.CHAVE_CARGO);

  if ((!nome || !cargo) && RAM_CONFIG.MODO_DEV) {
    nome = 'Carlos';
    cargo = 'Analista';
  }
  return { nome, cargo };
}

function preencherSidebar(sessao) {
  const nome = sessao.nome || 'Usuário';
  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');

  document.getElementById('sidebar-user-avatar').textContent = iniciais;
  document.getElementById('sidebar-user-name').textContent = nome;
  document.getElementById('sidebar-user-role').textContent = sessao.cargo || '';
}

/* --------------------------------------------------------------------------
   3. DADOS
   -------------------------------------------------------------------------- */
/* Servidores monitorados. A chave é o equipamento.id do banco (value do <select>).
   No mock cada máquina tem perfil próprio; com o back, este mapa some e o nome
   passa a vir do banco. */
const SERVIDORES_MOCK = {
  1: {
    nome: 'Servidor PACS 01 – Armazenamento Principal',
    total_gb: 32, base: 58, oscilacao: 4,
    processos: [
      { nome: 'dcm4chee-arc', pid: 1204, mb: 6800 },
      { nome: 'postgres', pid: 982, mb: 4200 },
      { nome: 'java (indexador DICOM)', pid: 2310, mb: 3100 },
      { nome: 'nginx', pid: 811, mb: 1250 },
      { nome: 'python (agente MagnaSync)', pid: 3340, mb: 480 }
    ],
    alertas: { atencao: 6, critico: 2, pico: 1 }
  },
  2: {
    nome: 'Servidor PACS 02 – Contingência',
    total_gb: 16, base: 31, oscilacao: 2,
    processos: [
      { nome: 'dcm4chee-arc (standby)', pid: 760, mb: 2100 },
      { nome: 'rsync', pid: 1890, mb: 980 },
      { nome: 'postgres', pid: 640, mb: 870 },
      { nome: 'nginx', pid: 512, mb: 310 },
      { nome: 'python (agente MagnaSync)', pid: 2201, mb: 260 }
    ],
    alertas: { atencao: 1, critico: 0, pico: 0 }
  },
  3: {
    nome: 'Servidor PACS 03 – Indexação DICOM',
    total_gb: 64, base: 82, oscilacao: 5,
    processos: [
      { nome: 'java (indexador DICOM)', pid: 4120, mb: 21800 },
      { nome: 'elasticsearch', pid: 1503, mb: 15400 },
      { nome: 'postgres', pid: 1102, mb: 6900 },
      { nome: 'dcm4chee-arc', pid: 1960, mb: 4300 },
      { nome: 'python (agente MagnaSync)', pid: 5230, mb: 520 }
    ],
    alertas: { atencao: 14, critico: 5, pico: 3 }
  }
};

const mockEstado = { servidorId: null, cfg: null, serie: [], valorAtual: 0 };

function horaAgora(data = new Date()) {
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function limitar(valor, min, max) {
  return Math.min(max, Math.max(min, valor));
}

function proximoValorMock() {
  const { base, oscilacao } = mockEstado.cfg;
  // volta suavemente para a média do servidor + ruído
  mockEstado.valorAtual = limitar(
    mockEstado.valorAtual + (base - mockEstado.valorAtual) * 0.05 + (Math.random() - 0.5) * oscilacao,
    20,
    98
  );
  return Number(mockEstado.valorAtual.toFixed(1));
}

/* Reinicia a série quando o servidor selecionado muda */
function iniciarSerieMock(servidorId) {
  mockEstado.servidorId = servidorId;
  mockEstado.cfg = SERVIDORES_MOCK[servidorId] || SERVIDORES_MOCK[1];
  mockEstado.valorAtual = mockEstado.cfg.base;
  mockEstado.serie = [];

  const agora = Date.now();
  for (let i = 59; i >= 0; i--) {
    mockEstado.serie.push({
      hora: horaAgora(new Date(agora - i * 60000)),
      valor: proximoValorMock()
    });
  }
}

function gerarDadosMock(servidorId) {
  if (mockEstado.servidorId !== servidorId) iniciarSerieMock(servidorId);

  mockEstado.serie.push({ hora: horaAgora(), valor: proximoValorMock() });
  if (mockEstado.serie.length > 60) mockEstado.serie.shift();

  const cfg = mockEstado.cfg;
  const atual = mockEstado.serie[mockEstado.serie.length - 1].valor;
  const usada = Number(((atual / 100) * cfg.total_gb).toFixed(1));
  const pico = mockEstado.serie.reduce((max, p) => (p.valor > max.valor ? p : max));

  return {
    servidor_id: servidorId,
    servidor_nome: cfg.nome,
    total_gb: cfg.total_gb,
    usada_gb: usada,
    disponivel_gb: Number((cfg.total_gb - usada).toFixed(1)),
    percentual: atual,
    pico: { valor: pico.valor, hora: pico.hora },
    historico: mockEstado.serie.slice(),
    processos: cfg.processos.map((p) => ({ ...p, mb: Math.round(p.mb * (0.95 + Math.random() * 0.1)) })),
    alertas: { ...cfg.alertas },
    atualizado_em: new Date().toISOString()
  };
}

/**
 * Ponto único de entrada de dados da tela.
 * `equipamentoId` = valor do <select> = equipamento.id no banco.
 *
 * Formato esperado (o back deve devolver exatamente isto):
 * {
 *   servidor_nome,                                          // ex.: nome/identificação da máquina
 *   total_gb, usada_gb, disponivel_gb, percentual,
 *   pico: { valor, hora },
 *   historico: [ { hora: 'HH:MM', valor: 63.2 }, ... ],     // últimos 60 min
 *   processos: [ { nome, pid, mb }, ... ],                  // top 5
 *   alertas: { atencao, critico, pico },
 *   atualizado_em: ISO-8601
 * }
 */
async function obterDadosRam(equipamentoId) {
  if (RAM_CONFIG.USAR_MOCK) {
    return gerarDadosMock(equipamentoId);
  }

  // FUTURO (etapa do back-end): o id vai para a rota e daí para o WHERE.
  // const resposta = await fetch(`/ram/${equipamentoId}`);
  // if (!resposta.ok) throw new Error('Falha ao buscar dados de RAM');
  // return await resposta.json();
  //
  // No Python/SQL, algo nesta linha (valores sempre via parâmetro, nunca concatenados):
  //   SELECT l.valor, l.data_hora
  //   FROM leitura l
  //   JOIN componente c      ON c.id = l.fkComponente
  //   JOIN tipoComponente t  ON t.id = c.fkTipo
  //   WHERE l.fkEquipamento = %s
  //     AND t.tipo = 'Ram'
  //     AND l.data_hora >= NOW() - INTERVAL 60 MINUTE
  //   ORDER BY l.data_hora;
  throw new Error('Rota de RAM ainda não configurada.');
}

/* --------------------------------------------------------------------------
   4. RENDERIZAÇÃO
   -------------------------------------------------------------------------- */
function classificarUso(percentual) {
  if (percentual >= RAM_CONFIG.LIMITE_CRITICO) {
    return { nivel: 'critical', texto: 'Crítico', gauge: 'Uso crítico' };
  }
  if (percentual >= RAM_CONFIG.LIMITE_ATENCAO) {
    return { nivel: 'warn', texto: 'Atenção', gauge: 'Uso em atenção' };
  }
  return { nivel: 'up', texto: 'Seguro', gauge: 'Dentro do limite seguro' };
}

function definirTexto(id, texto) {
  document.getElementById(id).textContent = texto;
}

function formatarGb(valor) {
  return `${valor.toFixed(1).replace('.', ',')} GB`;
}

function formatarPct(valor) {
  return `${valor.toFixed(1).replace('.', ',')}%`;
}

function formatarMemoria(mb) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1).replace('.', ',')} GB` : `${mb} MB`;
}

function renderizarKpis(d) {
  const estado = classificarUso(d.percentual);

  definirTexto('kpi-ram-uso', formatarPct(d.percentual));
  const badge = document.getElementById('kpi-ram-uso-badge');
  badge.textContent = estado.texto;
  badge.className = `kpi-badge ${estado.nivel}`;

  definirTexto('kpi-ram-utilizada', formatarGb(d.usada_gb));
  definirTexto('kpi-ram-disponivel', formatarGb(d.disponivel_gb));
  definirTexto('kpi-ram-pico', formatarPct(d.pico.valor));
  definirTexto('kpi-ram-pico-hora', d.pico.hora);
}

function renderizarSaude(d) {
  const estado = classificarUso(d.percentual);

  document.getElementById('ram-gauge-score').innerHTML =
    `${Math.round(d.percentual)}<small>%</small>`;

  const rotulo = document.getElementById('ram-gauge-label');
  rotulo.textContent = estado.gauge;
  rotulo.className = `gauge-label${estado.nivel === 'up' ? '' : ' ' + estado.nivel}`;

  const barra = document.getElementById('ram-bar');
  barra.setAttribute('aria-valuenow', Math.round(d.percentual));
  const preenchimento = document.getElementById('ram-bar-fill');
  preenchimento.style.width = `${d.percentual}%`;
  preenchimento.className = `ram-bar-fill${estado.nivel === 'up' ? '' : ' ' + estado.nivel}`;

  definirTexto('ram-total', formatarGb(d.total_gb));
  definirTexto('ram-em-uso', formatarGb(d.usada_gb));
  definirTexto('ram-disponivel', formatarGb(d.disponivel_gb));
  definirTexto('ram-percentual', formatarPct(d.percentual));
}

function renderizarProcessos(processos) {
  const container = document.getElementById('ram-processos');
  container.replaceChildren();

  if (!processos || processos.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'empty-state';
    vazio.innerHTML = '<p>Nenhum processo reportado nesta leitura.</p>';
    container.appendChild(vazio);
    return;
  }

  const maior = Math.max(...processos.map((p) => p.mb));

  processos.forEach((p) => {
    const item = document.createElement('div');
    item.className = 'process-item';

    const nome = document.createElement('div');
    nome.className = 'process-name';
    const titulo = document.createElement('strong');
    titulo.textContent = p.nome;
    const pid = document.createElement('small');
    pid.textContent = `PID ${p.pid}`;
    nome.append(titulo, pid);

    const trilho = document.createElement('div');
    trilho.className = 'process-track';
    const fill = document.createElement('div');
    fill.className = 'process-fill';
    fill.style.width = `${(p.mb / maior) * 100}%`;
    trilho.appendChild(fill);

    const valor = document.createElement('span');
    valor.className = 'process-value';
    valor.textContent = formatarMemoria(p.mb);

    item.append(nome, trilho, valor);
    container.appendChild(item);
  });
}

function renderizarAlertas(alertas) {
  definirTexto('alerta-atencao-rotulo', `Uso acima de ${RAM_CONFIG.LIMITE_ATENCAO}%`);
  definirTexto('alerta-critico-rotulo', `Uso crítico acima de ${RAM_CONFIG.LIMITE_CRITICO}%`);
  definirTexto('alerta-atencao-qtd', alertas.atencao);
  definirTexto('alerta-critico-qtd', alertas.critico);
  definirTexto('alerta-pico-qtd', alertas.pico);
}

/* ---------- Gráfico de linhas ---------- */
let graficoRam = null;

function criarGrafico() {
  const ctx = document.getElementById('chartRamHistorico').getContext('2d');

  graficoRam = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Uso de RAM (%)',
          data: [],
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4
        },
        {
          label: `Atenção (${RAM_CONFIG.LIMITE_ATENCAO}%)`,
          data: [],
          borderColor: '#d97706',
          borderDash: [6, 4],
          borderWidth: 1,
          pointRadius: 0
        },
        {
          label: `Crítico (${RAM_CONFIG.LIMITE_CRITICO}%)`,
          data: [],
          borderColor: '#dc2626',
          borderDash: [6, 4],
          borderWidth: 1,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: ${item.parsed.y.toFixed(1)}%`
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { callback: (v) => `${v}%`, font: { size: 11 } },
          grid: { color: 'rgba(39, 62, 99, 0.08)' }
        },
        x: {
          ticks: { maxTicksLimit: 8, font: { size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

function renderizarGrafico(historico) {
  if (!graficoRam) criarGrafico();

  graficoRam.data.labels = historico.map((p) => p.hora);
  graficoRam.data.datasets[0].data = historico.map((p) => p.valor);
  graficoRam.data.datasets[1].data = historico.map(() => RAM_CONFIG.LIMITE_ATENCAO);
  graficoRam.data.datasets[2].data = historico.map(() => RAM_CONFIG.LIMITE_CRITICO);
  graficoRam.update();
}

function renderizarTudo(d) {
  renderizarKpis(d);
  renderizarSaude(d);
  renderizarGrafico(d.historico);
  renderizarProcessos(d.processos);
  renderizarAlertas(d.alertas);
  definirTexto('ram-atualizado', `Atualizado às ${horaAgora(new Date(d.atualizado_em))}`);
}

/* --------------------------------------------------------------------------
   5. CICLO DE ATUALIZAÇÃO
   -------------------------------------------------------------------------- */
function servidorSelecionado() {
  return Number(document.getElementById('unit-selector').value);
}

function nomeServidorSelecionado() {
  const select = document.getElementById('unit-selector');
  return select.options[select.selectedIndex].text;
}

// Evita que uma resposta antiga sobrescreva a de um servidor escolhido depois
let requisicaoAtual = 0;

async function atualizar() {
  const numero = ++requisicaoAtual;
  const equipamentoId = servidorSelecionado();

  try {
    const dados = await obterDadosRam(equipamentoId);
    if (numero !== requisicaoAtual) return; // usuário trocou de servidor no meio
    renderizarTudo(dados);
  } catch (erro) {
    if (numero !== requisicaoAtual) return;
    console.error(erro);
    definirTexto('ram-atualizado', 'Falha ao atualizar dados');
  }
}

function aoTrocarServidor() {
  definirTexto('topbar-servidor-nome', nomeServidorSelecionado());
  definirTexto('ram-atualizado', 'Carregando…');
  if (RAM_CONFIG.USAR_MOCK) iniciarSerieMock(servidorSelecionado());
  atualizar();
}

/* --------------------------------------------------------------------------
   6. INICIALIZAÇÃO
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  preencherSidebar(obterSessao());

  definirTexto('topbar-servidor-nome', nomeServidorSelecionado());
  if (RAM_CONFIG.USAR_MOCK) iniciarSerieMock(servidorSelecionado());

  atualizar();
  setInterval(atualizar, RAM_CONFIG.INTERVALO_ATUALIZACAO);

  document.getElementById('unit-selector').addEventListener('change', aoTrocarServidor);
});
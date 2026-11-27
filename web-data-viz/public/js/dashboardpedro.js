/* ==========================================================================
   MagnaSync — Dashboard de Memória RAM (dashboardpedro)

   Fluxo: login grava a sessão -> esta tela confere se há login (qualquer cargo) ->
   busca os servidores do hospital -> busca os dados de RAM do servidor
   escolhido a cada 5 s. O back confere o login de novo (não confia no front).
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. CONFIGURAÇÃO
   -------------------------------------------------------------------------- */
const RAM_CONFIG = {
  // Endereço do back-end. '' = mesma origem do site. Se o back roda em outra
  // porta, use por exemplo 'http://localhost:3333' (e libere CORS no back).
  API_BASE: '',

  // true = dados simulados, sem back (só para testar o visual)
  USAR_MOCK: false,

  // Chaves do sessionStorage gravadas no login (conferem com o login.html do projeto)
  CHAVE_ID: 'ID_USUARIO',
  CHAVE_NOME: 'NOME_USUARIO',
  CHAVE_CARGO: 'CARGO_USUARIO',

  INTERVALO_ATUALIZACAO: 5000, // ms
  SEGUNDOS_SEM_DADOS: 120      // acima disso, avisa que o agente parou de enviar
};

// Substituído pelos limites que o back devolve (fonte única: model do back)
let limites = { atencao: 75, critico: 85, bloqueio: 90 };

/* --------------------------------------------------------------------------
   2. SESSÃO
   -------------------------------------------------------------------------- */
function normalizarTexto(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function obterSessao() {
  const sessao = {
    id: sessionStorage.getItem(RAM_CONFIG.CHAVE_ID),
    nome: sessionStorage.getItem(RAM_CONFIG.CHAVE_NOME),
    cargo: sessionStorage.getItem(RAM_CONFIG.CHAVE_CARGO)
  };
  if (!sessao.id) {
    console.warn(
      `[dashboardpedro] Sessão não encontrada. Esperado no sessionStorage: ${RAM_CONFIG.CHAVE_ID}. Encontrado:`,
      { ...sessionStorage }
    );
  }
  return sessao;
}

function preencherSidebar(sessao) {
  const nome = sessao.nome || 'Usuário';
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('');
  document.getElementById('sidebar-user-avatar').textContent = iniciais;
  document.getElementById('sidebar-user-name').textContent = nome;
  document.getElementById('sidebar-user-role').textContent = sessao.cargo || '';
}

let temporizador = null;

function mostrarAcessoNegado() {
  clearInterval(temporizador);
  document.getElementById('ram-conteudo').hidden = true;
  document.getElementById('acesso-negado').hidden = false;
}

function mostrarConteudo() {
  document.getElementById('acesso-negado').hidden = true;
  document.getElementById('ram-conteudo').hidden = false;
}

/* --------------------------------------------------------------------------
   3. DADOS
   -------------------------------------------------------------------------- */
async function chamarApi(caminho) {
  const sessao = obterSessao();
  const resposta = await fetch(`${RAM_CONFIG.API_BASE}${caminho}`, {
    headers: { 'x-funcionario-id': sessao.id || '' }
  });

  if (resposta.status === 401 || resposta.status === 403) {
    const erro = new Error('Acesso negado');
    erro.acessoNegado = true;
    throw erro;
  }
  if (!resposta.ok) {
    let detalhe = '';
    try { detalhe = (await resposta.json()).erro || ''; } catch (e) { /* sem corpo JSON */ }
    throw new Error(detalhe || `Erro ${resposta.status}`);
  }
  return resposta.json();
}

/* ---------- Mock (só com USAR_MOCK = true) ---------- */
const SERVIDORES_MOCK = {
  1: { nome: 'Servidor PACS 01 – Armazenamento Principal', total_gb: 32, base: 58, oscilacao: 4,
       processos: [['dcm4chee-arc', 1204, 1, 6800], ['postgres', 982, 12, 4200], ['java', 2310, 1, 3100], ['nginx', 811, 4, 1250], ['python', 3340, 1, 480]],
       alertas: { atencao: 6, critico: 2, bloqueio: 0 } },
  2: { nome: 'Servidor PACS 02 – Contingência', total_gb: 16, base: 31, oscilacao: 2,
       processos: [['dcm4chee-arc', 760, 1, 2100], ['rsync', 1890, 2, 980], ['postgres', 640, 8, 870], ['nginx', 512, 4, 310], ['python', 2201, 1, 260]],
       alertas: { atencao: 1, critico: 0, bloqueio: 0 } },
  3: { nome: 'Servidor PACS 03 – Indexação DICOM', total_gb: 64, base: 82, oscilacao: 5,
       processos: [['java', 4120, 1, 21800], ['elasticsearch', 1503, 1, 15400], ['postgres', 1102, 10, 6900], ['dcm4chee-arc', 1960, 1, 4300], ['python', 5230, 1, 520]],
       alertas: { atencao: 14, critico: 5, bloqueio: 3 } }
};
const mockEstado = { id: null, cfg: null, serie: [], valor: 0 };

function horaCurta(data = new Date()) {
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function proximoValorMock() {
  const { base, oscilacao } = mockEstado.cfg;
  mockEstado.valor = Math.min(98, Math.max(20,
    mockEstado.valor + (base - mockEstado.valor) * 0.05 + (Math.random() - 0.5) * oscilacao));
  return Number(mockEstado.valor.toFixed(1));
}

function iniciarMock(id) {
  mockEstado.id = id;
  mockEstado.cfg = SERVIDORES_MOCK[id];
  mockEstado.valor = mockEstado.cfg.base;
  mockEstado.serie = [];
  const agora = Date.now();
  for (let i = 59; i >= 0; i--) {
    mockEstado.serie.push({ hora: horaCurta(new Date(agora - i * 60000)), valor: proximoValorMock() });
  }
}

function gerarMock(id) {
  if (mockEstado.id !== id) iniciarMock(id);
  mockEstado.serie.push({ hora: horaCurta(), valor: proximoValorMock() });
  if (mockEstado.serie.length > 60) mockEstado.serie.shift();

  const cfg = mockEstado.cfg;
  const atual = mockEstado.serie[mockEstado.serie.length - 1].valor;
  const usada = Number(((atual / 100) * cfg.total_gb).toFixed(1));
  const pico = mockEstado.serie.reduce((max, p) => (p.valor > max.valor ? p : max));
  return {
    limites, total_gb: cfg.total_gb, usada_gb: usada, disponivel_gb: Number((cfg.total_gb - usada).toFixed(1)),
    percentual: atual, pico: { valor: pico.valor, hora: pico.hora }, historico: mockEstado.serie.slice(),
    processos: cfg.processos.map(([nome, pid, instancias, mb]) => ({ nome, pid, instancias, mb })),
    alertas: { ...cfg.alertas }, ultima_leitura: new Date().toLocaleTimeString('pt-BR'), segundos_desde_ultima_leitura: 0
  };
}

/* ---------- Funções que a tela usa ---------- */
async function obterServidores() {
  if (RAM_CONFIG.USAR_MOCK) {
    return Object.entries(SERVIDORES_MOCK).map(([id, cfg]) => ({ id: Number(id), nome: cfg.nome }));
  }
  return chamarApi('/dashboardpedro/servidores');
}

async function obterDadosRam(equipamentoId) {
  if (RAM_CONFIG.USAR_MOCK) return gerarMock(equipamentoId);
  return chamarApi(`/dashboardpedro/ram/${equipamentoId}`);
}

/* --------------------------------------------------------------------------
   4. RENDERIZAÇÃO
   -------------------------------------------------------------------------- */
function classificarUso(percentual) {
  if (percentual >= limites.bloqueio) return { nivel: 'critical', texto: 'Bloqueio', gauge: 'Uso em nível de bloqueio' };
  if (percentual >= limites.critico) return { nivel: 'critical', texto: 'Crítico', gauge: 'Uso crítico' };
  if (percentual >= limites.atencao) return { nivel: 'warn', texto: 'Atenção', gauge: 'Uso em atenção' };
  return { nivel: 'up', texto: 'Seguro', gauge: 'Dentro do limite seguro' };
}

function definirTexto(id, texto) {
  document.getElementById(id).textContent = texto;
}

const formatarGb = (v) => (v == null ? '-- GB' : `${v.toFixed(1).replace('.', ',')} GB`);
const formatarPct = (v) => `${v.toFixed(1).replace('.', ',')}%`;
const formatarMemoria = (mb) => (mb >= 1024 ? `${(mb / 1024).toFixed(1).replace('.', ',')} GB` : `${Math.round(mb)} MB`);

function aplicarNivel(elemento, base, nivel) {
  elemento.className = nivel === 'up' ? base : `${base} ${nivel}`;
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
  document.getElementById('ram-gauge-score').innerHTML = `${Math.round(d.percentual)}<small>%</small>`;
  const rotulo = document.getElementById('ram-gauge-label');
  rotulo.textContent = estado.gauge;
  aplicarNivel(rotulo, 'gauge-label', estado.nivel);

  document.getElementById('ram-bar').setAttribute('aria-valuenow', Math.round(d.percentual));
  const fill = document.getElementById('ram-bar-fill');
  fill.style.width = `${d.percentual}%`;
  aplicarNivel(fill, 'ram-bar-fill', estado.nivel);

  definirTexto('ram-total', formatarGb(d.total_gb));
  definirTexto('ram-em-uso', formatarGb(d.usada_gb));
  definirTexto('ram-disponivel', formatarGb(d.disponivel_gb));
  definirTexto('ram-percentual', formatarPct(d.percentual));
}

function mensagemVazia(container, texto) {
  container.replaceChildren();
  const vazio = document.createElement('div');
  vazio.className = 'empty-state';
  const p = document.createElement('p');
  p.textContent = texto;
  vazio.appendChild(p);
  container.appendChild(vazio);
}

function renderizarProcessos(processos) {
  const container = document.getElementById('ram-processos');
  if (!processos || processos.length === 0) {
    mensagemVazia(container, 'Nenhum processo reportado ainda. Use a captura de RAM no agente Python.');
    return;
  }
  container.replaceChildren();
  const maior = Math.max(...processos.map((p) => p.mb));

  processos.forEach((p) => {
    const item = document.createElement('div');
    item.className = 'process-item';

    const nome = document.createElement('div');
    nome.className = 'process-name';
    const titulo = document.createElement('strong');
    titulo.textContent = p.nome;
    const detalhe = document.createElement('small');
    detalhe.textContent = p.instancias > 1 ? `${p.instancias} processos` : `PID ${p.pid}`;
    nome.append(titulo, detalhe);

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
  definirTexto('alerta-atencao-rotulo', `Uso acima de ${limites.atencao}%`);
  definirTexto('alerta-critico-rotulo', `Uso crítico acima de ${limites.critico}%`);
  definirTexto('alerta-bloqueio-rotulo', `Bloqueio acima de ${limites.bloqueio}%`);
  definirTexto('alerta-atencao-qtd', alertas.atencao);
  definirTexto('alerta-critico-qtd', alertas.critico);
  definirTexto('alerta-bloqueio-qtd', alertas.bloqueio);
}

/* ---------- Gráfico de linhas ---------- */
let graficoRam = null;

function criarGrafico() {
  const linhaLimite = (cor) => ({ borderColor: cor, borderDash: [6, 4], borderWidth: 1, pointRadius: 0 });
  graficoRam = new Chart(document.getElementById('chartRamHistorico').getContext('2d'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Uso de RAM (%)', data: [], borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)',
          borderWidth: 2, fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 4 },
        { label: '', data: [], ...linhaLimite('#d97706') },
        { label: '', data: [], ...linhaLimite('#dc2626') },
        { label: '', data: [], ...linhaLimite('#7f1d1d') }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: (i) => `${i.dataset.label}: ${i.parsed.y.toFixed(1)}%` } }
      },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%`, font: { size: 11 } }, grid: { color: 'rgba(39, 62, 99, 0.08)' } },
        x: { ticks: { maxTicksLimit: 8, font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

function renderizarGrafico(historico) {
  if (!graficoRam) criarGrafico();
  const ds = graficoRam.data.datasets;
  graficoRam.data.labels = historico.map((p) => p.hora);
  ds[0].data = historico.map((p) => p.valor);
  ds[1].label = `Atenção (${limites.atencao}%)`;
  ds[2].label = `Crítico (${limites.critico}%)`;
  ds[3].label = `Bloqueio (${limites.bloqueio}%)`;
  ds[1].data = historico.map(() => limites.atencao);
  ds[2].data = historico.map(() => limites.critico);
  ds[3].data = historico.map(() => limites.bloqueio);
  graficoRam.update();
}

function renderizarSemDados(d) {
  ['kpi-ram-uso', 'kpi-ram-pico'].forEach((id) => definirTexto(id, '--%'));
  ['kpi-ram-utilizada', 'kpi-ram-disponivel', 'ram-total', 'ram-em-uso', 'ram-disponivel']
    .forEach((id) => definirTexto(id, '-- GB'));
  definirTexto('ram-percentual', '-- %');
  definirTexto('kpi-ram-pico-hora', '--:--');
  const badge = document.getElementById('kpi-ram-uso-badge');
  badge.textContent = '--';
  badge.className = 'kpi-badge normal';

  document.getElementById('ram-gauge-score').innerHTML = '--<small>%</small>';
  const rotulo = document.getElementById('ram-gauge-label');
  rotulo.textContent = 'Sem leituras';
  rotulo.className = 'gauge-label';
  document.getElementById('ram-bar-fill').style.width = '0';

  if (graficoRam) renderizarGrafico([]);
  mensagemVazia(document.getElementById('ram-processos'), 'Sem dados de processos para este servidor.');
  renderizarAlertas(d.alertas || { atencao: 0, critico: 0, bloqueio: 0 });
  definirTexto('ram-atualizado', 'Sem leituras. Inicie a captura no agente Python.');
}

function renderizarTudo(d) {
  if (d.limites) limites = d.limites;
  if (d.sem_dados) {
    renderizarSemDados(d);
    return;
  }
  renderizarKpis(d);
  renderizarSaude(d);
  renderizarGrafico(d.historico);
  renderizarProcessos(d.processos);
  renderizarAlertas(d.alertas);

  const atraso = d.segundos_desde_ultima_leitura;
  definirTexto('ram-atualizado', atraso > RAM_CONFIG.SEGUNDOS_SEM_DADOS
    ? `Sem leituras há ${Math.round(atraso / 60)} min (última às ${d.ultima_leitura})`
    : `Última leitura às ${d.ultima_leitura}`);
}

/* --------------------------------------------------------------------------
   5. SERVIDORES E CICLO DE ATUALIZAÇÃO
   -------------------------------------------------------------------------- */
function servidorSelecionado() {
  return Number(document.getElementById('unit-selector').value);
}

function nomeServidorSelecionado() {
  const select = document.getElementById('unit-selector');
  return select.options[select.selectedIndex].text;
}

async function carregarServidores() {
  const select = document.getElementById('unit-selector');
  const lista = await obterServidores();
  select.replaceChildren();

  if (lista.length === 0) {
    select.add(new Option('Nenhum servidor cadastrado', ''));
    definirTexto('topbar-servidor-nome', 'Nenhum servidor cadastrado');
    definirTexto('ram-atualizado', 'Cadastre uma máquina pelo agente Python.');
    return false;
  }
  lista.forEach((s) => select.add(new Option(s.nome, s.id)));
  definirTexto('topbar-servidor-nome', nomeServidorSelecionado());
  return true;
}

// Evita que uma resposta antiga sobrescreva a de um servidor escolhido depois
let requisicaoAtual = 0;

async function atualizar() {
  const equipamentoId = servidorSelecionado();
  if (!equipamentoId) return;

  const numero = ++requisicaoAtual;
  try {
    const dados = await obterDadosRam(equipamentoId);
    if (numero === requisicaoAtual) renderizarTudo(dados);
  } catch (erro) {
    if (numero !== requisicaoAtual) return;
    if (erro.acessoNegado) return mostrarAcessoNegado();
    console.error(erro);
    definirTexto('ram-atualizado', 'Falha ao atualizar dados');
  }
}

function aoTrocarServidor() {
  definirTexto('topbar-servidor-nome', nomeServidorSelecionado());
  definirTexto('ram-atualizado', 'Carregando…');
  if (RAM_CONFIG.USAR_MOCK) iniciarMock(servidorSelecionado());
  atualizar();
}

/* --------------------------------------------------------------------------
   6. INICIALIZAÇÃO
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  const sessao = obterSessao();
  preencherSidebar(sessao);

  // Sem login não há o que mostrar (no mock não precisa de sessão)
  if (!sessao.id && !RAM_CONFIG.USAR_MOCK) {
    mostrarAcessoNegado();
    return;
  }
  mostrarConteudo();

  try {
    if (!(await carregarServidores())) return;
  } catch (erro) {
    if (erro.acessoNegado) return mostrarAcessoNegado();
    console.error(erro);
    definirTexto('ram-atualizado', 'Falha ao carregar os servidores');
    return;
  }

  document.getElementById('unit-selector').addEventListener('change', aoTrocarServidor);
  if (RAM_CONFIG.USAR_MOCK) iniciarMock(servidorSelecionado());
  atualizar();
  temporizador = setInterval(atualizar, RAM_CONFIG.INTERVALO_ATUALIZACAO);
});
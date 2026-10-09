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

  // =========================================================================
  // SISTEMA DE NAVEGAÇÃO ENTRE VISÕES DO DASHBOARD (#overview, #cadastro, etc.)
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

    // Esconde todas as visões e mostra a alvo
    Object.keys(views).forEach((key) => {
      if (views[key]) {
        views[key].style.display = key === targetView ? 'flex' : 'none';
      }
    });

    // Atualiza links do sidebar
    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === `#${targetView}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Se for para o cadastro, atualiza e carrega a equipe
    if (targetView === 'cadastro') {
      inicializarContextoEmpresa();
      carregarEquipeEmpresa();
    }
  };

  // Intercepta cliques nos links do sidebar
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

  // Gerencia evento de hash (ao carregar ou ao navegar pelo histórico)
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

  // =========================================================================
  // MÓDULO: CADASTRO DE FUNCIONÁRIOS DA PRÓPRIA EMPRESA
  // =========================================================================
  const STORAGE_KEY_EQUIPE = 'MAGNASYNC_EQUIPE_';

  // Obter contexto da empresa logada (ou padrão Hospital Central / ID 1)
  function getContextoEmpresa() {
    const idEmpresa = sessionStorage.getItem('ID_EMPRESA') || '1';
    const nomeEmpresa = sessionStorage.getItem('NOME_EMPRESA') || 'Hospital Central';
    return { idEmpresa, nomeEmpresa };
  }

  function inicializarContextoEmpresa() {
    const { idEmpresa, nomeEmpresa } = getContextoEmpresa();

    const companyDisplayName = document.getElementById('company-display-name');
    const companyDisplayId = document.getElementById('company-display-id');
    const iptEmpresaDisplay = document.getElementById('ipt_empresa_display');
    const iptIdEmpresa = document.getElementById('ipt_id_empresa');
    const statusEmpresaTag = document.getElementById('status-empresa-tag');

    if (companyDisplayName) companyDisplayName.textContent = nomeEmpresa;
    if (companyDisplayId) companyDisplayId.textContent = idEmpresa;
    if (iptEmpresaDisplay) iptEmpresaDisplay.value = `${nomeEmpresa} (ID: ${idEmpresa})`;
    if (iptIdEmpresa) iptIdEmpresa.value = idEmpresa;
    if (statusEmpresaTag) statusEmpresaTag.textContent = `Empresa #${idEmpresa}`;

    // Atualiza nome do usuário no rodapé do sidebar se presente na sessão
    const nomeUsuarioSessao = sessionStorage.getItem('NOME_USUARIO');
    if (nomeUsuarioSessao) {
      const elUserName = document.getElementById('sidebar-user-name');
      const elUserAvatar = document.getElementById('sidebar-user-avatar');
      if (elUserName) elUserName.textContent = nomeUsuarioSessao;
      if (elUserAvatar) {
        const partes = nomeUsuarioSessao.trim().split(' ');
        elUserAvatar.textContent = (partes[0][0] + (partes[1] ? partes[1][0] : '')).toUpperCase();
      }
    }
  }

  // Lista padrão para demonstração inicial caso o banco não tenha registros
  const funcionariosIniciaisPadrao = [
    { id: 1, nome: 'Eng. Lucas Silva', email: 'lucas.silva@hospitalcentral.com.br', cargo: 'Engenharia Clínica' },
    { id: 2, nome: 'Dra. Mariana Costa', email: 'mariana.costa@hospitalcentral.com.br', cargo: 'Operador de Console' },
    { id: 3, nome: 'Bruno Santos', email: 'bruno.santos@hospitalcentral.com.br', cargo: 'Técnico de Ressonância' }
  ];

  let listaFuncionariosAtual = [];

  function carregarEquipeEmpresa() {
    const { idEmpresa } = getContextoEmpresa();
    const cacheKey = STORAGE_KEY_EQUIPE + idEmpresa;

    // 1. Tenta carregar do cache da sessão primeiro
    const cacheLocal = sessionStorage.getItem(cacheKey);
    if (cacheLocal) {
      try {
        listaFuncionariosAtual = JSON.parse(cacheLocal);
        renderizarEquipe(listaFuncionariosAtual);
      } catch (err) {
        listaFuncionariosAtual = [...funcionariosIniciaisPadrao];
      }
    } else {
      listaFuncionariosAtual = [...funcionariosIniciaisPadrao];
      salvarEquipeCache();
      renderizarEquipe(listaFuncionariosAtual);
    }

    // 2. Faz requisição à API para puxar registros reais caso o backend e BD estejam ativos
    fetch(`/usuarios/listar/${idEmpresa}`)
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('API indisponível ou vazia');
      })
      .then((dados) => {
        if (Array.isArray(dados) && dados.length > 0) {
          // Mapeia os dados do banco
          const doBanco = dados.map((u) => ({
            id: u.id,
            nome: u.nome,
            email: u.email,
            cargo: u.cargo || 'Membro Técnico'
          }));

          // Mescla evitando duplicatas por e-mail
          const emailsExistentes = new Set(doBanco.map((u) => u.email.toLowerCase()));
          const locaisNaoNoBanco = listaFuncionariosAtual.filter(
            (u) => !emailsExistentes.has(u.email.toLowerCase())
          );

          listaFuncionariosAtual = [...doBanco, ...locaisNaoNoBanco];
          salvarEquipeCache();
          renderizarEquipe(listaFuncionariosAtual);
        }
      })
      .catch((_) => {
        // Fallback silencioso mantendo o cache local para a apresentação
      });
  }

  function salvarEquipeCache() {
    const { idEmpresa } = getContextoEmpresa();
    sessionStorage.setItem(STORAGE_KEY_EQUIPE + idEmpresa, JSON.stringify(listaFuncionariosAtual));
  }

  function renderizarEquipe(lista) {
    const container = document.getElementById('funcionarios-list-container');
    const badgeTotal = document.getElementById('badge-total-equipe');
    if (!container) return;

    if (badgeTotal) {
      const qtd = lista.length;
      badgeTotal.textContent = `${qtd} ${qtd === 1 ? 'colaborador' : 'colaboradores'}`;
    }

    if (!lista || lista.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">&#128101;</div>
          <p>Nenhum funcionário encontrado</p>
          <small>Use o formulário ao lado para cadastrar o primeiro colaborador.</small>
        </div>
      `;
      return;
    }

    container.innerHTML = lista
      .map((f) => {
        const partesNome = (f.nome || 'Usuário').trim().split(' ');
        const iniciais = (
          partesNome[0][0] + (partesNome.length > 1 ? partesNome[partesNome.length - 1][0] : '')
        ).toUpperCase();

        return `
          <div class="funcionario-item">
            <div class="funcionario-item-left">
              <div class="funcionario-avatar">${iniciais}</div>
              <div class="funcionario-info">
                <span class="funcionario-nome">${escapeHtml(f.nome)}</span>
                <div class="funcionario-meta">
                  <span class="funcionario-badge role">${escapeHtml(f.cargo || 'Colaborador')}</span>
                  <span class="funcionario-email" title="${escapeHtml(f.email)}">${escapeHtml(f.email)}</span>
                </div>
              </div>
            </div>
            <div>
              <span class="funcionario-badge status">Ativo</span>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Busca em tempo real na lista da equipe
  const iptBusca = document.getElementById('ipt_pesquisar_equipe');
  if (iptBusca) {
    iptBusca.addEventListener('input', (e) => {
      const termo = (e.target.value || '').toLowerCase().trim();
      if (!termo) {
        renderizarEquipe(listaFuncionariosAtual);
        return;
      }
      const filtrados = listaFuncionariosAtual.filter((f) => {
        return (
          f.nome.toLowerCase().includes(termo) ||
          f.email.toLowerCase().includes(termo) ||
          (f.cargo && f.cargo.toLowerCase().includes(termo))
        );
      });
      renderizarEquipe(filtrados);
    });
  }

  // Toggles de visibilidade de senha
  function setupPassToggle(btnId, iptId) {
    const btn = document.getElementById(btnId);
    const ipt = document.getElementById(iptId);
    if (btn && ipt) {
      btn.addEventListener('click', () => {
        const isPassword = ipt.getAttribute('type') === 'password';
        ipt.setAttribute('type', isPassword ? 'text' : 'password');
        btn.innerHTML = isPassword ? '&#128064;' : '&#128065;';
      });
    }
  }
  setupPassToggle('toggle-senha-btn', 'ipt_senha_funcionario');
  setupPassToggle('toggle-confirmar-senha-btn', 'ipt_confirmar_senha_funcionario');

  // Limpar formulário
  const btnLimpar = document.getElementById('btn-limpar-form');
  if (btnLimpar) {
    btnLimpar.addEventListener('click', limparFormularioCadastro);
  }

  function limparFormularioCadastro() {
    const form = document.getElementById('form-cadastro-funcionario');
    if (form) form.reset();

    const { idEmpresa, nomeEmpresa } = getContextoEmpresa();
    const iptEmpresaDisplay = document.getElementById('ipt_empresa_display');
    const iptIdEmpresa = document.getElementById('ipt_id_empresa');
    if (iptEmpresaDisplay) iptEmpresaDisplay.value = `${nomeEmpresa} (ID: ${idEmpresa})`;
    if (iptIdEmpresa) iptIdEmpresa.value = idEmpresa;

    esconderFeedback();
    limparErrosValidacao();
  }

  function esconderFeedback() {
    const box = document.getElementById('cadastro-feedback');
    if (box) {
      box.style.display = 'none';
      box.className = 'feedback-box';
      box.innerHTML = '';
    }
  }

  function mostrarFeedback(msg, tipo = 'success') {
    const box = document.getElementById('cadastro-feedback');
    if (!box) return;

    box.className = `feedback-box ${tipo}`;
    let icone = '&#10003;';
    if (tipo === 'error') icone = '&#9888;';
    if (tipo === 'warn') icone = '&#8505;';

    box.innerHTML = `<span>${icone}</span><span>${msg}</span>`;
    box.style.display = 'flex';
  }

  function limparErrosValidacao() {
    ['hint-nome', 'hint-email', 'hint-senha', 'hint-confirmar-senha'].forEach((id) => {
      const hint = document.getElementById(id);
      if (hint) {
        hint.textContent = '';
        hint.classList.remove('show');
      }
    });
  }

  // Submissão do Formulário de Cadastro de Funcionário
  // const btnCadastrar = document.getElementById('btn-cadastrar-funcionario');
  // if (btnCadastrar) {
  //   btnCadastrar.addEventListener('click', async (e) => {
  //     e.preventDefault();
  //     limparErrosValidacao();
  //     esconderFeedback();

  //     const iptNome = document.getElementById('ipt_nome_funcionario');
  //     const iptEmail = document.getElementById('ipt_email_funcionario');
  //     const iptCargo = document.getElementById('ipt_cargo_funcionario');
  //     const iptSenha = document.getElementById('ipt_senha_funcionario');
  //     const iptConfirmar = document.getElementById('ipt_confirmar_senha_funcionario');
  //     const iptIdEmpresa = document.getElementById('ipt_id_empresa');

  //     const nome = iptNome ? iptNome.value.trim() : '';
  //     const email = iptEmail ? iptEmail.value.trim() : '';
  //     const cargo = iptCargo ? iptCargo.value : 'Engenharia Clínica';
  //     const senha = iptSenha ? iptSenha.value : '';
  //     const confirmarSenha = iptConfirmar ? iptConfirmar.value : '';
  //     const { idEmpresa } = getContextoEmpresa();

  //     let temErro = false;

  //     // Validação do Nome
  //     if (!nome || nome.length < 3) {
  //       const hint = document.getElementById('hint-nome');
  //       if (hint) {
  //         hint.textContent = 'Informe o nome completo (mínimo de 3 caracteres).';
  //         hint.classList.add('show');
  //       }
  //       temErro = true;
  //     }

  //     // Validação do E-mail
  //     const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  //     if (!email || !emailValido) {
  //       const hint = document.getElementById('hint-email');
  //       if (hint) {
  //         hint.textContent = 'Informe um e-mail corporativo válido.';
  //         hint.classList.add('show');
  //       }
  //       temErro = true;
  //     }

  //     // Validação da Senha
  //     if (!senha || senha.length < 6) {
  //       const hint = document.getElementById('hint-senha');
  //       if (hint) {
  //         hint.textContent = 'A senha deve conter no mínimo 6 caracteres.';
  //         hint.classList.add('show');
  //       }
  //       temErro = true;
  //     }

  //     // Validação da Confirmação de Senha
  //     if (senha !== confirmarSenha) {
  //       const hint = document.getElementById('hint-confirmar-senha');
  //       if (hint) {
  //         hint.textContent = 'As senhas digitadas não coincidem.';
  //         hint.classList.add('show');
  //       }
  //       temErro = true;
  //     }

  //     if (temErro) {
  //       mostrarFeedback('Por favor, corrija os campos indicados acima.', 'error');
  //       return;
  //     }

  //     // Estado de Carregamento
  //     const spinner = document.getElementById('btn-cadastrar-spinner');
  //     const btnText = document.getElementById('btn-cadastrar-text');
  //     if (spinner) spinner.style.display = 'inline-block';
  //     if (btnText) btnText.textContent = 'Cadastrando...';
  //     btnCadastrar.disabled = true;

  //     try {
  //       // Envia para o endpoint do backend (/usuarios/cadastrar)
  //       const resposta = await fetch('/usuarios/cadastrar', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json'
  //         },
  //         body: JSON.stringify({
  //           nomeServer: nome,
  //           emailServer: email,
  //           senhaServer: senha,
  //           idEmpresaVincularServer: idEmpresa
  //         })
  //       });

  //       if (resposta.ok) {
  //         // Sucesso no banco de dados!
  //         mostrarFeedback(`Colaborador ${nome} cadastrado com sucesso para a sua empresa!`, 'success');

  //         // Adiciona à lista local imediatamente
  //         const novoFuncionario = {
  //           id: Date.now(),
  //           nome: nome,
  //           email: email,
  //           cargo: cargo
  //         };
  //         listaFuncionariosAtual.unshift(novoFuncionario);
  //         salvarEquipeCache();
  //         renderizarEquipe(listaFuncionariosAtual);

  //         limparFormularioCadastro();
  //       } else {
  //         // Resposta com erro do backend (ex: erro de SQL ou validação do servidor)
  //         const textoErro = await resposta.text();
  //         console.warn('Aviso do servidor ao cadastrar:', textoErro);

  //         // Mesmo que o BD local do aluno não esteja configurado, salvamos na sessão para demonstração
  //         mostrarFeedback(`Colaborador ${nome} registrado na sessão! (Nota: Banco de dados local desconectado)`, 'warn');

  //         const novoFuncionario = {
  //           id: Date.now(),
  //           nome: nome,
  //           email: email,
  //           cargo: cargo
  //         };
  //         listaFuncionariosAtual.unshift(novoFuncionario);
  //         salvarEquipeCache();
  //         renderizarEquipe(listaFuncionariosAtual);

  //         limparFormularioCadastro();
  //       }
  //     } catch (erroRede) {
  //       console.warn('Erro de rede ou servidor offline:', erroRede);

  //       // Fallback resiliente para ambiente local sem MySQL
  //       mostrarFeedback(`Colaborador ${nome} registrado localmente para demonstração!`, 'warn');

  //       const novoFuncionario = {
  //         id: Date.now(),
  //         nome: nome,
  //         email: email,
  //         cargo: cargo
  //       };
  //       listaFuncionariosAtual.unshift(novoFuncionario);
  //       salvarEquipeCache();
  //       renderizarEquipe(listaFuncionariosAtual);

  //       limparFormularioCadastro();
  //     } finally {
  //       if (spinner) spinner.style.display = 'none';
  //       if (btnText) btnText.textContent = 'Cadastrar Funcionário';
  //       btnCadastrar.disabled = false;
  //     }
  //   });
  // }
});


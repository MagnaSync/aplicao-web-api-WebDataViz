var listaFuncionariosGlobal = [];
var timerFeedbackCadastro = null;
var timerMensagemHospital = null;

function mostrarFeedbackCadastro(msg, tipo) {
    var box = document.getElementById("cadastro-feedback");
    if (!box) return;

    box.className = "feedback-box " + (tipo || "success");
    var icone = "&#10003;";
    if (tipo === "error") icone = "&#9888;";
    if (tipo === "warn") icone = "&#8505;";

    box.innerHTML = "<span>" + icone + "</span><span>" + msg + "</span>";
    box.style.display = "flex";

    if (timerFeedbackCadastro) {
        clearTimeout(timerFeedbackCadastro);
    }
    timerFeedbackCadastro = setTimeout(esconderFeedback, 5000);
}

function esconderFeedback() {
    var box = document.getElementById("cadastro-feedback");
    if (box) {
        box.style.display = "none";
        box.className = "feedback-box";
        box.innerHTML = "";
    }
}

function limparErrosValidacao() {
    var ids = ["hint-nome", "hint-email", "hint-senha", "hint-confirmar-senha"];
    for (var i = 0; i < ids.length; i++) {
        var hint = document.getElementById(ids[i]);
        if (hint) {
            hint.textContent = "";
            hint.classList.remove("show");
        }
    }
}

function limparFormularioCadastro() {
    var form = document.getElementById("form-cadastro-funcionario");
    if (form) form.reset();

    sincronizarHospitalSessao();
    esconderFeedback();
    limparErrosValidacao();
}

function sincronizarHospitalSessao() {
    var idHospital = sessionStorage.ID_HOSPITAL || "1";
    var nomeHospital = sessionStorage.NOME_HOSPITAL;
    var iptIdHospital = document.getElementById("ipt_id_empresa");
    var hospitalDisplay = document.getElementById("hospital_input");

    if (iptIdHospital) {
        iptIdHospital.value = idHospital;
    }
    if (hospitalDisplay) {
        if (nomeHospital) {
            hospitalDisplay.value = nomeHospital + " (ID: " + idHospital + ")";
        } else {
            hospitalDisplay.value = idHospital === "1"
                ? "Hospital Central (ID: 1)"
                : "Hospital Vinculado (ID: " + idHospital + ")";
        }
    }
}

function cadastrar() {
    limparErrosValidacao();

    var nomeVar = nome_input.value.trim();
    var emailVar = email_input.value.trim();
    var senhaVar = senha_input.value;
    var confirmarSenhaVar = confirmacao_senha_input.value;
    var cargoVar = cargo_select.value;
    var hospitalIdVar = ipt_id_empresa.value;

    if (
        nomeVar == "" ||
        emailVar == "" ||
        senhaVar == "" ||
        confirmarSenhaVar == "" ||
        cargoVar == "" ||
        hospitalIdVar == ""
    ) {
        mostrarFeedbackCadastro("Preencha todos os campos obrigatórios.", "error");
        return false;
    } else if (cargoVar == "null") {
        mostrarFeedbackCadastro("Selecione um cargo válido.", "error");
        return false;
    } else if (senhaVar != confirmarSenhaVar) {
        mostrarFeedbackCadastro("As senhas digitadas não coincidem.", "error");
        return false;
    }

    fetch("/usuarios/cadastrar", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            nomeServer: nomeVar,
            emailServer: emailVar,
            senhaServer: senhaVar,
            idHospitalVincularServer: hospitalIdVar,
            cargoServer: cargoVar,
        }),
    })
        .then(function (resposta) {
            if (resposta.ok) {
                limparFormularioCadastro();
                mostrarFeedbackCadastro("Cadastro realizado com sucesso!", "success");
                listarFuncionarios();
            } else {
                throw "Houve um erro ao tentar realizar o cadastro!";
            }
        })
        .catch(function (erro) {
            console.log("#ERRO:", erro);
            mostrarFeedbackCadastro("Não foi possível realizar o cadastro. Verifique a conexão.", "error");
        });

    return false;
}

function listarCargos() {
    var cargoSelect = document.getElementById("cargo_select");
    if (!cargoSelect) return;

    sincronizarHospitalSessao();

    fetch("/usuarios/listarCargos", {
        method: "GET"
    })
        .then(function (resposta) {
            if (!resposta.ok) throw "Falha ao listar cargos";
            return resposta.json();
        })
        .then(function (cargos) {
            cargoSelect.innerHTML = '<option value="null">Selecione um cargo...</option>';
            cargos.forEach(function (cargo) {
                cargoSelect.innerHTML +=
                    `<option value="${cargo.id}">${cargo.funcao}</option>`;
            });
        })
        .catch(function (erro) {
            console.log("#ERRO:", erro);
        });
}

function listarFuncionarios() {
    var container = document.getElementById("funcionarios-list-container");
    if (!container) return;

    fetch("/usuarios/listarFuncionarios", { method: "GET" })
        .then(function (resposta) {
            if (!resposta.ok) throw "Falha ao listar funcionários";
            return resposta.json();
        })
        .then(function (funcionarios) {
            listaFuncionariosGlobal = Array.isArray(funcionarios) ? funcionarios : [];
            renderizarFuncionarios(listaFuncionariosGlobal);
        })
        .catch(function (erro) {
            console.log("#ERRO:", erro);
            renderizarFuncionarios([]);
        });
}

function obterIniciais(nomeCompleto) {
    if (!nomeCompleto) return "";
    var partes = nomeCompleto.trim().split(" ");
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

function renderizarFuncionarios(funcionarios) {
    var container = document.getElementById("funcionarios-list-container");
    var badgeTotal = document.getElementById("badge-total-equipe");
    if (!container) return;

    container.innerHTML = "";

    if (!funcionarios || funcionarios.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">&#128101;</div>
                <p>Nenhum funcionário encontrado</p>
            </div>
        `;
        if (badgeTotal) badgeTotal.innerText = "0 colaboradores";
        return;
    }

    funcionarios.forEach(function (funcionario) {
        var nome = funcionario["Nome do funcionário"] || "";
        var hospital = funcionario["Nome do Hospital"] || "";
        var funcao = funcionario["Função"] || "";
        var iniciais = obterIniciais(nome);

        var item = document.createElement("div");
        item.className = "funcionario-item";

        item.innerHTML = `
            <div class="funcionario-item-left">
                <div class="funcionario-avatar">${iniciais}</div>
                <div class="funcionario-info">
                    <span class="funcionario-nome">${nome}</span>
                    <div class="funcionario-meta">
                        <span>${hospital}</span>
                    </div>
                </div>
            </div>
            <span class="funcionario-badge role">${funcao}</span>
        `;

        container.appendChild(item);
    });

    if (badgeTotal) {
        var qtd = funcionarios.length;
        badgeTotal.innerText = qtd + (qtd === 1 ? " colaborador" : " colaboradores");
    }
}

function filtrarFuncionarios() {
    var inputBusca = document.getElementById("ipt_pesquisar_equipe");
    if (!inputBusca) return;

    var termoBusca = inputBusca.value.toLowerCase().trim();

    var funcionariosFiltrados = listaFuncionariosGlobal.filter(function (funcionario) {
        var nome = funcionario["Nome do funcionário"] ? funcionario["Nome do funcionário"].toLowerCase() : "";
        var funcao = funcionario["Função"] ? funcionario["Função"].toLowerCase() : "";
        var hospital = funcionario["Nome do Hospital"] ? funcionario["Nome do Hospital"].toLowerCase() : "";
        var email = funcionario["Email"] ? funcionario["Email"].toLowerCase() : "";

        return (
            nome.includes(termoBusca) ||
            funcao.includes(termoBusca) ||
            hospital.includes(termoBusca) ||
            email.includes(termoBusca)
        );
    });

    renderizarFuncionarios(funcionariosFiltrados);
}

function configurarToggleSenha(botaoId, inputId) {
    var botao = document.getElementById(botaoId);
    var input = document.getElementById(inputId);

    if (!botao || !input) return;

    botao.addEventListener("click", function () {
        var tipoAtual = input.getAttribute("type");
        var novoTipo = tipoAtual === "password" ? "text" : "password";

        input.setAttribute("type", novoTipo);
        this.innerHTML = novoTipo === "password" ? "&#128065;" : "&#128584;";
    });
}

// --- Cadastro de Hospital (cadastroHospital.html) ---

function mostrarMensagemHospital(texto, tipo) {
    var caixa = document.getElementById("mensagem_hospital");
    if (!caixa) return;

    var icone = tipo === "erro" ? "&#9888;" : "&#10003;";
    caixa.className = "mensagem mensagem--" + tipo;
    caixa.innerHTML = "<span>" + icone + "</span><span>" + texto + "</span>";
    caixa.style.display = "flex";

    if (timerMensagemHospital) {
        clearTimeout(timerMensagemHospital);
    }
    timerMensagemHospital = setTimeout(sumirMensagemHospital, 5000);
}

function sumirMensagemHospital() {
    var caixa = document.getElementById("mensagem_hospital");
    if (caixa) {
        caixa.style.display = "none";
        caixa.className = "mensagem";
        caixa.innerHTML = "";
    }
}

function limparFormularioHospital() {
    var form = document.getElementById("form-hospital");
    if (form) form.reset();

    sumirMensagemHospital();
}

function cadastrarHospital() {
    var nomeVar = nome_hospital_input.value.trim();
    var cnpjVar = cnpj_hospital_input.value.trim();
    var telefoneVar = telefone_hospital_input.value.trim();
    var emailVar = email_hospital_input.value.trim();
    var cepVar = cep_hospital_input.value.trim();
    var numeroVar = numero_hospital_input.value.trim();

    if (
        nomeVar == "" ||
        cnpjVar == "" ||
        telefoneVar == "" ||
        emailVar == "" ||
        cepVar == "" ||
        numeroVar == ""
    ) {
        mostrarMensagemHospital("Preencha todos os campos obrigatórios.", "erro");
        return false;
    } else if (!/^\d{14}$/.test(cnpjVar)) {
        mostrarMensagemHospital("CNPJ inválido: digite os 14 números.", "erro");
        return false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVar)) {
        mostrarMensagemHospital("Informe um e-mail válido.", "erro");
        return false;
    } else if (!/^\d{8}$/.test(cepVar)) {
        mostrarMensagemHospital("CEP inválido: digite os 8 números.", "erro");
        return false;
    }

    fetch("/hospital/cadastrarHospital", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            nomeServer: nomeVar,
            cnpjServer: cnpjVar,
            telefoneServer: telefoneVar,
            emailServer: emailVar,
            cepServer: cepVar,
            numeroServer: numeroVar
        }),
    })
        .then(function (resposta) {
            if (resposta.ok) {
                limparFormularioHospital();
                mostrarMensagemHospital("Hospital cadastrado com sucesso!", "sucesso");
            } else {
                throw "Erro ao cadastrar (status " + resposta.status + ")";
            }
        })
        .catch(function (erro) {
            console.log("#ERRO:", erro);
            mostrarMensagemHospital("Não foi possível cadastrar o hospital. Tente novamente.", "erro");
        });

    return false;
}

function sincronizarPerfilSidebar() {
    var nomeUsuario = sessionStorage.NOME_USUARIO;
    var cargoUsuario = sessionStorage.CARGO_USUARIO;
    if (!nomeUsuario) return;

    var elNome = document.getElementById("sidebar-user-name");
    var elCargo = document.getElementById("sidebar-user-role");
    var elAvatar = document.getElementById("sidebar-user-avatar");

    if (elNome) elNome.textContent = nomeUsuario;
    if (elCargo && cargoUsuario) elCargo.textContent = cargoUsuario;
    if (elAvatar) {
        elAvatar.textContent = obterIniciais(nomeUsuario);
    }
}

var iptPesquisar = document.getElementById("ipt_pesquisar_equipe");
if (iptPesquisar) {
    iptPesquisar.addEventListener("input", filtrarFuncionarios);
}

var btnLimpar = document.getElementById("btn-limpar-form");
if (btnLimpar) {
    btnLimpar.addEventListener("click", limparFormularioCadastro);
}

var btnLimparHospital = document.getElementById("btn-limpar-hospital");
if (btnLimparHospital) {
    btnLimparHospital.addEventListener("click", limparFormularioHospital);
}

configurarToggleSenha("toggle-senha-btn", "senha_input");
configurarToggleSenha("toggle-confirmar-senha-btn", "confirmacao_senha_input");
sincronizarPerfilSidebar();

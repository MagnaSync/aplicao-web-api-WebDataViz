(function verificarPermissaoPagina() {
    var idHospital = sessionStorage.ID_HOSPITAL;
    if (!idHospital) return;

    var estaNoCadastroHospital = window.location.pathname.includes("cadastroHospital.html");
    var estaNaDashboard = window.location.pathname.includes("dashboard.html");

    if (estaNoCadastroHospital && String(idHospital) !== "1") {
        window.location.href = "./dashboard/dashboard.html";
    } else if (estaNaDashboard && String(idHospital) === "1") {
        window.location.href = "../cadastroHospital.html";
    }
})();

var listaHospitaisGlobal = [];
var idHospitalEmEdicao = null;
var listaFuncionariosGlobal = [];
var timerFeedbackCadastro = null;
var timerMensagemHospital = null;
var idCargoEmEdicao = null;
var idFuncionarioEmEdicao = null;

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

function alternarAbaCadastro(aba) {
    var subviewFunc = document.getElementById("subview-funcionarios");
    var subviewCargos = document.getElementById("subview-cargos");
    var btnFunc = document.getElementById("tab-btn-funcionarios");
    var btnCargos = document.getElementById("tab-btn-cargos");
    var titulo = document.getElementById("titulo-secao-cadastro");

    if (aba === "cargos") {
        subviewFunc.style.display = "none";
        subviewCargos.style.display = "grid";
        btnFunc.classList.remove("active");
        btnCargos.classList.add("active");
        titulo.textContent = "Cadastro de Cargos";
        listarCargos();
    } else {
        subviewCargos.style.display = "none";
        subviewFunc.style.display = "grid";
        btnCargos.classList.remove("active");
        btnFunc.classList.add("active");
        titulo.textContent = "Cadastro de Funcionários";
    }
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
    idFuncionarioEmEdicao = null;
    var form = document.getElementById("form-cadastro-funcionario");
    if (form) form.reset();

    var titulo = document.getElementById("titulo-form-funcionario");
    var btnTexto = document.getElementById("btn-cadastrar-text");
    if (titulo) titulo.textContent = "Novo Colaborador";
    if (btnTexto) btnTexto.textContent = "Cadastrar Funcionário";

    sincronizarHospitalSessao();
    esconderFeedback();
    limparErrosValidacao();
}

function prepararEdicaoFuncionario(id) {
    var func = listaFuncionariosGlobal.find(function (f) { return f.id === id; });
    if (!func) return;

    idFuncionarioEmEdicao = id;
    nome_input.value = func["Nome do funcionário"] || "";
    email_input.value = func["Email"] || "";
    cargo_select.value = func.cargo_id || "null";
    senha_input.value = "";
    confirmacao_senha_input.value = "";

    var titulo = document.getElementById("titulo-form-funcionario");
    var btnTexto = document.getElementById("btn-cadastrar-text");
    if (titulo) titulo.textContent = "Editar Colaborador";
    if (btnTexto) btnTexto.textContent = "Salvar Alterações";
    nome_input.focus();
}

function cadastrar() {
    limparErrosValidacao();

    var nomeVar = nome_input.value.trim();
    var emailVar = email_input.value.trim();
    var senhaVar = senha_input.value;
    var confirmarSenhaVar = confirmacao_senha_input.value;
    var cargoVar = cargo_select.value;
    var hospitalIdVar = ipt_id_empresa.value;

    // Na edição, a senha é opcional; no cadastro novo, é obrigatória
    var senhaObrigatoria = idFuncionarioEmEdicao === null;

    if (
        nomeVar == "" ||
        emailVar == "" ||
        cargoVar == "" ||
        hospitalIdVar == "" ||
        (senhaObrigatoria && (senhaVar == "" || confirmarSenhaVar == ""))
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

    var url = idFuncionarioEmEdicao
        ? `/usuarios/editar/${idFuncionarioEmEdicao}`
        : "/usuarios/cadastrar";
    var metodo = idFuncionarioEmEdicao ? "PUT" : "POST";
    var msgSucesso = idFuncionarioEmEdicao
        ? "Colaborador atualizado com sucesso!"
        : "Cadastro realizado com sucesso!";

    fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
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
                mostrarFeedbackCadastro(msgSucesso, "success");
                listarFuncionarios();
            } else {
                throw "Houve um erro ao tentar salvar!";
            }
        })
        .catch(function (erro) {
            console.log("#ERRO:", erro);
            mostrarFeedbackCadastro("Não foi possível salvar o colaborador. Verifique a conexão.", "error");
        });

    return false;
}

function deletarFuncionario(id, nome) {
    if (String(id) === String(sessionStorage.ID_USUARIO)) {
        mostrarFeedbackCadastro("Você não pode excluir o próprio usuário logado.", "warn");
        return;
    }
    if (!confirm(`Deseja realmente excluir o colaborador "${nome}"?`)) {
        return;
    }

    fetch(`/usuarios/deletar/${id}`, { method: "DELETE" })
        .then(function (resposta) {
            if (resposta.ok) {
                if (idFuncionarioEmEdicao === id) limparFormularioCadastro();
                mostrarFeedbackCadastro("Colaborador excluído com sucesso!", "success");
                listarFuncionarios();
            } else {
                throw "Erro ao excluir";
            }
        })
        .catch(function (erro) {
            console.log("#ERRO:", erro);
            mostrarFeedbackCadastro("Não foi possível excluir o colaborador.", "error");
        });
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
        var email = funcionario["Email"] || "";
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
                        <span class="funcionario-email">${email}</span>
                    </div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <span class="funcionario-badge role">${funcao}</span>
                <button type="button" class="btn-toggle-eye" style="position: static;" title="Editar colaborador" onclick="prepararEdicaoFuncionario(${funcionario.id})">&#9998;</button>
                <button type="button" class="btn-toggle-eye" style="position: static; color: #e11d48;" title="Excluir colaborador" onclick="deletarFuncionario(${funcionario.id}, '${nome.replace(/'/g, "\\'")}')">&#128465;</button>
            </div>
        `;

        container.appendChild(item);
    });

    if (badgeTotal) {
        var qtd = funcionarios.length;
        badgeTotal.innerText = qtd + (qtd === 1 ? " colaborador" : " colaboradores");
    }
}

function sincronizarHospitalSessao() {
    var idHospital = sessionStorage.ID_HOSPITAL || "1";
    var nomeHospital = sessionStorage.NOME_HOSPITAL;
    var iptIdHospital = document.getElementById("ipt_id_empresa");
    
    if (iptIdHospital) {
        iptIdHospital.value = idHospital;
    }
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

            renderizarCargos(cargos);
        })
        .catch(function (erro) {
            console.log("#ERRO:", erro);
        });
}

function listarFuncionarios() {
    var container = document.getElementById("funcionarios-list-container");
    if (!container) return;

    var idHospital = sessionStorage.ID_HOSPITAL || "";
    var url = idHospital ? `/usuarios/listarFuncionarios?idHospital=${idHospital}` : "/usuarios/listarFuncionarios";

    fetch(url, { method: "GET" })
        .then(function (resposta) {
            if (!resposta.ok) throw "Falha ao listar funcionários";
            return resposta.json();
        })
        .then(function (funcionarios) {
            listaFuncionariosGlobal = Array.isArray(funcionarios) ? funcionarios : [];
            renderizarFuncionarios(listaFuncionariosGlobal);
            listarCargos();
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

function renderizarCargos(cargos) {
    var container = document.getElementById("cargos-list-container");
    var badgeTotal = document.getElementById("badge-total-cargos");
    var kpiTotal = document.getElementById("kpi-total-cargos");
    var kpiMaior = document.getElementById("kpi-cargo-maior");

    if (badgeTotal) badgeTotal.textContent = cargos.length + (cargos.length === 1 ? " cargo" : " cargos");
    if (kpiTotal) kpiTotal.textContent = cargos.length;

    if (!container) return;
    container.innerHTML = "";

    if (cargos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Nenhum cargo cadastrado</p>
            </div>
        `;
        return;
    }

    var cargoMaisComum = "-";
    var maiorQtd = -1;

    cargos.forEach(function (cargo) {
        var qtdNoCargo = listaFuncionariosGlobal.filter(function (f) {
            return f["Função"] === cargo.funcao;
        }).length;

        if (qtdNoCargo > maiorQtd) {
            maiorQtd = qtdNoCargo;
            cargoMaisComum = cargo.funcao;
        }

        container.innerHTML += `
            <div class="funcionario-item">
                <div class="funcionario-item-left">
                    <div class="funcionario-avatar">${obterIniciais(cargo.funcao)}</div>
                    <div class="funcionario-info">
                        <span class="funcionario-nome">${cargo.funcao}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="funcionario-badge role">${qtdNoCargo} ${qtdNoCargo === 1 ? "membro" : "membros"}</span>
                    <button type="button" class="btn-toggle-eye" style="position: static;" title="Editar cargo" onclick="prepararEdicaoCargo(${cargo.id}, '${cargo.funcao.replace(/'/g, "\\'")}')">&#9998;</button>
                    <button type="button" class="btn-toggle-eye" style="position: static; color: #e11d48;" title="Excluir cargo" onclick="deletarCargo(${cargo.id}, '${cargo.funcao.replace(/'/g, "\\'")}')">&#128465;</button>
                </div>
            </div>
        `;
    });

    if (kpiMaior) kpiMaior.textContent = maiorQtd > 0 ? cargoMaisComum : "-";
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
    idHospitalEmEdicao = null;
    var form = document.getElementById("form-hospital");
    if (form) form.reset();

    var titulo = document.getElementById("titulo-form-hospital");
    var btn = document.getElementById("btn-cadastrar-hospital");
    if (titulo) titulo.textContent = "Novo Hospital";
    if (btn) btn.textContent = "Cadastrar Hospital";

    sumirMensagemHospital();
}

function prepararEdicaoHospital(id) {
    var hosp = listaHospitaisGlobal.find(function (h) { return h.id === id; });
    if (!hosp) return;

    idHospitalEmEdicao = id;
    nome_hospital_input.value = hosp.nome || "";
    cnpj_hospital_input.value = hosp.cnpj || "";
    telefone_hospital_input.value = hosp.telefone || "";
    email_hospital_input.value = hosp.email || "";
    cep_hospital_input.value = hosp.cep || "";
    numero_hospital_input.value = hosp.numero || "";

    var titulo = document.getElementById("titulo-form-hospital");
    var btn = document.getElementById("btn-cadastrar-hospital");
    if (titulo) titulo.textContent = "Editar Hospital";
    if (btn) btn.textContent = "Salvar Alterações";
    nome_hospital_input.focus();
}

function cadastrarHospital() {
    var nomeVar = nome_hospital_input.value.trim();
    var cnpjVar = cnpj_hospital_input.value.trim();
    var telefoneVar = telefone_hospital_input.value.trim();
    var emailVar = email_hospital_input.value.trim();
    var cepVar = cep_hospital_input.value.trim();
    var numeroVar = numero_hospital_input.value.trim();

    if (!nomeVar || !cnpjVar || !telefoneVar || !emailVar || !cepVar || !numeroVar) {
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

    var url = idHospitalEmEdicao
        ? `/hospital/editar/${idHospitalEmEdicao}`
        : "/hospital/cadastrarHospital";
    var metodo = idHospitalEmEdicao ? "PUT" : "POST";
    var msgSucesso = idHospitalEmEdicao
        ? "Hospital atualizado com sucesso!"
        : "Hospital cadastrado com sucesso!";

    fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
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
                mostrarMensagemHospital(msgSucesso, "sucesso");
                listarHospitais();
            } else {
                throw "Erro ao salvar (status " + resposta.status + ")";
            }
        })
        .catch(function (erro) {
            console.log("#ERRO:", erro);
            mostrarMensagemHospital("Não foi possível salvar o hospital. Tente novamente.", "erro");
        });

    return false;
}

function listarHospitais() {
    var container = document.getElementById("hospitais-list-container");
    if (!container) return;

    fetch("/hospital/listar", { method: "GET" })
        .then(function (resposta) {
            if (!resposta.ok) throw "Erro ao listar hospitais";
            return resposta.json();
        })
        .then(function (hospitais) {
            listaHospitaisGlobal = Array.isArray(hospitais) ? hospitais : [];
            renderizarHospitais(listaHospitaisGlobal);
        })
        .catch(function (erro) {
            console.log("#ERRO:", erro);
            renderizarHospitais([]);
        });
}

function renderizarHospitais(hospitais) {
    var container = document.getElementById("hospitais-list-container");
    var badgeTotal = document.getElementById("badge-total-hospitais");
    if (!container) return;

    container.innerHTML = "";
    if (badgeTotal) {
        badgeTotal.textContent = hospitais.length + (hospitais.length === 1 ? " hospital" : " hospitais");
    }

    if (hospitais.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>Nenhum hospital cadastrado</p></div>`;
        return;
    }

    hospitais.forEach(function (hosp) {
        container.innerHTML += `
            <div class="funcionario-item">
                <div class="funcionario-item-left">
                    <div class="funcionario-avatar">${obterIniciais(hosp.nome)}</div>
                    <div class="funcionario-info">
                        <span class="funcionario-nome">${hosp.nome}</span>
                        <div class="funcionario-meta">
                            <span class="funcionario-email">CNPJ: ${hosp.cnpj} • ${hosp.email}</span>
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <button type="button" class="btn-toggle-eye" style="position: static;" title="Editar hospital" onclick="prepararEdicaoHospital(${hosp.id})">&#9998;</button>
                    <button type="button" class="btn-toggle-eye" style="position: static; color: #e11d48;" title="Excluir hospital" onclick="deletarHospital(${hosp.id}, '${hosp.nome.replace(/'/g, "\\'")}')">&#128465;</button>
                </div>
            </div>
        `;
    });
}

function deletarHospital(id, nome) {
    if (!confirm(`Deseja realmente excluir o hospital "${nome}"?`)) return;

    fetch(`/hospital/deletar/${id}`, { method: "DELETE" })
        .then(function (resposta) {
            if (resposta.ok) {
                if (idHospitalEmEdicao === id) limparFormularioHospital();
                mostrarMensagemHospital("Hospital excluído com sucesso!", "sucesso");
                listarHospitais();
            } else if (resposta.status === 409) {
                mostrarMensagemHospital("Não é possível excluir: há funcionários ou equipamentos vinculados.", "erro");
            } else {
                throw "Erro ao excluir";
            }
        })
        .catch(function (erro) {
            console.log("#ERRO:", erro);
            mostrarMensagemHospital("Não foi possível excluir o hospital.", "erro");
        });
}

if (document.getElementById("hospitais-list-container")) {
    listarHospitais();
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

function limparFormularioCargo() {
    idCargoEmEdicao = null;
    var input = document.getElementById("cargo_funcao_input");
    var titulo = document.getElementById("titulo-form-cargo");
    var btn = document.getElementById("btn-salvar-cargo");
    var box = document.getElementById("cargo-feedback");

    if (input) input.value = "";
    if (titulo) titulo.textContent = "Novo Cargo";
    if (btn) btn.textContent = "Cadastrar Cargo";
    if (box) {
        box.style.display = "none";
        box.innerHTML = "";
    }
}

function mostrarFeedbackCargo(msg, tipo) {
    var box = document.getElementById("cargo-feedback");
    if (!box) return;
    box.className = "feedback-box " + (tipo || "success");
    var icone = tipo === "error" ? "&#9888;" : "&#10003;";
    box.innerHTML = "<span>" + icone + "</span><span>" + msg + "</span>";
    box.style.display = "flex";
    setTimeout(function () { box.style.display = "none"; }, 5000);
}

function prepararEdicaoCargo(id, funcaoAtual) {
    idCargoEmEdicao = id;
    var input = document.getElementById("cargo_funcao_input");
    var titulo = document.getElementById("titulo-form-cargo");
    var btn = document.getElementById("btn-salvar-cargo");

    if (input) {
        input.value = funcaoAtual;
        input.focus();
    }
    if (titulo) titulo.textContent = "Editar Cargo";
    if (btn) btn.textContent = "Salvar Alteração";
}

function salvarCargo() {
    var funcaoVar = document.getElementById("cargo_funcao_input").value.trim();

    if (funcaoVar == "") {
        mostrarFeedbackCargo("Informe o nome do cargo.", "error");
        return false;
    }

    var url = idCargoEmEdicao
        ? `/usuarios/editarCargo/${idCargoEmEdicao}`
        : "/usuarios/cadastrarCargo";
    var metodo = idCargoEmEdicao ? "PUT" : "POST";
    var msgSucesso = idCargoEmEdicao
        ? "Cargo atualizado com sucesso!"
        : "Cargo cadastrado com sucesso!";

    fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funcaoServer: funcaoVar })
    })
        .then(function (resposta) {
            if (resposta.ok) {
                limparFormularioCargo();
                mostrarFeedbackCargo(msgSucesso, "success");
                listarCargos();
            } else {
                throw "Erro ao salvar cargo";
            }
        })
        .catch(function (erro) {
            console.log("#ERRO:", erro);
            mostrarFeedbackCargo("Não foi possível salvar o cargo.", "error");
        });

    return false;
}

function deletarCargo(id, funcao) {
    if (!confirm(`Deseja realmente excluir o cargo "${funcao}"?`)) {
        return;
    }

    fetch(`/usuarios/deletarCargo/${id}`, {
        method: "DELETE"
    })
        .then(function (resposta) {
            if (resposta.ok) {
                if (idCargoEmEdicao === id) limparFormularioCargo();
                mostrarFeedbackCargo("Cargo excluído com sucesso!", "success");
                listarCargos();
            } else if (resposta.status === 409) {
                mostrarFeedbackCargo("Não é possível excluir: há colaboradores neste cargo.", "warn");
            } else {
                throw "Erro ao excluir cargo";
            }
        })
        .catch(function (erro) {
            console.log("#ERRO:", erro);
            mostrarFeedbackCargo("Não foi possível excluir o cargo.", "error");
        });
}
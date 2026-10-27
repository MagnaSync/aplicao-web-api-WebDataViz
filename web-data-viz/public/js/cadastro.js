// cadastro na tela de dashboard

function cadastrar() {
    // aguardar();

    //Recupere o valor da nova input pelo nome do id
    // Agora vá para o método fetch logo abaixo
    var nomeVar = nome_input.value;
    var emailVar = email_input.value;
    var senhaVar = senha_input.value;
    var confirmarSenhaVar = confirmacao_senha_input.value;
    var cargoVar = cargo_select.value;
    var hospitalIdVar = ipt_id_empresa.value;

    // Verificando se há algum campo em branco
    if (
      nomeVar == "" ||
      emailVar == "" ||
      senhaVar == "" ||
      cargoVar == "" ||
      hospitalIdVar == ""
    ) {
      cardErro.style.display = "block";
      mensagem_erro.innerHTML =
        "(Mensagem de erro para todos os campos em branco)";

      finalizarAguardar();
      return false;
    } else if(cargoVar == "null") {
      cardErro.style.display = "block";
      mensagem_erro.innerHTML = "(Mensagem de erro para cargo não selecionado)";
      finalizarAguardar();
      return false;
    } else if (senhaVar != confirmarSenhaVar) {
      cardErro.style.display = "block";
      mensagem_erro.innerHTML = "(Mensagem de erro para senha não correspondente)";
      finalizarAguardar();
      return false;
    }

    // Verificando se o código de ativação é de alguma empresa cadastrada
    // for (let i = 0; i < listaEmpresasCadastradas.length; i++) {
    //   if (listaEmpresasCadastradas[i].codigo_ativacao == codigoVar) {
    //     idEmpresaVincular = listaEmpresasCadastradas[i].id
    //     console.log("Código de ativação válido.");
    //     break;
    //   } else {
    //     cardErro.style.display = "block";
    //     mensagem_erro.innerHTML = "(Mensagem de erro para código inválido)";
    //     finalizarAguardar();
    //   }
    // }

    // Enviando o valor da nova input
    fetch("/usuarios/cadastrar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // crie um atributo que recebe o valor recuperado aqui
        // Agora vá para o arquivo routes/usuario.js
        nomeServer: nomeVar,
        emailServer: emailVar,
        senhaServer: senhaVar,
        idHospitalVincularServer: hospitalIdVar,
        cargoServer: cargoVar,
      }),
    })
      .then(function (resposta) {
        console.log("resposta: ", resposta);

        if (resposta.ok) {
          cardErro.style.display = "block";

          mensagem_erro.innerHTML =
            "Cadastro realizado com sucesso!";

         
          window.location.reload();
        } else {
          throw "Houve um erro ao tentar realizar o cadastro!";
        }
      })
      .catch(function (resposta) {
        console.log(`#ERRO: ${resposta}`);
      
      });

    return false;
  }

function listarCargos() {
  const cargo_select = document.getElementById("cargo_select");

  fetch("/usuarios/listarCargos", {
        method: "GET"
    })
    .then(resposta => resposta.json())
    .then(cargos => {
        console.log("Cargos recebidos:", cargos);
        console.log("Select encontrado:", cargo_select);

        cargos.forEach(cargo => {
            cargo_select.innerHTML +=
                `<option value="${cargo.id}">${cargo.funcao}</option>`;
        });
    })
    .catch(erro => console.log("#ERRO:", erro));
}

  // Listando empresas cadastradas 
//   function listar() {
//     fetch("/empresas/listar", {
//       method: "GET",
//     })
//       .then(function (resposta) {
//         resposta.json().then((empresas) => {
//           empresas.forEach((empresa) => {
//             listaEmpresasCadastradas.push(empresa);

//             console.log("listaEmpresasCadastradas")
//             console.log(listaEmpresasCadastradas[0].codigo_ativacao)
//           });
//         });
//       })
//       .catch(function (resposta) {
//         console.log(`#ERRO: ${resposta}`);
//       });
//   }

// function listarFuncionarios() {
//   const tabelaFuncionarios = document.getElementById("tabelaFuncionarios");

//   fetch("/usuarios/listarFuncionarios", {
//         method: "GET"
//     })
//     .then(resposta => resposta.json())
//     .then(funcionarios => {
//         console.log("Funcionários recebidos:", funcionarios);
//         console.log("Tabela encontrada:", tabelaFuncionarios);

//         funcionarios.forEach(funcionario => {
//             const row = tabelaFuncionarios.insertRow();
//             row.insertCell(0).innerText = funcionario["Nome do funcionário"];
//             row.insertCell(1).innerText = funcionario["Nome do Hospital"];
//             row.insertCell(2).innerText = funcionario["Função"];
//         });
//     })
//     .catch(erro => console.log("#ERRO:", erro));
// }

// Variável global para guardar os funcionários
let listaFuncionariosGlobal = [];

// 1. Busca os dados do servidor
function listarFuncionarios() {
  const container = document.getElementById("funcionarios-list-container");

  fetch("/usuarios/listarFuncionarios", { method: "GET" })
    .then(resposta => resposta.json())
    .then(funcionarios => {
        listaFuncionariosGlobal = funcionarios; // Salva globalmente
        renderizarFuncionarios(funcionarios);   // Desenha na tela
    })
    .catch(erro => console.log("#ERRO:", erro));
}

// 2. Desenha os funcionários na tela (HTML)
function renderizarFuncionarios(funcionarios) {
    const container = document.getElementById("funcionarios-list-container");
    container.innerHTML = "";

    function obterIniciais(nomeCompleto) {
        if (!nomeCompleto) return "";
        const partes = nomeCompleto.trim().split(" ");
        if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
        return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
    }

    if (!funcionarios || funcionarios.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p>Nenhum funcionário encontrado</p>
            </div>
        `;
        document.getElementById("badge-total-equipe").innerText = "0 colaboradores";
        return;
    }

    funcionarios.forEach(funcionario => {
        const nome = funcionario["Nome do funcionário"];
        const iniciais = obterIniciais(nome);

        const item = document.createElement("div");
        item.className = "funcionario-item";

        item.innerHTML = `
            <div class="funcionario-item-left">
                <div class="funcionario-avatar">${iniciais}</div>
                <div class="funcionario-info">
                    <span class="funcionario-nome">${nome}</span>
                    <div class="funcionario-meta">
                        <span>${funcionario["Nome do Hospital"]}</span>
                    </div>
                </div>
            </div>
            <span class="funcionario-badge role">${funcionario["Função"]}</span>
        `;

        container.appendChild(item);
    });

    document.getElementById("badge-total-equipe").innerText = `${funcionarios.length} colaboradores`;
}

// 3. Função separada para filtrar
function filtrarFuncionarios() {
    const inputBusca = document.getElementById("ipt_pesquisar_equipe");
    const termoBusca = inputBusca.value.toLowerCase().trim();

    const funcionariosFiltrados = listaFuncionariosGlobal.filter(funcionario => {
        const nome = funcionario["Nome do funcionário"] ? funcionario["Nome do funcionário"].toLowerCase() : "";
        const funcao = funcionario["Função"] ? funcionario["Função"].toLowerCase() : "";
        const email = funcionario["Email"] ? funcionario["Email"].toLowerCase() : ""; 
        
        return nome.includes(termoBusca) || funcao.includes(termoBusca) || email.includes(termoBusca);
    });

    renderizarFuncionarios(funcionariosFiltrados);
}

// 4. Evento que escuta a digitação
document.getElementById("ipt_pesquisar_equipe").addEventListener("input", filtrarFuncionarios);

  // Toggles de visibilidade de senha
function configurarToggleSenha(botaoId, inputId) {
    const botao = document.getElementById(botaoId);
    const input = document.getElementById(inputId);

    botao.addEventListener("click", function () {
        // Se for password, muda pra text. Se for text, muda pra password
        const tipoAtual = input.getAttribute("type");
        const novoTipo = tipoAtual === "password" ? "text" : "password";
        
        input.setAttribute("type", novoTipo);

        // Opcional: Muda o ícone (👁️ para aberto, 🙈 para fechado)
        this.innerHTML = novoTipo === "password" ? "&#128065;" : "&#128584;";
    });
}

// Configura os dois campos
configurarToggleSenha("toggle-senha-btn", "senha_input");
configurarToggleSenha("toggle-confirmar-senha-btn", "confirmacao_senha_input");

  // Limpar formulário
  const btnLimpar = document.getElementById('btn-limpar-form');
  if (btnLimpar) {
    btnLimpar.addEventListener('click', limparFormularioCadastro);
  }

  function limparFormularioCadastro() {
    const form = document.getElementById('form-cadastro-funcionario');
    if (form) form.reset();

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

  function sumirMensagem() {
    cardErro.style.display = "none";
  }
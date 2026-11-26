document.addEventListener('DOMContentLoaded', () => {
  // --- Animações ao rolar a página: AOS (https://github.com/michalsnik/aos) ---
  AOS.init({
    duration: 900,
    easing: 'ease-out-cubic',
    offset: 220,
    once: false,
    mirror: true,
  });

  // --- Menu: destaca (negrito) a seção atual ---
  const linksMenu = Array.from(document.querySelectorAll('.menu-navegacao a[href^="#"]'));
  const secoesMenu = linksMenu
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  function atualizarMenuAtivo() {
    const referencia = window.scrollY + 120;
    let atual = secoesMenu[0];
    secoesMenu.forEach((secao) => {
      if (secao.getBoundingClientRect().top + window.scrollY <= referencia) atual = secao;
    });

    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      atual = secoesMenu[secoesMenu.length - 1];
    }
    linksMenu.forEach((link) => {
      const ativo = atual && link.getAttribute('href') === '#' + atual.id;
      link.classList.toggle('ativo', ativo);
      if (ativo) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });

    const linksMobileAtivo = Array.from(document.querySelectorAll('.link-menu-mobile[href^="#"]'));
    linksMobileAtivo.forEach((link) => {
      const ativo = atual && link.getAttribute('href') === '#' + atual.id;
      link.classList.toggle('ativo', ativo);
    });
  }

  if (secoesMenu.length) {
    window.addEventListener('scroll', atualizarMenuAtivo, { passive: true });
    window.addEventListener('resize', atualizarMenuAtivo);
    atualizarMenuAtivo();
  }

  // --- Menu Mobile (Gaveta) ---
  const btnMenuMobile = document.getElementById('btn-menu-mobile');
  const btnFecharMenu = document.getElementById('btn-fechar-menu');
  const menuMobile = document.getElementById('menu-mobile');
  const menuMobileBackdrop = document.getElementById('menu-mobile-backdrop');
  const linksMobile = Array.from(document.querySelectorAll('.link-menu-mobile'));

  function abrirMenuMobile() {
    if (!menuMobile) return;
    menuMobile.classList.add('aberto');
    if (menuMobileBackdrop) menuMobileBackdrop.classList.add('ativo');
    if (btnMenuMobile) {
      btnMenuMobile.classList.add('aberto');
      btnMenuMobile.setAttribute('aria-expanded', 'true');
    }
    document.body.style.overflow = 'hidden';
  }

  function fecharMenuMobile() {
    if (!menuMobile) return;
    menuMobile.classList.remove('aberto');
    if (menuMobileBackdrop) menuMobileBackdrop.classList.remove('ativo');
    if (btnMenuMobile) {
      btnMenuMobile.classList.remove('aberto');
      btnMenuMobile.setAttribute('aria-expanded', 'false');
    }
    document.body.style.overflow = '';
  }

  if (btnMenuMobile) {
    btnMenuMobile.addEventListener('click', () => {
      if (menuMobile && menuMobile.classList.contains('aberto')) {
        fecharMenuMobile();
      } else {
        abrirMenuMobile();
      }
    });
  }

  if (btnFecharMenu) {
    btnFecharMenu.addEventListener('click', fecharMenuMobile);
  }

  if (menuMobileBackdrop) {
    menuMobileBackdrop.addEventListener('click', fecharMenuMobile);
  }

  linksMobile.forEach((link) => {
    link.addEventListener('click', fecharMenuMobile);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuMobile && menuMobile.classList.contains('aberto')) {
      fecharMenuMobile();
    }
  });

  // --- Acordeão de Dúvidas (FAQ) ---
  const itensDuvida = Array.from(document.querySelectorAll('.item-duvida'));
  let indiceAtivo = 0;

  itensDuvida.forEach((item, index) => {
    const botaoToggle = item.querySelector('button');
    if (!botaoToggle) return;

    botaoToggle.addEventListener('click', () => {
      indiceAtivo = indiceAtivo === index ? -1 : index;

      itensDuvida.forEach((itemDuvida, i) => {
        const estaAberto = i === indiceAtivo;
        itemDuvida.classList.toggle('open', estaAberto);
        const botao = itemDuvida.querySelector('button');
        if (botao) {
          botao.setAttribute('aria-expanded', String(estaAberto));
        }
      });
    });
  });

  // --- Formulário de Solicitação de Demonstração ---
  const formulario = document.getElementById('formulario-contato');
  const areaFormulario = document.getElementById('area-formulario');

  if (formulario && areaFormulario) {
    formulario.addEventListener('submit', (event) => {
      event.preventDefault();
      areaFormulario.innerHTML = `
        <div class="formulario-sucesso">
          <span class="icone-sucesso">&#10003;</span>
          <div>
            <span>Solicitação recebida com sucesso.</span>
            <small>Nossa equipe técnica especializada entrará em contato em breve.</small>
          </div>
        </div>
      `;
    });
  }
});

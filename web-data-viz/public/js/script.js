/**
 * MagnaSync — Scripts da Plataforma
 * Gerencia menu mobile, acordeão de dúvidas (FAQ) e envio de contato.
 * Totalmente livre de dependências de SVG externas ou injetadas.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- Menu Mobile de Navegação ---
  const menuButton = document.getElementById('menu-btn');
  const mobileNav = document.getElementById('mobile-nav');

  let isMenuOpen = false;

  if (menuButton && mobileNav) {
    menuButton.addEventListener('click', () => {
      isMenuOpen = !isMenuOpen;
      mobileNav.classList.toggle('open', isMenuOpen);
      menuButton.classList.toggle('is-open', isMenuOpen);
      menuButton.setAttribute('aria-label', isMenuOpen ? 'Fechar menu' : 'Abrir menu');
    });

    // Fecha o menu ao clicar em qualquer link
    const navLinks = mobileNav.querySelectorAll('a');
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        isMenuOpen = false;
        mobileNav.classList.remove('open');
        menuButton.classList.remove('is-open');
        menuButton.setAttribute('aria-label', 'Abrir menu');
      });
    });
  }

  // --- Accordion FAQ ---
  const faqItems = Array.from(document.querySelectorAll('.faq-item'));
  let activeFaqIndex = 0; // Primeiro item aberto por padrão

  faqItems.forEach((item, index) => {
    const toggleButton = item.querySelector('button');
    if (!toggleButton) return;

    toggleButton.addEventListener('click', () => {
      activeFaqIndex = activeFaqIndex === index ? -1 : index;

      faqItems.forEach((faqItem, i) => {
        const isOpen = i === activeFaqIndex;
        faqItem.classList.toggle('open', isOpen);
        const button = faqItem.querySelector('button');
        if (button) {
          button.setAttribute('aria-expanded', String(isOpen));
        }
      });
    });
  });

  // --- Formulário de Solicitação de Demonstração ---
  const ctaForm = document.getElementById('cta-form');
  const ctaFormArea = document.getElementById('cta-form-area');

  if (ctaForm && ctaFormArea) {
    ctaForm.addEventListener('submit', (event) => {
      event.preventDefault();
      ctaFormArea.innerHTML = `
        <div class="form-success">
          <span class="success-icon">&#10003;</span>
          <div>
            <span>Solicitação recebida com sucesso.</span>
            <small>Nossa equipe técnica especializada entrará em contato em breve.</small>
          </div>
        </div>
      `;
    });
  }
});

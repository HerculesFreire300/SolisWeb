// Ano no rodapé
document.getElementById('year').textContent = new Date().getFullYear();

// ---- Menu mobile ----
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');

navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ---- Abas de preços ----
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.plans-grid');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;

    tabs.forEach(t => {
      t.classList.toggle('is-active', t === tab);
      t.setAttribute('aria-selected', String(t === tab));
    });

    panels.forEach(panel => {
      panel.classList.toggle('is-hidden', panel.dataset.panel !== target);
    });
  });
});

// ---- Revelação suave ao rolar a página ----
const revealEls = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // pequeno atraso em cascata para os itens do mesmo grupo
      const delay = (i % 3) * 90;
      setTimeout(() => entry.target.classList.add('is-visible'), delay);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => revealObserver.observe(el));

// ---- FAQ accordion ----
document.querySelectorAll('.faq-question').forEach(button => {
  button.addEventListener('click', () => {
    const answer = button.nextElementSibling;
    const isOpen = button.getAttribute('aria-expanded') === 'true';

    // fecha os outros itens
    document.querySelectorAll('.faq-question').forEach(other => {
      if (other !== button) {
        other.setAttribute('aria-expanded', 'false');
        other.nextElementSibling.style.maxHeight = null;
      }
    });

    button.setAttribute('aria-expanded', String(!isOpen));
    answer.style.maxHeight = isOpen ? null : answer.scrollHeight + 'px';
  });
});

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
const panels = document.querySelectorAll('.plans-grid, .table-note[data-panel]');

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

// ---- Cascata das imagens vinculada à rolagem da página ----
// Em vez de disparar uma animação única, cada imagem só "cai" na
// proporção em que o usuário rola a página para baixo — como um
// scrub ligado ao scroll, não como uma transição por tempo.
const capaStack = document.getElementById('capaStack');

if (capaStack) {
  const capaImgs = Array.from(capaStack.querySelectorAll('img'));
  const FALL_DISTANCE = 22;  // movimento reduzido, em pixels
  const SCROLL_RANGE = 500;  // distância de rolagem, em pixels, até a cascata completar
  let ticking = false;

  function updateCascade() {
    ticking = false;
    let progress = window.scrollY / SCROLL_RANGE;
    progress = Math.max(0, Math.min(1, progress));

    capaImgs.forEach((img, i) => {
      // cada imagem seguinte exige um pouco mais de rolagem para começar a cair
      const start = i * 0.12;
      let imgProgress = (progress - start) / (1 - start);
      imgProgress = Math.max(0, Math.min(1, imgProgress));

      img.style.opacity = imgProgress;
      img.style.transform = `translateY(${(1 - imgProgress) * -FALL_DISTANCE}px)`;
    });
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateCascade);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateCascade();
}

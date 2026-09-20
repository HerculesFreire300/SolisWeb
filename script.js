document.addEventListener('DOMContentLoaded', () => {

    /* =========================================================
       1. REVEAL SUAVE AO ROLAR A PÁGINA (SCROLL OBSERVER)
       ========================================================= */
    const revealElements = document.querySelectorAll('.reveal-on-scroll');

    if (revealElements.length > 0) {
        const revealObserverOptions = {
            root: null,
            rootMargin: '0px 0px -50px 0px',
            threshold: 0.1
        };

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, revealObserverOptions);

        revealElements.forEach(el => revealObserver.observe(el));
    }

    /* =========================================================
       2. INTERATIVIDADE DO ACCORDION (FAQ)
       ========================================================= */
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach((item, index) => {
        const questionBtn = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const icon = item.querySelector('.faq-icon');

        if (questionBtn) {
            // Acessibilidade: liga o botão à resposta e avisa leitores de tela
            // se a pergunta está aberta ou fechada (aria-expanded/aria-controls)
            if (answer) {
                if (!answer.id) answer.id = `faq-answer-${index + 1}`;
                questionBtn.setAttribute('aria-controls', answer.id);
            }
            questionBtn.setAttribute('aria-expanded', 'false');

            questionBtn.addEventListener('click', () => {
                const isActive = item.classList.contains('active');

                // Fecha todos os outros itens abertos
                faqItems.forEach(otherItem => {
                    otherItem.classList.remove('active');
                    const otherIcon = otherItem.querySelector('.faq-icon');
                    if (otherIcon) otherIcon.textContent = '+';
                    const otherBtn = otherItem.querySelector('.faq-question');
                    if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
                });

                // Alterna o estado do item clicado
                if (!isActive) {
                    item.classList.add('active');
                    if (icon) icon.textContent = '−';
                    questionBtn.setAttribute('aria-expanded', 'true');
                }
            });
        }
    });

    /* =========================================================
       3. SCROLL SUAVE PARA LINKS INTERNOS DA NAVBAR
       ========================================================= */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    /* =========================================================
       4. DIFICULTAR O DOWNLOAD DAS IMAGENS DO SITE
       (bloqueia clique direito "Salvar imagem como..." e o
       arrastar da imagem para a área de trabalho/outra aba)
       ========================================================= */
    document.querySelectorAll('img').forEach(img => {
        img.addEventListener('contextmenu', e => e.preventDefault());
        img.setAttribute('draggable', 'false');
        img.addEventListener('dragstart', e => e.preventDefault());
    });

});
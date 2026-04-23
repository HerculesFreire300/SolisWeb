// SOLISWEB - Interatividade e Dinamismo

document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    const cards = document.querySelectorAll('.service-card, .price-card, .evolution-bubble, .testimonial-bubble');

    // 1. Efeito de Scroll na Navbar (Transparência Dinâmica)
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.padding = '10px 0';
            navbar.style.boxShadow = '0 5px 20px rgba(0,0,0,0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.7)';
            navbar.style.padding = '15px 0';
            navbar.style.boxShadow = 'none';
        }
    });

    // 2. Animação de Revelação (Scroll Reveal Lite)
    // Faz com que os elementos apareçam suavemente conforme você desce a página
    const observerOptions = {
        threshold: 0.1
    };

    const revealOnScroll = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    cards.forEach(card => {
        // Estado inicial para animação
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease-out';
        revealOnScroll.observe(card);
    });

    // 3. Efeito de Clique nos Botões (Feedback Visual)
    const buttons = document.querySelectorAll('a[href^="https://wa.me"]');
    buttons.forEach(btn => {
        btn.addEventListener('mousedown', () => {
            btn.style.transform = 'scale(0.95)';
        });
        btn.addEventListener('mouseup', () => {
            btn.style.transform = 'scale(1.05)';
        });
    });

    // 4. Smooth Scroll para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
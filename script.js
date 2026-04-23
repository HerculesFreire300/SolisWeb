document.addEventListener('DOMContentLoaded', () => {
    
    // 1. EFEITO DE SCROLL NO HEADER
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 2. ANIMAÇÃO DE REVELAÇÃO (REVEAL ON SCROLL)
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealOnScroll = () => {
        revealElements.forEach(el => {
            const elementTop = el.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight - 100) {
                el.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Gatilho inicial para o que já está na tela

    // 3. MENU MOBILE DINÂMICO
    const mobileMenuIcon = document.getElementById('mobile-menu');
    const navLinks = document.getElementById('nav-links');

    mobileMenuIcon.addEventListener('click', () => {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        
        // Estilo rápido para o menu mobile se aberto
        if(navLinks.style.display === 'flex') {
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '80px';
            navLinks.style.left = '0';
            navLinks.style.width = '100%';
            navLinks.style.background = 'white';
            navLinks.style.padding = '20px';
            navLinks.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
        }
    });

    // 4. INTERATIVIDADE NOS BOTÕES (Efeito de clique)
    const buttons = document.querySelectorAll('.btn-modern, .btn-card, .btn-solis-premium');
    
    buttons.forEach(btn => {
        btn.addEventListener('mousedown', () => {
            btn.style.transform = 'scale(0.95)';
        });
        btn.addEventListener('mouseup', () => {
            btn.style.transform = 'scale(1.05)';
        });
    });

    // 5. PARALLAX SUAVE NA IMAGEM DO PORTFÓLIO
    const portfolioImg = document.querySelector('.interactive-img');
    if(portfolioImg) {
        window.addEventListener('mousemove', (e) => {
            const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
            const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
            portfolioImg.style.transform = `translate(${moveX}px, ${moveY}px) rotateX(${moveY}deg) rotateY(${moveX}deg)`;
        });
    }
});
// Adicione este código dentro do seu document.addEventListener('DOMContentLoaded', ... )

// INTERATIVIDADE NOS BALÕES DE DEPOIMENTOS
const balloons = document.querySelectorAll('.testimonial-card p');

balloons.forEach(balloon => {
    balloon.addEventListener('mousemove', (e) => {
        const { offsetWidth: width, offsetHeight: height } = balloon;
        const { offsetX: x, offsetY: y } = e;
        
        // Calcula a inclinação baseada na posição do mouse dentro do balão
        const moveX = (x / width - 0.5) * 10;
        const moveY = (y / height - 0.5) * 10;
        
        balloon.style.transform = `translateY(-10px) rotateX(${-moveY}deg) rotateY(${moveX}deg)`;
    });

    balloon.addEventListener('mouseleave', () => {
        balloon.style.transform = `translateY(0px) rotateX(0deg) rotateY(0deg)`;
    });
});

// EFEITO DE HOVER DINÂMICO NOS CARDS DE MANUTENÇÃO (Evolução Contínua)
const mCards = document.querySelectorAll('.m-card');
mCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        if(!card.classList.contains('vip')) {
            card.style.borderColor = '#0077ff';
        }
    });
    card.addEventListener('mouseleave', () => {
        if(!card.classList.contains('vip')) {
            card.style.borderColor = 'rgba(0, 119, 255, 0.1)';
        }
    });
});
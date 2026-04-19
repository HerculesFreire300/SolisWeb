/**
 * Solis Web Design - Script de Interatividade Premium
 * Assistente: Gemini 2026
 * Cliente: Dr. Celso Sol
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- 1. Seletores Principais ---
    const header = document.querySelector('#header');
    const mobileMenuBtn = document.querySelector('#mobile-menu');
    const navLinksContainer = document.querySelector('#nav-links');
    const navLinks = document.querySelectorAll('.nav-links a');
    const revealElements = document.querySelectorAll('.reveal');

    // --- 2. Controle do Header (Efeito de sombra ao rolar) ---
    const updateHeader = () => {
        if (!header) return;
        // Adiciona uma sombra suave ao header quando o usuário rola a página
        if (window.scrollY > 20) {
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.05)';
            header.style.background = 'rgba(255, 255, 255, 0.95)';
        } else {
            header.style.boxShadow = 'none';
            header.style.background = 'rgba(255, 255, 255, 0.85)';
        }
    };

    window.addEventListener('scroll', updateHeader, { passive: true });

    // --- 3. Menu Mobile (Abre e fecha) ---
    if (mobileMenuBtn && navLinksContainer) {
        const toggleMenu = () => {
            navLinksContainer.classList.toggle('active');
            
            // Alterna o ícone entre Barras e "X"
            const icon = mobileMenuBtn.querySelector('i');
            if (navLinksContainer.classList.contains('active')) {
                icon.classList.replace('fa-bars', 'fa-times');
                navLinksContainer.style.display = 'flex';
                navLinksContainer.style.flexDirection = 'column';
                navLinksContainer.style.position = 'absolute';
                navLinksContainer.style.top = '100%';
                navLinksContainer.style.left = '0';
                navLinksContainer.style.width = '100%';
                navLinksContainer.style.background = '#ffffff';
                navLinksContainer.style.padding = '2rem';
                navLinksContainer.style.borderBottom = '1px solid #e2e8f0';
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
                navLinksContainer.style.display = ''; // Volta ao padrão do CSS
            }
        };

        mobileMenuBtn.addEventListener('click', toggleMenu);

        // Fecha o menu automaticamente ao clicar em qualquer link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navLinksContainer.classList.contains('active')) toggleMenu();
            });
        });
    }

    // --- 4. Scroll Reveal (Animação de surgimento dos itens) ---
    // Faz os elementos aparecerem com um efeito de "subida" ao rolar a página
    const revealOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const revealOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Anima apenas uma vez
            }
        });
    }, revealOptions);

    revealElements.forEach(el => revealOnScroll.observe(el));

    // --- 5. Smooth Scroll (Navegação Suave) ---
    // Faz a página deslizar suavemente até a seção desejada
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return; 

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const headerHeight = header ? header.offsetHeight : 70;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Inicializa o estado do header
    updateHeader();
});
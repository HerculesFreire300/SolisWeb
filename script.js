/* SOLIS WEB - JavaScript Professional Control 
   Desenvolvido para: Solis Web
*/

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- 1. SELETORES ---
    const header = document.querySelector('header');
    const mobileMenuBtn = document.querySelector('#mobile-menu');
    const navLinksContainer = document.querySelector('.nav-links');
    const revealElements = document.querySelectorAll('.reveal');

    // --- 2. EFEITO DE SCROLL NO HEADER ---
    // Melhora a visibilidade do menu ao rolar a página
    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
            header.style.padding = '0.8rem 0'; // Reduz levemente a altura ao rolar
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.85)';
            header.style.boxShadow = 'none';
            header.style.padding = '1.2rem 0';
        }
    };

    window.addEventListener('scroll', handleScroll);

    // --- 3. MENU MOBILE (ABRIR / FECHAR) ---
    if (mobileMenuBtn && navLinksContainer) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
            
            // Troca o ícone (Bars/Times)
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });
    }

    // Fecha o menu mobile ao clicar em um link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinksContainer.classList.contains('active')) {
                navLinksContainer.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-times');
                }
            }
        });
    });

    // --- 4. INTERSECTION OBSERVER (REVEAL ON SCROLL) ---
    const observerOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Opcional: para a animação rodar apenas uma vez
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => revealObserver.observe(el));

    // --- 5. SMOOTH SCROLL (NAVEGAÇÃO INTELIGENTE) ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                
                // Cálculo compensando a altura do header fixo
                const headerHeight = header.offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});
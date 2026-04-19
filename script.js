/* SOLIS WEB - JavaScript Professional Control 
   Desenvolvido para: Dr. Celso Sol
*/

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- 1. SELETORES ---
    const header = document.querySelector('header');
    const mobileMenuBtn = document.querySelector('#mobile-menu'); // Certifique-se de ter este ID no seu botão de menu
    const navLinksContainer = document.querySelector('.nav-links');
    const revealElements = document.querySelectorAll('.reveal');

    // --- 2. EFEITO DE SCROLL NO HEADER ---
    // Adiciona uma sombra ao menu superior quando você desce a página
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.85)';
            header.style.boxShadow = 'none';
        }
    });

    // --- 3. MENU MOBILE (ABRIR / FECHAR) ---
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
            
            // Troca o ícone se estiver usando FontAwesome
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });
    }

    // Fecha o menu mobile ao clicar em qualquer link (melhora a experiência)
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinksContainer.classList.contains('active')) {
                navLinksContainer.classList.remove('active');
            }
        });
    });

    // --- 4. SCROLL REVEAL (ANIMAÇÃO DE ENTRADA) ---
    // Faz os elementos aparecerem suavemente ao subir a página
    const observerOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    revealElements.forEach(el => revealObserver.observe(el));

    // --- 5. NAVEGAÇÃO SUAVE (SMOOTH SCROLL) ---
    // Faz o "pulo" para as seções ser um deslize elegante
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const headerHeight = header.offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});
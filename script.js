/* SOLIS WEB - JavaScript Professional Control 
   Versão Otimizada: Dr. Celso Sol | 2026
*/

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- 1. SELETORES ---
    const header = document.querySelector('header');
    const mobileMenuBtn = document.querySelector('#mobile-menu'); // Certifique-se que o ID no HTML seja este
    const navLinksContainer = document.querySelector('.nav-links');
    const revealElements = document.querySelectorAll('.reveal');

    // --- 2. EFEITO DE SCROLL NO HEADER (Com Performance) ---
    let isScrolling = false;

    const handleScroll = () => {
        if (!header) return;

        if (window.scrollY > 50) {
            header.classList.add('header-scrolled'); // Recomendado usar classes CSS em vez de style direto
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
            header.style.padding = '0.8rem 0';
        } else {
            header.classList.remove('header-scrolled');
            header.style.background = 'rgba(255, 255, 255, 0.85)';
            header.style.boxShadow = 'none';
            header.style.padding = '1.2rem 0';
        }
        isScrolling = false;
    };

    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(handleScroll);
            isScrolling = true;
        }
    });

    // --- 3. MENU MOBILE (Lógica Consolidada) ---
    const toggleMenu = (forceClose = false) => {
        if (!navLinksContainer || !mobileMenuBtn) return;

        const icon = mobileMenuBtn.querySelector('i');
        const isActive = navLinksContainer.classList.contains('active');

        if (forceClose || isActive) {
            navLinksContainer.classList.remove('active');
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
            if (icon) {
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
            }
        } else {
            navLinksContainer.classList.add('active');
            mobileMenuBtn.setAttribute('aria-expanded', 'true');
            if (icon) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            }
        }
    };

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });
    }

    // Fecha ao clicar em links
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => toggleMenu(true));
    });

    // Fecha ao clicar fora do menu
    document.addEventListener('click', (e) => {
        if (navLinksContainer?.classList.contains('active') && 
            !navLinksContainer.contains(e.target) && 
            !mobileMenuBtn.contains(e.target)) {
            toggleMenu(true);
        }
    });

    // --- 4. INTERSECTION OBSERVER (Reveal on Scroll) ---
    if (revealElements.length > 0) {
        const observerOptions = {
            threshold: 0.15,
            rootMargin: "0px 0px -50px 0px"
        };

        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        revealElements.forEach(el => revealObserver.observe(el));
    }

    // --- 5. SMOOTH SCROLL (Navegação com Compensação de Header) ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || !targetId.startsWith('#')) return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                
                const headerHeight = header ? header.offsetHeight : 0;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});
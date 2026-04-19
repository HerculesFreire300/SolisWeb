/**
 * Solis Web Design - Script de Interatividade Premium
 * Branding: Dr. Celso Sol
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- Seletores de Elementos ---
    const header = document.querySelector('header') || document.querySelector('#header');
    const mobileMenuBtn = document.querySelector('#mobile-menu');
    const navLinksContainer = document.querySelector('.nav-links') || document.querySelector('#nav-links');
    const navLinks = document.querySelectorAll('.nav-links a');
    const revealElements = document.querySelectorAll('.reveal');

    // --- 1. Controle do Header (Efeito ao rolar) ---
    const updateHeader = () => {
        if (!header) return;
        window.scrollY > 50 
            ? header.classList.add('scrolled') 
            : header.classList.remove('scrolled');
    };

    window.addEventListener('scroll', updateHeader, { passive: true });

    // --- 2. Menu Mobile ---
    if (mobileMenuBtn && navLinksContainer) {
        const toggleMenu = () => {
            navLinksContainer.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            
            if (navLinksContainer.classList.contains('active')) {
                if (icon) icon.classList.replace('fa-bars', 'fa-times');
                document.body.style.overflow = 'hidden'; 
            } else {
                if (icon) icon.classList.replace('fa-times', 'fa-bars');
                document.body.style.overflow = 'auto';
            }
        };

        mobileMenuBtn.addEventListener('click', toggleMenu);

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navLinksContainer.classList.contains('active')) toggleMenu();
            });
        });
    }

    // --- 3. Scroll Reveal (Intersection Observer) ---
    const revealOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const revealOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => revealOnScroll.observe(el));

    // --- 4. Smooth Scroll (Navegação Suave Corrigida) ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return; 

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const headerHeight = header ? header.offsetHeight : 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // --- 5. Efeito de Perspectiva 3D na Imagem (REMOVIDO) ---
    // O código que adicionava movimento à imagem (.interactive-img) 
    // baseada no mouse foi removido para que ela permaneça estática.

    updateHeader();
});
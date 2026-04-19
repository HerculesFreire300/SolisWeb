/**
 * Solis Web Design - Script de Interatividade Premium
 * Branding: Dr. Celso Sol
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- Seletores de Elementos ---
    // Usando seletores que aceitam tanto IDs quanto Classes para maior segurança
    const header = document.querySelector('header') || document.querySelector('#header');
    const mobileMenuBtn = document.querySelector('#mobile-menu');
    const navLinksContainer = document.querySelector('.nav-links') || document.querySelector('#nav-links');
    const navLinks = document.querySelectorAll('.nav-links a');
    const revealElements = document.querySelectorAll('.reveal');
    const interactiveImg = document.querySelector('.interactive-img');

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

        // Fechar menu ao clicar em links (importante para Single Page Apps)
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
            if (targetId === '#') return; // Ignora links vazios

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

    // --- 5. Efeito de Perspectiva 3D na Imagem ---
    // Nota: No CSS anterior definimos como estática, mas este JS adiciona o 
    // movimento controlado pelo mouse caso você decida manter a interatividade.
    if (interactiveImg) {
        interactiveImg.addEventListener('mousemove', (e) => {
            const { left, top, width, height } = interactiveImg.getBoundingClientRect();
            const x = (e.clientX - left) / width - 0.5;
            const y = (e.clientY - top) / height - 0.5;

            interactiveImg.style.transform = `
                perspective(1000px) 
                rotateY(${x * 12}deg) 
                rotateX(${y * -12}deg) 
                scale(1.05)
            `;
        });

        interactiveImg.addEventListener('mouseleave', () => {
            interactiveImg.style.transform = 'perspective(1000px) rotateY(0) rotateX(0) scale(1)';
        });
    }

    // Execução inicial
    updateHeader();
});
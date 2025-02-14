import { loadComponent } from './components.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Load header and wait for it to complete
    await loadComponent('header', '/components/header.html');
    
    // Highlight active page in the navigation menu
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    navLinks.forEach(link => {
        if (link.dataset.page === currentPath) {
            link.classList.add('text-white', 'font-bold');
        } else {
            link.classList.remove('text-white', 'font-bold');
        }
    });

    // Load footer (can load independently)
    loadComponent('footer', '/components/footer.html');
});
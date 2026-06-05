'use strict';

/* global AuthService, SearchService, UserService, EventService, AppUI, HttpClient */

let currentFilter = 'all';
let debounceTimer = null;
let currentResults = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!AuthService.requireAuth()) return;
    bindSearch();
    bindFilters();
    bindLogout();
});

function bindSearch() {
    document.getElementById('globalSearchInput')?.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => performSearch(e.target.value.trim()), 300);
    });
}

async function performSearch(query) {
    const container = document.getElementById('searchResults');
    if (query.length < 2) {
        container.innerHTML = '<div class="search-empty"><p>Commencez a taper pour voir les resultats...</p></div>';
        return;
    }

    container.innerHTML = '<div class="loading">Recherche en cours...</div>';

    try {
        currentResults = await SearchService.search(query, currentFilter);
        renderResults(currentResults, container);
    } catch (err) {
        console.error('[SearchAdapter] Search error:', err);
        container.innerHTML = '<div class="search-empty"><p>Impossible de charger les resultats.</p></div>';
    }
}

function renderResults(results, container) {
    if (!results.length) {
        container.innerHTML = '<div class="search-empty"><p>Aucun resultat trouve.</p></div>';
        return;
    }

    container.innerHTML = results.map((item, index) => `
        <article class="result-card ${HttpClient.escapeHtml(item.type)}" data-index="${index}">
            <div class="result-icon"><i class="${getIcon(item.type)}"></i></div>
            <div class="result-content">
                <h4>${HttpClient.escapeHtml(item.title || '')}</h4>
                <p>${HttpClient.escapeHtml(item.description || item.subtitle || '')}</p>
                <div class="result-actions">${renderAction(item, index)}</div>
            </div>
            <span class="category-tag">${labelType(item.type)}</span>
        </article>`).join('');

    container.querySelectorAll('[data-search-action]').forEach((button) => {
        button.addEventListener('click', () => handleAction(button.dataset.searchAction, Number(button.dataset.index)));
    });
}

function renderAction(item, index) {
    if (item.type === 'user') {
        return `<button class="result-action-btn" data-search-action="follow" data-index="${index}">Ajouter comme ami</button>`;
    }
    if (item.type === 'event') {
        return `<button class="result-action-btn" data-search-action="join-event" data-index="${index}">Participer</button>`;
    }
    if (item.type === 'post') {
        return `<button class="result-action-btn secondary" data-search-action="open-feed" data-index="${index}">Voir dans le flux</button>`;
    }
    return '';
}

async function handleAction(action, index) {
    const item = currentResults[index];
    if (!item) return;

    try {
        if (action === 'follow') {
            await UserService.follow(item.id);
            AppUI.notify(`${item.title} a ete ajoute a tes amis.`, 'success');
        } else if (action === 'join-event') {
            await EventService.join(item.id);
            AppUI.notify('Participation enregistree.', 'success');
        } else if (action === 'open-feed') {
            window.location.href = `dashboard.html#post-${item.id}`;
        }
    } catch (err) {
        console.error('[SearchAdapter] Action error:', err);
        AppUI.notify("Cette action n'a pas pu etre terminee.", 'error');
    }
}

function getIcon(type) {
    return {
        user: 'fas fa-user-plus',
        post: 'fas fa-file-alt',
        event: 'fas fa-calendar-check',
    }[type] || 'fas fa-search';
}

function labelType(type) {
    return {
        user: 'Etudiant',
        post: 'Publication',
        event: 'Evenement',
    }[type] || type;
}

function bindFilters() {
    document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.filter-btn.active')?.classList.remove('active');
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.filter || 'all';
            const query = document.getElementById('globalSearchInput').value.trim();
            if (query.length >= 2) performSearch(query);
        });
    });
}

function bindLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        AuthService.logout();
    });
}

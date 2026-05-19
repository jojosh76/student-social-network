/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — SEARCH ADAPTER (SOA)                         ║
 * ║  Service consommé : SearchService                                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* global AuthService, SearchService */

let _currentFilter = 'all';
let _debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!AuthService.requireAuth()) return;
    _bindSearch();
    _bindFilters();
    _bindLogout();
});

// ─── RECHERCHE (avec debounce anti-surcharge) ─────────────────────────────────

function _bindSearch() {
    document.getElementById('globalSearchInput').addEventListener('input', (e) => {
        clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(() => _performSearch(e.target.value), 300);
    });
}

async function _performSearch(query) {
    const container = document.getElementById('searchResults');
    if (query.length < 2) {
        container.innerHTML = '';
        return;
    }

    try {
        const results = await SearchService.search(query, _currentFilter);
        _renderResults(results, container);
    } catch (err) {
        console.error('[SearchAdapter > SearchService] Erreur :', err);
        container.innerHTML = '<p>Erreur lors de la recherche.</p>';
    }
}

// ─── RENDU ────────────────────────────────────────────────────────────────────

function _renderResults(results, container) {
    if (!results.length) {
        container.innerHTML = '<p style="text-align:center;padding:20px">Aucun résultat trouvé.</p>';
        return;
    }

    container.innerHTML = results.map(item => `
        <div class="result-card ${item.type}">
            <div class="result-icon">${_getIcon(item.type)}</div>
            <div class="result-content">
                <h4>${item.title}</h4>
                <p>${item.description}</p>
            </div>
            <span class="category-tag">${item.type}</span>
        </div>`).join('');
}

function _getIcon(type) {
    const icons = { user: '👤', post: '📝', event: '📅', default: '🔍' };
    return icons[type] || icons.default;
}

// ─── FILTRES / LOGOUT ─────────────────────────────────────────────────────────

function _bindFilters() {
    document.querySelectorAll('.search-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.search-filter-btn.active')?.classList.remove('active');
            e.target.classList.add('active');
            _currentFilter = e.target.dataset.type || 'all';
            const query = document.getElementById('globalSearchInput').value;
            if (query.length >= 2) _performSearch(query);
        });
    });
}

function _bindLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        AuthService.logout();
    });
}

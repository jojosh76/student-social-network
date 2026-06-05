/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — EVENTS ADAPTER (SOA)                         ║
 * ║  Service consommé : EventService                                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* global AuthService, EventService, AppUI */

document.addEventListener('DOMContentLoaded', () => {
    if (!AuthService.requireAuth()) return;
    _loadEvents();
    _bindFilters();
    _bindLogout();
});

// ─── CHARGEMENT ───────────────────────────────────────────────────────────────

async function _loadEvents(category = 'all') {
    const grid = document.getElementById('eventsGrid');
    grid.innerHTML = '<div class="loading">Chargement des événements...</div>';

    try {
        const events = await EventService.getAll(category);
        _renderEvents(events, grid);
    } catch (err) {
        console.error('[EventsAdapter > EventService] Erreur :', err);
        grid.innerHTML = '<p>Erreur lors de la récupération des événements.</p>';
    }
}

// ─── RENDU ────────────────────────────────────────────────────────────────────

function _renderEvents(events, grid) {
    if (!events.length) {
        grid.innerHTML = '<p style="text-align:center;padding:30px">Aucun événement dans cette catégorie.</p>';
        return;
    }

    grid.innerHTML = events.map(event => {
        const date = new Date(event.startsAt || event.date || Date.now());
        return `
        <div class="event-card card">
            <div class="event-banner" aria-label="${event.title}"></div>
            <div class="event-date-floating">
                <span class="day">${event.day || date.getDate()}</span>
                <span class="month">${event.month || date.toLocaleString('fr-FR', { month: 'short' })}</span>
            </div>
            <div class="event-body">
                <span class="event-category">${event.category}</span>
                <h3>${event.title}</h3>
                <p>${event.description || ''}</p>
                <div class="event-meta">
                    <i class="fas fa-map-marker-alt"></i> ${event.location}
                </div>
                <button class="btn-participate" onclick="joinEvent('${event.id}')">${event.joined ? 'Inscrit' : 'Je participe'}</button>
            </div>
        </div>`;
    }).join('');
}

// ─── INSCRIPTION (Event-Driven) ───────────────────────────────────────────────

/**
 * Inscription à un événement.
 * Pattern Event-Driven : l'EventService publie un événement "USER_JOINED_EVENT"
 * consommé par le NotificationService pour envoyer des rappels automatiques.
 * @param {string|number} eventId
 */
async function joinEvent(eventId) {
    try {
        await EventService.join(eventId);
        AppUI.notify("Inscription enregistrée pour cet événement.", 'success');
    } catch (err) {
        AppUI.notify("Impossible de s'inscrire à cet événement.", 'error');
    }
}

// ─── FILTRES / LOGOUT ─────────────────────────────────────────────────────────

function _bindFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.filter-btn.active')?.classList.remove('active');
            e.target.classList.add('active');
            _loadEvents(e.target.dataset.cat);
        });
    });
}

function _bindLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        AuthService.logout();
    });
}

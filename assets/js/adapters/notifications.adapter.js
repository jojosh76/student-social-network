/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — NOTIFICATIONS ADAPTER (SOA)                  ║
 * ║  Pattern : Event-Driven + Observer (Store → EventBus → View)    ║
 * ║  Service consommé : NotificationService                          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Flux de données :
 *   NotificationService.fetchAll()
 *     → NotificationStore.load()
 *       → EventBus.emit('notification:updated')
 *         → NotificationRenderer.renderFeed()
 *
 * Dépendances :
 *   config/service-registry.js | utils/http-client.js
 *   utils/event-bus.js         | services/auth.service.js
 *   services/domain-services.js
 */

'use strict';

/* global AuthService, NotificationService, EventBus */

// ─── NOTIFICATION STORE ───────────────────────────────────────────────────────
/**
 * Source de vérité locale pour les notifications.
 * Toute mutation passe par le Store, qui publie sur l'EventBus.
 */
const NotificationStore = (() => {
    let _notifications = [];
    let _filter        = 'all';

    const _publish = () => {
        EventBus.emit('notification:updated', _getFiltered());
        EventBus.emit('notification:counts',  _getCounts());
    };

    function _getFiltered() {
        return _filter === 'all'
            ? [..._notifications]
            : _notifications.filter(n => n.type === _filter);
    }

    function _getCounts() {
        const counts = { all: 0, like: 0, comment: 0, message: 0, event: 0, system: 0 };
        _notifications.forEach(n => {
            counts.all++;
            if (counts[n.type] !== undefined) counts[n.type]++;
        });
        return counts;
    }

    return {
        load(data)       { _notifications = data; _publish(); },
        setFilter(f)     { _filter = f; EventBus.emit('notification:updated', _getFiltered()); },
        markAllRead()    { _notifications = _notifications.map(n => ({ ...n, read: true })); _publish(); },
        markRead(id)     { const n = _notifications.find(n => n.id === id); if (n) n.read = true; _publish(); },
        delete(id)       { _notifications = _notifications.filter(n => n.id !== id); _publish(); },
        clearAll()       { _notifications = []; _publish(); },
        addOne(notif)    { _notifications.unshift(notif); _publish(); },
        getUnreadCount() { return _notifications.filter(n => !n.read).length; },
    };
})();

// ─── NOTIFICATION RENDERER ────────────────────────────────────────────────────
/**
 * Vue : construit et injecte le HTML des notifications dans le DOM.
 * Séparation stricte des responsabilités (pas de logique métier ici).
 */
const NotificationRenderer = {

    _icons: {
        like:    'fas fa-heart',
        comment: 'fas fa-comment',
        message: 'fas fa-envelope',
        event:   'fas fa-calendar-alt',
        system:  'fas fa-cog',
    },

    renderCard(n) {
        return `
        <div class="notif-card ${n.read ? '' : 'unread'}" data-id="${n.id}">
            <div class="notif-actor-avatar">${n.actor.initials}</div>
            <div class="notif-content">
                <p>${n.message}</p>
                ${n.preview ? `<small class="notif-preview">${n.preview}</small>` : ''}
                <span class="notif-time">${n.time}</span>
            </div>
            <div class="notif-actions">
                ${!n.read ? `<button class="notif-action-btn mark-read" data-id="${n.id}" title="Marquer comme lu"><i class="fas fa-check"></i></button>` : ''}
                <button class="notif-action-btn del" data-id="${n.id}" title="Supprimer"><i class="fas fa-times"></i></button>
            </div>
        </div>`;
    },

    renderFeed(notifications) {
        const feed = document.getElementById('notifFeed');
        if (!feed) return;

        if (!notifications.length) {
            feed.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>Aucune notification</p></div>';
            return;
        }

        // Groupement par date
        const groups = notifications.reduce((acc, n) => {
            if (!acc[n.date]) acc[n.date] = [];
            acc[n.date].push(n);
            return acc;
        }, {});

        feed.innerHTML = Object.entries(groups).map(([date, items]) => `
            <div class="notif-group">
                <div class="group-label">${date}</div>
                ${items.map(n => this.renderCard(n)).join('')}
            </div>`).join('');

        this._bindCardEvents();
    },

    _bindCardEvents() {
        document.querySelectorAll('.notif-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.notif-actions')) return;
                NotificationStore.markRead(card.dataset.id);
            });
        });

        document.querySelectorAll('.mark-read').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                NotificationStore.markRead(btn.dataset.id);
            });
        });

        document.querySelectorAll('.notif-action-btn.del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.notif-card');
                card.style.transition = 'all 0.25s ease';
                card.style.opacity    = '0';
                card.style.transform  = 'translateX(20px)';
                setTimeout(() => NotificationStore.delete(btn.dataset.id), 250);
            });
        });
    },

    updateCounts(counts) {
        ['all', 'like', 'comment', 'message', 'event', 'system'].forEach(type => {
            const key = type.charAt(0).toUpperCase() + type.slice(1);
            const el  = document.getElementById(`count${key}`);
            if (el) el.textContent = counts[type] || 0;
        });

        ['like', 'comment', 'message', 'event'].forEach(type => {
            const key = type.charAt(0).toUpperCase() + type.slice(1);
            const el  = document.getElementById(`sum${key}`);
            if (el) el.textContent = counts[type] || 0;
        });

        const unread = NotificationStore.getUnreadCount();
        const badge  = document.getElementById('navBadge');
        if (badge) {
            badge.textContent = unread;
            badge.classList.toggle('hidden', unread === 0);
        }
        const label = document.getElementById('unreadLabel');
        if (label) label.textContent = `${unread} non lue${unread > 1 ? 's' : ''}`;
    },
};

// ─── ABONNEMENTS EVENTBUS ─────────────────────────────────────────────────────
EventBus.on('notification:updated', (notifications) => {
    NotificationRenderer.renderFeed(notifications);
});

EventBus.on('notification:counts', (counts) => {
    NotificationRenderer.updateCounts(counts);
});

// ─── INITIALISATION ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthService.requireAuth()) return;

    // Hamburger
    document.getElementById('hamburger')?.addEventListener('click', () => {
        document.getElementById('navLinks').classList.toggle('open');
    });

    // Filtres
    document.querySelectorAll('.filter-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.filter-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            NotificationStore.setFilter(item.dataset.filter);
        });
    });

    // Actions globales
    document.getElementById('markAllRead')?.addEventListener('click', () => NotificationStore.markAllRead());
    document.getElementById('clearAll')?.addEventListener('click', () => {
        if (confirm('Effacer toutes les notifications ?')) NotificationStore.clearAll();
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        AuthService.logout();
    });

    // Chargement initial depuis le microservice
    try {
        const data = await NotificationService.fetchAll();
        NotificationStore.load(data);
    } catch (err) {
        console.error('[NotificationsAdapter > NotificationService] Erreur :', err);
        document.getElementById('notifFeed').innerHTML =
            '<div class="loading-spinner"><i class="fas fa-exclamation-circle"></i> Service indisponible.</div>';
    }

    // Simulation WebSocket temps réel
    // En prod : const ws = new WebSocket('wss://gateway/notifications');
    //           ws.onmessage = (e) => NotificationStore.addOne(JSON.parse(e.data));
    _simulateRealtime();
});

// ─── SIMULATION REALTIME ──────────────────────────────────────────────────────
function _simulateRealtime() {
    setTimeout(() => {
        NotificationStore.addOne({
            id: 'notif_rt_' + Date.now(),
            type: 'like',
            actor: { name: 'Alex Moreau', initials: 'AM' },
            message: '<strong>Alex Moreau</strong> a aimé votre publication',
            preview: '"Très bon travail sur le microservice de messagerie !"',
            time: "À l'instant", date: "Aujourd'hui", read: false, link: 'dashboard.html',
        });
        _showToast('Alex Moreau a aimé votre publication');
    }, 4000);
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function _showToast(message) {
    document.getElementById('studnet-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'studnet-toast';
    toast.innerHTML = `<i class="fas fa-bell"></i> ${message}`;
    Object.assign(toast.style, {
        position: 'fixed', bottom: '24px', right: '24px',
        background: '#2d3436', color: '#fff', padding: '12px 20px',
        borderRadius: '12px', fontSize: '0.85rem', fontFamily: 'Poppins, sans-serif',
        display: 'flex', alignItems: 'center', gap: '10px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: '9999',
        transform: 'translateY(80px)', opacity: '0',
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; });
    setTimeout(() => {
        toast.style.transform = 'translateY(80px)'; toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

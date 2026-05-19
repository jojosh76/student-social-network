/**
 * NOTIFICATION SERVICE — STUDNET
 * Pattern: Event-Driven Architecture (Observer + EventBus)
 * Architecture: SOA Adapter → Notification Microservice
 * 
 * En production, ce module s'abonnerait à un WebSocket ou SSE
 * pour recevoir les événements en temps réel depuis le broker (ex: RabbitMQ/Kafka).
 */

'use strict';

// ============================================================
// 1. EVENT BUS — Médiateur central (Pattern Observer)
// ============================================================
const EventBus = {
    _listeners: {},

    /** S'abonner à un type d'événement */
    on(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
    },

    /** Publier un événement (émission vers tous les abonnés) */
    emit(event, data) {
        (this._listeners[event] || []).forEach(cb => cb(data));
    }
};

// ============================================================
// 2. NOTIFICATION STORE — Source de vérité locale
// ============================================================
const NotificationStore = {
    _notifications: [],
    _filter: 'all',

    /** Initialise le store avec les données du service */
    load(data) {
        this._notifications = data;
        EventBus.emit('store:updated', this.getFiltered());
        EventBus.emit('store:counts', this.getCounts());
    },

    /** Retourne les notifs filtrées */
    getFiltered() {
        if (this._filter === 'all') return [...this._notifications];
        return this._notifications.filter(n => n.type === this._filter);
    },

    getCounts() {
        const counts = { all: 0, like: 0, comment: 0, message: 0, event: 0, system: 0 };
        this._notifications.forEach(n => {
            counts.all++;
            if (counts[n.type] !== undefined) counts[n.type]++;
        });
        return counts;
    },

    getUnreadCount() {
        return this._notifications.filter(n => !n.read).length;
    },

    setFilter(filter) {
        this._filter = filter;
        EventBus.emit('store:updated', this.getFiltered());
    },

    markAllRead() {
        this._notifications = this._notifications.map(n => ({ ...n, read: true }));
        EventBus.emit('store:updated', this.getFiltered());
        EventBus.emit('store:counts', this.getCounts());
    },

    markRead(id) {
        const notif = this._notifications.find(n => n.id === id);
        if (notif) notif.read = true;
        EventBus.emit('store:updated', this.getFiltered());
        EventBus.emit('store:counts', this.getCounts());
    },

    delete(id) {
        this._notifications = this._notifications.filter(n => n.id !== id);
        EventBus.emit('store:updated', this.getFiltered());
        EventBus.emit('store:counts', this.getCounts());
    },

    clearAll() {
        this._notifications = [];
        EventBus.emit('store:updated', []);
        EventBus.emit('store:counts', this.getCounts());
    }
};

// ============================================================
// 3. NOTIFICATION SERVICE — Appel au Microservice
//    En prod: GET /api/notifications (avec JWT Bearer token)
// ============================================================
const NotificationService = {
    async fetchAll(token) {
        // Simulation d'un appel au microservice de notifications
        // const res = await fetch('http://localhost:5003/api/notifications', {
        //     headers: { 'Authorization': `Bearer ${token}` }
        // });
        // return res.json();

        // --- MOCK DATA (Event-Driven Simulation) ---
        await new Promise(r => setTimeout(r, 600)); // Simule la latence réseau

        return [
            {
                id: 'notif_001',
                type: 'like',
                actor: { name: 'Jean Dupont', initials: 'JD' },
                message: '<strong>Jean Dupont</strong> a aimé votre publication',
                preview: '"Architecture SOA et Clean Architecture en pratique..."',
                time: 'Il y a 5 min',
                date: 'Aujourd\'hui',
                read: false,
                link: 'dashboard.html'
            },
            {
                id: 'notif_002',
                type: 'comment',
                actor: { name: 'Marie Claire', initials: 'MC' },
                message: '<strong>Marie Claire</strong> a commenté votre post',
                preview: '"Très bonne présentation du pattern CQRS !"',
                time: 'Il y a 12 min',
                date: 'Aujourd\'hui',
                read: false,
                link: 'dashboard.html'
            },
            {
                id: 'notif_003',
                type: 'message',
                actor: { name: 'Pierre Martin', initials: 'PM' },
                message: '<strong>Pierre Martin</strong> vous a envoyé un message',
                preview: '"Tu as fini le TP de SOA ?"',
                time: 'Il y a 30 min',
                date: 'Aujourd\'hui',
                read: false,
                link: 'chat.html'
            },
            {
                id: 'notif_004',
                type: 'like',
                actor: { name: 'Sophie Leclerc', initials: 'SL' },
                message: '<strong>Sophie Leclerc</strong> a aimé votre commentaire',
                preview: '',
                time: 'Il y a 1h',
                date: 'Aujourd\'hui',
                read: true,
                link: 'dashboard.html'
            },
            {
                id: 'notif_005',
                type: 'event',
                actor: { name: 'StudNet', initials: 'SN' },
                message: 'Rappel : <strong>Hackathon Campus 2025</strong> dans 2 jours',
                preview: 'Vendredi 20 juin — Amphithéâtre B',
                time: 'Il y a 2h',
                date: 'Aujourd\'hui',
                read: true,
                link: 'dashboard.html'
            },
            {
                id: 'notif_006',
                type: 'comment',
                actor: { name: 'Lucas Bernard', initials: 'LB' },
                message: '<strong>Lucas Bernard</strong> a répondu à votre commentaire',
                preview: '"Exactement, le pattern Repository simplifie tout !"',
                time: 'Hier à 18h30',
                date: 'Hier',
                read: true,
                link: 'dashboard.html'
            },
            {
                id: 'notif_007',
                type: 'system',
                actor: { name: 'StudNet', initials: 'SN' },
                message: 'Votre compte a été <strong>vérifié avec succès</strong>',
                preview: 'Profil étudiant confirmé — L3 Génie Logiciel',
                time: 'Hier à 9h00',
                date: 'Hier',
                read: true,
                link: '#'
            },
            {
                id: 'notif_008',
                type: 'message',
                actor: { name: 'Fatou Diallo', initials: 'FD' },
                message: '<strong>Fatou Diallo</strong> vous a envoyé une photo',
                preview: 'Photo envoyée',
                time: 'Lun. à 14h22',
                date: 'Lundi',
                read: true,
                link: 'chat.html'
            }
        ];
    }
};

// ============================================================
// 4. NOTIFICATION RENDERER — Vue (séparation des responsabilités)
// ============================================================
const NotificationRenderer = {

    /** Icône FontAwesome par type */
    _icons: {
        like:    'fas fa-heart',
        comment: 'fas fa-comment',
        message: 'fas fa-envelope',
        event:   'fas fa-calendar-alt',
        system:  'fas fa-cog'
    },

    renderCard(notif) {
        const unreadClass = notif.read ? '' : 'unread';
        const icon = this._icons[notif.type] || 'fas fa-bell';
        const preview = notif.preview
            ? `<div class="notif-preview">${notif.preview}</div>`
            : '';

        return `
        <div class="notif-card ${unreadClass}" data-id="${notif.id}" data-type="${notif.type}">
            <div class="notif-avatar-wrap">
                <div class="notif-avatar">${notif.actor.initials}</div>
                <div class="notif-type-icon icon-${notif.type}">
                    <i class="${icon}"></i>
                </div>
            </div>
            <div class="notif-body">
                <p>${notif.message}</p>
                ${preview}
                <div class="notif-time">
                    <i class="far fa-clock"></i> ${notif.time}
                </div>
            </div>
            <div class="notif-actions">
                ${!notif.read ? `
                <button class="notif-action-btn mark-read" data-id="${notif.id}" title="Marquer comme lu">
                    <i class="fas fa-check"></i>
                </button>` : ''}
                <button class="notif-action-btn del" data-id="${notif.id}" title="Supprimer">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>`;
    },

    renderFeed(notifications) {
        const feed = document.getElementById('notifFeed');
        const emptyState = document.getElementById('emptyState');

        if (!notifications.length) {
            feed.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        // Grouper par date
        const groups = {};
        notifications.forEach(n => {
            if (!groups[n.date]) groups[n.date] = [];
            groups[n.date].push(n);
        });

        let html = '';
        for (const [date, items] of Object.entries(groups)) {
            html += `<div class="date-separator"><span>${date}</span></div>`;
            items.forEach(n => { html += this.renderCard(n); });
        }

        feed.innerHTML = html;
        this._bindCardEvents();
    },

    _bindCardEvents() {
        // Clic sur une card → marquer lu + naviguer
        document.querySelectorAll('.notif-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.notif-actions')) return;
                const id = card.dataset.id;
                NotificationStore.markRead(id);
            });
        });

        // Bouton "marquer lu"
        document.querySelectorAll('.mark-read').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                NotificationStore.markRead(btn.dataset.id);
            });
        });

        // Bouton "supprimer"
        document.querySelectorAll('.notif-action-btn.del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.notif-card');
                card.style.transition = 'all 0.25s ease';
                card.style.opacity = '0';
                card.style.transform = 'translateX(20px)';
                setTimeout(() => NotificationStore.delete(btn.dataset.id), 250);
            });
        });
    },

    updateCounts(counts) {
        ['all', 'like', 'comment', 'message', 'event', 'system'].forEach(type => {
            const el = document.getElementById(`count${type.charAt(0).toUpperCase() + type.slice(1)}`);
            if (el) el.textContent = counts[type] || 0;
        });

        // Résumé sidebar droite
        ['like', 'comment', 'message', 'event'].forEach(type => {
            const el = document.getElementById(`sum${type.charAt(0).toUpperCase() + type.slice(1)}`);
            if (el) el.textContent = counts[type] || 0;
        });

        // Badge navbar
        const unread = NotificationStore.getUnreadCount();
        const badge = document.getElementById('navBadge');
        if (badge) {
            if (unread > 0) {
                badge.textContent = unread;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        // Label "non lues"
        const label = document.getElementById('unreadLabel');
        if (label) label.textContent = `${unread} non lue${unread > 1 ? 's' : ''}`;
    }
};

// ============================================================
// 5. ABONNEMENTS EventBus — Réactivité du DOM
// ============================================================
EventBus.on('store:updated', (notifications) => {
    NotificationRenderer.renderFeed(notifications);
});

EventBus.on('store:counts', (counts) => {
    NotificationRenderer.updateCounts(counts);
});

// ============================================================
// 6. INITIALISATION — Point d'entrée (DOMContentLoaded)
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {

    // --- Auth Guard (SOA Security) ---
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Accès non autorisé. Veuillez vous connecter.");
        window.location.href = 'index.html';
        return;
    }

    // --- Hamburger menu ---
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    if (hamburger) {
        hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
    }

    // --- Filtres ---
    document.querySelectorAll('.filter-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.filter-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            NotificationStore.setFilter(item.dataset.filter);
        });
    });

    // --- Marquer tout lu ---
    document.getElementById('markAllRead').addEventListener('click', () => {
        NotificationStore.markAllRead();
    });

    // --- Effacer tout ---
    document.getElementById('clearAll').addEventListener('click', () => {
        if (confirm("Effacer toutes les notifications ?")) {
            NotificationStore.clearAll();
        }
    });

    // --- Déconnexion ---
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    // --- Chargement initial depuis le Microservice ---
    try {
        const data = await NotificationService.fetchAll(token);
        NotificationStore.load(data);
    } catch (err) {
        console.error("[NotificationService] Erreur :", err);
        document.getElementById('notifFeed').innerHTML =
            '<div class="loading-spinner"><i class="fas fa-exclamation-circle"></i> Service de notifications indisponible.</div>';
    }

    // --- Simulation WebSocket (Event-Driven Realtime) ---
    // En production: const ws = new WebSocket('ws://localhost:5003/notifications');
    // ws.onmessage = (e) => { const event = JSON.parse(e.data); NotificationStore.addOne(event); }
    simulateRealtimeEvent();
});

// ============================================================
// 7. SIMULATION TEMPS RÉEL — Pattern Publisher/Subscriber
//    (Remplace le WebSocket en mode demo)
// ============================================================
function simulateRealtimeEvent() {
    setTimeout(() => {
        const newNotif = {
            id: 'notif_rt_' + Date.now(),
            type: 'like',
            actor: { name: 'Alex Moreau', initials: 'AM' },
            message: '<strong>Alex Moreau</strong> a aimé votre publication',
            preview: '"Très bon travail sur le microservice de messagerie !"',
            time: 'À l\'instant',
            date: 'Aujourd\'hui',
            read: false,
            link: 'dashboard.html'
        };

        // Injection de l'événement dans le store (simule la réception WebSocket)
        NotificationStore._notifications.unshift(newNotif);
        EventBus.emit('store:updated', NotificationStore.getFiltered());
        EventBus.emit('store:counts', NotificationStore.getCounts());

        // Toast discret
        showToast(`${newNotif.actor.name} a aimé votre publication`);
    }, 4000);
}

// ============================================================
// 8. TOAST — Notification visuelle légère
// ============================================================
function showToast(message) {
    const existing = document.getElementById('studnet-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'studnet-toast';
    toast.innerHTML = `<i class="fas fa-bell"></i> ${message}`;

    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: '#2d3436',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '12px',
        fontSize: '0.85rem',
        fontFamily: 'Poppins, sans-serif',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        zIndex: '9999',
        transform: 'translateY(80px)',
        opacity: '0',
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
    });

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.transform = 'translateY(80px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}
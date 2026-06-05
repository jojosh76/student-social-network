/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║     STUDNET — SERVICES MÉTIER GROUPÉS (SOA)                      ║
 * ║  UserService | EventService | MessageService                     ║
 * ║  SearchService | FileService | NotificationService               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* global HttpClient, ServiceRegistry, DTOs */

// ─── USER SERVICE ─────────────────────────────────────────────────────────────
const UserService = (() => {
    const BASE = ServiceRegistry.resolveService('users');

    return {
        /**
         * Récupère le profil complet de l'utilisateur connecté.
         * @returns {Promise<Object>}
         */
        async getMe() {
            return HttpClient.httpGet(`${BASE}/me`);
        },

        /**
         * Récupère la liste des utilisateurs en ligne.
         * @returns {Promise<Object[]>}
         */
        async getOnlineUsers() {
            return HttpClient.httpGet(`${BASE}/online`);
        },

        async getAll() {
            return HttpClient.httpGet(`${BASE}`);
        },

        async getFriends() {
            return HttpClient.httpGet(`${BASE}/friends`);
        },

        async follow(userId) {
            return HttpClient.httpPost(`${BASE}/${userId}/follow`, {});
        },

        /**
         * Met à jour l'URL de l'avatar.
         * @param {string} avatarUrl
         * @returns {Promise<void>}
         */
        async updateAvatar(avatarUrl) {
            const dto = DTOs.UpdateAvatarCommand(avatarUrl);
            return HttpClient.httpPatch(`${BASE}/update-avatar`, dto);
        },

        async updateProfile(profile) {
            return HttpClient.httpPatch(`${BASE}/me`, profile);
        },
    };
})();

// ─── EVENT SERVICE ────────────────────────────────────────────────────────────
const EventService = (() => {
    const BASE = ServiceRegistry.resolveService('events');

    return {
        /**
         * Récupère tous les événements, avec filtrage optionnel.
         * @param {string} [category='all']
         * @returns {Promise<Object[]>}
         */
        async getAll(category = 'all') {
            const qs = category !== 'all' ? `?category=${category}` : '';
            return HttpClient.httpGet(`${BASE}${qs}`);
        },

        /**
         * Récupère les prochains événements (widget dashboard).
         * @returns {Promise<Object[]>}
         */
        async getUpcoming() {
            return HttpClient.httpGet(`${BASE}/upcoming`);
        },

        async create(event) {
            return HttpClient.httpPost(`${BASE}`, event);
        },

        /**
         * Inscrit l'utilisateur à un événement.
         * Pattern Event-Driven : génère un événement "USER_JOINED_EVENT"
         * consommé par NotificationService pour envoyer des rappels.
         * @param {string|number} eventId
         * @returns {Promise<void>}
         */
        async join(eventId) {
            return HttpClient.httpPost(`${BASE}/${eventId}/join`, {});
        },
    };
})();

// ─── MESSAGE SERVICE ──────────────────────────────────────────────────────────
const MessageService = (() => {
    const BASE = ServiceRegistry.resolveService('messages');

    return {
        /**
         * Récupère toutes les conversations de l'utilisateur.
         * @returns {Promise<Object[]>}
         */
        async getConversations() {
            return HttpClient.httpGet(`${BASE}`);
        },

        /**
         * Récupère le nombre de messages non lus (badge navbar).
         * @returns {Promise<{ count: number }>}
         */
        async getUnreadCount() {
            return HttpClient.httpGet(`${BASE}/unread-count`);
        },

        async createConversation(payload) {
            return HttpClient.httpPost(`${BASE}`, payload);
        },

        async getMessages(conversationId) {
            return HttpClient.httpGet(`${BASE}/${conversationId}/messages`);
        },

        async sendMessage(conversationId, payload) {
            return HttpClient.httpPost(`${BASE}/${conversationId}/messages`, payload);
        },
    };
})();

// ─── SEARCH SERVICE ───────────────────────────────────────────────────────────
const SearchService = (() => {
    const BASE = ServiceRegistry.resolveService('search');

    return {
        /**
         * Effectue une recherche globale (posts, users, events).
         * @param {string} query - Terme de recherche (min. 2 caractères)
         * @param {string} [type='all'] - Filtre de type
         * @returns {Promise<Object[]>}
         */
        async search(query, type = 'all') {
            if (query.length < 2) return [];
            return HttpClient.httpGet(`${BASE}?q=${encodeURIComponent(query)}&type=${type}`);
        },
    };
})();

// ─── FILE SERVICE ─────────────────────────────────────────────────────────────
const FileService = (() => {
    const BASE = ServiceRegistry.resolveService('files');

    return {
        /**
         * Upload un fichier (image, audio, document) vers le FileService.
         * @param {File|Blob} file
         * @returns {Promise<{ url: string }>}
         */
        async upload(file) {
            const formData = new FormData();
            formData.append('file', file);
            return HttpClient.httpUpload(`${BASE}`, formData);
        },
    };
})();

// ─── NOTIFICATION SERVICE ─────────────────────────────────────────────────────
const NotificationService = (() => {
    const BASE = ServiceRegistry.resolveService('notifications');

    return {
        /**
         * Récupère toutes les notifications de l'utilisateur connecté.
         * @returns {Promise<Object[]>}
         */
        async fetchAll() {
            return HttpClient.httpGet(`${BASE}`);
        },

        /**
         * Marque une notification comme lue.
         * @param {string} id
         * @returns {Promise<void>}
         */
        async markRead(id) {
            return HttpClient.httpPatch(`${BASE}/${id}/read`, {});
        },

        /**
         * Supprime une notification.
         * @param {string} id
         * @returns {Promise<void>}
         */
        async delete(id) {
            return HttpClient.httpDelete(`${BASE}/${id}`);
        },
    };
})();

// ─── EXPORT ───────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined') {
    module.exports = {
        UserService, EventService, MessageService,
        SearchService, FileService, NotificationService,
    };
} else {
    Object.assign(window, {
        UserService, EventService, MessageService,
        SearchService, FileService, NotificationService,
    });
}

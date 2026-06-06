/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — SERVICE REGISTRY (SOA)                       ║
 * ║  Répertoire central de tous les services de la plateforme        ║
 * ║  Pattern : Service Locator / Registry                            ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Rôle : Source unique de vérité pour les URL de microservices.
 * Tous les adapters et services importent depuis ici.
 * En production, ce fichier peut être alimenté par un consul/etcd.
 */

'use strict';

/**
 * @typedef {Object} ServiceDescriptor
 * @property {string} url       - URL de base du microservice
 * @property {string} version   - Version de l'API consommée
 * @property {string[]} routes  - Routes exposées (documentation)
 */

/** @type {Record<string, ServiceDescriptor>} */
const SERVICE_REGISTRY = {
    auth: {
        url:     'http://164.92.198.226/api/auth',
        version: 'v1',
        routes:  ['POST /login', 'POST /register', 'GET /me'],
    },
    posts: {
        url:     'http://164.92.198.226/api/posts',
        version: 'v1',
        routes:  ['GET /', 'POST /', 'GET /me', 'POST /:id/like'],
    },
    users: {
        url:     'http://164.92.198.226/api/users',
        version: 'v1',
        routes:  ['GET /me', 'GET /online', 'PATCH /update-avatar'],
    },
    events: {
        url:     'http://164.92.198.226/api/events',
        version: 'v1',
        routes:  ['GET /', 'GET /upcoming', 'POST /:id/join'],
    },
    messages: {
        url:     'http://164.92.198.226/api/conversations',
        version: 'v1',
        routes:  ['GET /', 'GET /unread-count'],
    },
    notifications: {
        url:     'http://164.92.198.226/api/notifications',
        version: 'v1',
        routes:  ['GET /', 'PATCH /:id/read', 'DELETE /:id'],
    },
    search: {
        url:     'http://164.92.198.226/api/search',
        version: 'v1',
        routes:  ['GET /?q=&type='],
    },
    files: {
        url:     'http://164.92.198.226/api/upload',
        version: 'v1',
        routes:  ['POST /'],
    },
    chat: {
        url:     'http://164.92.198.226',
        wsPath:  '/chat',
        version: 'v1',
        routes:  ['WS /chat'],
    },
};

/**
 * Résout l'URL d'un service par son nom.
 * @param {string} serviceName - Nom du service (ex: 'auth')
 * @returns {string} URL du service
 * @throws {Error} Si le service est inconnu
 */
function resolveService(serviceName) {
    const descriptor = SERVICE_REGISTRY[serviceName];
    if (!descriptor) {
        throw new Error(`[ServiceRegistry] Service inconnu : "${serviceName}"`);
    }
    return descriptor.url;
}

// Exposé en module ES ou script global selon l'environnement
if (typeof module !== 'undefined') {
    module.exports = { SERVICE_REGISTRY, resolveService };
} else {
    window.ServiceRegistry = { SERVICE_REGISTRY, resolveService };
}

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — EVENT BUS (SOA / Event-Driven)              ║
 * ║  Médiateur central pour la communication inter-composants       ║
 * ║  Pattern : Observer / Publisher-Subscriber                      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Usage :
 *   EventBus.on('notification:received', handler);
 *   EventBus.emit('notification:received', payload);
 *   EventBus.off('notification:received', handler);
 */

'use strict';

const EventBus = (() => {
    /** @type {Record<string, Function[]>} */
    const _listeners = {};

    return {
        /**
         * S'abonner à un type d'événement.
         * @param {string} event
         * @param {Function} callback
         */
        on(event, callback) {
            if (!_listeners[event]) _listeners[event] = [];
            _listeners[event].push(callback);
        },

        /**
         * Se désabonner d'un type d'événement.
         * @param {string} event
         * @param {Function} callback
         */
        off(event, callback) {
            if (!_listeners[event]) return;
            _listeners[event] = _listeners[event].filter(cb => cb !== callback);
        },

        /**
         * Publier un événement vers tous les abonnés.
         * @param {string} event
         * @param {*} data
         */
        emit(event, data) {
            (_listeners[event] || []).forEach(cb => {
                try { cb(data); }
                catch (err) { console.error(`[EventBus] Erreur sur "${event}" :`, err); }
            });
        },

        /**
         * S'abonner une seule fois (auto-unsubscribe après premier déclenchement).
         * @param {string} event
         * @param {Function} callback
         */
        once(event, callback) {
            const wrapper = (data) => {
                callback(data);
                this.off(event, wrapper);
            };
            this.on(event, wrapper);
        },
    };
})();

// ─── Événements standards StudNet ────────────────────────────────────────────
// Convention de nommage : "domaine:action"
//
// Notifications  → notification:received | notification:read | notification:deleted
// Auth           → auth:logout | auth:sessionExpired
// Posts          → post:published | post:liked
// Chat           → chat:message | chat:typing
// Store          → store:updated | store:counts

if (typeof module !== 'undefined') {
    module.exports = { EventBus };
} else {
    window.EventBus = EventBus;
}

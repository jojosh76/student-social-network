/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — CHAT SERVICE (SOA / WebSocket)              ║
 * ║  Couche Service : gestion de la connexion WebSocket vers        ║
 * ║  le ChatService via l'API Gateway                                ║
 * ║  Pattern : Facade + Event-Driven (Publisher/Subscriber)         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* global io, HttpClient, ServiceRegistry, DTOs, EventBus */

const ChatService = (() => {
    const { url, wsPath } = ServiceRegistry.SERVICE_REGISTRY.chat;

    /** @type {import('socket.io-client').Socket|null} */
    let _socket = null;
    let _conversationId = null;

    return {
        /**
         * Établit la connexion WebSocket authentifiée vers le ChatService (via Gateway).
         * Publie les événements reçus sur l'EventBus pour découpler la vue.
         */
        connect() {
            if (_socket?.connected) return;

            _socket = io(url, {
                path: wsPath,
                auth: { token: HttpClient.getToken() },
                transports: ['websocket'],
            });

            _socket.on('connect', () => {
                console.log('[ChatService] Connecté au Gateway WebSocket');
            });

            // ── Réception → EventBus ──
            _socket.on('new_message', (data) => {
                EventBus.emit('chat:message', data);
            });

            _socket.on('user_typing', (data) => {
                EventBus.emit('chat:typing', data);
            });

            _socket.on('error', (err) => {
                console.error('[ChatService] Erreur socket :', err.message);
                EventBus.emit('chat:error', err);
            });

            _socket.on('disconnect', () => {
                console.warn('[ChatService] Déconnecté du Gateway WebSocket');
            });
        },

        setConversation(conversationId) {
            _conversationId = conversationId;
        },

        /**
         * Envoie un message texte.
         * @param {string} text
         */
        sendText(text) {
            if (!text.trim() || !_conversationId) return;
            const payload = DTOs.ChatMessagePayload({ conversationId: _conversationId, text });
            _socket?.emit('send_message', payload);
        },

        /**
         * Envoie un message avec image (URL déjà uploadée via FileService).
         * @param {string} imageUrl
         */
        sendImage(imageUrl) {
            if (!_conversationId) return;
            const payload = DTOs.ChatMessagePayload({ conversationId: _conversationId, text: 'Image', imgUrl: imageUrl, imageUrl });
            _socket?.emit('send_message', payload);
        },

        /**
         * Envoie une note vocale (URL déjà uploadée via FileService).
         * @param {string} audioUrl
         */
        sendAudio(audioUrl) {
            if (!_conversationId) return;
            const payload = DTOs.ChatMessagePayload({ conversationId: _conversationId, text: 'Note vocale', audioUrl });
            _socket?.emit('send_message', payload);
        },

        /**
         * Émet l'événement "en train d'écrire".
         * @param {string} conversationId
         */
        sendTyping(conversationId) {
            _socket?.emit('typing', { conversationId });
        },

        /**
         * Ferme la connexion WebSocket proprement.
         */
        disconnect() {
            _socket?.disconnect();
            _socket = null;
        },
    };
})();

if (typeof module !== 'undefined') {
    module.exports = { ChatService };
} else {
    window.ChatService = ChatService;
}

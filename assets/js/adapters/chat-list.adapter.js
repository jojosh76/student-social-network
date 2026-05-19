/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — CHAT LIST ADAPTER (SOA)                      ║
 * ║  Service consommé : MessageService                               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* global AuthService, MessageService */

document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthService.requireAuth()) return;

    const container = document.getElementById('conversationsList');

    try {
        const chats = await MessageService.getConversations();
        _renderConversations(chats, container);
    } catch (err) {
        console.error('[ChatListAdapter > MessageService] Erreur :', err);
        container.innerHTML = '<p>Erreur de connexion au service de messagerie.</p>';
    }
});

function _renderConversations(chats, container) {
    if (!chats.length) {
        container.innerHTML = '<p style="padding:20px;text-align:center">Aucune conversation.</p>';
        return;
    }

    container.innerHTML = chats.map(chat => `
        <div class="chat-item" onclick="window.location.href='chat.html?id=${chat.id}'">
            <div class="chat-avatar">${chat.name[0]}</div>
            <div class="chat-info">
                <div class="chat-name-row">
                    <span class="name">${chat.name}</span>
                    <span class="time">${chat.time}</span>
                </div>
                <p class="last-msg">${chat.lastMsg}</p>
            </div>
            ${chat.unread > 0 ? `<span class="badge">${chat.unread}</span>` : ''}
        </div>`).join('');
}

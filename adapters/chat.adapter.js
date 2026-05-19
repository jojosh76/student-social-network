/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — CHAT ADAPTER (SOA / WebSocket)              ║
 * ║  Services consommés : ChatService (WS) | FileService (upload)   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Dépendances :
 *   config/service-registry.js | utils/http-client.js
 *   utils/event-bus.js         | dtos/dtos.js
 *   services/auth.service.js   | services/chat.service.js
 *   services/domain-services.js
 */

'use strict';

/* global AuthService, ChatService, FileService, EventBus */

document.addEventListener('DOMContentLoaded', () => {
    if (!AuthService.requireAuth()) return;

    // Ouvrir la connexion WebSocket via le Gateway
    ChatService.connect();

    // ── Abonnement EventBus : nouveaux messages → affichage ──
    EventBus.on('chat:message', (data) => {
        _displayMessage(data.text, 'received', data.imgUrl, data.audioUrl);
    });

    EventBus.on('chat:error', () => {
        alert('Le service de chat est temporairement indisponible.');
    });

    _bindTextSend();
    _bindImageSend();
    _bindVoiceSend();
    _bindLogout();
});

// ─── ENVOI TEXTE ──────────────────────────────────────────────────────────────

function _bindTextSend() {
    document.getElementById('sendBtn')?.addEventListener('click', _sendText);
    document.getElementById('msgContent')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendText(); }
    });
}

function _sendText() {
    const input = document.getElementById('msgContent');
    const text  = input?.value.trim();
    if (!text) return;

    ChatService.sendText(text);
    _displayMessage(text, 'sent');
    input.value = '';
}

// ─── ENVOI IMAGE ──────────────────────────────────────────────────────────────

function _bindImageSend() {
    document.getElementById('imageInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // 1. Upload vers FileService
            const { url } = await FileService.upload(file);

            // 2. Envoi de l'URL via ChatService (WebSocket)
            ChatService.sendImage(url);
            _displayMessage('Image envoyée', 'sent', url, null);

        } catch (err) {
            console.error('[ChatAdapter > FileService] Erreur image :', err);
        }
    });
}

// ─── ENVOI VOCAL ──────────────────────────────────────────────────────────────

function _bindVoiceSend() {
    const voiceBtn = document.getElementById('voiceBtn');
    if (!voiceBtn) return;

    let mediaRecorder = null;

    voiceBtn.addEventListener('mousedown', async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();
        voiceBtn.classList.replace('voice-inactive', 'voice-active');
    });

    voiceBtn.addEventListener('mouseup', () => {
        if (!mediaRecorder) return;
        mediaRecorder.stop();
        voiceBtn.classList.replace('voice-active', 'voice-inactive');

        mediaRecorder.ondataavailable = async (e) => {
            try {
                // 1. Upload Blob audio vers FileService
                const { url } = await FileService.upload(e.data);

                // 2. Envoi URL audio via ChatService (WebSocket)
                ChatService.sendAudio(url);
                _displayMessage('Note vocale', 'sent', null, url);

            } catch (err) {
                console.error('[ChatAdapter > FileService] Erreur audio :', err);
            }
        };
    });
}

// ─── RENDU MESSAGE ────────────────────────────────────────────────────────────

function _displayMessage(text, direction, imgUrl = null, audioUrl = null) {
    const feed = document.getElementById('chatFeed');
    if (!feed) return;

    const div = document.createElement('div');
    div.className = `message ${direction}`;
    div.innerHTML = `
        ${text ? `<p>${text}</p>` : ''}
        ${imgUrl   ? `<img src="${imgUrl}" style="max-width:220px;border-radius:10px;">` : ''}
        ${audioUrl ? `<audio controls src="${audioUrl}"></audio>` : ''}
    `;
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
}

function _bindLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        ChatService.disconnect();
        AuthService.logout();
    });
}

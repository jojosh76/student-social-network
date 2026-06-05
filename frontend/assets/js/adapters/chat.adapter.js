'use strict';

/* global AuthService, ChatService, MessageService, FileService, EventBus, AppUI, HttpClient */

let conversationId = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthService.requireAuth()) return;

    conversationId = new URLSearchParams(window.location.search).get('id');
    if (!conversationId) {
        AppUI.notify('Choisis une discussion avant de discuter.', 'error');
        window.location.href = 'chat-list.html';
        return;
    }

    try {
        currentUser = await AuthService.getMe();
        await loadConversationHeader();
        await loadMessages();
        ChatService.setConversation(conversationId);
        ChatService.connect();
    } catch (err) {
        console.error('[ChatAdapter] Init error:', err);
        AppUI.notify('Impossible de charger cette discussion.', 'error');
    }

    EventBus.on('chat:message', (data) => {
        const messageConversationId = data.conversationId || data.conversation_id;
        if (messageConversationId !== conversationId) return;
        const senderId = data.senderId || data.sender_id;
        if (senderId === currentUser?.id) return;
        displayMessage(normalizeMessage(data), 'received');
    });

    EventBus.on('chat:error', () => {
        AppUI.notify('Le service de chat est temporairement indisponible.', 'error');
    });

    bindTextSend();
    bindImageSend();
    bindVoiceSend();
    bindLogout();
});

async function loadConversationHeader() {
    const conversations = await MessageService.getConversations();
    const conversation = conversations.find(item => item.id === conversationId);
    const title = conversation?.name || 'Discussion StudNet';
    document.getElementById('conversationTitle').textContent = title;
    document.getElementById('conversationAvatar').textContent = title.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

async function loadMessages() {
    const feed = document.getElementById('messageDisplay');
    feed.innerHTML = '<div class="msg received">Chargement des messages...</div>';

    const messages = await MessageService.getMessages(conversationId);
    feed.innerHTML = '';
    if (!messages.length) {
        feed.innerHTML = '<div class="msg received">Aucun message pour le moment.</div>';
        return;
    }

    messages.forEach((message) => {
        displayMessage(message, message.senderId === currentUser?.id ? 'sent' : 'received');
    });
}

function bindTextSend() {
    document.getElementById('sendBtn')?.addEventListener('click', sendText);
    document.getElementById('msgContent')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendText();
        }
    });
}

function sendText() {
    const input = document.getElementById('msgContent');
    const text = input?.value.trim();
    if (!text) return;

    ChatService.sendText(text);
    displayMessage({ text }, 'sent');
    input.value = '';
}

function bindImageSend() {
    document.getElementById('imageInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const { url } = await FileService.upload(file);
            ChatService.sendImage(url);
            displayMessage({ text: 'Image', imageUrl: url }, 'sent');
            e.target.value = '';
        } catch (err) {
            console.error('[ChatAdapter] Image upload error:', err);
            AppUI.notify("Impossible d'envoyer cette image.", 'error');
        }
    });
}

function bindVoiceSend() {
    const voiceBtn = document.getElementById('voiceBtn');
    if (!voiceBtn || !navigator.mediaDevices) return;

    let mediaRecorder = null;
    let chunks = [];

    voiceBtn.addEventListener('mousedown', async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
        mediaRecorder.start();
    });

    voiceBtn.addEventListener('mouseup', () => {
        if (!mediaRecorder) return;
        mediaRecorder.onstop = async () => {
            try {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const { url } = await FileService.upload(blob);
                ChatService.sendAudio(url);
                displayMessage({ text: 'Note vocale', audioUrl: url }, 'sent');
            } catch (err) {
                console.error('[ChatAdapter] Audio upload error:', err);
                AppUI.notify("Impossible d'envoyer la note vocale.", 'error');
            }
        };
        mediaRecorder.stop();
    });
}

function normalizeMessage(data) {
    return {
        text: data.text || data.content || '',
        imageUrl: data.imageUrl || data.image_url || data.imgUrl || null,
        audioUrl: data.audioUrl || data.audio_url || null,
    };
}

function displayMessage(message, direction) {
    const feed = document.getElementById('messageDisplay');
    if (!feed) return;

    if (feed.textContent.includes('Aucun message') || feed.textContent.includes('Chargement')) {
        feed.innerHTML = '';
    }

    const div = document.createElement('div');
    div.className = `msg ${direction}`;
    const text = message.text ? `<p>${HttpClient.escapeHtml(message.text)}</p>` : '';
    const image = message.imageUrl ? `<img src="${message.imageUrl}" alt="Image envoyee" class="chat-media">` : '';
    const audio = message.audioUrl ? `<audio controls src="${message.audioUrl}"></audio>` : '';
    div.innerHTML = `${text}${image}${audio}`;
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
}

function bindLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        ChatService.disconnect();
        AuthService.logout();
    });
}

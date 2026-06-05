'use strict';

/* global AuthService, MessageService, UserService, AppUI, HttpClient */

let conversations = [];
let users = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthService.requireAuth()) return;

    bindLogout();
    bindSearch();
    bindNewConversation();
    await loadConversations();
});

async function loadConversations() {
    const container = document.getElementById('conversationsList');
    container.innerHTML = '<div class="empty-state"><p>Chargement des discussions...</p></div>';

    try {
        conversations = await MessageService.getConversations();
        renderConversations(conversations);
    } catch (err) {
        console.error('[ChatListAdapter] Conversations error:', err);
        container.innerHTML = '<div class="empty-state"><p>Impossible de charger la messagerie.</p></div>';
    }
}

function renderConversations(list) {
    const container = document.getElementById('conversationsList');
    if (!list.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>Aucune conversation.</p></div>';
        return;
    }

    container.innerHTML = list.map((chat) => {
        const name = chat.name || 'Discussion';
        const initials = name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
        const time = chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        return `
            <button class="conversation-item" data-id="${chat.id}">
                <div class="avatar">${HttpClient.escapeHtml(initials || 'ST')}</div>
                <div class="info">
                    <div class="top-row">
                        <h4>${HttpClient.escapeHtml(name)}</h4>
                        <span class="timestamp">${time}</span>
                    </div>
                    <p>${HttpClient.escapeHtml(chat.lastMessage || 'Nouvelle discussion')}</p>
                </div>
                ${chat.unread > 0 ? `<span class="unread-badge">${chat.unread}</span>` : ''}
            </button>`;
    }).join('');

    container.querySelectorAll('.conversation-item').forEach((item) => {
        item.addEventListener('click', () => {
            window.location.href = `chat.html?id=${item.dataset.id}`;
        });
    });
}

function bindSearch() {
    document.getElementById('conversationSearch')?.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        if (!q) return renderConversations(conversations);
        renderConversations(conversations.filter((chat) => {
            return `${chat.name || ''} ${chat.lastMessage || ''}`.toLowerCase().includes(q);
        }));
    });
}

function bindNewConversation() {
    document.getElementById('newConversationBtn')?.addEventListener('click', openConversationPanel);
}

async function openConversationPanel() {
    closeConversationPanel();
    try {
        users = await UserService.getAll();
    } catch (err) {
        console.error('[ChatListAdapter] Users error:', err);
        AppUI.notify('Impossible de charger les utilisateurs.', 'error');
        return;
    }

    const panel = document.createElement('div');
    panel.className = 'conversation-panel';
    panel.innerHTML = `
        <div class="conversation-panel-card">
            <div class="conversation-panel-header">
                <h3>Nouvelle discussion</h3>
                <button type="button" id="closeConversationPanel"><i class="fas fa-times"></i></button>
            </div>
            <input id="groupTitle" class="panel-input" type="text" placeholder="Nom du groupe (optionnel)">
            <div class="panel-users">
                ${users.map(user => `
                    <label class="panel-user">
                        <input type="checkbox" value="${user.id}">
                        <span>${HttpClient.escapeHtml(user.name)}</span>
                        <small>${HttpClient.escapeHtml(user.major || '')}</small>
                    </label>`).join('')}
            </div>
            <button type="button" id="createConversationSubmit" class="panel-submit">Creer</button>
        </div>`;

    document.body.appendChild(panel);
    document.getElementById('closeConversationPanel').addEventListener('click', closeConversationPanel);
    document.getElementById('createConversationSubmit').addEventListener('click', createConversation);
}

function closeConversationPanel() {
    document.querySelector('.conversation-panel')?.remove();
}

async function createConversation() {
    const selected = [...document.querySelectorAll('.panel-user input:checked')].map(input => input.value);
    const title = document.getElementById('groupTitle').value.trim();

    if (!selected.length) {
        AppUI.notify('Choisis au moins un etudiant.', 'error');
        return;
    }

    try {
        const conversation = await MessageService.createConversation({
            participantIds: selected,
            title: title || null,
        });
        AppUI.notify('Discussion creee.', 'success');
        window.location.href = `chat.html?id=${conversation.id}`;
    } catch (err) {
        console.error('[ChatListAdapter] Create conversation error:', err);
        AppUI.notify("Impossible de creer cette discussion.", 'error');
    }
}

function bindLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        AuthService.logout();
    });
}

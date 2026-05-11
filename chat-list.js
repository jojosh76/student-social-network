document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = 'index.html';

    const listContainer = document.getElementById('conversationsList');

    try {
        // Simulation d'appel au Microservice de Messagerie
        // const response = await fetch('http://localhost:5001/api/conversations', { ... });
        
        const mockChats = [
            { id: "msg_001", name: "Jean Dupont", lastMsg: "Tu as fini le TP de SOA ?", time: "10:45", unread: 2 },
            { id: "msg_002", name: "Marie Claire", lastMsg: "Photo envoyée", time: "Hier", unread: 0 }
        ];

        listContainer.innerHTML = mockChats.map(chat => `
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
            </div>
        `).join('');

    } catch (error) {
        listContainer.innerHTML = "<p>Erreur de connexion au service de messagerie.</p>";
    }
});
// Adapter pour la page de création et liste des groupes
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.HttpClient?.requireAuth()) return;

    const form = document.getElementById('createGroupForm');
    const status = document.getElementById('statusMessage');
    const groupsList = document.getElementById('groupsList');

    // Charge les groupes existants (si l'API les supporte)
    async function loadGroups() {
        try {
            const url = ServiceRegistry.SERVICE_REGISTRY.messages.url + '/groups';
            const res = await HttpClient.httpGet(url);
            renderGroups(res.groups || []);
        } catch (err) {
            groupsList.innerText = 'Impossible de charger les groupes.';
            console.error(err);
        }
    }

    function renderGroups(groups) {
        if (!groups.length) {
            groupsList.innerHTML = '<p>Aucun groupe trouvé. Créez-en un !</p>';
            return;
        }
        groupsList.innerHTML = '';
        groups.forEach(g => {
            const div = document.createElement('div');
            div.className = 'group-item';
            div.innerHTML = `
                <div class="group-avatar">${(g.name||'G').charAt(0).toUpperCase()}</div>
                <div class="group-meta">
                    <strong>${escapeHtml(g.name)}</strong>
                    <small>${escapeHtml(g.members?.length ? g.members.join(', ') : '0 membres')}</small>
                </div>
            `;
            groupsList.appendChild(div);
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.className = 'status';
        status.innerText = 'Création du groupe...';

        const name = document.getElementById('groupName').value.trim();
        const membersRaw = document.getElementById('groupMembers').value.trim();
        const members = membersRaw ? membersRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
        const avatarFile = document.getElementById('groupAvatar').files[0];

        try {
            let avatarUrl = null;
            if (avatarFile) {
                const fd = new FormData();
                fd.append('file', avatarFile);
                const upload = await HttpClient.httpUpload(ServiceRegistry.SERVICE_REGISTRY.files.url + '/', fd);
                avatarUrl = upload.url || null;
            }

            const payload = { name, members, avatar: avatarUrl };
            const url = ServiceRegistry.SERVICE_REGISTRY.messages.url + '/groups';
            const created = await HttpClient.httpPost(url, payload);

            status.classList.remove('hidden');
            status.style.background = '#d1fae5';
            status.style.color = '#065f46';
            status.innerText = 'Groupe créé ! Redirection...';

            setTimeout(() => window.location.href = 'chat-list.html', 900);
        } catch (err) {
            status.classList.remove('hidden');
            status.style.background = '#fee2e2';
            status.style.color = '#991b1b';
            status.innerText = 'Erreur : ' + (err.message || 'échec création');
            console.error(err);
        }
    });

    // initial load
    loadGroups();
});

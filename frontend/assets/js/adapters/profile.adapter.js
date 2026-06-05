/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — PROFILE ADAPTER (SOA)                        ║
 * ║  Services consommés : UserService | PostService | FileService    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Dépendances :
 *   config/service-registry.js | utils/http-client.js | dtos/dtos.js
 *   services/auth.service.js   | services/post.service.js
 *   services/domain-services.js
 */

'use strict';

/* global AuthService, UserService, PostService, FileService, AppUI, HttpClient */

document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthService.requireAuth()) return;

    await Promise.all([
        _loadUserProfile(),
        _loadUserPosts(),
    ]);

    _bindAvatarUpload();
    _bindProfileEdit();
    _bindLogout();
});

// ─── USER SERVICE ─────────────────────────────────────────────────────────────

async function _loadUserProfile() {
    try {
        const user = await UserService.getMe();

        document.getElementById('userName').textContent  = `${user.firstName} ${user.lastName}`;
        document.getElementById('userBio').textContent   = user.bio || 'Étudiant StudNet';
        document.getElementById('userMajor').textContent = user.major;
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userJoinDate').textContent = _formatJoinDate(user.createdAt);
        if (user.avatarUrl) document.getElementById('userAvatar').src = user.avatarUrl;

    } catch (err) {
        console.error('[ProfileAdapter > UserService] Erreur profil :', err);
    }
}

function _formatJoinDate(createdAt) {
    if (!createdAt) return 'Date inconnue';
    return new Date(createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

// ─── POST SERVICE ─────────────────────────────────────────────────────────────

async function _loadUserPosts() {
    const container = document.getElementById('userPosts');
    try {
        const posts = await PostService.getMyPosts();

        if (!posts.length) {
            container.innerHTML = "<p class='card' style='padding:20px'>Aucune publication pour le moment.</p>";
            return;
        }

        container.innerHTML = posts.map(post => `
            <article class="post-card card" style="margin-bottom:20px;padding:20px;">
                <small>${post.createdAt}</small>
                <p style="margin-top:10px">${post.content}</p>
                ${post.imageUrl ? `<img src="${post.imageUrl}" style="width:100%;border-radius:10px;margin-top:10px;">` : ''}
            </article>`).join('');

    } catch (err) {
        console.error('[ProfileAdapter > PostService] Erreur posts :', err);
    }
}

// ─── FILE SERVICE + USER SERVICE (update avatar) ──────────────────────────────

function _bindAvatarUpload() {
    document.getElementById('avatarInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // 1. Upload vers le FileService
            const { url } = await FileService.upload(file);

            // 2. Mise à jour du profil via UserService
            await UserService.updateAvatar(url);

            // 3. Mise à jour de la vue
            document.getElementById('userAvatar').src = url;
            AppUI.notify("Avatar mis à jour.", 'success');

        } catch (err) {
            console.error('[ProfileAdapter > FileService/UserService] Erreur avatar :', err);
            AppUI.notify("Impossible de mettre à jour l'avatar.", 'error');
        }
    });
}

function _bindProfileEdit() {
    document.getElementById('openEditModal')?.addEventListener('click', async () => {
        const current = await UserService.getMe();
        _openEditModal(current);
    });
}

function _openEditModal(user) {
    document.querySelector('.profile-edit-modal')?.remove();
    const modal = document.createElement('div');
    modal.className = 'profile-edit-modal';
    modal.innerHTML = `
        <form class="profile-edit-card" id="profileEditForm">
            <div class="profile-edit-header">
                <h3>Modifier le profil</h3>
                <button type="button" id="closeProfileEdit"><i class="fas fa-times"></i></button>
            </div>
            <label>Bio</label>
            <textarea id="editBio" rows="4" maxlength="240">${HttpClient.escapeHtml(user.bio || '')}</textarea>
            <label>Filiere</label>
            <select id="editMajor">
                <option value="BMS" ${user.major === 'BMS' || user.major === 'bms' ? 'selected' : ''}>BMS</option>
                <option value="ICT" ${user.major === 'ICT' || user.major === 'ict' ? 'selected' : ''}>ICT (Informatique)</option>
            </select>
            <label>Niveau</label>
            <input id="editYear" type="text" maxlength="20" value="${HttpClient.escapeHtml(user.academicInfo?.year || 'L3')}">
            <button type="submit" class="profile-edit-submit">Enregistrer</button>
        </form>`;

    document.body.appendChild(modal);
    document.getElementById('closeProfileEdit').addEventListener('click', () => modal.remove());
    document.getElementById('profileEditForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await UserService.updateProfile({
                bio: document.getElementById('editBio').value.trim(),
                major: document.getElementById('editMajor').value,
                academicYear: document.getElementById('editYear').value.trim(),
            });
            modal.remove();
            await _loadUserProfile();
            AppUI.notify('Profil mis a jour.', 'success');
        } catch (err) {
            console.error('[ProfileAdapter] Update profile error:', err);
            AppUI.notify("Impossible de modifier le profil.", 'error');
        }
    });
}

function _bindLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        AuthService.logout();
    });
}

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

/* global AuthService, UserService, PostService, FileService */

document.addEventListener('DOMContentLoaded', async () => {
    if (!AuthService.requireAuth()) return;

    await Promise.all([
        _loadUserProfile(),
        _loadUserPosts(),
    ]);

    _bindAvatarUpload();
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
        if (user.avatar) document.getElementById('userAvatar').src = user.avatar;

    } catch (err) {
        console.error('[ProfileAdapter > UserService] Erreur profil :', err);
    }
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
                <small>${new Date(post.createdAt).toLocaleDateString()}</small>
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

        } catch (err) {
            console.error('[ProfileAdapter > FileService/UserService] Erreur avatar :', err);
            alert("Impossible de mettre à jour l'avatar.");
        }
    });
}

function _bindLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        AuthService.logout();
    });
}

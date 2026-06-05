/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — DASHBOARD ADAPTER (SOA)                      ║
 * ║  Couche Adapter : orchestre les appels vers les microservices    ║
 * ║  et pilote la vue du tableau de bord                             ║
 * ║                                                                  ║
 * ║  Services consommés :                                            ║
 * ║    AuthService | PostService | UserService                       ║
 * ║    EventService | MessageService                                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Dépendances (chargées avant ce script dans le HTML) :
 *   config/service-registry.js
 *   utils/http-client.js
 *   utils/event-bus.js
 *   dtos/dtos.js
 *   services/auth.service.js
 *   services/post.service.js
 *   services/domain-services.js
 */

'use strict';

/* global AuthService, PostService, UserService, EventService, MessageService, FileService, HttpClient, AppUI */

// ─── ÉTAT LOCAL ───────────────────────────────────────────────────────────────
let currentUser   = null;
let currentFilter = 'all';
let currentType   = 'general';
let selectedImage = null;
let selectedImageFile = null;
let allPosts      = [];

// ─── INITIALISATION ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    if (!AuthService.requireAuth()) return;

    // Fan-out : appels parallèles vers tous les microservices
    await Promise.all([
        _loadUserProfile(),
        _loadPosts(),
        _loadOnlineUsers(),
        _loadUpcomingEvents(),
        _loadUnreadCount(),
    ]);

    _bindComposer();
    _bindFilters();
    _bindLogout();
    _bindHamburger();
});

// ─── LOADERS (1 service = 1 fonction) ────────────────────────────────────────

async function _loadUserProfile() {
    try {
        currentUser = await AuthService.getMe();

        const initials = `${currentUser.firstName[0]}${currentUser.lastName[0]}`;
        document.getElementById('profileAvatar').textContent   = initials;
        document.getElementById('composerAvatar').textContent  = initials;
        document.getElementById('profileName').textContent     = `${currentUser.firstName} ${currentUser.lastName}`;
        document.getElementById('profileMajor').textContent    = `${currentUser.academicInfo.year} — ${currentUser.academicInfo.major}`;
        document.getElementById('statPosts').textContent       = currentUser.postsCount;
        document.getElementById('statFriends').textContent     = currentUser.friendsCount;

    } catch (err) {
        console.error('[DashboardAdapter > AuthService] Erreur profil :', err);
    }
}

async function _loadPosts() {
    try {
        allPosts = await PostService.getAll();
        _renderPosts(currentFilter);
    } catch (err) {
        console.error('[DashboardAdapter > PostService] Erreur posts :', err);
        document.getElementById('postsFeed').innerHTML =
            '<p style="text-align:center;padding:30px;">Impossible de charger le flux.</p>';
    }
}

async function _loadOnlineUsers() {
    try {
        const users = await UserService.getOnlineUsers();
        document.getElementById('onlineUsers').innerHTML = users.map(u => `
            <div class="online-user-item">
                <div class="online-user-avatar">${u.initials}</div>
                <div class="online-user-info"><strong>${u.name}</strong><small>${u.major}</small></div>
            </div>`).join('');
    } catch (err) {
        console.error('[DashboardAdapter > UserService] Erreur utilisateurs en ligne :', err);
    }
}

async function _loadUpcomingEvents() {
    try {
        const events = await EventService.getUpcoming();
        document.getElementById('upcomingEvents').innerHTML = events.map(ev => `
            <div class="event-item">
                <div class="event-date-badge"><div class="day">${ev.day}</div><div class="month">${ev.month}</div></div>
                <div class="event-info"><h5>${ev.title}</h5><small><i class="fas fa-map-marker-alt"></i> ${ev.location}</small></div>
            </div>`).join('');
    } catch (err) {
        console.error('[DashboardAdapter > EventService] Erreur événements :', err);
    }
}

async function _loadUnreadCount() {
    try {
        const { count } = await MessageService.getUnreadCount();
        const badge = document.getElementById('msgBadge');
        if (count > 0) { badge.textContent = count; badge.classList.remove('hidden'); }
    } catch (err) {
        console.error('[DashboardAdapter > MessageService] Erreur compteur :', err);
    }
}

// ─── RENDU DES POSTS ──────────────────────────────────────────────────────────

function _renderPosts(filter) {
    const feed     = document.getElementById('postsFeed');
    const filtered = filter === 'all' ? allPosts : allPosts.filter(p => p.type === filter);

    if (!filtered.length) {
        feed.innerHTML = '<p style="text-align:center;padding:30px;">Aucun post dans cette catégorie.</p>';
        return;
    }

    feed.innerHTML = filtered.map(post => `
        <article class="post-card" data-id="${post.id}">
            <div class="post-header">
                <div class="post-author-avatar">${post.author.initials}</div>
                <div class="post-author-info"><h4>${post.author.name}</h4><small>${post.createdAt}</small></div>
                <span class="post-type-tag tag-${post.type}">${_labelType(post.type)}</span>
            </div>
            <div class="post-body"><p>${HttpClient.escapeHtml(post.content)}</p></div>
            ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" alt="image du post">` : ''}
            <div class="post-actions">
                <button class="action-btn like-btn ${post.liked ? 'liked' : ''}" data-id="${post.id}">
                    <i class="${post.liked ? 'fas' : 'far'} fa-heart"></i> ${post.likes} J'aime
                </button>
                <button class="action-btn comment-btn" data-id="${post.id}"><i class="far fa-comment"></i> ${post.comments} Commentaire${post.comments > 1 ? 's' : ''}</button>
                <button class="action-btn share-btn" data-id="${post.id}"><i class="fas fa-share"></i> Partager</button>
            </div>
            <div class="comments-panel hidden" id="comments-${post.id}">
                <div class="comments-list"></div>
                <form class="comment-form" data-id="${post.id}">
                    <input type="text" placeholder="Ajouter un commentaire..." maxlength="300">
                    <button type="submit">Envoyer</button>
                </form>
            </div>
        </article>`).join('');

    feed.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => _handleLike(btn.dataset.id));
    });
    feed.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', () => _toggleComments(btn.dataset.id));
    });
    feed.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', _submitComment);
    });
    feed.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', () => _sharePost(btn.dataset.id));
    });
}

async function _handleLike(postId) {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    post.liked  = !post.liked;
    post.likes += post.liked ? 1 : -1;
    _renderPosts(currentFilter);

    try {
        const result = await PostService.toggleLike(postId);
        post.liked = result.liked;
        post.likes = result.likes;
        _renderPosts(currentFilter);
    } catch (err) {
        post.liked  = !post.liked;
        post.likes += post.liked ? 1 : -1;
        _renderPosts(currentFilter);
        console.error('[DashboardAdapter > PostService] Erreur like :', err);
    }
}

async function _toggleComments(postId) {
    const panel = document.getElementById(`comments-${postId}`);
    if (!panel) return;

    panel.classList.toggle('hidden');
    if (panel.dataset.loaded === 'true') return;

    const list = panel.querySelector('.comments-list');
    list.innerHTML = '<p class="comment-empty">Chargement des commentaires...</p>';

    try {
        const comments = await PostService.getComments(postId);
        _renderComments(panel, comments);
        panel.dataset.loaded = 'true';
    } catch (err) {
        console.error('[DashboardAdapter > PostService] Erreur commentaires :', err);
        list.innerHTML = '<p class="comment-empty">Impossible de charger les commentaires.</p>';
    }
}

function _renderComments(panel, comments) {
    const list = panel.querySelector('.comments-list');
    if (!comments.length) {
        list.innerHTML = '<p class="comment-empty">Aucun commentaire pour le moment.</p>';
        return;
    }

    list.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="comment-avatar">${comment.author.initials}</div>
            <div class="comment-body">
                <strong>${HttpClient.escapeHtml(comment.author.name)}</strong>
                <p>${HttpClient.escapeHtml(comment.content)}</p>
                <small>${comment.createdAt}</small>
            </div>
        </div>`).join('');
}

async function _submitComment(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const postId = form.dataset.id;
    const input = form.querySelector('input');
    const content = input.value.trim();
    if (!content) return;

    try {
        const comment = await PostService.addComment(postId, content);
        input.value = '';

        const panel = document.getElementById(`comments-${postId}`);
        const comments = await PostService.getComments(postId);
        _renderComments(panel, comments);

        const post = allPosts.find(p => p.id === postId);
        if (post) {
            post.comments = (post.comments || 0) + 1;
            const button = document.querySelector(`.comment-btn[data-id="${postId}"]`);
            if (button) button.innerHTML = `<i class="far fa-comment"></i> ${post.comments} Commentaire${post.comments > 1 ? 's' : ''}`;
        }
        AppUI.notify('Commentaire ajouté.', 'success');
    } catch (err) {
        console.error('[DashboardAdapter > PostService] Erreur ajout commentaire :', err);
        AppUI.notify("Impossible d'ajouter ce commentaire.", 'error');
    }
}

async function _sharePost(postId) {
    const url = `${window.location.origin}${window.location.pathname}#post-${postId}`;
    try {
        if (navigator.share) {
            await navigator.share({ title: 'Publication StudNet', url });
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(url);
            AppUI.notify('Lien de la publication copié.', 'success');
        } else {
            AppUI.notify('Lien prêt à partager.', 'info');
        }
    } catch {
        AppUI.notify('Partage annulé.', 'info');
    }
}

// ─── COMPOSER ─────────────────────────────────────────────────────────────────

function _bindComposer() {
    const typeBtn      = document.getElementById('postTypeBtn');
    const typeDropdown = document.getElementById('typeDropdown');
    const typeLabel    = document.getElementById('postTypeLabel');

    typeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        typeDropdown.classList.toggle('hidden');
    });

    document.querySelectorAll('.type-option').forEach(opt => {
        opt.addEventListener('click', () => {
            currentType = opt.dataset.type;
            typeLabel.textContent = opt.dataset.label;
            typeDropdown.classList.add('hidden');
            _toggleEventDetails();
        });
    });

    document.addEventListener('click', () => typeDropdown.classList.add('hidden'));

    document.getElementById('postImage').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        selectedImage = URL.createObjectURL(file);
        selectedImageFile = file;
        document.getElementById('imagePreview').src = selectedImage;
        document.getElementById('imagePreviewContainer').classList.remove('hidden');
    });

    document.getElementById('removeImage').addEventListener('click', () => {
        selectedImage = null;
        selectedImageFile = null;
        document.getElementById('imagePreview').src = '';
        document.getElementById('imagePreviewContainer').classList.add('hidden');
        document.getElementById('postImage').value = '';
    });

    document.getElementById('publishBtn').addEventListener('click', _publishPost);
    document.getElementById('postInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _publishPost(); }
    });
}

async function _publishPost() {
    const text = document.getElementById('postInput').value.trim();
    if (!text && !selectedImageFile) return;
    const eventDetails = document.getElementById('eventDetails');
    const wasEvent = currentType === 'evenement';

    let imageUrl = null;
    if (selectedImageFile && window.FileService) {
        const uploaded = await FileService.upload(selectedImageFile);
        imageUrl = uploaded.url;
    }

    if (wasEvent) {
        const startsAt = document.getElementById('eventStartsAt').value;
        const location = document.getElementById('eventLocation').value.trim();
        if (!text || !startsAt || !location) {
            AppUI.notify("Pour un evenement, ajoute un titre, une date et un lieu.", 'error');
            return;
        }

        await EventService.create({
            title: text.slice(0, 80),
            description: text,
            category: 'evenement',
            location,
            startsAt,
        });
        _loadUpcomingEvents();
    }

    const newPost = await PostService.create({
        authorId: currentUser.id,
        content: text,
        type: currentType,
        imageUrl,
    });

    allPosts.unshift(newPost);
    currentUser.postsCount++;
    document.getElementById('statPosts').textContent = currentUser.postsCount;
    document.getElementById('postInput').value = '';
    selectedImage = null;
    selectedImageFile = null;
    document.getElementById('imagePreviewContainer').classList.add('hidden');
    document.getElementById('postImage').value = '';
    if (eventDetails) {
        document.getElementById('eventStartsAt').value = '';
        document.getElementById('eventLocation').value = '';
        eventDetails.classList.add('hidden');
    }
    currentType = 'general';
    const typeLabel = document.getElementById('postTypeLabel');
    if (typeLabel) typeLabel.textContent = 'Général';
    _renderPosts(currentFilter);
    AppUI.notify(wasEvent ? "Evenement publie et ajoute a la page Evenements." : 'Publication ajoutee.', 'success');
}

function _toggleEventDetails() {
    const details = document.getElementById('eventDetails');
    if (!details) return;
    details.classList.toggle('hidden', currentType !== 'evenement');
}

// ─── FILTRES / LOGOUT / HAMBURGER ────────────────────────────────────────────

function _bindFilters() {
    document.querySelectorAll('.side-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.side-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentFilter = item.dataset.filter;
            _renderPosts(currentFilter);
        });
    });
}

function _bindLogout() {
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        AuthService.logout();
    });
}

function _bindHamburger() {
    document.getElementById('hamburger').addEventListener('click', () => {
        document.querySelector('.nav-links').classList.toggle('open');
    });
}

// ─── HELPERS PRIVÉS ───────────────────────────────────────────────────────────

function _labelType(type) {
    return { general: 'Général', cours: 'Cours', evenement: 'Événement', annonce: 'Annonce' }[type] || type;
}

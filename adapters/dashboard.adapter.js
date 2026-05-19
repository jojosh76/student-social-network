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

/* global AuthService, PostService, UserService, EventService, MessageService, HttpClient */

// ─── ÉTAT LOCAL ───────────────────────────────────────────────────────────────
let currentUser   = null;
let currentFilter = 'all';
let currentType   = 'general';
let selectedImage = null;
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
        // MOCK — remplacer par : currentUser = await AuthService.getMe();
        currentUser = {
            id: 'u_001', firstName: 'Ton', lastName: 'Nom',
            academicInfo: { major: 'Génie Logiciel', year: 'L3' },
            postsCount: 12, friendsCount: 47,
        };

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
        // MOCK — remplacer par : allPosts = await PostService.getAll();
        allPosts = [
            { id: 'p_001', author: { name: 'Marie Claire', initials: 'MC' }, content: "Je partage le cours complet de SOA en PDF ! Vraiment utile pour le projet 🙌", type: 'cours',     imageUrl: null, likes: 14, comments: 3,  liked: false, createdAt: HttpClient.formatRelativeTime(10)  },
            { id: 'p_002', author: { name: 'Jean Dupont',  initials: 'JD' }, content: "Hackathon StudNet ce weekend au campus ! Venez nombreux, les équipes se forment maintenant 🚀",  type: 'evenement', imageUrl: null, likes: 32, comments: 8,  liked: false, createdAt: HttpClient.formatRelativeTime(45)  },
            { id: 'p_003', author: { name: 'Admin Campus', initials: 'AC' }, content: "Les soutenances de projets de L3 sont prévues pour le 20 mai. Préparez vos slides !",          type: 'annonce',   imageUrl: null, likes: 51, comments: 12, liked: false, createdAt: HttpClient.formatRelativeTime(120) },
        ];
        _renderPosts(currentFilter);
    } catch (err) {
        console.error('[DashboardAdapter > PostService] Erreur posts :', err);
        document.getElementById('postsFeed').innerHTML =
            '<p style="text-align:center;padding:30px;">Impossible de charger le flux.</p>';
    }
}

async function _loadOnlineUsers() {
    try {
        // MOCK — remplacer par : const users = await UserService.getOnlineUsers();
        const users = [
            { initials: 'MC', name: 'Marie Claire', major: 'Info L3'  },
            { initials: 'AB', name: 'Armel Biya',   major: 'Droit L2' },
            { initials: 'PK', name: 'Paul Kamga',   major: 'Éco L1'   },
        ];
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
        // MOCK — remplacer par : const events = await EventService.getUpcoming();
        const events = [
            { day: '15', month: 'MAI', title: 'Hackathon Campus',  location: 'Salle B201'   },
            { day: '20', month: 'MAI', title: 'Soutenances L3',    location: 'Amphi 1'      },
            { day: '28', month: 'MAI', title: 'Forum des stages',  location: 'Hall central' },
        ];
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
        // MOCK — remplacer par : const { count } = await MessageService.getUnreadCount();
        const count = 2;
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
                <button class="action-btn"><i class="far fa-comment"></i> ${post.comments} Commentaire${post.comments > 1 ? 's' : ''}</button>
                <button class="action-btn"><i class="fas fa-share"></i> Partager</button>
            </div>
        </article>`).join('');

    feed.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => _handleLike(btn.dataset.id));
    });
}

async function _handleLike(postId) {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    post.liked  = !post.liked;
    post.likes += post.liked ? 1 : -1;
    _renderPosts(currentFilter);

    // En production : await PostService.toggleLike(postId);
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
        });
    });

    document.addEventListener('click', () => typeDropdown.classList.add('hidden'));

    document.getElementById('postImage').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        selectedImage = URL.createObjectURL(file);
        document.getElementById('imagePreview').src = selectedImage;
        document.getElementById('imagePreviewContainer').classList.remove('hidden');
    });

    document.getElementById('removeImage').addEventListener('click', () => {
        selectedImage = null;
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
    if (!text && !selectedImage) return;

    // En production : await PostService.create({ authorId: currentUser.id, content: text, type: currentType, imageUrl: selectedImage });
    const newPost = {
        id:        'p_' + Date.now(),
        author:    { name: `${currentUser.firstName} ${currentUser.lastName}`, initials: `${currentUser.firstName[0]}${currentUser.lastName[0]}` },
        content:   text || '',
        type:      currentType,
        imageUrl:  selectedImage,
        likes:     0, comments:  0, liked: false, createdAt: "À l'instant",
    };

    allPosts.unshift(newPost);
    currentUser.postsCount++;
    document.getElementById('statPosts').textContent = currentUser.postsCount;
    document.getElementById('postInput').value = '';
    selectedImage = null;
    document.getElementById('imagePreviewContainer').classList.add('hidden');
    document.getElementById('postImage').value = '';
    _renderPosts(currentFilter);
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

/**
 * DASHBOARD ADAPTER — StudNet
 * Architecture : SOA / Microservices (simulation)
 *
 * Services consommés (mock) :
 *   - AuthService       : http://localhost:5000/api/auth/me
 *   - PostService       : http://localhost:5002/api/posts
 *   - UserService       : http://localhost:5003/api/users/online
 *   - EventService      : http://localhost:5004/api/events/upcoming
 *   - MessageService    : http://localhost:5001/api/conversations/unread-count
 */

'use strict';

// ─── CONFIG SERVICES (Gateway URLs) ──────────────────────────────────────────
const SERVICES = {
    auth:    'http://localhost:3000/api',
    posts:   'http://localhost:3002/api',
    users:   'http://localhost:3003/api',
    events:  'http://localhost:3004/api',
    messages:'http://localhost:3001/api',
};

// ─── ÉTAT LOCAL ───────────────────────────────────────────────────────────────
let currentUser   = null;
let currentFilter = 'all';
let currentType   = 'general';
let selectedImage = null;
let allPosts      = [];

// ─── INITIALISATION ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

    // 1. Auth Guard — vérifie le token (Auth Service)
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Accès non autorisé. Veuillez vous connecter.");
        window.location.href = 'index.html';
        return;
    }

    // 2. Chargement parallèle de tous les services (fan-out)
    await Promise.all([
        loadUserProfile(token),
        loadPosts(token),
        loadOnlineUsers(token),
        loadUpcomingEvents(token),
        loadUnreadCount(token),
    ]);

    // 3. Bind des interactions UI
    bindComposer();
    bindFilters();
    bindLogout();
    bindHamburger();
});

// ─── SERVICE : AUTH / PROFIL ──────────────────────────────────────────────────
async function loadUserProfile(token) {
    try {
        /*
         * [Microservice] GET /api/auth/me
         * Renvoie : { id, firstName, lastName, academicInfo: { major, year }, postsCount, friendsCount }
         */
        // const res  = await fetch(`${SERVICES.auth}/auth/me`, { headers: authHeaders(token) });
        // currentUser = await res.json();

        // ── MOCK ──
        currentUser = {
            id: 'u_001',
            firstName: 'Ton',
            lastName:  'Nom',
            academicInfo: { major: 'Génie Logiciel', year: 'L3' },
            postsCount:   12,
            friendsCount: 47,
        };

        const initials = `${currentUser.firstName[0]}${currentUser.lastName[0]}`;

        document.getElementById('profileAvatar').textContent    = initials;
        document.getElementById('composerAvatar').textContent   = initials;
        document.getElementById('profileName').textContent      = `${currentUser.firstName} ${currentUser.lastName}`;
        document.getElementById('profileMajor').textContent     = `${currentUser.academicInfo.year} — ${currentUser.academicInfo.major}`;
        document.getElementById('statPosts').textContent        = currentUser.postsCount;
        document.getElementById('statFriends').textContent      = currentUser.friendsCount;

    } catch (err) {
        console.error('[AuthService] Erreur profil :', err);
    }
}

// ─── SERVICE : POSTS ─────────────────────────────────────────────────────────
async function loadPosts(token) {
    try {
        /*
         * [Microservice] GET /api/posts
         * Renvoie : Post[]
         */
        // const res = await fetch(`${SERVICES.posts}/posts`, { headers: authHeaders(token) });
        // allPosts  = await res.json();

        // ── MOCK ──
        allPosts = [
            {
                id: 'p_001',
                author: { name: 'Marie Claire', initials: 'MC' },
                content: "Je partage le cours complet de SOA en PDF ! Vraiment utile pour le projet 🙌",
                type: 'cours',
                imageUrl: null,
                likes: 14,
                comments: 3,
                liked: false,
                createdAt: il_y_a(10),
            },
            {
                id: 'p_002',
                author: { name: 'Jean Dupont', initials: 'JD' },
                content: "Hackathon StudNet ce weekend au campus ! Venez nombreux, les équipes se forment maintenant 🚀",
                type: 'evenement',
                imageUrl: null,
                likes: 32,
                comments: 8,
                liked: false,
                createdAt: il_y_a(45),
            },
            {
                id: 'p_003',
                author: { name: 'Admin Campus', initials: 'AC' },
                content: "Les soutenances de projets de L3 sont prévues pour le 20 mai. Préparez vos slides !",
                type: 'annonce',
                imageUrl: null,
                likes: 51,
                comments: 12,
                liked: false,
                createdAt: il_y_a(120),
            },
        ];

        renderPosts(currentFilter);

    } catch (err) {
        console.error('[PostService] Erreur chargement posts :', err);
        document.getElementById('postsFeed').innerHTML =
            '<p style="text-align:center;color:var(--text);padding:30px;">Impossible de charger le flux.</p>';
    }
}

function renderPosts(filter) {
    const feed = document.getElementById('postsFeed');
    const filtered = filter === 'all'
        ? allPosts
        : allPosts.filter(p => p.type === filter);

    if (filtered.length === 0) {
        feed.innerHTML = '<p style="text-align:center;color:var(--text);padding:30px;">Aucun post dans cette catégorie.</p>';
        return;
    }

    feed.innerHTML = filtered.map(post => `
        <article class="post-card" data-id="${post.id}">
            <div class="post-header">
                <div class="post-author-avatar">${post.author.initials}</div>
                <div class="post-author-info">
                    <h4>${post.author.name}</h4>
                    <small>${post.createdAt}</small>
                </div>
                <span class="post-type-tag tag-${post.type}">${labelType(post.type)}</span>
            </div>
            <div class="post-body">
                <p>${escapeHtml(post.content)}</p>
            </div>
            ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" alt="image du post">` : ''}
            <div class="post-actions">
                <button class="action-btn like-btn ${post.liked ? 'liked' : ''}" data-id="${post.id}">
                    <i class="${post.liked ? 'fas' : 'far'} fa-heart"></i>
                    ${post.likes} J'aime
                </button>
                <button class="action-btn">
                    <i class="far fa-comment"></i>
                    ${post.comments} Commentaire${post.comments > 1 ? 's' : ''}
                </button>
                <button class="action-btn">
                    <i class="fas fa-share"></i> Partager
                </button>
            </div>
        </article>
    `).join('');

    // Bind des likes (optimistic update)
    feed.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => handleLike(btn.dataset.id));
    });
}

async function handleLike(postId) {
    /*
     * [Microservice] POST /api/posts/:id/like (CQRS — WriteCommand)
     */
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    post.liked  = !post.liked;
    post.likes += post.liked ? 1 : -1;
    renderPosts(currentFilter);

    // (En prod) appel API :
    // await fetch(`${SERVICES.posts}/posts/${postId}/like`, { method: 'POST', headers: authHeaders(token) });
}

// ─── SERVICE : UTILISATEURS EN LIGNE ─────────────────────────────────────────
async function loadOnlineUsers(token) {
    try {
        /*
         * [Microservice] GET /api/users/online
         */
        // ── MOCK ──
        const users = [
            { initials: 'MC', name: 'Marie Claire',   major: 'Info L3'  },
            { initials: 'AB', name: 'Armel Biya',     major: 'Droit L2' },
            { initials: 'PK', name: 'Paul Kamga',     major: 'Éco L1'   },
        ];

        const container = document.getElementById('onlineUsers');
        container.innerHTML = users.map(u => `
            <div class="online-user-item">
                <div class="online-user-avatar">${u.initials}</div>
                <div class="online-user-info">
                    <strong>${u.name}</strong>
                    <small>${u.major}</small>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('[UserService] Erreur utilisateurs en ligne :', err);
    }
}

// ─── SERVICE : ÉVÉNEMENTS ─────────────────────────────────────────────────────
async function loadUpcomingEvents(token) {
    try {
        /*
         * [Microservice] GET /api/events/upcoming
         */
        // ── MOCK ──
        const events = [
            { day: '15', month: 'MAI', title: 'Hackathon Campus', location: 'Salle B201' },
            { day: '20', month: 'MAI', title: 'Soutenances L3',   location: 'Amphi 1'   },
            { day: '28', month: 'MAI', title: 'Forum des stages', location: 'Hall central' },
        ];

        const container = document.getElementById('upcomingEvents');
        container.innerHTML = events.map(ev => `
            <div class="event-item">
                <div class="event-date-badge">
                    <div class="day">${ev.day}</div>
                    <div class="month">${ev.month}</div>
                </div>
                <div class="event-info">
                    <h5>${ev.title}</h5>
                    <small><i class="fas fa-map-marker-alt" style="color:var(--primary);margin-right:4px;"></i>${ev.location}</small>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('[EventService] Erreur événements :', err);
    }
}

// ─── SERVICE : MESSAGES NON LUS ───────────────────────────────────────────────
async function loadUnreadCount(token) {
    try {
        /*
         * [Microservice] GET /api/conversations/unread-count
         */
        // ── MOCK ──
        const count = 2;
        const badge = document.getElementById('msgBadge');
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        }

    } catch (err) {
        console.error('[MessageService] Erreur compteur messages :', err);
    }
}

// ─── COMPOSER ─────────────────────────────────────────────────────────────────
function bindComposer() {
    // Sélection de type
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

    // Aperçu image
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

    // Publication
    document.getElementById('publishBtn').addEventListener('click', publishPost);
    document.getElementById('postInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); publishPost(); }
    });
}

async function publishPost() {
    const text = document.getElementById('postInput').value.trim();
    if (!text && !selectedImage) return;

    /*
     * [Microservice] POST /api/posts  (CQRS — CreatePostCommand)
     * Body : { authorId, content, type, imageUrl }
     */
    const newPost = {
        id:        'p_' + Date.now(),
        author:    { name: `${currentUser.firstName} ${currentUser.lastName}`, initials: `${currentUser.firstName[0]}${currentUser.lastName[0]}` },
        content:   text || '',
        type:      currentType,
        imageUrl:  selectedImage,
        likes:     0,
        comments:  0,
        liked:     false,
        createdAt: "À l'instant",
    };

    // Ajout en tête du feed (optimistic)
    allPosts.unshift(newPost);
    currentUser.postsCount++;
    document.getElementById('statPosts').textContent = currentUser.postsCount;

    // Reset composer
    document.getElementById('postInput').value = '';
    selectedImage = null;
    document.getElementById('imagePreview').src = '';
    document.getElementById('imagePreviewContainer').classList.add('hidden');
    document.getElementById('postImage').value = '';

    renderPosts(currentFilter);
}

// ─── FILTRES ──────────────────────────────────────────────────────────────────
function bindFilters() {
    document.querySelectorAll('.side-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.side-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentFilter = item.dataset.filter;
            renderPosts(currentFilter);
        });
    });
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
function bindLogout() {
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
}

// ─── HAMBURGER MOBILE ─────────────────────────────────────────────────────────
function bindHamburger() {
    document.getElementById('hamburger').addEventListener('click', () => {
        document.querySelector('.nav-links').classList.toggle('open');
    });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function authHeaders(token) {
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function il_y_a(minutes) {
    if (minutes < 60)   return `Il y a ${minutes} min`;
    const h = Math.floor(minutes / 60);
    if (h < 24)         return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h / 24)} jour(s)`;
}

function labelType(type) {
    const labels = { general: 'Général', cours: 'Cours', evenement: 'Événement', annonce: 'Annonce' };
    return labels[type] || type;
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

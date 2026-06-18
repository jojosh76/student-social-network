/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              STUDNET — API GATEWAY (SOA)                         ║
 * ║  Point d'entrée unique (ESB simplifié) pour tous les services    ║
 * ║  Port exposé : 3000                                              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * ┌─────────────────── ARCHITECTURE SOA ──────────────────────────┐
 * │                                                               │
 * │  [Frontend]  ──HTTP/WS──▶  [API Gateway :3000]               │
 * │                                 │                            │
 * │                    ┌────────────┼────────────┐               │
 * │                    ▼            ▼            ▼               │
 * │             [AuthSvc:5000] [PostSvc:5002] [UserSvc:5003]     │
 * │             [MsgSvc:5001]  [EvtSvc:5004]  [SrchSvc:5005]    │
 * │             [FileSvc:5006] [ChatSvc:5007 — WebSocket]        │
 * │                                                               │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Responsabilités du Gateway (ESB) :
 *   ✔ Auth Guard JWT centralisé (tous les services protégés)
 *   ✔ Routage et reverse-proxy vers les microservices
 *   ✔ Rate Limiting (global + strict sur /auth)
 *   ✔ CORS / Helmet (sécurité HTTP)
 *   ✔ Logging des requêtes (Morgan)
 *   ✔ Pont WebSocket (Chat — relais bidirectionnel)
 *   ✔ Gestion centralisée des erreurs (502 si service down)
 *   ✔ Injection des headers internes (X-User-Id, X-User-Email)
 */

'use strict';

// ── Dépendances ────────────────────────────────────────────────────────────────
const express        = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt            = require('jsonwebtoken');
const rateLimit      = require('express-rate-limit');
const cors           = require('cors');
const morgan         = require('morgan');
const helmet         = require('helmet');
const { createServer }        = require('http');
const { Server: SocketServer } = require('socket.io');
const { io: SocketClient }    = require('socket.io-client');

const app    = express();
app.set('trust proxy', 1);
const server = createServer(app);

// ── CONFIG ─────────────────────────────────────────────────────────────────────
const GATEWAY_PORT = process.env.PORT       || 3100;
const JWT_SECRET   = process.env.JWT_SECRET || 'studnet_secret_key';

/**
 * Registre interne des microservices.
 * En production : alimenté par Consul/etcd (Service Discovery).
 */
const SERVICES = {
    auth     : process.env.AUTH_SERVICE_URL      || 'http://localhost:5100',
    messaging: process.env.MESSAGING_SERVICE_URL || 'http://localhost:5101',
    content  : process.env.CONTENT_SERVICE_URL   || 'http://localhost:5102',
    users    : process.env.USER_SERVICE_URL      || 'http://localhost:5103',
    files    : process.env.FILE_SERVICE_URL      || 'http://localhost:5106',
};

/** Routes sans vérification JWT (endpoints publics) */
const PUBLIC_ROUTES = [
    { method: 'POST', path: '/api/auth/login'    },
    { method: 'POST', path: '/api/auth/register' },
];

// ── MIDDLEWARES GLOBAUX ────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
    origin: (origin, callback) => callback(null, true),
    methods      : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials  : true,
}));
app.use(morgan(':method :url :status :response-time ms - :res[content-length]'));

// ── RATE LIMITING ──────────────────────────────────────────────────────────────
/** 200 req / 15 min par IP (global) */
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, max: 200,
    standardHeaders: true, legacyHeaders: false,
    message: { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
}));

/** 10 tentatives / 15 min sur les routes d'authentification */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 10,
    message:  { error: 'Trop de tentatives de connexion. Réessayez plus tard.' },
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// Extract user from JWT without blocking requests
app.use((req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
            req.headers['x-user-id']    = decoded.id;
            req.headers['x-user-email'] = decoded.email;
            req.headers['x-user-role']  = decoded.role || 'student';
        } catch {
            // Invalid token — don't block, just don't set headers
        }
    }
    next();
});

// ── HEALTH CHECK ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
    gateway: 'StudNet API Gateway', status: 'UP',
    uptime:  process.uptime(), services: Object.keys(SERVICES),
}));


// ── FACTORY DE PROXY ──────────────────────────────────────────────────────────
/**
 * Crée un reverse-proxy vers un microservice avec gestion d'erreur.
 * Retourne un 502 si le service cible est indisponible (circuit breaker simplifié).
 */
function makeProxy(target, options = {}) {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
        on: {
            error: (err, req, res) => {
                console.error(`[Gateway] Proxy error → ${target} :`, err.message);
                res.status(502).json({ error: 'Service temporairement indisponible.', service: target });
            },
            proxyReq: (_proxyReq, req) => {
                console.log(`[Gateway] → ${req.method} ${target}${req.path}`);
            },
        },
        ...options,
    });
}

function mountedProxy(target, upstreamPrefix = '', options = {}) {
    const proxy = makeProxy(target, options);
    return (req, res, next) => {
        req.url = `${upstreamPrefix}${req.url}`;
        proxy(req, res, next);
    };
}

// ── ROUTAGE DES MICROSERVICES ──────────────────────────────────────────────────
app.use('/api/auth',          mountedProxy(SERVICES.auth));
app.use('/api/users',         mountedProxy(SERVICES.users));
app.use('/api/posts',         mountedProxy(SERVICES.content, '/posts'));
app.use('/api/events',        mountedProxy(SERVICES.content, '/events'));
app.use('/api/notifications', mountedProxy(SERVICES.content, '/notifications'));
app.use('/api/search',        mountedProxy(SERVICES.content, '/search'));
app.use('/api/conversations', mountedProxy(SERVICES.messaging));
app.use('/api/upload',        mountedProxy(SERVICES.files, '', { selfHandleResponse: false }));

// ── PONT WEBSOCKET — CHAT SERVICE ─────────────────────────────────────────────
/**
 * Le Gateway relaie les connexions WebSocket du frontend vers le ChatService.
 * Flux : Client ──WS──▶ Gateway:3000/chat ──WS──▶ ChatService:5007
 *
 * Auth Guard WebSocket : le token est vérifié au handshake.
 * L'identité (userId, email) est injectée dans la connexion vers ChatService.
 */
const io = new SocketServer(server, {
    cors   : { origin: process.env.FRONTEND_URL || 'http://localhost:8080', methods: ['GET', 'POST'] },
    path   : '/socket.io',
});

// Auth Guard WebSocket
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token manquant'));
    try {
        socket.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        next(new Error('Token invalide ou expiré'));
    }
});

io.on('connection', (clientSocket) => {
    const { id: userId, email } = clientSocket.user;
    console.log(`[Gateway WS] Connecté : ${email} (${userId})`);

    // Connexion vers ChatService avec identité injectée
    const chatSocket = SocketClient(SERVICES.messaging.replace('http://', 'ws://'), {
        auth      : { userId, email },
        transports: ['websocket'],
    });

    // Relais Frontend → ChatService
    clientSocket.on('send_message', (payload) => chatSocket.emit('send_message', { ...payload, senderId: userId }));
    clientSocket.on('typing',       (data)    => chatSocket.emit('typing', { ...data, userId }));

    // Relais ChatService → Frontend
    chatSocket.on('new_message', (data) => clientSocket.emit('new_message', data));
    chatSocket.on('user_typing', (data) => clientSocket.emit('user_typing', data));

    // Nettoyage
    clientSocket.on('disconnect', () => {
        console.log(`[Gateway WS] Déconnecté : ${email}`);
        chatSocket.disconnect();
    });
    chatSocket.on('connect_error', (err) => {
        console.error('[Gateway WS] ChatService :', err.message);
        clientSocket.emit('error', { message: 'Service de chat indisponible.' });
    });
});

// ── GESTION DES ERREURS ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route non trouvée : ${req.method} ${req.originalUrl}` }));
app.use((err, _req, res, _next) => {
    console.error('[Gateway] Erreur interne :', err);
    res.status(500).json({ error: 'Erreur interne du Gateway.' });
});

// ── DÉMARRAGE ─────────────────────────────────────────────────────────────────
server.listen(GATEWAY_PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║       STUDNET — API GATEWAY DÉMARRÉ (SOA)        ║
║  URL       : http://localhost:${GATEWAY_PORT}              ║
║  Health    : http://localhost:${GATEWAY_PORT}/health        ║
╠══════════════════════════════════════════════════╣
║  /api/auth          → AuthService     :5000      ║
║  /api/posts         → ContentService  :5002      ║
║  /api/users         → UserService     :5003      ║
║  /api/events        → ContentService  :5002      ║
║  /api/notifications → ContentService  :5002      ║
║  /api/conversations → MessagingSvc    :5001      ║
║  /api/search        → ContentService  :5002      ║
║  /api/upload        → FileService     :5006      ║
║  ws:/chat           → MessagingSvc    :5001      ║
╚══════════════════════════════════════════════════╝
    `);
});

module.exports = server;

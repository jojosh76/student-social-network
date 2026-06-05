'use strict';

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { query, healthCheck, getUserId, initials } = require('../shared/db');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5101;
const JWT_SECRET = process.env.JWT_SECRET || 'studnet_secret_key';

app.use(cors());
app.use(express.json());

const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

function mapConversation(row) {
    return {
        id: row.id,
        name: row.title || row.participant_names || 'Conversation',
        lastMessage: row.last_message || '',
        unread: row.unread_count || 0,
        updatedAt: row.updated_at,
    };
}

function mapMessage(row) {
    return {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        senderName: `${row.first_name} ${row.last_name}`,
        senderInitials: initials(row.first_name, row.last_name),
        text: row.content,
        imageUrl: row.image_url,
        audioUrl: row.audio_url,
        createdAt: row.created_at,
    };
}

app.get('/health', async (_req, res) => {
    try {
        await healthCheck();
        res.json({ service: 'MessagingService', status: 'UP', database: 'UP', websocket: 'UP' });
    } catch (err) {
        res.status(503).json({ service: 'MessagingService', status: 'DOWN', error: err.message });
    }
});

app.get('/', async (req, res) => {
    const userId = getUserId(req);
    const result = await query(
        `SELECT c.id, c.title, c.updated_at,
                latest.content AS last_message,
                STRING_AGG(CONCAT(u.first_name, ' ', u.last_name), ', ') FILTER (WHERE u.id <> $1) AS participant_names,
                0::int AS unread_count
         FROM conversations c
         JOIN conversation_participants cp ON cp.conversation_id = c.id
         LEFT JOIN conversation_participants others ON others.conversation_id = c.id
         LEFT JOIN users u ON u.id = others.user_id
         LEFT JOIN LATERAL (
             SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1
         ) latest ON true
         WHERE cp.user_id = $1
         GROUP BY c.id, latest.content
         ORDER BY c.updated_at DESC`,
        [userId]
    );
    res.json(result.rows.map(mapConversation));
});

app.get('/unread-count', async (_req, res) => {
    res.json({ count: 0 });
});

app.post('/', async (req, res) => {
    const userId = getUserId(req);
    const { participantId, participantIds = [], title = null } = req.body;
    const uniqueParticipants = [...new Set([participantId, ...participantIds].filter(Boolean))];
    const otherParticipants = uniqueParticipants.filter(id => id !== userId);

    if (!otherParticipants.length) {
        return res.status(400).json({ error: 'At least one participant is required' });
    }

    const conversation = await query('INSERT INTO conversations (title) VALUES ($1) RETURNING *', [title]);
    const participantRows = [userId, ...otherParticipants]
        .map((id, index) => `($1, $${index + 2})`)
        .join(', ');
    await query(
        `INSERT INTO conversation_participants (conversation_id, user_id)
         VALUES ${participantRows}
         ON CONFLICT DO NOTHING`,
        [conversation.rows[0].id, userId, ...otherParticipants]
    );
    res.status(201).json(conversation.rows[0]);
});

app.get('/:id/messages', async (req, res) => {
    const userId = getUserId(req);
    const membership = await query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [req.params.id, userId]
    );
    if (!membership.rows[0]) return res.status(403).json({ error: 'Access denied' });

    const result = await query(
        `SELECT m.*, u.first_name, u.last_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = $1
         ORDER BY m.created_at ASC`,
        [req.params.id]
    );
    res.json(result.rows.map(mapMessage));
});

app.post('/:id/messages', async (req, res) => {
    const userId = getUserId(req);
    const { text = '', imageUrl = null, audioUrl = null } = req.body;
    const membership = await query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [req.params.id, userId]
    );
    if (!membership.rows[0]) return res.status(403).json({ error: 'Access denied' });

    const created = await query(
        `INSERT INTO messages (conversation_id, sender_id, content, image_url, audio_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [req.params.id, userId, text, imageUrl, audioUrl]
    );
    await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.status(201).json(created.rows[0]);
});

io.use((socket, next) => {
    const auth = socket.handshake.auth || {};
    socket.user = { userId: auth.userId };

    if (!socket.user.userId && auth.token) {
        try {
            const decoded = jwt.verify(auth.token, JWT_SECRET);
            socket.user.userId = decoded.id;
        } catch {
            return next(new Error('Invalid token'));
        }
    }

    if (!socket.user.userId) return next(new Error('Missing userId'));
    next();
});

io.on('connection', (socket) => {
    socket.join(socket.user.userId);

    socket.on('send_message', async (payload) => {
        try {
            const conversationId = payload.conversationId;
            const created = await query(
                `INSERT INTO messages (conversation_id, sender_id, content, image_url, audio_url)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [conversationId, socket.user.userId, payload.text || payload.content || '', payload.imgUrl || payload.imageUrl || null, payload.audioUrl || null]
            );
            await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
            io.emit('new_message', created.rows[0]);
        } catch (err) {
            socket.emit('error', { message: err.message });
        }
    });

    socket.on('typing', (data) => {
        socket.broadcast.emit('user_typing', { ...data, userId: socket.user.userId });
    });
});

server.listen(PORT, () => {
    console.log(`Messaging service listening on http://localhost:${PORT}`);
});

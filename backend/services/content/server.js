'use strict';

const express = require('express');
const cors = require('cors');
const { query, healthCheck, getUserId, initials } = require('../shared/db');

const app = express();
const PORT = process.env.PORT || 5102;

app.use(cors());
app.use(express.json());

function relativeLabel(date) {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${Math.floor(hours / 24)} jour(s)`;
}

function mapPost(row) {
    return {
        id: row.id,
        author: {
            id: row.author_id,
            name: `${row.first_name} ${row.last_name}`,
            initials: initials(row.first_name, row.last_name),
            avatarUrl: row.avatar_url,
        },
        content: row.content,
        type: row.type,
        imageUrl: row.image_url,
        likes: row.likes_count || 0,
        comments: row.comments_count || 0,
        liked: Boolean(row.liked),
        createdAt: relativeLabel(row.created_at),
    };
}

function mapEvent(row) {
    const starts = new Date(row.starts_at);
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        location: row.location,
        startsAt: row.starts_at,
        day: String(starts.getDate()).padStart(2, '0'),
        month: starts.toLocaleString('fr-FR', { month: 'short' }).toUpperCase(),
        attendees: row.attendees_count || 0,
        joined: Boolean(row.joined),
    };
}

app.get('/health', async (_req, res) => {
    try {
        await healthCheck();
        res.json({ service: 'ContentService', status: 'UP', database: 'UP' });
    } catch (err) {
        res.status(503).json({ service: 'ContentService', status: 'DOWN', error: err.message });
    }
});

async function fetchPosts(userId, mineOnly = false) {
    const result = await query(
        `SELECT p.*, u.first_name, u.last_name, u.avatar_url,
                COUNT(DISTINCT pl.user_id)::int AS likes_count,
                COUNT(DISTINCT c.id)::int AS comments_count,
                BOOL_OR(pl.user_id = $1) AS liked
         FROM posts p
         JOIN users u ON u.id = p.author_id
         LEFT JOIN post_likes pl ON pl.post_id = p.id
         LEFT JOIN comments c ON c.post_id = p.id
         WHERE ($2::boolean = false OR p.author_id = $1)
         GROUP BY p.id, u.first_name, u.last_name, u.avatar_url
         ORDER BY p.created_at DESC`,
        [userId, mineOnly]
    );
    return result.rows.map(mapPost);
}

app.get('/posts', async (req, res) => {
    res.json(await fetchPosts(getUserId(req), false));
});

app.get('/posts/me', async (req, res) => {
    res.json(await fetchPosts(getUserId(req), true));
});

app.post('/posts', async (req, res) => {
    const userId = getUserId(req);
    const { content = '', type = 'general', imageUrl = null } = req.body;
    if (!content && !imageUrl) return res.status(400).json({ error: 'Post content or imageUrl is required' });

    const created = await query(
        'INSERT INTO posts (author_id, content, type, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, content, type, imageUrl]
    );
    const posts = await fetchPosts(userId, false);
    res.status(201).json(posts.find(post => post.id === created.rows[0].id));
});

app.post('/posts/:id/like', async (req, res) => {
    const userId = getUserId(req);
    const { id } = req.params;
    const existing = await query('SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2', [id, userId]);

    if (existing.rows[0]) {
        await query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [id, userId]);
    } else {
        await query('INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)', [id, userId]);
    }

    const count = await query('SELECT COUNT(*)::int AS likes FROM post_likes WHERE post_id = $1', [id]);
    res.json({ liked: !existing.rows[0], likes: count.rows[0].likes });
});

app.get('/posts/:id/comments', async (req, res) => {
    const result = await query(
        `SELECT c.id, c.content, c.created_at, u.first_name, u.last_name
         FROM comments c
         JOIN users u ON u.id = c.author_id
         WHERE c.post_id = $1
         ORDER BY c.created_at ASC`,
        [req.params.id]
    );

    res.json(result.rows.map(row => ({
        id: row.id,
        content: row.content,
        author: {
            name: `${row.first_name} ${row.last_name}`,
            initials: initials(row.first_name, row.last_name),
        },
        createdAt: relativeLabel(row.created_at),
    })));
});

app.post('/posts/:id/comments', async (req, res) => {
    const userId = getUserId(req);
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Comment content is required' });

    const created = await query(
        `INSERT INTO comments (post_id, author_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [req.params.id, userId, content.trim()]
    );

    const author = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    res.status(201).json({
        id: created.rows[0].id,
        content: created.rows[0].content,
        author: {
            name: `${author.rows[0].first_name} ${author.rows[0].last_name}`,
            initials: initials(author.rows[0].first_name, author.rows[0].last_name),
        },
        createdAt: relativeLabel(created.rows[0].created_at),
    });
});

app.get('/events', async (req, res) => {
    const userId = getUserId(req);
    const category = req.query.category || 'all';
    const result = await query(
        `SELECT e.*,
                COUNT(ea.user_id)::int AS attendees_count,
                BOOL_OR(ea.user_id = $1) AS joined
         FROM events e
         LEFT JOIN event_attendees ea ON ea.event_id = e.id
         WHERE ($2 = 'all' OR e.category = $2)
         GROUP BY e.id
         ORDER BY e.starts_at ASC`,
        [userId, category]
    );
    res.json(result.rows.map(mapEvent));
});

app.get('/events/upcoming', async (req, res) => {
    const userId = getUserId(req);
    const result = await query(
        `SELECT e.*,
                COUNT(ea.user_id)::int AS attendees_count,
                BOOL_OR(ea.user_id = $1) AS joined
         FROM events e
         LEFT JOIN event_attendees ea ON ea.event_id = e.id
         WHERE e.starts_at >= NOW()
         GROUP BY e.id
         ORDER BY e.starts_at ASC
         LIMIT 5`,
        [userId]
    );
    res.json(result.rows.map(mapEvent));
});

app.post('/events', async (req, res) => {
    const userId = getUserId(req);
    const {
        title,
        description = '',
        category = 'evenement',
        location = 'Campus',
        startsAt,
    } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Event title is required' });
    if (!startsAt) return res.status(400).json({ error: 'Event start date is required' });

    const created = await query(
        `INSERT INTO events (created_by, title, description, category, location, starts_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, title.trim(), description, category, location, startsAt]
    );

    const joined = await query(
        `SELECT e.*,
                COUNT(ea.user_id)::int AS attendees_count,
                BOOL_OR(ea.user_id = $1) AS joined
         FROM events e
         LEFT JOIN event_attendees ea ON ea.event_id = e.id
         WHERE e.id = $2
         GROUP BY e.id`,
        [userId, created.rows[0].id]
    );
    res.status(201).json(mapEvent(joined.rows[0]));
});

app.post('/events/:id/join', async (req, res) => {
    const userId = getUserId(req);
    const { id } = req.params;
    await query(
        'INSERT INTO event_attendees (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, userId]
    );
    await query(
        `INSERT INTO notifications (user_id, type, title, body, related_id)
         VALUES ($1, 'event', 'Inscription evenement', 'Votre participation a ete enregistree.', $2)`,
        [userId, id]
    );
    res.status(201).json({ joined: true });
});

app.get('/notifications', async (req, res) => {
    const result = await query(
        `SELECT id, type, title, body, related_id AS "relatedId", is_read AS "isRead", created_at AS "createdAt"
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [getUserId(req)]
    );
    res.json(result.rows);
});

app.patch('/notifications/:id/read', async (req, res) => {
    await query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, getUserId(req)]);
    res.json({ read: true });
});

app.delete('/notifications/:id', async (req, res) => {
    await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, getUserId(req)]);
    res.json({ deleted: true });
});

app.get('/search', async (req, res) => {
    const q = `%${String(req.query.q || '').trim()}%`;
    const type = String(req.query.type || 'all');
    if (q.length < 4) return res.json([]);

    const [users, posts, events] = await Promise.all([
        type === 'all' || type === 'user'
            ? query(`SELECT id, first_name, last_name, major FROM users WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR major ILIKE $1 LIMIT 10`, [q])
            : Promise.resolve({ rows: [] }),
        type === 'all' || type === 'post'
            ? query(`SELECT id, content, type FROM posts WHERE content ILIKE $1 LIMIT 10`, [q])
            : Promise.resolve({ rows: [] }),
        type === 'all' || type === 'event'
            ? query(`SELECT id, title, description, category FROM events WHERE title ILIKE $1 OR description ILIKE $1 LIMIT 10`, [q])
            : Promise.resolve({ rows: [] }),
    ]);

    res.json([
        ...users.rows.map(u => ({ type: 'user', id: u.id, title: `${u.first_name} ${u.last_name}`, subtitle: u.major })),
        ...posts.rows.map(p => ({ type: 'post', id: p.id, title: p.content.slice(0, 80), subtitle: p.type })),
        ...events.rows.map(e => ({ type: 'event', id: e.id, title: e.title, subtitle: e.category, description: e.description })),
    ]);
});

app.listen(PORT, () => {
    console.log(`Content service listening on http://localhost:${PORT}`);
});

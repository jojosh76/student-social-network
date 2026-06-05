'use strict';

const express = require('express');
const cors = require('cors');
const { query, healthCheck, getUserId, initials } = require('../shared/db');

const app = express();
const PORT = process.env.PORT || 5103;

app.use(cors());
app.use(express.json());

function mapUser(row) {
    return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        name: `${row.first_name} ${row.last_name}`,
        email: row.email,
        major: row.major,
        academicInfo: { major: row.major, year: row.academic_year },
        bio: row.bio,
        avatarUrl: row.avatar_url,
        initials: initials(row.first_name, row.last_name),
        isOnline: row.is_online,
        postsCount: row.posts_count || 0,
        friendsCount: row.friends_count || 0,
        createdAt: row.created_at,
    };
}

app.get('/health', async (_req, res) => {
    try {
        await healthCheck();
        res.json({ service: 'UserService', status: 'UP', database: 'UP' });
    } catch (err) {
        res.status(503).json({ service: 'UserService', status: 'DOWN', error: err.message });
    }
});

app.get('/me', async (req, res) => {
    const userId = getUserId(req);
    const result = await query(
        `SELECT u.*,
                (SELECT COUNT(*)::int FROM posts p WHERE p.author_id = u.id) AS posts_count,
                (SELECT COUNT(*)::int FROM follows f WHERE f.follower_id = u.id) AS friends_count
         FROM users u WHERE u.id = $1`,
        [userId]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(mapUser(result.rows[0]));
});

app.get('/online', async (_req, res) => {
    const result = await query(
        `SELECT * FROM users
         WHERE is_online = true
         ORDER BY updated_at DESC
         LIMIT 12`
    );
    res.json(result.rows.map(mapUser));
});

app.get('/', async (_req, res) => {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows.map(mapUser));
});

app.get('/friends', async (req, res) => {
    const userId = getUserId(req);
    const result = await query(
        `SELECT u.*
         FROM follows f
         JOIN users u ON u.id = f.following_id
         WHERE f.follower_id = $1
         ORDER BY u.first_name, u.last_name`,
        [userId]
    );
    res.json(result.rows.map(mapUser));
});

app.post('/:id/follow', async (req, res) => {
    const userId = getUserId(req);
    const followedId = req.params.id;

    if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifie' });
    if (userId === followedId) return res.status(400).json({ error: 'Tu ne peux pas t ajouter toi-meme.' });

    const found = await query('SELECT id FROM users WHERE id = $1', [followedId]);
    if (!found.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });

    await query(
        `INSERT INTO follows (follower_id, following_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, followedId]
    );

    res.status(201).json({ following: true, userId: followedId });
});

app.patch('/update-avatar', async (req, res) => {
    const userId = getUserId(req);
    const { avatarUrl } = req.body;
    if (!avatarUrl) return res.status(400).json({ error: 'avatarUrl is required' });

    const result = await query(
        'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [avatarUrl, userId]
    );
    res.json(mapUser(result.rows[0]));
});

app.patch('/me', async (req, res) => {
    const userId = getUserId(req);
    const { bio, major, academicYear } = req.body;
    const result = await query(
        `UPDATE users
         SET bio = COALESCE($1, bio),
             major = COALESCE($2, major),
             academic_year = COALESCE($3, academic_year),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [bio, major, academicYear, userId]
    );
    res.json(mapUser(result.rows[0]));
});

app.listen(PORT, () => {
    console.log(`User service listening on http://localhost:${PORT}`);
});

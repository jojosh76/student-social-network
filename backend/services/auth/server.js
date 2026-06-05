'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { query, healthCheck, getUserId, initials } = require('../shared/db');

const app = express();
const PORT = process.env.PORT || 5100;
const JWT_SECRET = process.env.JWT_SECRET || 'studnet_secret_key';

app.use(cors());
app.use(express.json());

function publicUser(row) {
    return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        major: row.major,
        academicInfo: { major: row.major, year: row.academic_year },
        avatarUrl: row.avatar_url,
        initials: initials(row.first_name, row.last_name),
        createdAt: row.created_at,
    };
}

function signToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: 'student' },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

app.get('/health', async (_req, res) => {
    try {
        await healthCheck();
        res.json({ service: 'AuthService', status: 'UP', database: 'UP' });
    } catch (err) {
        res.status(503).json({ service: 'AuthService', status: 'DOWN', error: err.message });
    }
});

app.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, academicInfo = {}, credentials = {} } = req.body;
        const { email, password } = credentials;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'firstName, lastName, email and password are required.' });
        }
        if (!normalizedEmail.endsWith('@ictuniversity.edu.cm')) {
            return res.status(400).json({ error: 'Utilise ton email academique @ictuniversity.edu.cm' });
        }
        if (!strongPassword.test(password)) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir 6 caracteres, une majuscule, un chiffre et un symbole.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const created = await query(
            `INSERT INTO users (first_name, last_name, email, password_hash, major, academic_year)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [firstName, lastName, normalizedEmail, passwordHash, academicInfo.major || null, academicInfo.year || 'L3']
        );

        const user = publicUser(created.rows[0]);
        const token = signToken(user);

        res.status(201).json({ message: 'Inscription reussie', token, user });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Cet email est deja utilise' });
        }
        res.status(500).json({ error: 'Erreur serveur', details: err.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const found = await query('SELECT * FROM users WHERE email = $1', [String(email || '').toLowerCase()]);
        const userRow = found.rows[0];

        if (!userRow || !(await bcrypt.compare(password || '', userRow.password_hash))) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        await query('UPDATE users SET is_online = true, updated_at = NOW() WHERE id = $1', [userRow.id]);
        const user = publicUser({ ...userRow, is_online: true });

        res.json({ token: signToken(user), user });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur', details: err.message });
    }
});

app.get('/me', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Utilisateur non authentifie' });

        const found = await query(
            `SELECT u.*,
                    (SELECT COUNT(*)::int FROM posts p WHERE p.author_id = u.id) AS posts_count,
                    (SELECT COUNT(*)::int FROM follows f WHERE f.follower_id = u.id) AS friends_count
             FROM users u WHERE u.id = $1`,
            [userId]
        );

        if (!found.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
        const user = publicUser(found.rows[0]);
        user.postsCount = found.rows[0].posts_count;
        user.friendsCount = found.rows[0].friends_count;
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur', details: err.message });
    }
});

app.post('/logout', async (req, res) => {
    const userId = getUserId(req);
    if (userId) await query('UPDATE users SET is_online = false, updated_at = NOW() WHERE id = $1', [userId]);
    res.json({ message: 'Deconnexion reussie' });
});

app.listen(PORT, () => {
    console.log(`Auth service listening on http://localhost:${PORT}`);
});

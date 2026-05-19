/**
 * STUDNET — AUTH SERVICE (Microservice)
 * Port : 5000
 */

'use strict';
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'studnet_secret_key'; // À mettre dans .env en prod

app.use(cors());
app.use(express.json());

// Simulation base de données (à remplacer par MongoDB/PostgreSQL plus tard)
const users = [];

// Health Check
app.get('/health', (req, res) => {
    res.json({ service: 'AuthService', status: 'UP' });
});

// REGISTER
app.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, academicInfo, credentials } = req.body;
        const { email, password } = credentials;

        // Vérifier si l'utilisateur existe déjà
        if (users.find(u => u.email === email)) {
            return res.status(409).json({ error: "Cet email est déjà utilisé" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: Date.now().toString(),
            firstName,
            lastName,
            email,
            major: academicInfo.major,
            password: hashedPassword,
            createdAt: new Date()
        };

        users.push(newUser);

        res.status(201).json({ 
            message: "Inscription réussie",
            user: { id: newUser.id, firstName, lastName, email, major: newUser.major }
        });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// LOGIN
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.find(u => u.email === email);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Email ou mot de passe incorrect" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: 'student' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.listen(PORT, () => {
    console.log(`\n✅ AUTH SERVICE démarré sur http://localhost:${PORT}`);
});
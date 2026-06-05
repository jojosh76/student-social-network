'use strict';

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query, healthCheck, getUserId } = require('../shared/db');

const app = express();
const PORT = process.env.PORT || 5106;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(cors());
app.use('/files', express.static(uploadDir));

app.get('/health', async (_req, res) => {
    try {
        await healthCheck();
        res.json({ service: 'FileService', status: 'UP', database: 'UP', storage: uploadDir });
    } catch (err) {
        res.status(503).json({ service: 'FileService', status: 'DOWN', error: err.message });
    }
});

app.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const url = `${PUBLIC_BASE_URL}/files/${req.file.filename}`;
    const created = await query(
        `INSERT INTO files (owner_id, original_name, stored_name, url, mime_type, size_bytes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, url, original_name AS "originalName", mime_type AS "mimeType", size_bytes AS "sizeBytes", created_at AS "createdAt"`,
        [getUserId(req), req.file.originalname, req.file.filename, url, req.file.mimetype, req.file.size]
    );

    res.status(201).json(created.rows[0]);
});

app.get('/', async (req, res) => {
    const result = await query(
        `SELECT id, url, original_name AS "originalName", mime_type AS "mimeType", size_bytes AS "sizeBytes", created_at AS "createdAt"
         FROM files
         WHERE owner_id = $1
         ORDER BY created_at DESC`,
        [getUserId(req)]
    );
    res.json(result.rows);
});

app.listen(PORT, () => {
    console.log(`File service listening on http://localhost:${PORT}`);
});

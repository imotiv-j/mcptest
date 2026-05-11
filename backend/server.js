const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Your GitHub token (keep this secret!)
const GITHUB_TOKEN = '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';   // ← Change this
const REPO_OWNER = 'imotiv-j';
const REPO_NAME = 'mcptest';
const BRANCH = 'main';

app.get('/api/files', async (req, res) => {
    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/uploads?ref=${BRANCH}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/upload', async (req, res) => {
    try {
        const { path, content, message } = req.body;
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message || `Upload via proxy`,
                content: content,
                branch: BRANCH
            })
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`🌐 Open the forwarded Codespaces URL (port 3000)`);
});

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set to true in production with HTTPS
}));

// Config from .env
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'imotiv-j';
const REPO_NAME = 'mcptest';
const BRANCH = 'main';

// GitHub OAuth Login
app.get('/auth/github', (req, res) => {
  const redirectUri = `mcptest-production-ee5e.up.railway.app/auth/github/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user`;
  res.redirect(githubAuthUrl);
});

app.get('/auth/github/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code provided');

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code
      })
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const userResponse = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${accessToken}` }
    });
    const user = await userResponse.json();

    req.session.user = user;
    res.redirect('/');
  } catch (error) {
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/user', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// File APIs (Protected)
app.get('/api/files', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

  const username = req.session.user.login;
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/uploads/${username}?ref=${BRANCH}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.status === 404) {
      return res.json([]);
    }

    const files = await response.json();
    res.json(Array.isArray(files) ? files : []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

  const { path, content, message } = req.body;
  const username = req.session.user.login;

  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message || `Upload by ${username}`,
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

app.delete('/api/delete', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

  const { path, sha } = req.body;
  const username = req.session.user.login;

  // Safety check: only allow deleting from the user's own folder
  if (!path.startsWith(`uploads/${username}/`)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Delete ${path} by ${username}`,
        sha: sha,
        branch: BRANCH
      })
    });

    if (response.ok) {
      res.json({ success: true });
    } else {
      const err = await response.json();
      res.status(response.status).json({ error: err.message });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('🌐 Open the Codespaces forwarded URL for port 3000');
});

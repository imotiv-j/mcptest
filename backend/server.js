const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// TODO: Replace with your actual GitHub token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN_HERE';
const REPO_OWNER = 'imotiv-j';
const REPO_NAME = 'mcptest';
const BRANCH = 'main';

app.get('/api/files', async (req, res) => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/uploads?ref=${BRANCH}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    if (!response.ok) {
      if (response.status === 404) return res.json([]);
      throw new Error('GitHub API error');
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', async (req, res) => {
  try {
    const { path: filePath, content, message } = req.body;

    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`,
      {
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
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('Make sure to set GITHUB_TOKEN environment variable!');
});

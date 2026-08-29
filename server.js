require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.warn('WARNING: ANTHROPIC_API_KEY is not set. Requests to /api/generate will fail.');
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `You are an application generator. Given a short natural-language description, output ONE complete, self-contained, working HTML file that implements the requested web app. Requirements: inline all CSS in a <style> tag and all JS in a <script> tag (no external dependencies except Google Fonts if desired), make it visually polished and fully functional (not a mockup), use vanilla JavaScript only, ensure it works when loaded via srcdoc in an iframe (no relative asset paths). Output ONLY the raw HTML code — no markdown code fences, no explanation, no preamble, no commentary before or after.`;

app.post('/api/generate', async (req, res) => {
  const prompt = (req.body && req.body.prompt || '').trim();

  if (!prompt) {
    return res.status(400).json({ error: 'Missing "prompt" in request body.' });
  }
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: 'Build this app: ' + prompt }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return res.status(502).json({ error: 'Upstream API error (status ' + response.status + ')' });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');

    if (!textBlock || !textBlock.text) {
      return res.status(502).json({ error: 'No content returned from model.' });
    }

    res.json({ html: textBlock.text });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`AI 101 app generator running at http://localhost:${PORT}`);
});

// Lightweight AI proxy server to call OpenAI-compatible API without exposing key to the client.
// Usage:
//   1) Set environment variables:
//      AI_API_BASE=https://api.openai.com/v1   (or another OpenAI-compatible base)
//      AI_API_KEY=sk-...                        (your API key)
//      AI_MODEL=gpt-4o-mini                     (or gpt-4o, gpt-3.5-turbo, etc.)
//   2) Run: npm run server
//   3) Client calls POST http://localhost:8787/api/reframe or /api/chat

import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 8787;
const AI_API_BASE = process.env.AI_API_BASE || 'https://api.openai.com/v1';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

function send(res, status, data, headers={}) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', ...headers });
  res.end(JSON.stringify(data));
}

async function callChat(prompt, system) {
  if (!AI_API_KEY) throw new Error('Missing AI_API_KEY');
  const body = {
    model: AI_MODEL,
    messages: [
      { role: 'system', content: system || 'You are a supportive CBT-informed therapist assistant. Be concise, safe, and practical.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7
  };
  const resp = await fetch(`${AI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_API_KEY}` },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI error ${resp.status}: ${text}`);
  }
  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content || '';
  return content.trim();
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'POST' && url.pathname === '/api/reframe') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { thought } = JSON.parse(body || '{}');
          if (!thought || typeof thought !== 'string') return send(res, 400, { error: 'Invalid thought' });
          const system = 'You are a CBT therapist. Return: 1) A kind, balanced reframe of the user thought. 2) One small actionable step. Be concise.';
          const content = await callChat(`Thought: ${thought}\nReframe + Action:`, system);
          send(res, 200, { reframe: content });
        } catch (e) {
          send(res, 500, { error: e.message });
        }
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { history, prompt, persona } = JSON.parse(body || '{}');
          const system = persona === 'coach'
            ? 'You are a recovery coach. Give short, practical, motivating steps.'
            : persona === 'mindful'
              ? 'You are a mindfulness guide. Encourage grounding and present awareness.'
              : 'You are a CBT-informed therapist assistant. Be supportive and safe.';
          const stitched = (history || []).slice(-6).map(m => `${m.role}: ${m.text}`).join('\n');
          const content = await callChat(`${stitched}\nUser: ${prompt}`, system);
          send(res, 200, { reply: content });
        } catch (e) {
          send(res, 500, { error: e.message });
        }
      });
      return;
    }

    // Thought Record Analysis
    if (req.method === 'POST' && url.pathname === '/api/thought-record') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { thought, mood, context } = JSON.parse(body || '{}');
          if (!thought || typeof thought !== 'string') {
            return send(res, 400, { error: 'Invalid thought' });
          }
          
          const system = `You are a skilled CBT therapist. Analyze the following thought using cognitive behavioral therapy techniques.
          
          For the thought: "${thought}"
          
          Provide a JSON response with the following structure:
          {
            "cognitiveDistortions": ["list", "of", "identified", "distortions"],
            "challenge": "A kind challenge to the thought using Socratic questioning",
            "reframe": "A balanced, evidence-based reframe of the thought",
            "actionStep": "One small, actionable step to address this thought"
          }`;
          
          const response = await callChat(thought, system);
          
          try {
            // Try to parse the response as JSON
            const parsedResponse = JSON.parse(response);
            send(res, 200, parsedResponse);
          } catch (e) {
            // If JSON parsing fails, wrap the response in a generic structure
            send(res, 200, {
              cognitiveDistortions: [],
              challenge: "Let's examine the evidence for and against this thought.",
              reframe: response,
              actionStep: "Consider writing down evidence that supports and contradicts this thought."
            });
          }
        } catch (e) {
          console.error('Error in thought record analysis:', e);
          send(res, 500, { 
            error: 'Failed to analyze thought',
            details: e.message 
          });
        }
      });
      return;
    }

    // Health check
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return send(res, 200, { 
        ok: true, 
        model: AI_MODEL,
        endpoints: ['/api/reframe', '/api/chat', '/api/thought-record']
      });
    }

    send(res, 404, { error: 'Not found' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`AI server running on http://localhost:${PORT}`);
});


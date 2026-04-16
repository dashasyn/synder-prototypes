const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const REPORTS_DIR = __dirname;
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.md': 'text/markdown', '.txt': 'text/plain',
};

function sendJSON(res, obj, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => resolve(body));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // API: Save
  const saveMatch = pathname.match(/^\/api\/save\/(.+)$/);
  if (saveMatch && req.method === 'POST') {
    const reportId = saveMatch[1];
    const body = JSON.parse(await readBody(req));
    const filePath = path.join(DATA_DIR, `${reportId}.json`);
    
    const data = { reportId, approved: body.approved || {}, meta: body.meta || {}, updatedAt: new Date().toISOString(), history: [] };
    if (fs.existsSync(filePath)) {
      try {
        const prev = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        data.history = (prev.history || []).slice(0, 50);
        data.history.unshift({ timestamp: prev.updatedAt, changeCount: Object.keys(prev.approved || {}).length });
      } catch (e) {}
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return sendJSON(res, { ok: true, updatedAt: data.updatedAt });
  }

  // API: Load
  const loadMatch = pathname.match(/^\/api\/load\/(.+)$/);
  if (loadMatch && req.method === 'GET') {
    const reportId = loadMatch[1];
    const filePath = path.join(DATA_DIR, `${reportId}.json`);
    if (fs.existsSync(filePath)) {
      return sendJSON(res, JSON.parse(fs.readFileSync(filePath, 'utf8')));
    }
    return sendJSON(res, { reportId, approved: {}, meta: {}, updatedAt: null });
  }

  // API: Export
  const exportMatch = pathname.match(/^\/api\/export\/(.+)$/);
  if (exportMatch && req.method === 'GET') {
    const reportId = exportMatch[1];
    const filePath = path.join(DATA_DIR, `${reportId}.json`);
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('No saved data'); return; }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let md = `# Approved Copy — ${reportId}\nUpdated: ${data.updatedAt}\n\n`;
    for (const [key, val] of Object.entries(data.approved || {})) {
      if (val && val.trim()) md += `## ${key}\n${val}\n\n`;
    }
    res.writeHead(200, { 'Content-Type': 'text/markdown', 'Content-Disposition': `attachment; filename="${reportId}-approved.md"` });
    res.end(md);
    return;
  }

  // API: Generate Options (returns 3 variants with one recommended)
  if (pathname === '/api/generate-options' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const { pageName, field, currentValue, context } = body;

      const fieldDescriptions = {
        header: 'benefit-oriented header (4-8 words)',
        description: '1-2 sentence description explaining what the page does and why the user should care',
        cta: 'CTA button label (2-5 words)',
        trustLine: 'reassurance/trust line (one sentence) that addresses the user\'s fear about clicking the CTA'
      };

      const desc = fieldDescriptions[field];
      if (!desc) return sendJSON(res, { error: 'Unknown field' }, 400);

      const prompt = `You are a UX copywriter for Synder, an accounting/ecommerce SaaS platform.

Generate 3 options for a ${desc} for the empty state on the "${pageName}" page.
${context ? 'Page context: ' + context : ''}
${currentValue ? 'Current copy (generate DIFFERENT options): "' + currentValue + '"' : ''}

For each option, provide:
- The copy text
- A short reason why this angle works (1 sentence)

Mark the best option as recommended.

Output as JSON array, nothing else:
[{"text":"...","reason":"...","recommended":true/false},{"text":"...","reason":"...","recommended":false},{"text":"...","reason":"...","recommended":false}]`;

      let apiKey;
      try {
        const authFile = fs.readFileSync('/home/ubuntu/.openclaw/agents/main/agent/auth-profiles.json', 'utf8');
        const auth = JSON.parse(authFile);
        const profile = Object.values(auth.profiles).find(p => p.provider === 'anthropic');
        apiKey = profile?.token;
      } catch(e) {}
      if (!apiKey) return sendJSON(res, { error: 'No API key found' }, 500);

      const apiBody = JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      });

      const apiReq = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(apiBody)
        },
        timeout: 30000
      }, (apiRes) => {
        let data = '';
        apiRes.on('data', c => data += c);
        apiRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) return sendJSON(res, { error: parsed.error.message || 'API error' }, 500);
            const text = parsed.content?.[0]?.text || '';
            // Extract JSON array from response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const options = JSON.parse(jsonMatch[0]);
              return sendJSON(res, { options });
            }
            return sendJSON(res, { error: 'Failed to parse options' }, 500);
          } catch(e) {
            console.error('Options parse error:', e.message);
            return sendJSON(res, { error: 'Failed to parse options' }, 500);
          }
        });
      });
      apiReq.on('error', (e) => sendJSON(res, { error: e.message }, 500));
      apiReq.on('timeout', () => { apiReq.destroy(); sendJSON(res, { error: 'Timed out' }, 504); });
      apiReq.write(apiBody);
      apiReq.end();
    } catch (e) {
      return sendJSON(res, { error: e.message }, 500);
    }
    return;
  }

  // API: Regenerate (AI-powered — single result)
  if (pathname === '/api/regenerate' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const { pageName, field, currentValue, context } = body;

      const fieldPrompts = {
        illustrationPrompt: `Write an illustration prompt for a designer. The illustration is for an empty state on the "${pageName}" page in Synder (accounting/ecommerce SaaS). Style: minimalist line-art, blue monochrome, 80x80px icon. Current prompt was: "${currentValue}". Give a DIFFERENT creative direction. Output ONLY the prompt, nothing else.`,
        header: `Write a short benefit-oriented header (4-8 words) for an empty state on the "${pageName}" page in Synder (accounting/ecommerce SaaS). ${context ? 'Page context: ' + context : ''} Current header was: "${currentValue}". Give a DIFFERENT angle. Output ONLY the header text, no quotes.`,
        description: `Write a 1-2 sentence description for an empty state on the "${pageName}" page in Synder (accounting/ecommerce SaaS). Explain what the page does and why the user should care. ${context ? 'Page context: ' + context : ''} Current description was: "${currentValue}". Give a DIFFERENT angle. Output ONLY the description, no quotes.`,
        cta: `Write a short CTA button label (2-5 words) for an empty state on the "${pageName}" page in Synder (accounting/ecommerce SaaS). ${context ? 'Page context: ' + context : ''} Current CTA was: "${currentValue}". Give a DIFFERENT option. Output ONLY the button text, no quotes.`,
        trustLine: `Write a short reassurance/trust line (one sentence) for an empty state on the "${pageName}" page in Synder (accounting/ecommerce SaaS). It should address the user's fear about clicking the CTA. ${context ? 'Page context: ' + context : ''} Current trust line was: "${currentValue}". Give a DIFFERENT angle. Output ONLY the line, no quotes.`,
        faq: `Write one FAQ item (question + answer) for an empty state on the "${pageName}" page in Synder (accounting/ecommerce SaaS). ${context ? 'Page context: ' + context : ''} The answer should be 1-3 sentences, helpful for a new user. Also explain what user problem or confusion this FAQ solves. Output as JSON: {"q":"...","a":"...","rationale":"..."} — nothing else.`
      };

      const prompt = fieldPrompts[field];
      if (!prompt) return sendJSON(res, { error: 'Unknown field' }, 400);

      // Read Anthropic API key from auth profiles
      let apiKey;
      try {
        const authFile = fs.readFileSync('/home/ubuntu/.openclaw/agents/main/agent/auth-profiles.json', 'utf8');
        const auth = JSON.parse(authFile);
        const profile = Object.values(auth.profiles).find(p => p.provider === 'anthropic');
        apiKey = profile?.token;
      } catch(e) {}
      if (!apiKey) return sendJSON(res, { error: 'No API key found' }, 500);

      const apiBody = JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      });
      console.log('Calling Anthropic API, model: claude-sonnet-4-20250514, prompt length:', prompt.length, 'body length:', apiBody.length);

      const apiReq = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(apiBody)
        },
        timeout: 30000
      }, (apiRes) => {
        let data = '';
        apiRes.on('data', c => data += c);
        apiRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) { console.error('API error:', JSON.stringify(parsed.error)); return sendJSON(res, { error: parsed.error.message || JSON.stringify(parsed.error) }, 500); }
            const result = parsed.content?.[0]?.text || '';
            return sendJSON(res, { result: result.trim() });
          } catch(e) {
            console.error('Parse error:', e.message, 'raw:', data.substring(0, 200));
            return sendJSON(res, { error: 'Failed to parse API response' }, 500);
          }
        });
      });
      apiReq.on('error', (e) => sendJSON(res, { error: 'API request failed: ' + e.message }, 500));
      apiReq.on('timeout', () => { apiReq.destroy(); sendJSON(res, { error: 'Generation timed out' }, 504); });
      apiReq.write(apiBody);
      apiReq.end();
    } catch (e) {
      console.error('Regenerate catch:', e.message, e.stack);
      return sendJSON(res, { error: e.message }, 500);
    }
    return;
  }

  // ─── FIGMA PLUGIN BRIDGE ────────────────────────────────────
  // Command queue: Dasha sends commands, plugin polls for them, executes, sends results back
  
  if (pathname === '/api/figma/ping' && req.method === 'GET') {
    return sendJSON(res, { ok: true, time: Date.now(), pending: global.__figmaQueue?.length || 0 });
  }
  
  if (pathname === '/api/figma/poll' && req.method === 'POST') {
    if (!global.__figmaQueue) global.__figmaQueue = [];
    const cmd = global.__figmaQueue.shift();
    if (cmd) return sendJSON(res, cmd);
    return sendJSON(res, { noop: true });
  }
  
  if (pathname === '/api/figma/result' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    if (!global.__figmaResults) global.__figmaResults = {};
    global.__figmaResults[body.requestId] = body.result;
    return sendJSON(res, { ok: true });
  }
  
  if (pathname === '/api/figma/send' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const requestId = 'req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    if (!global.__figmaQueue) global.__figmaQueue = [];
    if (!global.__figmaResults) global.__figmaResults = {};
    global.__figmaQueue.push({ cmd: body.cmd, args: body.args || {}, requestId });
    const timeout = body.timeout || 30000;
    const start = Date.now();
    const result = await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (global.__figmaResults[requestId] !== undefined) {
          clearInterval(interval);
          const r = global.__figmaResults[requestId];
          delete global.__figmaResults[requestId];
          resolve(r);
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          resolve({ error: 'Timeout waiting for plugin response' });
        }
      }, 200);
    });
    return sendJSON(res, { requestId, result });
  }
  
  if (pathname === '/api/figma/status' && req.method === 'GET') {
    return sendJSON(res, { queueLength: global.__figmaQueue?.length || 0, pendingResults: Object.keys(global.__figmaResults || {}).length });
  }

  // API: Help Search (AI-powered)
  if (pathname === '/api/help-search' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const { question } = body;
      if (!question || question.trim().length < 3) return sendJSON(res, { error: 'Question too short' }, 400);

      // Load KB from disk
      const kbPath = path.join(__dirname, '..', '.synder-state', 'full-kb-min.txt');
      const kb = fs.existsSync(kbPath) ? fs.readFileSync(kbPath, 'utf8') : '';

      // Get API key
      let apiKey;
      try {
        const authFile = fs.readFileSync('/home/ubuntu/.openclaw/agents/main/agent/auth-profiles.json', 'utf8');
        const auth = JSON.parse(authFile);
        const profile = Object.values(auth.profiles).find(p => p.provider === 'anthropic');
        apiKey = profile?.token;
      } catch(e) {}
      if (!apiKey) return sendJSON(res, { error: 'API key not found' }, 500);

      const systemPrompt = `You are the Synder help assistant. You answer questions about the Synder accounting integration product.

Your answers must be:
- PRECISE and specific — include exact field names, tab names, and click paths
- SHORT — 3-6 sentences or numbered steps maximum
- ACTIONABLE — tell the user exactly where to click and what to do
- Based ONLY on the knowledge base provided below

Format:
1. Direct answer (1-2 sentences)
2. Step-by-step path if applicable (numbered steps with exact UI labels)
3. Any important warning or note (optional, 1 sentence)

Always include the exact navigation path like: Settings → [Integration] → Sales → Default → Clearing account dropdown

KNOWLEDGE BASE:
${kb}`;

      const apiBody = JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }]
      });

      const apiReq = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(apiBody)
        },
        timeout: 25000
      }, (apiRes) => {
        let data = '';
        apiRes.on('data', c => data += c);
        apiRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) return sendJSON(res, { error: parsed.error.message }, 500);
            const answer = parsed.content?.[0]?.text || '';

            // Try to extract path line if present
            const pathMatch = answer.match(/Settings\s*[→>]\s*[^\n]+/i) ||
                              answer.match(/Go to[:\s]+([A-Z][^\n.]+)/i);
            const pathLine = pathMatch ? pathMatch[0].replace(/^(Go to[:\s]+)/i, '') : null;

            return sendJSON(res, { answer, path: pathLine });
          } catch(e) {
            return sendJSON(res, { error: 'Parse error' }, 500);
          }
        });
      });
      apiReq.on('error', e => sendJSON(res, { error: 'API error: ' + e.message }, 500));
      apiReq.on('timeout', () => { apiReq.destroy(); sendJSON(res, { error: 'Timed out' }, 504); });
      apiReq.write(apiBody);
      apiReq.end();
    } catch(e) {
      return sendJSON(res, { error: e.message }, 500);
    }
    return;
  }

  // Static files — serve from reports/, projects/, and prototypes/
  const PROJECTS_DIR = path.join(REPORTS_DIR, '..', 'projects');
  const PROTOTYPES_DIR = path.join(REPORTS_DIR, '..', 'prototypes');
  let filePath;
  if (pathname.startsWith('/projects/')) {
    filePath = path.join(PROJECTS_DIR, pathname.replace('/projects/', ''));
    if (!filePath.startsWith(path.resolve(PROJECTS_DIR))) { res.writeHead(403); res.end('Forbidden'); return; }
  } else if (pathname.startsWith('/prototypes/')) {
    filePath = path.join(PROTOTYPES_DIR, pathname.replace('/prototypes/', ''));
    if (!filePath.startsWith(path.resolve(PROTOTYPES_DIR))) { res.writeHead(403); res.end('Forbidden'); return; }
  } else {
    filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(REPORTS_DIR, filePath);
    if (!filePath.startsWith(REPORTS_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
  }
  
  // Directory index.html resolution
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) filePath = indexPath;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📄 Synder UX Tools running at http://0.0.0.0:${PORT}`);
});

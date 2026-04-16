#!/usr/bin/env node
/**
 * Prototype Hub — Public server with basic auth.
 * Run: node server.mjs
 * Env: PROTO_PORT (default 8095), PROTO_USER, PROTO_PASS
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PROTO_PORT || '8095');
const USER = process.env.PROTO_USER || 'synder';
const PASS = process.env.PROTO_PASS || 'ux-review-2026';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function checkAuth(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString();
  const [u, p] = decoded.split(':');
  return u === USER && p === PASS;
}

const server = http.createServer((req, res) => {
  // Basic auth
  if (!checkAuth(req)) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="Synder Prototypes"',
      'Content-Type': 'text/plain'
    });
    res.end('Authentication required');
    return;
  }

  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  
  // Default to hub
  if (urlPath === '/') urlPath = '/hub/index.html';
  if (urlPath === '/hub' || urlPath === '/hub/') urlPath = '/hub/index.html';

  const filePath = path.join(__dirname, urlPath);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    // If directory, try index.html
    let target = filePath;
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      target = path.join(target, 'index.html');
    }
    
    const content = fs.readFileSync(target);
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, { 
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'X-Frame-Options': 'SAMEORIGIN',
    });
    res.end(content);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found: ' + urlPath);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Prototype Hub running at http://0.0.0.0:${PORT}`);
  console.log(`Auth: ${USER} / ${PASS}`);
});

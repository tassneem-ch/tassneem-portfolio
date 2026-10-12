/**
 * Tassneem Cherif portfolio — zero-dependency Node.js static server.
 *
 * Built for Hostinger Node.js web apps (Business / Cloud plans).
 *  - No npm packages, so `npm install` can never fail.
 *  - Serves everything in ./public over HTTP with correct MIME types,
 *    gzip, ETags, cache headers and the same security headers as the
 *    Apache/Netlify/Cloudflare configs.
 *  - Listens on process.env.PORT (set by Hostinger) or 3000 locally.
 *
 * Run:  node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

// Hostinger injects PORT (some environments use HTTP_PORT instead).
// Never read process.env.HOST — platforms often set it to a hostname that
// isn't a valid bind address, which crashes the app at startup.
const PORT = Number(process.env.PORT) || Number(process.env.HTTP_PORT) || 3000;
const ROOT = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.pdf': 'application/pdf',
};

const COMPRESSIBLE = new Set([
  'text/html', 'text/css', 'text/javascript', 'application/javascript',
  'application/json', 'image/svg+xml', 'application/xml', 'text/plain',
]);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '0',
};

function cacheControlFor(relPath, ext) {
  if (relPath.startsWith('assets/') || /\.(woff2?|webp|png|jpe?g|gif|svg|ico)$/i.test(ext)) {
    return 'public, max-age=31536000, immutable';
  }
  if (ext === '.html') return 'no-cache';
  return 'public, max-age=86400';
}

function safeJoin(root, target) {
  const resolved = path.normalize(path.join(root, target));
  return resolved.startsWith(root) ? resolved : null;
}

function send(req, res, status, body, headers) {
  res.writeHead(status, Object.assign({}, SECURITY_HEADERS, headers));
  if (req.method === 'HEAD') res.end();
  else res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(req, res, 405, 'Method Not Allowed', { 'Content-Type': 'text/plain', Allow: 'GET, HEAD' });
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    return send(req, res, 400, 'Bad Request', { 'Content-Type': 'text/plain' });
  }

  if (pathname.endsWith('/')) pathname += 'index.html';

  // Never expose dotfiles (.htaccess, .git, .env, ...).
  if (pathname.split('/').some((seg) => seg.startsWith('.'))) {
    return send(req, res, 404, 'Not Found', { 'Content-Type': 'text/plain' });
  }

  const file = safeJoin(ROOT, pathname);
  if (!file) {
    return send(req, res, 403, 'Forbidden', { 'Content-Type': 'text/plain' });
  }

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      const notFound = path.join(ROOT, '404.html');
      return fs.readFile(notFound, (e2, html) => {
        if (e2) return send(req, res, 404, 'Not Found', { 'Content-Type': 'text/plain' });
        send(req, res, 404, html, { 'Content-Type': MIME['.html'] });
      });
    }

    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const etag = '"' + crypto.createHash('sha1').update(file + '-' + stat.size + '-' + stat.mtimeMs).digest('hex').slice(0, 16) + '"';

    if (req.headers['if-none-match'] === etag) {
      return send(req, res, 304, null, { ETag: etag, 'Cache-Control': cacheControlFor(pathname.slice(1), ext) });
    }

    const baseHeaders = {
      'Content-Type': type,
      ETag: etag,
      'Last-Modified': stat.mtime.toUTCString(),
      'Cache-Control': cacheControlFor(pathname.slice(1), ext),
      Vary: 'Accept-Encoding',
    };

    const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    if (acceptsGzip && COMPRESSIBLE.has(type.split(';')[0].trim()) && stat.size > 1024) {
      baseHeaders['Content-Encoding'] = 'gzip';
      res.writeHead(200, Object.assign({}, SECURITY_HEADERS, baseHeaders));
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(file).pipe(zlib.createGzip({ level: 6 })).pipe(res);
    }

    baseHeaders['Content-Length'] = stat.size;
    res.writeHead(200, Object.assign({}, SECURITY_HEADERS, baseHeaders));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});

// No host argument: Node binds dual-stack (all interfaces, IPv4+IPv6), which
// every reverse proxy can reach. A HOST env var or explicit '0.0.0.0' can break
// that on some platforms.
server.listen(PORT, () => {
  const line = `Portfolio server running on port ${PORT}`;
  console.log(line);
  console.error(line); // Hostinger captures runtime output in stderr.log
});

// Surface any crash reason in stderr.log (Hostinger's runtime log destination)
process.on('uncaughtException', (err) => console.error('uncaughtException:', err));
process.on('unhandledRejection', (err) => console.error('unhandledRejection:', err));

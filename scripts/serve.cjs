const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream');
const { createGzip } = require('node:zlib');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.pdf':'application/pdf', '.woff2':'font/woff2', '.xml':'application/xml', '.txt':'text/plain; charset=utf-8', '.ico':'image/x-icon' };
function createServer(root = path.resolve(__dirname, '..')) {
  root = path.resolve(root);
  return http.createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const parts = pathname.split('/').filter(Boolean);
      if (parts.some(part => part.startsWith('.') || ['node_modules','tmp','backups','scripts','tests','docs'].includes(part))) { res.writeHead(403).end(); return; }
      const file = path.resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
      if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const type = types[path.extname(file).toLowerCase()];
      if (!type) { res.writeHead(403).end(); return; }
      const stat = await fs.promises.stat(file);
      if (!stat.isFile()) { res.writeHead(404).end(); return; }
      const etag = '"' + stat.size + '-' + stat.mtimeMs + '"';
      res.setHeader('Content-Type', type);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('ETag', etag);
      // Revalidate local assets: no stale files while editing.
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Accept-Ranges', 'bytes');
      if (req.headers['if-none-match'] === etag) { res.writeHead(304).end(); return; }
      let start = 0, end = stat.size - 1;
      if (req.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (!match || (!match[1] && !match[2])) { res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size }).end(); return; }
        if (!match[1]) start = Math.max(0, stat.size - Number(match[2]));
        else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
        if (start > end || start >= stat.size) { res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size }).end(); return; }
        res.statusCode = 206;
        res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + stat.size);
      }
      const gzip = !req.headers.range && /gzip/.test(req.headers['accept-encoding'] || '') && /text|json|xml|svg/.test(type);
      res.setHeader('Vary', 'Accept-Encoding');
      if (gzip) res.setHeader('Content-Encoding', 'gzip');
      else res.setHeader('Content-Length', end - start + 1);
      if (req.method === 'HEAD') { res.end(); return; }
      const stream = fs.createReadStream(file, { start, end });
      if (gzip) pipeline(stream, createGzip(), res, () => {});
      else pipeline(stream, res, () => {});
    } catch (_) { if (!res.headersSent) res.writeHead(404); res.end(); }
  });
}
module.exports = { createServer };
if (require.main === module) {
  const port = Number(process.env.PORT || 8000);
  createServer(process.env.SITE_ROOT).listen(port, '127.0.0.1', () => console.log('Portafolio: http://127.0.0.1:' + port));
}

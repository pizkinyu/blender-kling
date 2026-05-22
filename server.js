const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC = path.join(__dirname, 'public');
const ROOT  = __dirname;

const mime = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'text/javascript',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  // Try public/ first, then fall back to root (for video asset)
  let filePath = path.join(PUBLIC, urlPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(ROOT, urlPath);
  }

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC) && !filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = mime[ext] || 'application/octet-stream';

    // Range support for video streaming
    const range = req.headers.range;
    if (range && type.startsWith('video/')) {
      const size = stat.size;
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : size - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range':  `bytes ${start}-${end}/${size}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': chunkSize,
        'Content-Type':   type,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type':   type,
        'Content-Length': stat.size,
        'Accept-Ranges':  'bytes',
        'Cache-Control':  'no-cache',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Blender Kling running at http://localhost:${PORT}`);
});

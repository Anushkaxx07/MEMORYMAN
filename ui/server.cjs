const http = require('http');
const fs = require('fs');
const path = require('path');
const { fetchProcessData, killProcess } = require('./api-handler.cjs');

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // API: Get processes & system stats
  if (url.pathname === '/api/processes') {
    try {
      const data = await fetchProcessData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Kill process
  if (url.pathname === '/api/kill' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { pid } = JSON.parse(body || '{}');
        if (pid === undefined || pid === null) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'PID is required' }));
        }
        const result = await killProcess(pid);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Export CSV
  if (url.pathname === '/api/export') {
    try {
      const data = await fetchProcessData();
      let csv = 'PID,Process Name,Memory (MB)\n';
      for (const p of data.processes) {
        csv += `${p.pid},"${p.name.replace(/"/g, '""')}",${p.memoryMB.toFixed(2)}\n`;
      }
      res.writeHead(200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="sysscope_processes.csv"'
      });
      res.end(csv);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Error generating CSV: ${err.message}`);
    }
    return;
  }

  // Serve static files from dist if built
  if (fs.existsSync(DIST_DIR)) {
    let filePath = path.join(DIST_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
    return;
  }

  // If dist not built yet
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <div style="font-family: sans-serif; padding: 40px; text-align: center; color: #333;">
      <h2>SysScope UI Server</h2>
      <p>API is active at <code>/api/processes</code>.</p>
      <p>To run the React development UI, execute: <code>npm run dev</code> inside the <code>ui/</code> folder.</p>
      <p>Or build the frontend with <code>npm run build</code> to serve it here.</p>
    </div>
  `);
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  SysScope Server listening on http://localhost:${PORT}`);
  console.log(`  API Endpoint: http://localhost:${PORT}/api/processes`);
  console.log(`======================================================\n`);
});

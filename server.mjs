import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

createServer((request, response) => {
  const pathname = request.url?.split('?')[0] || '/';
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const target = normalize(join(root, relativePath));

  if (!target.startsWith(root) || !existsSync(target)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': types[extname(target)] || 'application/octet-stream',
  });
  createReadStream(target).pipe(response);
}).listen(port, () => {
  console.log(`OpsFlow demo available at http://127.0.0.1:${port}`);
});

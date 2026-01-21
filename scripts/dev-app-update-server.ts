/**
 * Local update server for testing electron-updater
 * Serves release-dev/ directory on http://localhost:8080
 *
 * Usage: bun run scripts/update-server.ts
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const PORT = 8080;
const RELEASE_DIR = join(import.meta.dir, '..', 'release-dev');

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const filePath = join(RELEASE_DIR, pathname);

    const file = Bun.file(filePath);
    const exists = await file.exists();

    if (!exists) {
      // If requesting root, list directory contents
      if (pathname === '/index.html') {
        try {
          const files = await readdir(RELEASE_DIR);
          const html = `
<!DOCTYPE html>
<html>
<head><title>Update Server</title></head>
<body>
<h1>Update Server - release-dev/</h1>
<ul>
${files.map((f) => `<li><a href="/${f}">${f}</a></li>`).join('\n')}
</ul>
</body>
</html>`;
          return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
          });
        } catch {
          return new Response('Directory not found', { status: 404 });
        }
      }
      return new Response('Not found', { status: 404 });
    }

    return new Response(file);
  },
});

console.log(`Update server running at http://localhost:${PORT}`);
console.log(`Serving files from: ${RELEASE_DIR}`);
console.log('\nPress Ctrl+C to stop');

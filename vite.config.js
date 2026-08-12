import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { writeAssetManifest } from './scripts/write-asset-manifest.mjs';

// Serve files from ./db/* at /db/* during dev and build, so the React app can
// fetch('/db/rules.json') and fetch('/db/nsw_lga.geojson') directly.
function serveDb() {
  return {
    name: 'serve-db',
    configureServer(server) {
      server.middlewares.use('/db', (req, res, next) => {
        const urlPath = decodeURIComponent(req.url.split('?')[0]);
        const filePath = path.join(process.cwd(), 'db', urlPath);
        if (!filePath.startsWith(path.join(process.cwd(), 'db'))) {
          res.statusCode = 403;
          res.end('forbidden');
          return;
        }
        fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            next();
            return;
          }
          const ext = path.extname(filePath).toLowerCase();
          const types = { '.json': 'application/json', '.geojson': 'application/geo+json' };
          res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
          fs.createReadStream(filePath).pipe(res);
        });
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/db', (req, res, next) => {
        const urlPath = decodeURIComponent(req.url.split('?')[0]);
        const filePath = path.join(process.cwd(), 'dist', 'db', urlPath);
        if (!filePath.startsWith(path.join(process.cwd(), 'dist', 'db'))) {
          res.statusCode = 403;
          res.end('forbidden');
          return;
        }
        fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            // Fall back to project db/ if not built
            const fallback = path.join(process.cwd(), 'db', urlPath);
            try {
              const data = fs.readFileSync(fallback);
              res.end(data);
            } catch {
              next();
            }
            return;
          }
          res.setHeader('Content-Type', 'application/json');
          fs.createReadStream(filePath).pipe(res);
        });
      });
    },
    closeBundle() {
      // Copy db/ -> dist/db/ on build
      const src = path.join(process.cwd(), 'db');
      const dest = path.join(process.cwd(), 'dist', 'db');
      fs.mkdirSync(dest, { recursive: true });
      for (const file of fs.readdirSync(src)) {
        fs.copyFileSync(path.join(src, file), path.join(dest, file));
      }
      // Write dist/asset-manifest.json so the service worker can precache
      // every hashed /assets/* entry without hard-coding hashes here.
      writeAssetManifest(path.join(process.cwd(), 'dist'));
    },
  };
}

export default defineConfig({
  plugins: [react(), serveDb()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
  },
});
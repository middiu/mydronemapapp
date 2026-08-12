// Write dist/asset-manifest.json mapping original asset paths to their
// hashed filenames, so the service worker can precache every hashed
// /assets/* entry without us hard-coding hashes at build time.
//
// Invoked from vite.config.js's closeBundle hook.

import fs from 'node:fs';
import path from 'node:path';

export function writeAssetManifest(distDir) {
  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) return;

  const entries = {};
  for (const file of fs.readdirSync(assetsDir)) {
    const full = path.join(assetsDir, file);
    if (!fs.statSync(full).isFile()) continue;
    // Strip content hash: foo-ASQyHHuG.js -> foo.js
    const hashed = file.replace(/-[\w]{8}(\.[^.]+)$/, '$1');
    entries[hashed] = `/assets/${file}`;
  }

  // Also include top-level files the SW cares about (so the manifest
  // double-serves as a "shell URLs" list with hashes).
  for (const file of ['index.html', 'manifest.webmanifest', 'sw.js']) {
    const full = path.join(distDir, file);
    if (fs.existsSync(full)) {
      entries[file] = `/${file}`;
    }
  }

  fs.writeFileSync(
    path.join(distDir, 'asset-manifest.json'),
    JSON.stringify(entries, null, 2) + '\n',
  );
}
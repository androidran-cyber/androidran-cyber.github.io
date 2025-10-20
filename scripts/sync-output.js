#!/usr/bin/env node
// Copy root /output into frontend/public or frontend/dist
const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'output'); // repo root /output
const to = process.argv.includes('--to=dist')
  ? path.join(root, 'frontend', 'dist', 'output')
  : path.join(root, 'frontend', 'public', 'output');

copyDir(out, to);
console.log(`[sync-output] copied ${out} -> ${to}`);

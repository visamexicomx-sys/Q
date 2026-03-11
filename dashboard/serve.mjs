#!/usr/bin/env node
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const html = readFileSync(join(__dirname, 'index.html'), 'utf-8');

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`\n  Skills Dashboard running at:\n`);
  console.log(`  \x1b[1m\x1b[36mhttp://localhost:${PORT}\x1b[0m\n`);
  console.log(`  Press Ctrl+C to stop.\n`);
});

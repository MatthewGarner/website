import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

// Build a real article with rich content in a disposable copy, never the publishing folder.
const source = path.resolve(import.meta.dirname, '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'site-browser-'));
const project = path.join(directory, 'site');
fs.mkdirSync(project);
process.on('exit', () => fs.rmSync(directory, { recursive: true, force: true }));
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => process.exit(0));
for (const entry of ['src', 'astro.config.ts', 'tsconfig.json', 'package.json']) fs.cpSync(path.join(source, entry), path.join(project, entry), { recursive: true });
fs.symlinkSync(path.join(source, 'node_modules'), path.join(project, 'node_modules'), 'dir');
fs.cpSync(path.join(source, '../content'), path.join(directory, 'content'), { recursive: true });
let sample = fs.readFileSync(path.join(source, 'tests/fixtures/reading-sample.md'), 'utf8');
sample += '\n\nA repeated reference checks keyboard return.[^pace]\n';
sample = sample.replace('This footnote is deliberately brief.', 'This footnote is deliberately brief. See [Drifting](/drifting).');
fs.writeFileSync(path.join(directory, 'content/interaction-sample.md'), sample);
const require = createRequire(import.meta.url);
const astro = path.resolve(path.dirname(require.resolve('astro/package.json')), require('astro/package.json').bin.astro);
execFileSync(process.execPath, [astro, 'build'], { cwd: project, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }, stdio: 'inherit' });
const dist = path.join(project, 'dist');
const port = Number(process.env.BROWSER_TEST_PORT ?? 4335);
const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml' };
http.createServer((request, response) => {
  let file: string;
  try { file = path.resolve(dist, '.' + decodeURIComponent(new URL(request.url!, 'http://localhost').pathname)); }
  catch { response.writeHead(400).end(); return; }
  if (file !== dist && !file.startsWith(dist + path.sep)) { response.writeHead(404).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
  fs.createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`Browser fixture ready at http://127.0.0.1:${port}`));

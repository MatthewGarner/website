import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PORTABLE_FILES = ['catalogue.json', 'schema.js', 'codec.js', 'definition.js', 'legacy.js'] as const;
const destination = path.resolve(import.meta.dirname, '../src/lib/tool-contract');

/** Only explicit, local Tools exports are accepted; builds never fetch a catalogue. */
export async function syncToolContract(source: string, target = destination, check = false) {
  source = path.resolve(source);
  if (!fs.lstatSync(source).isDirectory() || fs.lstatSync(source).isSymbolicLink()) throw new Error('The portable export must be a real directory.');
  const files = new Map<string, Buffer>();
  for (const name of PORTABLE_FILES) {
    const file = path.join(source, name);
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024) throw new Error(`Invalid portable file: ${name}`);
    files.set(name, fs.readFileSync(file));
  }
  // Metadata validation belongs to the exported contract, including future tools.
  const { validateCatalogue } = await import(pathToFileURL(path.join(source, 'definition.js')).href);
  if (typeof validateCatalogue !== 'function') throw new Error('Unsupported portable contract: missing catalogue validator.');
  const catalogue = validateCatalogue(JSON.parse(files.get('catalogue.json')!.toString('utf8')));
  if (fs.existsSync(target)) {
    if (!fs.lstatSync(target).isDirectory() || fs.lstatSync(target).isSymbolicLink()) throw new Error('The vendored contract must be a real directory.');
    for (const name of fs.readdirSync(target)) {
      if (!PORTABLE_FILES.includes(name as typeof PORTABLE_FILES[number])) throw new Error(`The generated contract directory has an unexpected file: ${name}`);
      const stat = fs.lstatSync(path.join(target, name));
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Invalid vendored file: ${name}`);
    }
  }
  const differences = PORTABLE_FILES.filter(name => !fs.existsSync(path.join(target, name)) || !files.get(name)!.equals(fs.readFileSync(path.join(target, name))));
  if (check) {
    if (differences.length) throw new Error(`The vendored Tools contract differs: ${differences.join(', ')}. Run sync:tool-contract without --check.`);
    return { changed: false, tools: catalogue.tools.length };
  }
  if (!differences.length) return { changed: false, tools: catalogue.tools.length };
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const staging = fs.mkdtempSync(path.join(path.dirname(target), '.tool-contract-'));
  const previous = staging + '-previous';
  try {
    for (const [name, bytes] of files) fs.writeFileSync(path.join(staging, name), bytes);
    if (fs.existsSync(target)) {
      fs.renameSync(target, previous);
    }
    try { fs.renameSync(staging, target); }
    catch (error) { if (fs.existsSync(previous)) fs.renameSync(previous, target); throw error; }
    fs.rmSync(previous, { recursive: true, force: true });
  } finally { fs.rmSync(staging, { recursive: true, force: true }); }
  return { changed: true, tools: catalogue.tools.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const directories = args.filter(arg => arg !== '--check');
  if (directories.length !== 1 || directories[0].startsWith('-') || args.filter(arg => arg === '--check').length > 1) {
    throw new Error('Usage: npm run sync:tool-contract -- /path/to/tools/embed/portable [--check]');
  }
  const result = await syncToolContract(directories[0], destination, args.includes('--check'));
  console.log(`${result.changed ? 'Synced' : 'Verified'} the portable contract for ${result.tools} versioned tools.`);
}

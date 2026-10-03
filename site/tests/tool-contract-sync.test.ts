import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PORTABLE_FILES, syncToolContract } from '../scripts/sync-tool-contract';

const portable = path.resolve(import.meta.dirname, '../src/lib/tool-contract');

test('portable sync is deterministic, copies only the contract, and detects drift without changing files', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-contract-sync-'));
  try {
    const source = path.join(root, 'source'), target = path.join(root, 'target');
    fs.cpSync(portable, source, { recursive: true });
    fs.writeFileSync(path.join(source, 'unrelated.txt'), 'Do not copy this.');
    assert.equal((await syncToolContract(source, target)).changed, true);
    assert.deepEqual(fs.readdirSync(target).sort(), [...PORTABLE_FILES].sort());
    assert.equal((await syncToolContract(source, target, true)).changed, false);
    assert.equal((await syncToolContract(source, target)).changed, false);
    const changed = fs.readFileSync(path.join(target, 'codec.js'), 'utf8') + '\n// drift\n';
    fs.writeFileSync(path.join(target, 'codec.js'), changed);
    await assert.rejects(syncToolContract(source, target, true), /differs: codec.js/);
    assert.equal(fs.readFileSync(path.join(target, 'codec.js'), 'utf8'), changed);
    await syncToolContract(source, target);
    assert.deepEqual(fs.readFileSync(path.join(target, 'codec.js')), fs.readFileSync(path.join(source, 'codec.js')));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('invalid catalogue metadata and symlinks cannot replace a working portable contract', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-contract-invalid-'));
  try {
    const source = path.join(root, 'source'), target = path.join(root, 'target');
    fs.cpSync(portable, source, { recursive: true });
    await syncToolContract(source, target);
    const before = fs.readFileSync(path.join(target, 'catalogue.json'), 'utf8');
    const catalogue = JSON.parse(before);
    catalogue.schemaVersion = 99;
    fs.writeFileSync(path.join(source, 'catalogue.json'), JSON.stringify(catalogue));
    await assert.rejects(syncToolContract(source, target), /catalogue/);
    assert.equal(fs.readFileSync(path.join(target, 'catalogue.json'), 'utf8'), before);
    fs.writeFileSync(path.join(source, 'catalogue.json'), before);
    fs.rmSync(path.join(source, 'schema.js'));
    fs.symlinkSync(path.join(portable, 'schema.js'), path.join(source, 'schema.js'));
    await assert.rejects(syncToolContract(source, target), /Invalid portable file/);
    assert.equal(fs.readFileSync(path.join(target, 'catalogue.json'), 'utf8'), before);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

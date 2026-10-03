import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import { CONTENT_DIR, resolveAsset } from './publishing';

export const TOOLS_ORIGIN = 'https://tools.matthewgarner.me';
// Each entry names an explicitly supported view, not an arbitrary iframe URL.
const views: Record<string, string> = { 'flow/1/waiting-time': '/embed/v1/flow/' };
type FlowParams = { demandPerWeek: number; itemDays: number; team: number; wipLimit: number; cov: string };
export type ToolExample = {
  tool: 'flow'; version: 1; view: 'waiting-time'; title: string; summary: string;
  image: string; alt: string; params: FlowParams; seed: number; controls: string[];
};
const text = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Tool example needs ${label}.`);
  return value.trim();
};
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function keys(value: Record<string, unknown>, allowed: string[]) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unknown tool option: ${key}`);
}
export function validateExample(value: unknown): ToolExample {
  if (!object(value)) throw new Error('Tool example must be an object.');
  keys(value, ['tool', 'version', 'view', 'title', 'summary', 'image', 'alt', 'params', 'seed', 'controls']);
  if (typeof value.tool !== 'string' || typeof value.view !== 'string' || typeof value.version !== 'number' || !views[`${value.tool}/${value.version}/${value.view}`]) throw new Error('Unsupported tool, version or view.');
  if (!object(value.params)) throw new Error('Tool example needs params.');
  keys(value.params, ['demandPerWeek', 'itemDays', 'team', 'wipLimit', 'cov']);
  const p = value.params;
  const range = (n: unknown, min: number, max: number, step = 1) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max && Number.isInteger(n / step);
  if (!range(p.demandPerWeek, .5, 10, .5) || !range(p.itemDays, 1, 15) || !range(p.team, 1, 10) ||
      !(range(p.wipLimit, 1, 20) || p.wipLimit === 40) || typeof p.cov !== 'string' || !['low', 'med', 'high'].includes(p.cov)) {
    throw new Error('Invalid Flow inputs: use the ranges supported by the full tool.');
  }
  if (value.seed !== 61709) throw new Error('Flow v1 uses the fixed seed 61709.');
  if (!Array.isArray(value.controls) || !(value.controls.length === 0 || (value.controls.length === 1 && value.controls[0] === 'demand'))) {
    throw new Error('Flow v1 controls must be [] or [demand].');
  }
  for (const field of ['title', 'summary', 'image', 'alt']) text(value[field], field);
  if (!/\.(?:svg|png|jpe?g|webp|avif)$/i.test(String(value.image)) || /^(?:[a-z]+:|\/\/)/i.test(String(value.image))) {
    throw new Error('Tool fallback must be a local image.');
  }
  return value as ToolExample;
}
export function readExample(id: string, root = CONTENT_DIR): ToolExample {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`Invalid tool example name: ${id}`);
  const directory = path.join(root, 'tool-examples');
  const file = path.join(directory, `${id}.json`);
  // Content publishing excludes symlinks; example loading must honour that boundary too.
  if (fs.lstatSync(directory).isSymbolicLink() || fs.lstatSync(file).isSymbolicLink()) throw new Error('Tool examples cannot be symlinks.');
  return validateExample(JSON.parse(fs.readFileSync(file, 'utf8')));
}
const escape = (value: string) => value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
export function exampleURLs(example: ToolExample, origin = TOOLS_ORIGIN) {
  const { params: p, seed, controls } = example;
  const state = { params: p, seed, controls };
  const src = `${origin}${views[`${example.tool}/${example.version}/${example.view}`]}#${encodeURIComponent(JSON.stringify(state))}`;
  // The full tool retains its legacy JSON/base64 codec, so this also works without JS.
  const hash = Buffer.from(JSON.stringify({ d: p.demandPerWeek, s: p.itemDays, t: p.team, w: p.wipLimit === 40 ? 21 : p.wipLimit, v: p.cov })).toString('base64');
  return { src, full: `${origin}/flow/#${hash}` };
}

/** Expand authored examples into accessible figures. JS is an optional enhancement. */
export function articleTools({ root = CONTENT_DIR, origin = TOOLS_ORIGIN } = {}) {
  const url = new URL(origin);
  if (url.origin !== origin || !(origin === TOOLS_ORIGIN || (url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)))) {
    throw new Error('Tool embed origin must be Tools Lab or a local preview server.');
  }
  return (tree: Root, file: { path?: string }) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'tool' || !parent || index === undefined) return;
      const options = matter(`---\n${node.value}\n---`).data;
      keys(options, ['example', 'caption', 'mode']);
      const id = text(options.example, 'example');
      const example = readExample(id, root);
      const caption = options.caption === undefined ? example.summary : text(options.caption, 'caption');
      const mode = options.mode ?? 'interactive';
      if (!['interactive', 'figure'].includes(mode)) throw new Error('Tool mode must be interactive or figure.');
      const from = file.path ? path.relative(root, file.path).split(path.sep).join('/') : 'index.md';
      const image = resolveAsset(example.image, from, root);
      const { src, full } = exampleURLs(example, origin);
      parent.children[index] = { type: 'html', value:
        `<figure class="tool-demo"${mode === 'interactive' ? ` data-tool-src="${escape(src)}" data-tool-title="${escape(example.title)}"` : ''}>` +
        `<div class="tool-demo-stage"><img class="tool-demo-poster" src="${escape(image)}" alt="${escape(example.alt)}" loading="lazy" /></div>` +
        `<figcaption>${escape(caption)}</figcaption>` +
        `<div class="tool-demo-actions">${mode === 'interactive' ? '<button type="button" data-tool-start hidden>Explore this example</button>' : ''}` +
        `<a href="${escape(full)}" target="_blank" rel="noopener">Open full tool <span aria-hidden="true">↗</span></a></div>` +
        '<p class="tool-demo-status" role="status" aria-live="polite"></p></figure>' };
    });
  };
}

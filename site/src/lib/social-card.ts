import { createRequire } from 'node:module';
import { openSync, type Font, type GlyphRun } from 'fontkit';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const loadFont = (name: string) => openSync(require.resolve(name)) as Font;
// Use the WOFF2 files' default weight (400). Fontkit's getVariation() currently
// loses WOFF2 tables; outlining the default instance also avoids host fonts.
const titleFonts = ['latin', 'latin-ext', 'vietnamese', 'cyrillic', 'cyrillic-ext'].map((subset) =>
  loadFont(`@fontsource-variable/oswald/files/oswald-${subset}-wght-normal.woff2`));
const proseFont = loadFont('@fontsource-variable/newsreader/files/newsreader-latin-standard-normal.woff2');
const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });
const segments = (text: string) => Array.from(graphemes.segment(text), (part) => part.segment);
const normalise = (text: string) => text.normalize('NFC').replace(/\s+/gu, ' ').trim();

export const socialCardSize = { width: 1200, height: 630 };
const titleBox = { x: 72, y: 152, width: 1056, height: 334 };

interface FontRun { font: Font; run: GlyphRun; }
function shape(text: string, fonts: Font[]): FontRun[] {
  const runs: { font: Font; text: string }[] = [];
  for (const segment of segments(text)) {
    const font = fonts.find((candidate) => [...segment].every((char) => candidate.hasGlyphForCodePoint(char.codePointAt(0)!))) ?? fonts[0];
    const previous = runs.at(-1);
    if (previous?.font === font) previous.text += segment;
    else runs.push({ font, text: segment });
  }
  return runs.map(({ font, text }) => ({ font, run: font.layout(text) }));
}

function textWidth(text: string, size: number, fonts = titleFonts): number {
  return shape(text, fonts).reduce((width, { font, run }) => width + run.advanceWidth * size / font.unitsPerEm, 0);
}

function wrap(text: string, size: number, width = titleBox.width): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size) <= width) { line = candidate; continue; }
    if (line) lines.push(line);
    line = '';
    // Split unusually long words at grapheme boundaries, preserving accents and emoji.
    for (const char of segments(word)) {
      if (line && textWidth(line + char, size) > width) { lines.push(line); line = ''; }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function balance(text: string, size: number, lineCount: number): string[] {
  let low = titleBox.width / lineCount;
  let high = titleBox.width;
  // Find the narrowest measure that keeps this line count, avoiding orphan words.
  while (high - low > 1) {
    const width = (low + high) / 2;
    if (wrap(text, size, width).length > lineCount) low = width;
    else high = width;
  }
  return wrap(text, size, high);
}

export function layoutSocialTitle(title: string) {
  const text = normalise(title);
  for (let fontSize = 104; fontSize >= 48; fontSize -= 4) {
    const lines = wrap(text, fontSize);
    const lineHeight = fontSize * 1.18;
    const height = (lines.length - 1) * lineHeight + fontSize * 1.05;
    if (height <= titleBox.height) return { lines: balance(text, fontSize, lines.length), fontSize, lineHeight, height, truncated: false };
  }
  const fontSize = 48;
  const lineHeight = fontSize * 1.18;
  const maxLines = Math.floor((titleBox.height - fontSize * 1.05) / lineHeight) + 1;
  const lines = wrap(text, fontSize).slice(0, maxLines);
  let last = segments(lines.at(-1) ?? '');
  while (last.length && textWidth(last.join('').trimEnd() + '…', fontSize) > titleBox.width) last.pop();
  lines[lines.length - 1] = last.join('').trimEnd() + '…';
  return { lines, fontSize, lineHeight, height: (lines.length - 1) * lineHeight + fontSize * 1.05, truncated: true };
}

function outline(text: string, x: number, baseline: number, size: number, fill: string, fonts = titleFonts): string {
  const paths: string[] = [];
  for (const { font, run } of shape(text, fonts)) {
    const scale = size / font.unitsPerEm;
    let pen = 0;
    for (let i = 0; i < run.glyphs.length; i++) {
      const glyph = run.glyphs[i];
      const position = run.positions[i];
      const data = glyph.path.toSVG();
      if (data) paths.push(`<path d="${data}" transform="translate(${x + (pen + position.xOffset) * scale} ${baseline - position.yOffset * scale}) scale(${scale} ${-scale})"/>`);
      pen += position.xAdvance;
    }
    x += run.advanceWidth * scale;
  }
  return `<g fill="${fill}">${paths.join('')}</g>`;
}

export interface SocialCard { title: string; type?: string; date?: Date; }

export async function renderSocialCard({ title, type = 'essay', date }: SocialCard): Promise<Buffer> {
  const layout = layoutSocialTitle(title);
  const baseline = titleBox.y + (titleBox.height - layout.height) / 2 + layout.fontSize * 0.9;
  const label = normalise(type).toLocaleUpperCase('en-GB');
  const labelSize = Math.min(22, 420 / Math.max(1, textWidth(label, 1)));
  const dateLabel = date ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date) : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#faf8f2"/>
    ${outline('Matthew Garner', 72, 84, 34, '#594278', [proseFont])}
    ${outline(label, 1128 - textWidth(label, labelSize), 82, labelSize, '#594278')}
    <path d="M72 114H1128" stroke="#594278" stroke-width="2"/>
    ${layout.lines.map((line, index) => outline(line, titleBox.x, baseline + index * layout.lineHeight, layout.fontSize, '#24212c')).join('')}
    <path d="M72 524H1128" stroke="#594278" stroke-opacity=".25"/>
    ${outline('matthewgarner.me', 72, 574, 26, '#594278', [proseFont])}
    ${outline(dateLabel, 1128 - textWidth(dateLabel, 26, [proseFont]), 574, 26, '#594278', [proseFont])}
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/* Portable state transport. No compression, storage, DOM or network side effects. */
import {assertJSON, STATE_LIMITS} from './schema.js';
const decoder = new TextDecoder('utf-8', {fatal:true});
export const ARTICLE_PREFIX = 'article:';
export const FULL_TOOL_ORIGINS = Object.freeze(['https://tools.matthewgarner.me', 'https://energy.matthewgarner.me']);
function base64(json, urlSafe = false){
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for(let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  const encoded = btoa(binary);
  return urlSafe ? encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : encoded;
}
function decode64(value){
  if(!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) throw new Error('Invalid article state encoding.');
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return decoder.decode(Uint8Array.from(binary, character => character.charCodeAt(0)));
}
function envelope(value){
  if(!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).some(key => !['tool', 'version', 'state'].includes(key)) ||
    typeof value.tool !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value.tool) ||
    !Number.isSafeInteger(value.version) || value.version < 1 || !Object.hasOwn(value, 'state'))
    throw new Error('Invalid article state envelope.');
}
export function encodeArticleFragment(value){
  envelope(value);
  return ARTICLE_PREFIX + base64(assertJSON(value), true);
}
export function decodeArticleFragment(hash, {tool, version = 1, maxBytes = STATE_LIMITS.maxBytes} = {}){
  if(typeof tool !== 'string' || !tool) throw new Error('The receiving tool must identify itself.');
  const fragment = String(hash).replace(/^#/, '');
  if(!fragment.startsWith(ARTICLE_PREFIX)) throw new Error('This is not an article example link.');
  const encoded = fragment.slice(ARTICLE_PREFIX.length);
  if(encoded.length > Math.ceil(maxBytes * 4 / 3)) throw new Error('Article state is too large.');
  let value;
  try { value = JSON.parse(decode64(encoded)); }
  catch { throw new Error('The article example could not be read.'); }
  assertJSON(value, {maxBytes});
  envelope(value);
  if(value.tool !== tool || value.version !== version) throw new Error('The article example targets a different tool or unsupported version.');
  return value.state;
}
export function fullToolURL(definition, state){
  const target = new URL(definition.fullTool.url);
  if(!FULL_TOOL_ORIGINS.includes(target.origin) || target.username || target.password || target.search || target.hash)
    throw new Error('The full-tool URL is not an approved tool route.');
  const encoding = definition.fullTool.encoding;
  let fragment;
  if(encoding === 'json-base64') fragment = base64(assertJSON(state));
  else if(encoding === 'article-json-base64url') fragment = encodeArticleFragment({tool:definition.id, version:definition.version, state});
  else throw new Error('Unsupported full-tool state encoding.');
  const url = target.href + '#' + fragment;
  if(url.length > (definition.fullTool.maxLength ?? 200000)) throw new Error('The example is too large for its full-tool link.');
  return url;
}

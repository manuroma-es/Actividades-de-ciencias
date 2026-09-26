import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const MAX_HTML = 450_000;
const hosts = new Map([['wordwall.net', 'wordwall'], ['es.educaplay.com', 'educaplay'], ['www.educaplay.com', 'educaplay']]);

export class AdminError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function externalLink(input, manualResource = '') {
  let url;
  try { url = new URL(input); } catch { throw new AdminError('Pega una URL completa de Wordwall o Educaplay.'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !hosts.has(host) || url.username || url.password || url.port || input.length > 2048) {
    throw new AdminError('Solo se admiten enlaces HTTPS de Wordwall o Educaplay.');
  }
  const platformId = hosts.get(host);
  const match = platformId === 'wordwall'
    ? /^\/[a-z]{2}\/resource\/([0-9]+)(?:\/[^?#]*)?$/.exec(url.pathname)
    : /^\/(?:recursos-educativos|learning-resources)\/([0-9]+)(?:-[^/?#]+)?\.html$/.exec(url.pathname);
  if (!match && (!/^[0-9]{1,20}$/.test(manualResource) || !url.pathname.includes(manualResource) || url.pathname === '/')) throw new AdminError('El enlace no tiene un ID de actividad reconocible. Introduce el ID manualmente si cambió el formato.');
  url.hash = ''; url.search = '';
  const resourceId = match?.[1] || manualResource;
  return { url: url.href, platformId, resourceId, id: `${platformId === 'wordwall' ? 'WW' : 'EP'}-${resourceId}` };
}

function plain(text) {
  return String(text || '').replace(/<[^>]*>/g, '').replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => {
    const value = Number.parseInt(n.slice(0, 1).toLowerCase() === 'x' ? n.slice(1) : n, n[0]?.toLowerCase() === 'x' ? 16 : 10);
    return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '';
  }).replace(/&(?:amp|quot|apos|lt|gt|nbsp);/gi, (m) => ({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '}[m.toLowerCase()] ?? m)).trim().slice(0, 1200);
}

function meta(html, key) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attributes = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gis)].map((item) => [item[1].toLowerCase(), item[3]]));
    if (attributes.property === key || attributes.name === key) return plain(attributes.content);
  }
  return '';
}

export async function inspectLink(input, request = fetch) {
  const original = externalLink(input);
  let current = original.url;
  for (let step = 0; step < 4; step++) {
    const response = await request(current, { redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { accept: 'text/html' } });
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get('location');
      if (!next) throw new AdminError('La plataforma devolvió una redirección incompleta.');
      const destination = externalLink(new URL(next, current).href);
      if (destination.platformId !== original.platformId || destination.resourceId !== original.resourceId) throw new AdminError('El enlace redirige a otro recurso.');
      current = destination.url;
      await response.body?.cancel();
      continue;
    }
    if (!response.ok || !(response.headers.get('content-type') || '').toLowerCase().includes('text/html')) {
      throw new AdminError('No se pudo leer la página pública. Puedes introducir los datos manualmente.');
    }
    const reader = response.body.getReader();
    const chunks = []; let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_HTML) throw new AdminError('La página supera el tamaño permitido. Introduce los datos manualmente.');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    const html = new TextDecoder().decode(Buffer.concat(chunks));
    const title = (meta(html, 'og:title') || plain(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])).slice(0, 180);
    const description = (meta(html, 'og:description') || meta(html, 'description')).slice(0, 1200);
    return { ...externalLink(current), title, description, verified: true };
  }
  throw new AdminError('El enlace tiene demasiadas redirecciones.');
}

export function validateDraft(body, catalog) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AdminError('Datos incompletos.');
  const allowed = new Set(['url','platformId','resourceId','title','description','subjectId','topicIds','typeId','language','verified','sourceTitle','manual']);
  if (Object.keys(body).some(k => !allowed.has(k))) throw new AdminError('La solicitud contiene campos inesperados.');
  const link = externalLink(body.url, body.manual ? body.resourceId : '');
  if (body.manual && body.verified) throw new AdminError('Un enlace introducido manualmente debe quedar pendiente de verificación.');
  if (link.platformId !== body.platformId || link.resourceId !== body.resourceId) throw new AdminError('La plataforma o ID no coinciden con el enlace.');
  for (const [key, limit] of [['title', 180], ['description', 1200]]) {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > limit || /[\x00-\x1f]/.test(body[key])) throw new AdminError(`${key}: revisa el texto.`);
  }
  if (body.sourceTitle != null && (typeof body.sourceTitle !== 'string' || body.sourceTitle.length > 180)) throw new AdminError('Título original inválido.');
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(body.language || '')) throw new AdminError('Idioma inválido.');
  const subjects = new Set(catalog.subjects.filter(s => s.status === 'active').map(s => s.id));
  if (!subjects.has(body.subjectId)) throw new AdminError('Esta asignatura ya no está activa.');
  const topics = new Map(catalog.topics.map(t => [t.id, t]));
  if (!Array.isArray(body.topicIds) || body.topicIds.length < 1 || body.topicIds.length > 20 || new Set(body.topicIds).size !== body.topicIds.length || body.topicIds.some(id => topics.get(id)?.subjectId !== body.subjectId || topics.get(id)?.status !== 'active')) throw new AdminError('Selecciona temas activos de la asignatura, sin repetir.');
  if (!catalog.activityTypes.some(t => t.id === body.typeId)) throw new AdminError('Tipo de actividad desconocido.');
  if (typeof body.verified !== 'boolean') throw new AdminError('Estado de verificación inválido.');
  if (catalog.activities.some(a => a.id === link.id || (a.source?.platformId === link.platformId && String(a.source?.resourceId) === link.resourceId) || [a.source?.url,a.source?.canonicalUrl,a.source?.originalUrl].includes(link.url))) throw new AdminError('Esta actividad ya existe en el catálogo.', 409);
  return { ...body, url: link.url, title: body.title.trim(), description: body.description.trim() };
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 256 || !/^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(encoded || '')) return false;
  const [salt, hex] = encoded.split(':');
  const actual = await scrypt(password, Buffer.from(salt, 'hex'), 64);
  return timingSafeEqual(actual, Buffer.from(hex, 'hex'));
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 16) throw new Error('Usa una contraseña de al menos 16 caracteres.');
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function requestId() { return randomBytes(12).toString('hex'); }
export function digest(value) { return createHash('sha256').update(value).digest('hex'); }
export function activitySlug(title, resourceId) {
  const base = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 75).replace(/-$/, '');
  return `${base || 'actividad'}-${resourceId}`;
}

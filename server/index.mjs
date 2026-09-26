import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { AdminError, externalLink, inspectLink, requestId, validateDraft, verifyPassword } from './admin-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'out');
const catalog = JSON.parse(await readFile(path.join(root, 'data/generated/catalog.json'), 'utf8'));
const sessions = new Map();
const attempts = new Map();
const owner = 't2wmt6sgff-glitch';
const repository = 'Actividades-de-ciencias';
const workflow = 'import-activity.yml';
const githubApi = 'https://api.github.com';
const isProduction = process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development';

if (isProduction && (!/^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(process.env.ADMIN_PASSWORD_HASH || '') || (process.env.GITHUB_ACTIONS_TOKEN || '').length < 20 || !/^https:\/\/[^/]+$/.test(process.env.ADMIN_ORIGIN || ''))) {
  throw new Error('Configura ADMIN_PASSWORD_HASH, GITHUB_ACTIONS_TOKEN y ADMIN_ORIGIN antes de iniciar el servidor.');
}

function send(res, status, value, extra = {}) {
  const data = JSON.stringify(value);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra });
  res.end(data);
}

function cookie(req, name) {
  const pairs = (req.headers.cookie || '').split(';').map(item => item.trim().split('='));
  return pairs.find(pair => pair[0] === name)?.[1];
}

function session(req) {
  const key = cookie(req, 'admin_session');
  const entry = key && sessions.get(key);
  if (entry && entry.expires > Date.now()) return entry;
  if (key) sessions.delete(key);
  throw new AdminError('Inicia sesión para continuar.', 401);
}

function origin(req) {
  const configured = process.env.ADMIN_ORIGIN;
  if (!configured && isProduction) throw new AdminError('ADMIN_ORIGIN no está configurado.', 503);
  const expected = configured || `http://${req.headers.host}`;
  if (req.headers.origin !== expected) throw new AdminError('Origen de petición no permitido.', 403);
}

function csrf(req, entry) {
  origin(req);
  if (req.headers['x-admin-csrf'] !== entry.csrf) throw new AdminError('Sesión caducada. Actualiza el panel.', 403);
}

function rate(key, max, windowMs) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter(time => time > now - windowMs);
  list.push(now); attempts.set(key, list);
  if (list.length > max) throw new AdminError('Demasiados intentos. Prueba más tarde.', 429);
}

async function body(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 12_000) throw new AdminError('La solicitud es demasiado grande.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new AdminError('JSON inválido.'); }
}

async function github(endpoint, options = {}) {
  const token = process.env.GITHUB_ACTIONS_TOKEN;
  if (!token) throw new AdminError('Publicación pendiente de configuración del servidor.', 503);
  const response = await fetch(`${githubApi}/repos/${owner}/${repository}${endpoint}`, {
    ...options,
    headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'x-github-api-version': '2022-11-28', ...(options.headers || {}) },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new AdminError('GitHub no ha aceptado la operación. Inténtalo de nuevo.', 502);
  return response.status === 204 ? null : response.json();
}

async function api(req, res, pathname) {
  if (req.method === 'POST' && pathname === '/api/admin/login') {
    origin(req);
    rate(`login:${req.socket.remoteAddress}`, 6, 15 * 60_000);
    const data = await body(req);
    if (!await verifyPassword(data.password, process.env.ADMIN_PASSWORD_HASH)) throw new AdminError('Credenciales incorrectas.', 401);
    const id = randomBytes(32).toString('hex');
    const entry = { csrf: randomBytes(24).toString('hex'), expires: Date.now() + 8 * 60 * 60_000 };
    sessions.set(id, entry);
    send(res, 200, { authenticated: true, csrf: entry.csrf }, { 'set-cookie': `admin_session=${id}; HttpOnly; Path=/api/admin; SameSite=Lax; Max-Age=28800${isProduction ? '; Secure' : ''}` });
    return;
  }
  if (req.method === 'GET' && pathname === '/api/admin/session') {
    const entry = session(req);
    send(res, 200, { authenticated: true, csrf: entry.csrf, catalog: {
      subjects: catalog.subjects.filter(s => s.status === 'active').map(s => ({ id: s.id, name: s.name })),
      topics: catalog.topics.filter(t => t.status === 'active').map(t => ({ id: t.id, subjectId: t.subjectId, name: t.name })),
      types: catalog.activityTypes.map(t => ({ id: t.id, name: t.name })),
      platforms: catalog.platforms.map(p => ({ id: p.id, name: p.name })),
    } }); return;
  }
  if (req.method === 'POST' && pathname === '/api/admin/logout') {
    const entry = session(req); csrf(req, entry);
    sessions.delete(cookie(req, 'admin_session'));
    send(res, 200, { authenticated: false }, { 'set-cookie': `admin_session=; HttpOnly; Path=/api/admin; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}` }); return;
  }
  if (req.method === 'POST' && pathname === '/api/admin/analyze') {
    const entry = session(req); csrf(req, entry);
    rate(`analyze:${cookie(req, 'admin_session')}`, 25, 15 * 60_000);
    const data = await body(req);
    if (typeof data.url !== 'string') throw new AdminError('Pega un enlace.');
    externalLink(data.url);
    try { send(res, 200, await inspectLink(data.url)); }
    catch (error) {
      if (!(error instanceof AdminError)) console.error('No se pudo leer la metadata:', error?.name);
      send(res, 200, { ...externalLink(data.url), title: '', description: '', verified: false, warning: error instanceof AdminError ? error.message : 'No se pudo leer la página. Completa los datos manualmente.' });
    }
    return;
  }
  if (req.method === 'POST' && pathname === '/api/admin/publish') {
    const entry = session(req); csrf(req, entry);
    rate(`publish:${cookie(req, 'admin_session')}`, 10, 60 * 60_000);
    const draft = validateDraft(await body(req), catalog);
    const runs = await github(`/actions/workflows/${workflow}/runs?event=workflow_dispatch&per_page=10`);
    if (runs.workflow_runs?.some(run => ['queued','in_progress','waiting','pending'].includes(run.status))) throw new AdminError('Ya hay una publicación en curso. Espera a que termine.', 409);
    const id = requestId();
    await github(`/actions/workflows/${workflow}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: 'main', inputs: { request_id: id, source_sha: catalog.source.sha256, payload: JSON.stringify(draft) } }) });
    send(res, 202, { requestId: id, status: 'queued' }); return;
  }
  const match = /^\/api\/admin\/status\/([a-f0-9]{24})$/.exec(pathname);
  if (req.method === 'GET' && match) {
    session(req);
    const runs = await github(`/actions/workflows/${workflow}/runs?event=workflow_dispatch&per_page=30`);
    const run = runs.workflow_runs?.find(item => item.display_title === `admin:${match[1]}`);
    if (!run) { send(res, 200, { status: 'queued' }); return; }
    const status = run.status === 'completed' ? (run.conclusion === 'success' ? 'committed' : 'failed') : 'validating';
    send(res, 200, { status, runUrl: run.html_url,
      message: status === 'failed' ? 'La validación o el commit fallaron. Revisa la ejecución y corrige el formulario.' : undefined }); return;
  }
  throw new AdminError('Ruta no encontrada.', 404);
}

const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.mp4':'video/mp4', '.txt':'text/plain; charset=utf-8', '.ico':'image/x-icon', '.woff2':'font/woff2' };
async function staticFile(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new AdminError('Método no permitido.', 405);
  let name;
  try { name = decodeURIComponent(pathname); } catch { throw new AdminError('Ruta inválida.'); }
  const file = path.resolve(out, `.${name}`, name.endsWith('/') || !path.extname(name) ? 'index.html' : '');
  if (!file.startsWith(out + path.sep)) throw new AdminError('Ruta inválida.', 403);
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not file');
    const headers = { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'x-content-type-options': 'nosniff', ...(pathname.startsWith('/admin') ? { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } : {}) };
    if (path.extname(file) === '.mp4') {
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
      if (req.headers.range && !range) { res.writeHead(416, { 'content-range': `bytes */${info.size}` }); res.end(); return; }
      const start = range ? Number(range[1]) : 0;
      const end = range && range[2] ? Number(range[2]) : info.size - 1;
      if (start >= info.size || end >= info.size || end < start) { res.writeHead(416, { 'content-range': `bytes */${info.size}` }); res.end(); return; }
      res.writeHead(range ? 206 : 200, { ...headers, 'accept-ranges': 'bytes', 'content-length': end - start + 1, ...(range ? { 'content-range': `bytes ${start}-${end}/${info.size}` } : {}) });
      if (req.method === 'HEAD') res.end(); else createReadStream(file, { start, end }).pipe(res);
      return;
    }
    const contents = await readFile(file);
    res.writeHead(200, { ...headers, 'content-length': contents.length });
    res.end(req.method === 'HEAD' ? undefined : contents);
  } catch { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('No encontrado'); }
}

export const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname.startsWith('/api/admin/')) await api(req, res, pathname);
    else await staticFile(req, res, pathname);
  } catch (error) {
    if (!(error instanceof AdminError)) console.error('Error de servidor:', error);
    send(res, error instanceof AdminError ? error.status : 500, { error: error instanceof AdminError ? error.message : 'Error del servidor.' });
  }
});

if (process.env.NODE_ENV !== 'test') server.listen(Number(process.env.PORT || 3000), '0.0.0.0');

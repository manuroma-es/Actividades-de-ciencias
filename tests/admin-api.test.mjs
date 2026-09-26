import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword } from '../server/admin-core.mjs';

test('login, cookie, CSRF y logout protegen el panel', async () => {
  process.env.ADMIN_PASSWORD_HASH = await hashPassword('frase-de-prueba-segura');
  process.env.NODE_ENV = 'test';
  const { server } = await import('../server/index.mjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const fetchApi = (route, init) => fetch(base + route, init);
  try {
    assert.equal((await fetchApi('/api/admin/session')).status, 401);
    assert.equal((await fetchApi('/admin/')).status, 200);
    const media = await fetchApi('/media/repaso-mates-web.mp4', { headers:{range:'bytes=0-15'} });
    assert.equal(media.status, 206);
    assert.equal((await media.arrayBuffer()).byteLength, 16);
    const invalidOrigin = await fetchApi('/api/admin/login', { method:'POST', headers:{origin:'https://other.test'}, body:JSON.stringify({password:'frase-de-prueba-segura'}) });
    assert.equal(invalidOrigin.status, 403);
    const login = await fetchApi('/api/admin/login', { method:'POST', headers:{origin:base}, body:JSON.stringify({password:'frase-de-prueba-segura'}) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const { csrf } = await login.json();
    assert.match(login.headers.get('set-cookie'), /HttpOnly/);
    assert.equal((await fetchApi('/api/admin/session', { headers:{cookie} })).status, 200);
    assert.equal((await fetchApi('/api/admin/analyze', { method:'POST', headers:{cookie,origin:base}, body:'{}' })).status, 403);
    assert.equal((await fetchApi('/api/admin/analyze', { method:'POST', headers:{cookie,origin:base,'x-admin-csrf':csrf}, body:JSON.stringify({url:'https://localhost/private'}) })).status, 400);
    assert.equal((await fetchApi('/api/admin/logout', { method:'POST', headers:{cookie,origin:base,'x-admin-csrf':csrf}, body:'{}' })).status, 200);
    assert.equal((await fetchApi('/api/admin/session', { headers:{cookie} })).status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

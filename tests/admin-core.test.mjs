import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AdminError, activitySlug, externalLink, inspectLink, validateDraft, hashPassword, verifyPassword } from '../server/admin-core.mjs';
import catalog from '../data/generated/catalog.json' with { type: 'json' };

const draft = { url:'https://wordwall.net/es/resource/999999999/prueba', platformId:'wordwall', resourceId:'999999999', title:'Prueba de importación', description:'Una actividad nueva.', subjectId:'matematicas', topicIds:['topic-matematicas-multiplicaciones','topic-matematicas-operaciones-combinadas'], typeId:'cuestionario', language:'es', verified:false };

test('parsing, ID, slug y relaciones múltiples', () => {
  assert.equal(externalLink(draft.url).id, 'WW-999999999');
  assert.equal(activitySlug(draft.title, draft.resourceId), 'prueba-de-importacion-999999999');
  assert.deepEqual(validateDraft(draft, catalog).topicIds, draft.topicIds);
  assert.throws(() => validateDraft({ ...draft, topicIds:[draft.topicIds[0],draft.topicIds[0]] }, catalog), AdminError);
  assert.throws(() => validateDraft({ ...draft, topicIds:['topic-ciencias-001'] }, catalog), AdminError);
  assert.throws(() => validateDraft({ ...draft, typeId:'desconocido' }, catalog), AdminError);
  assert.throws(() => validateDraft({ ...draft, language:'?' }, catalog), AdminError);
  assert.equal(validateDraft({ ...draft, url:'https://wordwall.net/new-format/999999999/game', manual:true }, catalog).verified, false);
  assert.throws(() => validateDraft({ ...draft, url:catalog.activities[0].source.url, platformId:catalog.activities[0].source.platformId, resourceId:catalog.activities[0].source.resourceId }, catalog), /existe/);
});

test('solo hosts exactos HTTPS y redirecciones del mismo recurso', async () => {
  for (const url of ['http://wordwall.net/es/resource/10', 'https://wordwall.net.evil.test/es/resource/10', 'https://127.0.0.1/es/resource/10', 'file:///etc/passwd', 'https://wordwall.net@evil.test/es/resource/10']) assert.throws(() => externalLink(url), AdminError);
  let calls = 0;
  await assert.rejects(inspectLink('https://wordwall.net/es/resource/10', async () => { calls++; return { status:302, headers:new Headers({ location:'http://localhost/private' }), body:null }; }), AdminError);
  assert.equal(calls, 1);
  const html = '<html><meta property="og:title" content="Prueba &amp; música"><meta property="og:description" content="Cuestionario"></html>';
  const response = await inspectLink('https://wordwall.net/es/resource/10', async () => new Response(html, { headers:{'content-type':'text/html'} }));
  assert.equal(response.title, 'Prueba & música');
  assert.equal(response.verified, true);
});

test('contraseña hasheada con sal', async () => {
  const hash = await hashPassword('una-frase-larga-de-prueba');
  assert.equal(await verifyPassword('una-frase-larga-de-prueba', hash), true);
  assert.equal(await verifyPassword('incorrecta', hash), false);
  assert.ok(!hash.includes('una-frase'));
});

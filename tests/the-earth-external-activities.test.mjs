import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const catalog = JSON.parse(await readFile(new URL('../data/generated/catalog.json', import.meta.url), 'utf8'));
const topicId = 'topic-biologia-geologia-the-earth';
const expected = [
  ['EP-30815160', 'What Are Cells Like? Animal and Plant Cell', 'https://es.educaplay.com/recursos-educativos/30815160-what_are_cells_like.html', 'https://es.educaplay.com/juego/30815160-what_are_cells_like.html'],
  ['EP-30945103', 'Animal Cell', 'https://es.educaplay.com/recursos-educativos/30945103-animal_cell.html', 'https://es.educaplay.com/juego/30945103-animal_cell.html'],
  ['EP-31000797', 'Plant Cell', 'https://es.educaplay.com/recursos-educativos/31000797-eukaryotic_cel.html', 'https://es.educaplay.com/juego/31000797-eukaryotic_cel.html'],
  ['LUMI-1PCQ0H', 'How Do Living Things Get Nutrients?', 'https://app.lumi.education/run/1PCQ0H', 'https://app.lumi.education/run/1PCQ0H'],
  ['LUMI-IUQRTE', 'How Do Living Things Reproduce? Parte 1', 'https://app.lumi.education/run/iuQrtE', 'https://app.lumi.education/run/iuQrtE'],
  ['WW-121629558', 'How Do Living Things Reproduce? Parte 2', 'https://wordwall.net/resource/121629558?wwmethod=link', 'https://wordwall.net/embed/fc0b8b174f2b466f80b7f879d3e72e14?themeId=1&templateId=2&fontStackId=0'],
  ['LUMI-3ARRY5', 'How Do Living Things Interact with Their Environment? Parte 1', 'https://app.lumi.education/run/3Arry5', 'https://app.lumi.education/run/3Arry5'],
  ['WW-121676126', 'How Do Living Things Interact with Their Environment? Parte 2', 'https://wordwall.net/resource/121676126?wwmethod=link', 'https://wordwall.net/embed/66f02bba25bd48fdbabe4bd91dec5d23?themeId=1&templateId=2&fontStackId=0'],
];

test('The Earth retains both native activities and adds the eight requested external activities in source order', () => {
  const topicActivities = catalog.activities.filter((activity) => activity.topicIds.includes(topicId));
  assert.equal(topicActivities.length, 10);
  assert.ok(topicActivities.some((activity) => activity.id === 'native-vital-functions'));
  assert.ok(topicActivities.some((activity) => activity.id === 'native-living-things-are-formed-of-cells'));
  assert.deepEqual(topicActivities.slice(-8).map(({ id, title }) => [id, title]), expected.map(([id, title]) => [id, title]));
  for (const [id, title, url, embedUrl] of expected) {
    const activity = topicActivities.find((entry) => entry.id === id);
    assert.equal(activity.title, title);
    assert.equal(activity.source.url, url);
    assert.equal(activity.source.embedUrl, embedUrl);
  }
});

test('The Earth topic page displays the eight new activities in the Markdown order', async () => {
  const html = await readFile(new URL('../out/asignatura/biologia-geologia/the-earth/index.html', import.meta.url), 'utf8');
  const positions = expected.map(([id]) => {
    const activity = catalog.activities.find((entry) => entry.id === id);
    return html.indexOf(`/actividad/${activity.slug}/`);
  });
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('each embedded detail page exports its player and a direct-link fallback', async () => {
  for (const [id, , url, embedUrl] of expected) {
    const activity = catalog.activities.find((entry) => entry.id === id);
    const html = await readFile(new URL(`../out/actividad/${activity.slug}/index.html`, import.meta.url), 'utf8');
    const escaped = (value) => value.replaceAll('&', '&amp;');
    assert.ok(html.includes(`src="${escaped(embedUrl)}"`), `iframe missing for ${id}`);
    assert.ok(html.includes(`href="${escaped(url)}"`), `direct-link fallback missing for ${id}`);
  }
});

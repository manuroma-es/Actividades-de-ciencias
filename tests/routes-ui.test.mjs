import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const catalog = JSON.parse(await readFile(path.join(root, "data/generated/catalog.json"), "utf8"));
const subjects = new Map(catalog.subjects.map((subject) => [subject.id, subject]));

async function html(relative) {
  return readFile(path.join(root, "out", relative, "index.html"), "utf8");
}

test("exporta una ruta por asignatura activa y por relación asignatura-tema", async () => {
  for (const subject of catalog.subjects.filter((item) => item.status === "active")) {
    await access(path.join(root, "out/asignatura", subject.slug, "index.html"));
    const subjectHtml = await html(`asignatura/${subject.slug}`);
    for (const topic of catalog.topics.filter((item) => item.subjectId === subject.id)) {
      assert.match(subjectHtml, new RegExp(`/asignatura/${subject.slug}/${topic.slug}`));
      const topicHtml = await html(`asignatura/${subject.slug}/${topic.slug}`);
      assert.match(topicHtml, new RegExp(`<link rel="canonical" href="/asignatura/${subject.slug}/${topic.slug}"`));
    }
  }
});

test("mantiene cada alias de sección con canónica y navegación nueva", async () => {
  for (const topic of catalog.topics) {
    const subject = subjects.get(topic.subjectId);
    const aliasHtml = await html(`seccion/${topic.slug}`);
    const destination = `/asignatura/${subject.slug}/${topic.slug}`;
    assert.match(aliasHtml, new RegExp(`<link rel="canonical" href="${destination}"`));
    assert.match(aliasHtml, /<meta name="robots" content="noindex, follow"/);
    assert.ok(aliasHtml.includes(`/asignatura/${subject.slug}`));
  }
});

test("no exporta combinaciones de asignatura y tema incoherentes", async () => {
  await assert.rejects(access(path.join(root, "out/asignatura/no-existe/index.html")));
  await assert.rejects(access(path.join(root, "out/asignatura/ciencias/no-existe/index.html")));
  await assert.rejects(access(path.join(root, "out/asignatura/matematicas/historia/index.html")));
});

test("exporta Inicio, Explorar y Recientes y mantiene /actividades como alias", async () => {
  await access(path.join(root, "out/explorar/index.html"));
  await access(path.join(root, "out/recientes/index.html"));
  const alias = await html("actividades");
  assert.match(alias, /<link rel="canonical" href="\/explorar"/);
  assert.match(alias, /<meta name="robots" content="noindex, follow"/);
  const home = await readFile(path.join(root, "out/index.html"), "utf8");
  assert.match(home, /Actividades de repaso/);
  assert.match(home, /href="\/explorar\/"/);
  assert.match(home, /href="\/recientes\/"/);
});

test("cada actividad multitema aparece en todas sus vistas sin duplicar su entidad", async () => {
  assert.equal(new Set(catalog.activities.map((activity) => activity.id)).size, catalog.activities.length);
  for (const activity of catalog.activities.filter((item) => item.topicIds.length > 1)) {
    for (const topicId of activity.topicIds) {
      const topic = catalog.topics.find((item) => item.id === topicId);
      const subject = subjects.get(topic.subjectId);
      const topicHtml = await html(`asignatura/${subject.slug}/${topic.slug}`);
      assert.ok(topicHtml.includes(`/actividad/${activity.slug}`), `${activity.id} no aparece en ${topic.id}`);
    }
  }
});

test("las fichas conservan los 65 slugs y representan todas las fuentes externas", async () => {
  assert.equal(catalog.activities.filter((activity) => activity.primarySubjectId === "ciencias").length, 65);
  assert.ok(catalog.activities.every((activity) => activity.source.kind === "external"));
  for (const activity of catalog.activities) {
    const activityHtml = await html(`actividad/${activity.slug}`);
    assert.ok(activityHtml.includes(activity.source.url));
    assert.match(activityHtml, new RegExp(`<link rel="canonical" href="/actividad/${activity.slug}"`));
  }
});

test("los temas actuales tienen visual completo y existe fallback genérico", async () => {
  for (const topic of catalog.topics.filter((item) => item.subjectId === "ciencias")) {
    assert.match(topic.visual?.accent ?? "", /^#[0-9A-F]{6}$/i);
    assert.match(topic.visual?.accentSoft ?? "", /^#[0-9A-F]{6}$/i);
    assert.ok(topic.visual?.image);
    assert.ok(topic.visual?.imageAlt);
    assert.ok(topic.visual?.creditId);
  }
  const css = await readFile(path.join(root, "app/globals.css"), "utf8");
  const thumbnail = await readFile(path.join(root, "components/activity-thumbnail.tsx"), "utf8");
  assert.match(css, /activity-thumbnail\.visual-fallback/);
  assert.match(thumbnail, /Actividad de repaso/);
  assert.match(await readFile(path.join(root, "lib/catalog/presentation.ts"), "utf8"), /contrastText/);
  assert.doesNotMatch(css, /section-theme-\d/);
});

test("la UI usa BCP 47 y conserva es/en con soporte tipado para fr y native", async () => {
  const spanish = catalog.activities.find((activity) => activity.language === "es");
  const english = catalog.activities.find((activity) => activity.language === "en");
  assert.match(await html(`actividad/${spanish.slug}`), /lang="es"/);
  assert.match(await html(`actividad/${english.slug}`), /lang="en"/);
  const formatter = await readFile(path.join(root, "lib/catalog/presentation.ts"), "utf8");
  const typeFixture = await readFile(path.join(root, "tests/type-fixtures/multisubject-ui.tsx"), "utf8");
  assert.match(formatter, /Intl\.DisplayNames/);
  assert.match(typeFixture, /language: "fr"/);
  assert.match(typeFixture, /kind: "native"/);
  assert.match(typeFixture, /Tema sin imagen/);
});

test("la UI ya no depende de los adaptadores de dominio de Ciencias", async () => {
  await assert.rejects(access(path.join(root, "lib/science-data.ts")));
  await assert.rejects(access(path.join(root, "lib/section-media.ts")));
});

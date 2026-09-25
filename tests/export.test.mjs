import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const data = JSON.parse(await readFile(path.join(root, "data/generated/catalog.json"), "utf8"));

test("preserva la regresión pública de Ciencias", () => {
  const science=data.activities.filter((item)=>item.primarySubjectId==="ciencias");
  assert.equal(science.length, 65);
  assert.equal(data.topics.filter((item)=>item.subjectId==="ciencias").length, 11);
  assert.equal(science.reduce((total, item) => total + item.topicIds.length, 0), 69);
  assert.equal(science.filter((item) => item.topicIds.length > 1).length, 4);
  assert.equal(new Set(science.map((item) => item.id)).size, 65);
  assert.equal(new Set(science.map((item) => item.slug)).size, 65);
  assert.equal(new Set(science.map((item) => item.source.url)).size, 65);
});

test("mantiene cursos y enlaces públicos externos", () => {
  const platforms = new Set(data.platforms.map((platform) => platform.id));
  for (const activity of data.activities) {
    assert.ok(activity.originCourseLabel, `Curso ausente: ${activity.id}`);
    assert.equal(activity.source.kind, "external");
    assert.ok(platforms.has(activity.source.platformId), `Plataforma inesperada: ${activity.id}`);
    const url = new URL(activity.source.url);
    assert.ok(["wordwall.net", "es.educaplay.com"].includes(url.hostname), `Dominio inesperado: ${activity.source.url}`);
  }
});

test("exporta todas las rutas directas", async () => {
  const expected = [
    "index.html",
    "actividades/index.html",
    "explorar/index.html",
    "recientes/index.html",
    "sobre-el-proyecto/index.html",
    ...data.subjects.filter((subject) => subject.status === "active").map((subject) => `asignatura/${subject.slug}/index.html`),
    ...data.topics.map((topic) => {
      const subject = data.subjects.find((item) => item.id === topic.subjectId);
      return `asignatura/${subject.slug}/${topic.slug}/index.html`;
    }),
    ...data.topics.map((topic) => `seccion/${topic.slug}/index.html`),
    ...data.activities.map((activity) => `actividad/${activity.slug}/index.html`),
  ];
  await Promise.all(expected.map((relative) => access(path.join(root, "out", relative))));
  assert.equal(expected.length, 156);
});

test("exporta las once imágenes temáticas", async () => {
  const images = [
    "alimentacion.webp", "cuerpo-humano.webp", "derechos-y-deberes.webp",
    "historia.webp", "la-transicion-espanola.webp", "medio-ambiente-y-sostenibilidad.webp",
    "politica-y-organizacion-de-espana.webp", "relieve-y-geografia.webp",
    "reproduccion-humana.webp", "sociedad-y-poblacion.webp", "union-europea.webp",
  ];
  await Promise.all(images.map((name) => access(path.join(root, "out/sections", name))));
  assert.equal(images.length, data.topics.filter((topic) => topic.subjectId === "ciencias").length);
});

test("incluye la autoría y los créditos en el HTML", async () => {
  const home = await readFile(path.join(root, "out/index.html"), "utf8");
  const about = await readFile(path.join(root, "out/sobre-el-proyecto/index.html"), "utf8");
  assert.match(home, /actividades creadas y recopiladas por/);
  assert.match(home, /Alejandro Castaño Medina/);
  assert.match(about, /Creador de las actividades y autor de esta web/);
  assert.match(about, /Licencia gratuita de Magnific/);
});

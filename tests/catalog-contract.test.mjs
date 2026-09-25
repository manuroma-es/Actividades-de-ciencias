import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const catalog = JSON.parse(await readFile(path.join(root, "data/generated/catalog.json"), "utf8"));
const report = JSON.parse(await readFile(path.join(root, "data/generated/generation-report.json"), "utf8"));

function unique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} contiene duplicados`);
}

test("expone un contrato general versionado", () => {
  assert.equal(catalog.schemaVersion, 1);
  assert.ok(Array.isArray(catalog.subjects));
  assert.ok(Array.isArray(catalog.topics));
  assert.ok(Array.isArray(catalog.activityTypes));
  assert.ok(Array.isArray(catalog.platforms));
  assert.ok(Array.isArray(catalog.activities));
  assert.ok(Array.isArray(catalog.credits));
  assert.equal(report.schemaVersion, catalog.schemaVersion);
  assert.deepEqual(report.errors, []);
});

test("mantiene IDs y slugs únicos, incluidos los históricos", () => {
  for (const [label, records] of [["asignaturas", catalog.subjects], ["temas", catalog.topics], ["actividades", catalog.activities]]) {
    unique(records.map((record) => record.id), `${label}: IDs`);
    const current = records.map((record) => record.slug);
    const legacy = records.flatMap((record) => record.legacySlugs ?? []);
    unique([...current, ...legacy], `${label}: slugs actuales e históricos`);
  }
});

test("valida referencias y relaciones multiasignatura", () => {
  const subjectIds = new Set(catalog.subjects.map((subject) => subject.id));
  const topics = new Map(catalog.topics.map((topic) => [topic.id, topic]));
  for (const topic of catalog.topics) {
    assert.ok(subjectIds.has(topic.subjectId), `Asignatura huérfana en ${topic.id}`);
  }
  for (const activity of catalog.activities) {
    assert.ok(activity.subjectIds.length >= 1, `Sin asignatura: ${activity.id}`);
    assert.ok(activity.subjectIds.includes(activity.primarySubjectId), `Asignatura principal inválida: ${activity.id}`);
    for (const subjectId of activity.subjectIds) assert.ok(subjectIds.has(subjectId));
    for (const topicId of activity.topicIds) {
      const topic = topics.get(topicId);
      assert.ok(topic, `Tema huérfano ${topicId} en ${activity.id}`);
      assert.ok(activity.subjectIds.includes(topic.subjectId), `Asignatura del tema ausente en ${activity.id}`);
    }
    if (activity.primaryTopicId !== null) assert.ok(activity.topicIds.includes(activity.primaryTopicId));
  }
});

test("distingue fuentes externas y nativas", () => {
  const platformIds = new Set(catalog.platforms.map((platform) => platform.id));
  for (const activity of catalog.activities) {
    assert.ok(["external", "native"].includes(activity.source.kind));
    if (activity.source.kind === "external") {
      assert.ok(platformIds.has(activity.source.platformId));
      assert.match(activity.source.url, /^https?:\/\//);
      assert.ok(["unverified", "verified", "limited", "redirected", "broken"].includes(activity.source.linkStatus));
    } else {
      assert.ok(activity.source.native.contentPath);
      assert.ok(activity.source.native.activityType);
      assert.ok(Number.isInteger(activity.source.native.engineVersion));
    }
  }
});

test("valida fechas editoriales y de enlace por separado", () => {
  for (const activity of catalog.activities) {
    assert.ok(["draft", "review", "published", "archived"].includes(activity.publicationStatus));
    if (activity.publicationStatus === "published") assert.match(activity.dates.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
    if (activity.dates.publishedAt && activity.dates.updatedAt) {
      assert.ok(activity.dates.publishedAt <= activity.dates.updatedAt);
    }
    if (activity.source.kind === "external" && activity.source.lastVerifiedAt) {
      assert.match(activity.source.lastVerifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    }
  }
});

test("cada imagen configurada tiene crédito", () => {
  const creditIds = new Set(catalog.credits.map((credit) => credit.id));
  for (const entity of [...catalog.subjects, ...catalog.topics]) {
    if (entity.visual?.image) assert.ok(creditIds.has(entity.visual.creditId), `Crédito ausente: ${entity.id}`);
  }
});

test("el informe identifica exactamente el libro que generó el catálogo", async () => {
  const workbook = await readFile(path.join(root, "data/catalogo-actividades.xlsx"));
  const digest = createHash("sha256").update(workbook).digest("hex");
  assert.equal(catalog.source.sha256, digest);
  assert.equal(report.source.sha256, digest);
  assert.equal(report.source.file, "data/catalogo-actividades.xlsx");
});

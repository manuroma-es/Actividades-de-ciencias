import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const legacy = JSON.parse(await readFile(path.join(root, "tests/fixtures/science-data.legacy.json"), "utf8"));
const catalog = JSON.parse(await readFile(path.join(root, "data/generated/catalog.json"), "utf8"));

const newById = new Map(catalog.activities.map((activity) => [activity.id, activity]));
const platformNames = new Map(catalog.platforms.map((platform) => [platform.id, platform.name]));
const typeNames = new Map(catalog.activityTypes.map((type) => [type.id, type.name]));
const languageNames = new Map([["es", "Español"], ["en", "Inglés"], ["fr", "Francés"]]);
const topicLegacyIds = new Map(catalog.topics.map((topic) => [topic.id, topic.legacy?.sourceId]));
const scienceActivities = catalog.activities.filter((activity) => activity.primarySubjectId === "ciencias");
const scienceTopics = catalog.topics.filter((topic) => topic.subjectId === "ciencias");

function terms(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

test("conserva las entidades y recuentos del catálogo de Ciencias", () => {
  assert.equal(catalog.subjects.filter((subject) => subject.id === "ciencias").length, 1);
  assert.equal(scienceTopics.length, 11);
  assert.equal(scienceActivities.length, 65);
  assert.equal(scienceActivities.reduce((total, activity) => total + activity.topicIds.length, 0), 69);
  assert.equal(scienceActivities.filter((activity) => activity.topicIds.length > 1).length, 4);
  assert.deepEqual(Object.fromEntries(["educaplay", "wordwall"].map((id) => [id, scienceActivities.filter((activity) => activity.source.platformId === id).length])), { educaplay: 43, wordwall: 22 });
  assert.deepEqual(Object.fromEntries(["en", "es"].map((id) => [id, scienceActivities.filter((activity) => activity.language === id).length])), { en: 39, es: 26 });
  assert.equal(scienceActivities.filter((activity) => activity.source.kind === "external").length, 65);
});

test("conserva exactamente los campos públicos y su significado", () => {
  assert.deepEqual(new Set(scienceActivities.map((activity) => activity.id)), new Set(legacy.activities.map((activity) => activity.id)));
  for (const oldActivity of legacy.activities) {
    const activity = newById.get(oldActivity.id);
    assert.ok(activity, `Falta ${oldActivity.id}`);
    assert.equal(activity.slug, oldActivity.slug);
    assert.equal(activity.title, oldActivity.title);
    assert.equal(activity.sourceTitle, oldActivity.originalTitle);
    assert.equal(activity.description, oldActivity.description);
    assert.equal(activity.source.url, oldActivity.url);
    assert.equal(activity.source.canonicalUrl, oldActivity.canonicalUrl);
    assert.equal(platformNames.get(activity.source.platformId), oldActivity.platform);
    assert.equal(typeNames.get(activity.typeId), oldActivity.type);
    assert.equal(languageNames.get(activity.language), oldActivity.language);
    assert.equal(activity.originCourseLabel, oldActivity.course);
    assert.deepEqual(activity.tags, terms(oldActivity.tags));
    assert.deepEqual(activity.keywords, terms(oldActivity.keywords));
    assert.equal(activity.source.lastVerifiedAt, oldActivity.verifiedAt);
    assert.equal(activity.source.titleVerified, oldActivity.verifiedTitle === "Sí");
    assert.equal(activity.legacy.subjectLabel, oldActivity.subject);
    assert.equal(activity.legacy.linkStatusLabel, oldActivity.status);
    assert.deepEqual(activity.topicIds.map((id) => topicLegacyIds.get(id)), oldActivity.sectionIds);
    assert.equal(topicLegacyIds.get(activity.primaryTopicId), oldActivity.primarySectionId);
  }
});

test("aplica la política de fechas aprobada sin usar la verificación como publicación", () => {
  for (const activity of scienceActivities) {
    assert.equal(activity.dates.createdAt, null);
    assert.equal(activity.dates.publishedAt, "2026-09-06");
    assert.equal(activity.dates.updatedAt, "2026-09-06");
    assert.equal(activity.source.lastVerifiedAt, "2026-09-05");
    assert.notEqual(activity.dates.publishedAt, activity.source.lastVerifiedAt);
  }
});

test("conserva el mapa explícito SEC-xx a TopicId", () => {
  assert.equal(Object.keys(catalog.migration.topicIdMap).length, 11);
  for (let number = 1; number <= 11; number += 1) {
    const legacyId = `SEC-${String(number).padStart(2, "0")}`;
    assert.equal(catalog.migration.topicIdMap[legacyId], `topic-ciencias-${String(number).padStart(3, "0")}`);
  }
});

test("mantiene la huella del Excel histórico intacto", async () => {
  const source = await readFile(path.join(root, "data/Actividades_Ciencias_para_Sites.xlsx"));
  const digest = createHash("sha256").update(source).digest("hex");
  assert.equal(digest, "a83a3fed5cc7606e3ab18e5eba0c2ff948d10c01eccd49ce8d05376568b45263");
  assert.equal(catalog.migration.legacySourceSha256, digest);
});

test("mantiene EP-28734734 como recurso limitado y publicado", () => {
  const activity = newById.get("EP-28734734");
  assert.equal(activity.publicationStatus, "published");
  assert.equal(activity.source.linkStatus, "limited");
  assert.ok(catalog.qualityIssues.some((issue) => issue.activityId === activity.id && issue.status === "open"));
});

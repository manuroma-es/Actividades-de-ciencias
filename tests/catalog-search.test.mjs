import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { matchesActivityFilters, normalizeSearchText, rankSearchEntries, scoreSearchEntry } from "../lib/catalog/search-core.mjs";

const index = JSON.parse(await readFile("data/generated/search-index.json", "utf8"));
const catalog = JSON.parse(await readFile("data/generated/catalog.json", "utf8"));

test("normaliza tildes, mayúsculas y espacios", () => {
  assert.equal(normalizeSearchText("  ALIMENTACIÓN   Y CIENCIAS "), "alimentacion y ciencias");
});

test("exige todos los términos y encuentra tema y etiquetas", () => {
  const multiTerm = rankSearchEntries(index.entries, "MUSCLES write").map((item) => item.id);
  assert.ok(multiTerm.includes("EP-26216986"));
  const byTopic = rankSearchEntries(index.entries, "cuerpo humano");
  assert.ok(byTopic.length > 0);
  assert.ok(byTopic.every((item) => index.entries.find((entry) => entry.id === item.id).topics.includes("cuerpo humano")));
  assert.ok(rankSearchEntries(index.entries, "industrialización").some((item) => item.id === "WW-105308549"));
});

test("prioriza título, título de origen y tema sobre campos débiles", () => {
  const titleEntry = { id: "title", title: "sistema solar", sourceTitle: "", description: "", subjects: [], topics: [], tags: [], keywords: [], type: "", language: "", platform: "", source: "" };
  const descriptionEntry = { ...titleEntry, id: "description", title: "otro recurso", description: "sistema solar" };
  const topicEntry = { ...titleEntry, id: "topic", title: "otro recurso", topics: ["sistema solar"] };
  assert.ok(scoreSearchEntry(titleEntry, "sistema solar") > scoreSearchEntry(topicEntry, "sistema solar"));
  assert.ok(scoreSearchEntry(topicEntry, "sistema solar") > scoreSearchEntry(descriptionEntry, "sistema solar"));
});

test("combina OR dentro de una faceta y AND entre facetas", () => {
  const activity = catalog.activities[0];
  const base = { subjects: [activity.primarySubjectId, "otra"], topics: [], languages: [activity.language], types: [activity.typeId], platforms: [], sources: ["external"] };
  assert.equal(matchesActivityFilters(activity, base), true);
  assert.equal(matchesActivityFilters(activity, { ...base, languages: ["fr"] }), false);
  assert.equal(matchesActivityFilters(activity, { ...base, topics: ["topic-inexistente"] }), false);
  assert.equal(matchesActivityFilters(activity, { ...base, platforms: [activity.source.platformId] }), true);
  assert.equal(matchesActivityFilters(activity, { ...base, sources: ["native"] }), false);
});

test("los resultados globales permanecen desduplicados por ID", () => {
  const ids = rankSearchEntries(index.entries, "ciencias").map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(index.entries.map((item) => item.id)).size, index.entries.length);
});

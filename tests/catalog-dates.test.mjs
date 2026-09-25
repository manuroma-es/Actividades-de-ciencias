import assert from "node:assert/strict";
import test from "node:test";
import { NEW_BADGE_START_DATE, compareRecentActivities, isNewPublication, sortRecentActivities } from "../lib/catalog/dates-core.mjs";

function activity(id, publishedAt, updatedAt = publishedAt, publicationStatus = "published") {
  return { id, publicationStatus, dates: { createdAt: null, publishedAt, updatedAt } };
}

test("ordena recientes por publicación, actualización e ID", () => {
  const values = [activity("B", "2026-09-20", "2026-09-21"), activity("C", "2026-09-22"), activity("A", "2026-09-20", "2026-09-21")];
  assert.deepEqual(sortRecentActivities(values).map((item) => item.id), ["C", "A", "B"]);
  assert.ok(compareRecentActivities(values[1], values[0]) < 0);
});

test("excluye no publicados y fechas de publicación ausentes", () => {
  assert.deepEqual(sortRecentActivities([activity("A", null), activity("B", "2026-09-22", null, "review"), activity("C", "2026-09-21")]).map((item) => item.id), ["C"]);
});

test("Nueva respeta el inicio y el límite inclusivo de 21 días", () => {
  assert.equal(NEW_BADGE_START_DATE, "2026-09-23");
  assert.equal(isNewPublication("2026-09-22", new Date("2026-09-23T12:00:00Z")), false);
  assert.equal(isNewPublication("2026-09-23", new Date("2026-10-13T12:00:00Z")), true);
  assert.equal(isNewPublication("2026-09-23", new Date("2026-10-14T12:00:00Z")), true);
  assert.equal(isNewPublication("2026-09-23", new Date("2026-10-15T12:00:00Z")), false);
});

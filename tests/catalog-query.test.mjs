import assert from "node:assert/strict";
import test from "node:test";
import { parseExploreParams, serializeExploreParams } from "../lib/catalog/query-core.mjs";

const config = {
  subjects: [{ id: "ciencias", slug: "ciencias", name: "Ciencias" }, { id: "matematicas", slug: "matematicas", name: "Matemáticas" }],
  topics: [{ id: "cuerpo", slug: "cuerpo-humano", name: "Cuerpo humano", subjectId: "ciencias", aliases: ["SEC-10"] }, { id: "fracciones", slug: "fracciones", name: "Fracciones", subjectId: "matematicas", aliases: [] }],
  languages: [{ id: "es", slug: "es", name: "Español" }, { id: "en", slug: "en", name: "Inglés" }],
  types: [{ id: "quiz", slug: "quiz", name: "Cuestionario" }],
  platforms: [{ id: "wordwall", slug: "wordwall", name: "Wordwall" }],
  sources: ["external", "native"],
};

test("reconstruye parámetros nuevos y conserva enlaces compartibles", () => {
  const state = parseExploreParams("?q=fracciones&subject=matematicas&topic=fracciones&language=es&type=quiz&platform=wordwall&source=external&sort=recent", config);
  assert.deepEqual(state.filters.subjects, ["matematicas"]);
  assert.deepEqual(state.filters.topics, ["fracciones"]);
  assert.equal(serializeExploreParams(state, config).toString(), "q=fracciones&subject=matematicas&topic=fracciones&language=es&type=quiz&platform=wordwall&source=external&sort=recent");
});

test("convierte section y lang al formato moderno", () => {
  const state = parseExploreParams("?section=SEC-10&lang=Español", config);
  const serialized = serializeExploreParams(state, config).toString();
  assert.equal(serialized, "topic=cuerpo-humano&language=es");
});

test("elimina valores inválidos y combinaciones asignatura-tema incoherentes", () => {
  const state = parseExploreParams("?subject=matematicas|no-existe&topic=cuerpo-humano|fracciones&language=xx&source=otro", config);
  assert.deepEqual(state.filters.subjects, ["matematicas"]);
  assert.deepEqual(state.filters.topics, ["fracciones"]);
  assert.deepEqual(state.filters.languages, []);
  assert.deepEqual(state.filters.sources, []);
});

test("elige relevancia con búsqueda y orden temático sin consulta", () => {
  assert.equal(parseExploreParams("?q=cuerpo", config).sort, "relevance");
  assert.equal(parseExploreParams("?sort=relevance", config).sort, "theme");
});

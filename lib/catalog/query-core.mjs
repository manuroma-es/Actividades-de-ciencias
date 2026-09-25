import { normalizeSearchText } from "./search-core.mjs";

export const EMPTY_FILTERS = Object.freeze({
  subjects: [], topics: [], languages: [], types: [], platforms: [], sources: [],
});

function valuesFrom(params, ...names) {
  return names.flatMap((name) => (params.get(name) ?? "").split("|")).filter(Boolean);
}

function resolveMany(values, entries, aliases) {
  const resolved = [];
  for (const value of values) {
    const normalized = normalizeSearchText(value);
    const entry = entries.find((item) => [item.id, item.slug, item.name, ...(aliases?.(item) ?? [])]
      .filter(Boolean).some((candidate) => normalizeSearchText(candidate) === normalized));
    if (entry && !resolved.includes(entry.id)) resolved.push(entry.id);
  }
  return resolved;
}

export function parseExploreParams(search, config) {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const subjects = resolveMany(valuesFrom(params, "subject"), config.subjects);
  const topics = resolveMany(valuesFrom(params, "topic", "section"), config.topics, (item) => item.aliases ?? []);

  const coherentTopics = subjects.length
    ? topics.filter((topicId) => subjects.includes(config.topics.find((item) => item.id === topicId)?.subjectId))
    : topics;
  const languages = resolveMany(valuesFrom(params, "language", "lang"), config.languages);
  const types = resolveMany(valuesFrom(params, "type"), config.types);
  const platforms = resolveMany(valuesFrom(params, "platform"), config.platforms);
  const sources = valuesFrom(params, "source").filter((value, index, items) => config.sources.includes(value) && items.indexOf(value) === index);
  const query = (params.get("q") ?? "").trim();
  const requestedSort = params.get("sort");
  const allowedSorts = ["relevance", "recent", "az", "theme"];
  const sort = allowedSorts.includes(requestedSort) && (requestedSort !== "relevance" || query)
    ? requestedSort
    : query ? "relevance" : "theme";
  return {
    query,
    filters: { subjects, topics: coherentTopics, languages, types, platforms, sources },
    sort,
  };
}

function idsToParam(ids, entries) {
  return ids.map((id) => entries.find((item) => item.id === id)?.slug ?? id).join("|");
}

export function serializeExploreParams(state, config) {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.filters.subjects.length) params.set("subject", idsToParam(state.filters.subjects, config.subjects));
  if (state.filters.topics.length) params.set("topic", idsToParam(state.filters.topics, config.topics));
  if (state.filters.languages.length) params.set("language", idsToParam(state.filters.languages, config.languages));
  if (state.filters.types.length) params.set("type", idsToParam(state.filters.types, config.types));
  if (state.filters.platforms.length) params.set("platform", idsToParam(state.filters.platforms, config.platforms));
  if (state.filters.sources.length) params.set("source", state.filters.sources.join("|"));
  const defaultSort = state.query ? "relevance" : "theme";
  if (state.sort !== defaultSort) params.set("sort", state.sort);
  return params;
}

export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

function fields(entry) {
  return {
    title: [entry.title],
    sourceTitle: [entry.sourceTitle],
    topics: entry.topics,
    tags: entry.tags,
    keywords: entry.keywords,
    description: [entry.description],
    subjects: entry.subjects,
    type: [entry.type],
    language: [entry.language],
    platform: [entry.platform],
    source: [entry.source],
  };
}

export function scoreSearchEntry(entry, query) {
  const normalizedQuery = normalizeSearchText(query);
  const terms = normalizedQuery.split(" ").filter(Boolean);
  if (!terms.length) return 0;
  const searchable = fields(entry);
  const allValues = Object.values(searchable).flat();
  if (!terms.every((term) => allValues.some((value) => value.includes(term)))) return null;

  let score = 0;
  for (const term of terms) {
    if (searchable.title.some((value) => value.includes(term))) score += 700;
    else if (searchable.sourceTitle.some((value) => value.includes(term))) score += 560;
    else if (searchable.topics.some((value) => value.includes(term))) score += 480;
    else if ([...searchable.tags, ...searchable.keywords].some((value) => value.includes(term))) score += 360;
    else if (searchable.description.some((value) => value.includes(term))) score += 260;
    else score += 100;
  }

  if (entry.title === normalizedQuery) score += 1600;
  else if (entry.title.startsWith(normalizedQuery)) score += 1050;
  else if (entry.title.includes(normalizedQuery)) score += 800;
  if (entry.sourceTitle === normalizedQuery) score += 850;
  else if (entry.sourceTitle.startsWith(normalizedQuery)) score += 600;
  if (entry.topics.some((value) => value === normalizedQuery)) score += 700;
  return score;
}

export function rankSearchEntries(entries, query) {
  return entries
    .map((entry) => ({ id: entry.id, score: scoreSearchEntry(entry, query), title: entry.title }))
    .filter((item) => item.score !== null)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "es") || a.id.localeCompare(b.id))
    .map(({ id, score }) => ({ id, score }));
}

export function matchesActivityFilters(activity, filters) {
  return (!filters.subjects.length || activity.subjectIds.some((id) => filters.subjects.includes(id)))
    && (!filters.topics.length || activity.topicIds.some((id) => filters.topics.includes(id)))
    && (!filters.languages.length || filters.languages.includes(activity.language))
    && (!filters.types.length || filters.types.includes(activity.typeId))
    && (!filters.platforms.length || (activity.source.kind === "external" && filters.platforms.includes(activity.source.platformId)))
    && (!filters.sources.length || filters.sources.includes(activity.source.kind));
}

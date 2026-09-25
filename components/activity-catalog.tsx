"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { ActivityCard } from "@/components/activity-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { activityTypes, platforms } from "@/lib/catalog/data";
import { compareRecentActivities } from "@/lib/catalog/dates";
import { activityTypeById, platformById, subjectById, topicById } from "@/lib/catalog/indexes";
import { languageLabel } from "@/lib/catalog/presentation";
import { parseExploreParams, serializeExploreParams } from "@/lib/catalog/query-core.mjs";
import type { CatalogSort, ExploreQueryConfig } from "@/lib/catalog/query-core.mjs";
import { matchesActivityFilters, searchActivityIds } from "@/lib/catalog/search";
import type { CatalogFilterState } from "@/lib/catalog/search";
import { activeSubjects, activeTopics, publicActivities } from "@/lib/catalog/selectors";
import type { Activity } from "@/lib/catalog/schema";

const presentLanguages = [...new Set(publicActivities.map((activity) => activity.language))].sort();
const queryConfig: ExploreQueryConfig = {
  subjects: activeSubjects.map((subject) => ({ id: subject.id, slug: subject.slug, name: subject.name })),
  topics: activeTopics.map((topic) => ({ id: topic.id, slug: topic.slug, name: topic.name, subjectId: topic.subjectId, aliases: [topic.legacy?.sourceId, ...(topic.legacySlugs ?? [])].filter((item): item is string => Boolean(item)) })),
  languages: presentLanguages.map((language) => ({ id: language, slug: language, name: languageLabel(language) })),
  types: activityTypes.map((type) => ({ id: type.id, slug: type.id, name: type.name })),
  platforms: platforms.map((platform) => ({ id: platform.id, slug: platform.id, name: platform.name })),
  sources: ["external", "native"],
};
const emptyFilters: CatalogFilterState = { subjects: [], topics: [], languages: [], types: [], platforms: [], sources: [] };

function FilterGroup({ title, values, selected, onToggle }: { title: string; values: Array<{ value: string; label: string; count: number }>; selected: string[]; onToggle: (value: string) => void }) {
  const groupId = useId();
  if (!values.length) return null;
  return <fieldset className="filter-group"><legend>{title}</legend><div className="filter-options">{values.map((item, index) => {
    const id = `${groupId}-${index}`;
    return <label key={item.value} htmlFor={id}><Checkbox id={id} checked={selected.includes(item.value)} onCheckedChange={() => onToggle(item.value)} /><span>{item.label}</span><span className="filter-count">{item.count}</span></label>;
  })}</div></fieldset>;
}

function themeOrder(first: Activity, second: Activity) {
  const firstSubject = subjectById.get(first.primarySubjectId);
  const secondSubject = subjectById.get(second.primarySubjectId);
  const firstTopic = first.primaryTopicId ? topicById.get(first.primaryTopicId) : undefined;
  const secondTopic = second.primaryTopicId ? topicById.get(second.primaryTopicId) : undefined;
  return (firstSubject?.order ?? 999) - (secondSubject?.order ?? 999)
    || (firstTopic?.order ?? 999) - (secondTopic?.order ?? 999)
    || first.title.localeCompare(second.title, "es")
    || first.id.localeCompare(second.id);
}

export function ActivityCatalog({ lockedTopicId, lockedSubjectId, globalFilters = false }: { lockedTopicId?: string; lockedSubjectId?: string; globalFilters?: boolean }) {
  const lockedTopic = lockedTopicId ? topicById.get(lockedTopicId) : undefined;
  const lockedSubject = lockedSubjectId ? subjectById.get(lockedSubjectId) : undefined;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<CatalogFilterState>(emptyFilters);
  const [sort, setSort] = useState<CatalogSort>("theme");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const parsed = parseExploreParams(window.location.search, queryConfig);
    const scopedFilters = { ...parsed.filters, subjects: lockedSubjectId ? [] : parsed.filters.subjects, topics: lockedTopicId ? [] : parsed.filters.topics };
    // URL state is available only after static hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(parsed.query); setDebouncedQuery(parsed.query); setFilters(scopedFilters); setSort(parsed.sort); setHydrated(true);
  }, [lockedSubjectId, lockedTopicId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!hydrated) return;
    const params = serializeExploreParams({ query: debouncedQuery, filters, sort }, queryConfig);
    const next = `${window.location.pathname}${params.size ? `?${params}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState({ catalog: true }, "", next);
  }, [debouncedQuery, filters, sort, hydrated]);

  const scopedActivities = useMemo(() => publicActivities.filter((activity) => (!lockedSubjectId || activity.subjectIds.includes(lockedSubjectId)) && (!lockedTopicId || activity.topicIds.includes(lockedTopicId))), [lockedSubjectId, lockedTopicId]);
  const availableTopics = activeTopics.filter((topic) => lockedSubjectId ? topic.subjectId === lockedSubjectId : (!filters.subjects.length || filters.subjects.includes(topic.subjectId)));
  const countBy = (predicate: (activity: Activity) => boolean) => scopedActivities.filter(predicate).length;

  const results = useMemo(() => {
    const filtered = scopedActivities.filter((activity) => matchesActivityFilters(activity, filters));
    const scoreById = new Map(searchActivityIds(debouncedQuery).map((item) => [item.id, item.score]));
    const searched = debouncedQuery ? filtered.filter((activity) => scoreById.has(activity.id)) : filtered;
    return [...new Map(searched.map((activity) => [activity.id, activity])).values()].sort((first, second) => {
      if (sort === "az") return first.title.localeCompare(second.title, "es") || first.id.localeCompare(second.id);
      if (sort === "recent") return compareRecentActivities(first, second);
      if (sort === "relevance" && debouncedQuery) return (scoreById.get(second.id) ?? 0) - (scoreById.get(first.id) ?? 0) || themeOrder(first, second);
      return lockedTopic ? first.title.localeCompare(second.title, "es") : themeOrder(first, second);
    });
  }, [debouncedQuery, filters, lockedTopic, scopedActivities, sort]);

  function toggle(group: keyof CatalogFilterState, value: string) {
    setFilters((current) => {
      const currentValues = current[group] as string[];
      const nextValues = currentValues.includes(value) ? currentValues.filter((item) => item !== value) : [...currentValues, value];
      const next = { ...current, [group]: nextValues } as CatalogFilterState;
      if (group === "subjects") next.topics = next.topics.filter((topicId) => !next.subjects.length || next.subjects.includes(topicById.get(topicId)?.subjectId ?? ""));
      return next;
    });
  }

  function clearAll() { setQuery(""); setDebouncedQuery(""); setFilters(emptyFilters); setSort("theme"); }

  const chips = [
    ...filters.subjects.map((id) => ({ group: "subjects" as const, value: id, label: subjectById.get(id)?.name ?? id })),
    ...filters.topics.map((id) => ({ group: "topics" as const, value: id, label: topicById.get(id)?.name ?? id })),
    ...filters.languages.map((value) => ({ group: "languages" as const, value, label: languageLabel(value) })),
    ...filters.types.map((value) => ({ group: "types" as const, value, label: activityTypeById.get(value)?.name ?? value })),
    ...filters.platforms.map((value) => ({ group: "platforms" as const, value, label: platformById.get(value)?.name ?? value })),
    ...filters.sources.map((value) => ({ group: "sources" as const, value, label: value === "external" ? "Externa" : "Propia" })),
  ];
  const sourceValues = (["external", "native"] as const).map((source) => ({ value: source, label: source === "external" ? "Externa" : "Propia", count: countBy((activity) => activity.source.kind === source) })).filter((item) => item.count > 0);

  const filtersUi = <div className="filters-stack">
    {globalFilters && !lockedSubject ? <FilterGroup title="Asignatura" values={activeSubjects.map((subject) => ({ value: subject.id, label: subject.name, count: countBy((activity) => activity.subjectIds.includes(subject.id)) })).filter((item) => item.count > 0)} selected={filters.subjects} onToggle={(value) => toggle("subjects", value)} /> : null}
    {!lockedTopic ? <FilterGroup title="Tema" values={availableTopics.map((topic) => ({ value: topic.id, label: globalFilters && !filters.subjects.length && activeSubjects.length > 1 ? `${topic.name} · ${subjectById.get(topic.subjectId)?.name}` : topic.name, count: countBy((activity) => activity.topicIds.includes(topic.id)) })).filter((item) => item.count > 0)} selected={filters.topics} onToggle={(value) => toggle("topics", value)} /> : null}
    <FilterGroup title="Idioma" values={presentLanguages.map((language) => ({ value: language, label: languageLabel(language), count: countBy((activity) => activity.language === language) })).filter((item) => item.count > 0)} selected={filters.languages} onToggle={(value) => toggle("languages", value)} />
    <FilterGroup title="Tipo de actividad" values={activityTypes.map((item) => ({ value: item.id, label: item.name, count: countBy((activity) => activity.typeId === item.id) })).filter((item) => item.count > 0)} selected={filters.types} onToggle={(value) => toggle("types", value)} />
    <details className="secondary-filters" open={filters.platforms.length > 0 || filters.sources.length > 0}><summary>Más filtros</summary><FilterGroup title="Plataforma" values={platforms.map((platform) => ({ value: platform.id, label: platform.name, count: countBy((activity) => activity.source.kind === "external" && activity.source.platformId === platform.id) })).filter((item) => item.count > 0)} selected={filters.platforms} onToggle={(value) => toggle("platforms", value)} /><FilterGroup title="Origen" values={sourceValues} selected={filters.sources} onToggle={(value) => toggle("sources", value)} /></details>
    <Button variant="outline" className="clear-filter-button" onClick={clearAll}>Limpiar filtros</Button>
  </div>;

  return <div className="catalog-shell">
    <div className="catalog-toolbar"><div className="catalog-search"><label htmlFor="catalog-search">Buscar en las actividades</label><div className="catalog-search-field"><Search aria-hidden="true" /><input id="catalog-search" value={query} onChange={(event) => { setQuery(event.target.value); setSort((current) => event.target.value.trim() ? current === "theme" ? "relevance" : current : current === "relevance" ? "theme" : current); }} placeholder="Título, tema, concepto o actividad" /></div></div><div className="toolbar-controls"><Sheet><SheetTrigger asChild><Button variant="outline" className="mobile-filter-trigger"><Filter /> Filtros{chips.length ? ` (${chips.length})` : ""}</Button></SheetTrigger><SheetContent side="left" className="filter-sheet" showCloseButton={false}><SheetHeader><SheetTitle>Filtrar actividades</SheetTitle><SheetDescription>Combina asignaturas, temas, idiomas, tipos y origen.</SheetDescription></SheetHeader><SheetClose className="sheet-close-button" aria-label="Cerrar filtros"><X /></SheetClose><div className="filter-sheet-scroll">{filtersUi}</div></SheetContent></Sheet><div className="sort-control"><SlidersHorizontal aria-hidden="true" /><label htmlFor="sort-results">Ordenar</label><Select value={sort} onValueChange={(value) => setSort(value as CatalogSort)}><SelectTrigger id="sort-results"><SelectValue /></SelectTrigger><SelectContent>{debouncedQuery ? <SelectItem value="relevance">Relevancia</SelectItem> : null}<SelectItem value="recent">Más recientes</SelectItem><SelectItem value="az">Título A–Z</SelectItem><SelectItem value="theme">Orden temático</SelectItem></SelectContent></Select></div></div></div>
    {chips.length ? <div className="active-filters" aria-label="Filtros activos">{chips.map((chip) => <button key={`${chip.group}-${chip.value}`} onClick={() => toggle(chip.group, chip.value)}>{chip.label}<X aria-hidden="true" /></button>)}<button className="clear-link" onClick={clearAll}>Limpiar filtros</button></div> : null}
    <div className="catalog-layout"><aside className="desktop-filters" aria-label="Filtros"><div className="filter-heading"><Filter aria-hidden="true" /><h2>Filtros</h2></div>{filtersUi}</aside><section className="results-panel" aria-labelledby="results-heading"><div className="results-heading"><h2 id="results-heading">{results.length} {results.length === 1 ? "actividad" : "actividades"}</h2>{lockedTopic ? <span>en {lockedTopic.name}</span> : lockedSubject ? <span>de {lockedSubject.name}</span> : null}</div><p className="sr-only" aria-live="polite">Se muestran {results.length} resultados.</p>{results.length ? <div className="activity-grid">{results.map((activity) => <ActivityCard key={activity.id} activity={activity} currentTopic={lockedTopic} currentSubject={lockedSubject} />)}</div> : <div className="empty-state" role="status"><Search aria-hidden="true" /><h3>No hay resultados con esos criterios</h3><p>La combinación elegida no produjo resultados. Prueba otra búsqueda o elimina algún filtro.</p><Button onClick={clearAll}>Limpiar filtros</Button></div>}</section></div>
  </div>;
}

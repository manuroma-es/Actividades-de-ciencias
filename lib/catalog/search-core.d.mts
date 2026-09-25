import type { Activity, SearchIndexEntry } from "./schema";
export interface CatalogFilterState { subjects: string[]; topics: string[]; languages: string[]; types: string[]; platforms: string[]; sources: Array<"external" | "native"> }
export function normalizeSearchText(value: unknown): string;
export function scoreSearchEntry(entry: SearchIndexEntry, query: string): number | null;
export function rankSearchEntries(entries: SearchIndexEntry[], query: string): Array<{ id: string; score: number }>;
export function matchesActivityFilters(activity: Activity, filters: CatalogFilterState): boolean;

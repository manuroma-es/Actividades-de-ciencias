import type { CatalogFilterState } from "./search-core.mjs";
export type CatalogSort = "relevance" | "recent" | "az" | "theme";
export interface ExploreState { query: string; filters: CatalogFilterState; sort: CatalogSort }
export interface QueryEntry { id: string; slug?: string; name?: string; subjectId?: string; aliases?: string[] }
export interface ExploreQueryConfig { subjects: QueryEntry[]; topics: QueryEntry[]; languages: QueryEntry[]; types: QueryEntry[]; platforms: QueryEntry[]; sources: string[] }
export const EMPTY_FILTERS: CatalogFilterState;
export function parseExploreParams(search: string | URLSearchParams, config: ExploreQueryConfig): ExploreState;
export function serializeExploreParams(state: ExploreState, config: ExploreQueryConfig): URLSearchParams;

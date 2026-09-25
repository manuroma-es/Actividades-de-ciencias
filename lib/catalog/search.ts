import rawSearchIndex from "@/data/generated/search-index.json";
import { rankSearchEntries } from "@/lib/catalog/search-core.mjs";
import type { SearchIndex } from "@/lib/catalog/schema";

export { matchesActivityFilters, normalizeSearchText, scoreSearchEntry } from "@/lib/catalog/search-core.mjs";
export type { CatalogFilterState } from "@/lib/catalog/search-core.mjs";

export const searchIndex = rawSearchIndex as unknown as SearchIndex;

export function searchActivityIds(query: string) {
  return rankSearchEntries(searchIndex.entries, query);
}

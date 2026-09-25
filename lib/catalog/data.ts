import rawCatalog from "@/data/generated/catalog.json";
import type { Catalog } from "@/lib/catalog/schema";

export const catalog = rawCatalog as unknown as Catalog;

export const subjects = catalog.subjects;
export const topics = catalog.topics;
export const activities = catalog.activities;
export const mediaResources = catalog.mediaResources;
export const activityTypes = catalog.activityTypes;
export const platforms = catalog.platforms;
export const credits = catalog.credits;
export const qualityIssues = catalog.qualityIssues;
export const catalogInformation = catalog.information;

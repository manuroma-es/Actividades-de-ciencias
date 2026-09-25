import type { Activity, ISODate } from "./schema";
export const NEW_BADGE_DAYS: 21;
export const NEW_BADGE_START_DATE: ISODate;
export function compareRecentActivities(first: Activity, second: Activity): number;
export function sortRecentActivities(activities: Activity[]): Activity[];
export function isNewPublication(publishedAt: ISODate | null, today?: Date, startDate?: ISODate, windowDays?: number): boolean;
export function formatCatalogDate(date: ISODate | null, locale?: string): string;

export const NEW_BADGE_DAYS = 21;
export const NEW_BADGE_START_DATE = "2026-09-23";

const DAY_MS = 86_400_000;

function timestamp(value) {
  if (!value) return null;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareNullableDatesDesc(first, second) {
  const firstTime = timestamp(first);
  const secondTime = timestamp(second);
  if (firstTime === null && secondTime === null) return 0;
  if (firstTime === null) return 1;
  if (secondTime === null) return -1;
  return secondTime - firstTime;
}

export function compareRecentActivities(first, second) {
  return compareNullableDatesDesc(first.dates.publishedAt, second.dates.publishedAt)
    || compareNullableDatesDesc(first.dates.updatedAt, second.dates.updatedAt)
    || first.id.localeCompare(second.id);
}

export function sortRecentActivities(activities) {
  return activities
    .filter((activity) => activity.publicationStatus === "published" && activity.dates.publishedAt)
    .sort(compareRecentActivities);
}

export function isNewPublication(publishedAt, today = new Date(), startDate = NEW_BADGE_START_DATE, windowDays = NEW_BADGE_DAYS) {
  const published = timestamp(publishedAt);
  const start = timestamp(startDate);
  if (published === null || start === null || published < start) return false;
  const current = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const ageDays = Math.floor((current - published) / DAY_MS);
  return ageDays >= 0 && ageDays <= windowDays;
}

export function formatCatalogDate(date, locale = "es") {
  const parsed = timestamp(date);
  if (parsed === null) return "Fecha desconocida";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(parsed));
}

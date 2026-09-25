import type { CSSProperties } from "react";
import { activityTypeById, platformById, subjectById } from "@/lib/catalog/indexes";
import type { Activity, LinkStatus, Subject, Topic, VisualConfig } from "@/lib/catalog/schema";

export { formatCatalogDate } from "@/lib/catalog/dates";

const FALLBACK_ACCENT = "#285F79";
const FALLBACK_ACCENT_SOFT = "#DFEAF0";
const safeColor = /^#[0-9a-f]{6}$/i;

export type ThemeStyle = CSSProperties & {
  "--theme": string;
  "--theme-soft": string;
  "--theme-ink": string;
};

function contrastText(color: string) {
  const [red, green, blue] = [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)]
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance > 0.46 ? "#172534" : "#FFFFFF";
}

export function languageLabel(language: string, locale = "es") {
  try {
    const label = new Intl.DisplayNames([locale], { type: "language" }).of(language);
    if (label) return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
  } catch {
    // Unknown runtimes and tags retain a readable standards-based fallback.
  }
  return language.toUpperCase();
}

export function typeLabel(activity: Activity) {
  return activityTypeById.get(activity.typeId)?.name ?? activity.typeId;
}

export function platformLabel(activity: Activity) {
  return activity.source.kind === "external"
    ? platformById.get(activity.source.platformId)?.name ?? activity.source.platformId
    : "Actividad propia";
}

export function linkStatusLabel(status: LinkStatus) {
  return {
    unverified: "Pendiente de verificar",
    verified: "Enlace verificado",
    limited: "Información pública limitada",
    redirected: "Enlace redirigido",
    broken: "Enlace no disponible",
  }[status];
}

export function formatOriginCourse(course?: string) {
  return !course || course === "Curso de origen desconocido"
    ? "no lo recuerdo con certeza"
    : course;
}

function simplify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function shouldShowSourceTitle(activity: Activity) {
  return Boolean(activity.sourceTitle && simplify(activity.title) !== simplify(activity.sourceTitle));
}

export function resolveVisual(subject?: Subject, topic?: Topic): VisualConfig {
  const configuredSubject = subject ?? (topic ? subjectById.get(topic.subjectId) : undefined);
  return {
    accent: safeColor.test(topic?.visual?.accent ?? "")
      ? topic?.visual?.accent
      : safeColor.test(configuredSubject?.visual.accent ?? "")
        ? configuredSubject?.visual.accent
        : FALLBACK_ACCENT,
    accentSoft: safeColor.test(topic?.visual?.accentSoft ?? "")
      ? topic?.visual?.accentSoft
      : safeColor.test(configuredSubject?.visual.accentSoft ?? "")
        ? configuredSubject?.visual.accentSoft
        : FALLBACK_ACCENT_SOFT,
    icon: topic?.visual?.icon ?? configuredSubject?.visual.icon,
    image: topic?.visual?.image ?? configuredSubject?.visual.image,
    imageAlt: topic?.visual?.imageAlt ?? configuredSubject?.visual.imageAlt,
    imageObjectPosition: topic?.visual?.imageObjectPosition ?? configuredSubject?.visual.imageObjectPosition,
    creditId: topic?.visual?.creditId ?? configuredSubject?.visual.creditId,
  };
}

export function visualStyle(subject?: Subject, topic?: Topic): ThemeStyle {
  const visual = resolveVisual(subject, topic);
  const accent = visual.accent ?? FALLBACK_ACCENT;
  return {
    "--theme": accent,
    "--theme-soft": visual.accentSoft ?? FALLBACK_ACCENT_SOFT,
    "--theme-ink": contrastText(accent),
  };
}

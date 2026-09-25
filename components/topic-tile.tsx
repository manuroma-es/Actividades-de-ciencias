import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CatalogIcon } from "@/components/catalog-icon";
import { subjectById } from "@/lib/catalog/indexes";
import { resolveVisual, visualStyle } from "@/lib/catalog/presentation";
import { getTopicActivities, getTopicHref } from "@/lib/catalog/selectors";
import type { Topic } from "@/lib/catalog/schema";

export function TopicTile({ topic }: { topic: Topic }) {
  const subject = subjectById.get(topic.subjectId);
  const visual = resolveVisual(subject, topic);
  const count = getTopicActivities(topic).length;
  return (
    <Link href={getTopicHref(topic)} className={`section-tile${visual.image ? " has-topic-image" : " visual-fallback"}`} style={visualStyle(subject, topic)}>
      {visual.image ? <img src={visual.image} alt="" loading="lazy" decoding="async" style={{ objectPosition: visual.imageObjectPosition }} /> : null}
      <span className="section-tile-shade" aria-hidden="true" />
      <span className="section-number" aria-hidden="true">{String(topic.order).padStart(2, "0")}</span>
      {!visual.image ? <span className="topic-fallback-icon" aria-hidden="true"><CatalogIcon name={visual.icon} /></span> : null}
      <span className="section-name">{topic.name}</span>
      <span className="section-count">{count} {count === 1 ? "actividad" : "actividades"}</span>
      {visual.image && topic.legacy?.sourceId ? <small className="image-signature">Alejandro Castaño Medina</small> : null}
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

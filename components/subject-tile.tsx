import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CatalogIcon } from "@/components/catalog-icon";
import { visualStyle } from "@/lib/catalog/presentation";
import { getSubjectActivities, getSubjectTopics } from "@/lib/catalog/selectors";
import type { Subject } from "@/lib/catalog/schema";

export function SubjectTile({ subject }: { subject: Subject }) {
  const activities = getSubjectActivities(subject).length;
  const topics = getSubjectTopics(subject).length;
  return <Link className="subject-tile" href={`/asignatura/${subject.slug}`} style={visualStyle(subject)}>
    <span className="subject-tile-icon" aria-hidden="true"><CatalogIcon name={subject.visual.icon} /></span>
    <span className="subject-tile-copy"><strong>{subject.name}</strong><span>{subject.description ?? `${activities} actividades de repaso`}</span><small>{activities} actividades · {topics} temas</small></span>
    <ArrowRight aria-hidden="true" />
  </Link>;
}

import Link from "next/link";
import { ActivityCatalog } from "@/components/activity-catalog";
import { activityById } from "@/lib/catalog/indexes";
import { resolveVisual, visualStyle } from "@/lib/catalog/presentation";
import { getTopicActivities, getTopicMediaResources } from "@/lib/catalog/selectors";
import type { Subject, Topic } from "@/lib/catalog/schema";

export function TopicPageContent({ subject, topic }: { subject: Subject; topic: Topic }) {
  const visual = resolveVisual(subject, topic);
  const count = getTopicActivities(topic).length;
  const relatedMedia = getTopicMediaResources(topic.id);
  return (
    <main id="main-content" className="catalog-page site-container">
      <nav className="breadcrumbs" aria-label="Migas de pan">
        <Link href="/">Inicio</Link><span aria-hidden="true">/</span>
        <Link href={`/asignatura/${subject.slug}`}>{subject.name}</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{topic.name}</span>
      </nav>
      <div className={`page-heading section-page-heading${visual.image ? " has-topic-image" : " visual-fallback"}`} style={visualStyle(subject, topic)}>
        {visual.image ? <img src={visual.image} alt={visual.imageAlt ?? ""} style={{ objectPosition: visual.imageObjectPosition }} /> : null}
        <span className="section-hero-shade" aria-hidden="true" />
        <div className="section-heading-content"><p className="eyebrow">{subject.name} · Tema {String(topic.order).padStart(2, "0")}</p><h1>{topic.name}</h1><p>{topic.description ?? `${count} actividades de repaso relacionadas con este tema.`}</p></div>
        {visual.image ? <small className="image-signature">Alejandro Castaño Medina</small> : null}
      </div>
      <ActivityCatalog lockedSubjectId={subject.id} lockedTopicId={topic.id} />
      {relatedMedia.length ? <section className="topic-media" aria-labelledby="topic-media-heading"><h2 id="topic-media-heading">Videotutorial relacionado</h2>{relatedMedia.flatMap((resource) => resource.relatedActivityIds.flatMap((id) => { const activity = activityById.get(id); return activity ? [<p key={`${resource.id}-${id}`}><Link href={`/actividad/${activity.slug}`}>{resource.title}</Link> · Vídeo original creado en {resource.originCourseLabel}</p>] : []; }))}</section> : null}
    </main>
  );
}

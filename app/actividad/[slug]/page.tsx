import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Info } from "lucide-react";
import { notFound } from "next/navigation";
import { ActivityThumbnail } from "@/components/activity-thumbnail";
import { RelatedVideo } from "@/components/related-video";
import { BackToResults } from "@/components/back-to-results";
import { activityBySlug } from "@/lib/catalog/indexes";
import {
  formatCatalogDate,
  formatOriginCourse,
  languageLabel,
  linkStatusLabel,
  platformLabel,
  shouldShowSourceTitle,
  typeLabel,
} from "@/lib/catalog/presentation";
import {
  getActivitySubjects,
  getActivityMediaResources,
  getActivityTopics,
  getPrimarySubject,
  getPrimaryTopic,
  getTopicHref,
  routableActivities,
} from "@/lib/catalog/selectors";

export const dynamicParams = false;

export function generateStaticParams() {
  return routableActivities.flatMap((activity) => [activity.slug, ...(activity.legacySlugs ?? [])].map((slug) => ({ slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const activity = activityBySlug.get(slug)
    ?? routableActivities.find((item) => item.legacySlugs?.includes(slug));
  return activity ? {
    title: `${activity.title} | Actividades de repaso`,
    description: activity.description,
    alternates: { canonical: `/actividad/${activity.slug}` },
  } : {};
}

export default async function ActivityPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const activity = activityBySlug.get(slug)
    ?? routableActivities.find((item) => item.legacySlugs?.includes(slug));
  if (!activity) notFound();

  const relatedTopics = getActivityTopics(activity);
  const relatedSubjects = getActivitySubjects(activity);
  const primarySubject = getPrimarySubject(activity);
  const primaryTopic = getPrimaryTopic(activity);
  const relatedMedia = getActivityMediaResources(activity.id);
  const language = languageLabel(activity.language);
  const sourceLabel = platformLabel(activity);

  return (
    <main id="main-content" className="detail-page site-container">
      <nav className="breadcrumbs" aria-label="Migas de pan">
        <Link href="/">Inicio</Link><span aria-hidden="true">/</span>
        {primarySubject ? <><Link href={`/asignatura/${primarySubject.slug}`}>{primarySubject.name}</Link><span aria-hidden="true">/</span></> : <><Link href="/explorar">Explorar</Link><span aria-hidden="true">/</span></>}
        {primaryTopic ? <><Link href={getTopicHref(primaryTopic)}>{primaryTopic.name}</Link><span aria-hidden="true">/</span></> : null}
        <span aria-current="page">{activity.title}</span>
      </nav>
      <BackToResults />
      <article className="detail-layout">
        <div className="detail-main">
          <ActivityThumbnail activity={activity} />
          <div className="detail-badges"><span className={`platform-badge source-${activity.source.kind}${activity.source.kind === "external" ? ` platform-${activity.source.platformId}` : ""}`}>{sourceLabel}</span><span className="language-badge" lang={activity.language}>{language}</span><span className="type-badge">{typeLabel(activity)}</span></div>
          <h1 lang={activity.language}>{activity.title}</h1>
          <p className="detail-description">{activity.description}</p>
          {shouldShowSourceTitle(activity) ? <p className="original-title"><strong>Título original:</strong> <span lang={activity.language}>{activity.sourceTitle}</span></p> : null}
          <section className="detail-section"><h2>Asignaturas relacionadas</h2><div className="theme-links">{relatedSubjects.map((subject) => <Link key={subject.id} href={`/asignatura/${subject.slug}`}>{subject.name}</Link>)}</div></section>
          <section className="detail-section"><h2>Temas relacionados</h2><div className="theme-links">{relatedTopics.map((topic) => <Link key={topic.id} href={getTopicHref(topic)}>{topic.name}</Link>)}</div></section>
          {relatedMedia.map((resource) => <RelatedVideo key={resource.id} resource={resource} />)}
        </div>
        <aside className="detail-aside">
          {activity.source.kind === "external" ? (
            <>
              <a className="detail-external-button" href={activity.source.url} target="_blank" rel="noopener noreferrer">Abrir actividad en {sourceLabel} <ExternalLink aria-hidden="true" /></a>
              <p className="new-tab-note">La actividad se abrirá en una pestaña nueva en un sitio externo.</p>
              <p className="link-status"><strong>Estado:</strong> {linkStatusLabel(activity.source.linkStatus)}{activity.source.lastVerifiedAt ? ` · comprobado el ${formatCatalogDate(activity.source.lastVerifiedAt)}` : ""}</p>
            </>
          ) : (
            <div className="native-activity-notice"><strong>Actividad propia</strong><p>Este catálogo ya reconoce actividades nativas. Su ejecución se incorporará en una fase posterior.</p></div>
          )}
          <section className="course-context" aria-labelledby="context-heading"><Info aria-hidden="true" /><div><h2 id="context-heading">Contexto de la actividad</h2><p><strong>Curso en que la creé:</strong> {formatOriginCourse(activity.originCourseLabel)}.</p><p>Es un dato histórico personal; no indica el curso, la edad o el nivel para los que se recomienda la actividad.</p></div></section>
        </aside>
      </article>
    </main>
  );
}

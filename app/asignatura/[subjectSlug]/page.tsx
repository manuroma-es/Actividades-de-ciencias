import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActivityCatalog } from "@/components/activity-catalog";
import { CatalogIcon } from "@/components/catalog-icon";
import { TopicTile } from "@/components/topic-tile";
import { subjectBySlug } from "@/lib/catalog/indexes";
import { visualStyle } from "@/lib/catalog/presentation";
import { activeSubjects, getSubjectActivities, getSubjectTopics } from "@/lib/catalog/selectors";

export const dynamicParams = false;

export function generateStaticParams() {
  return activeSubjects.map((subject) => ({ subjectSlug: subject.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ subjectSlug: string }> }): Promise<Metadata> {
  const subject = subjectBySlug.get((await params).subjectSlug);
  return subject ? {
    title: `${subject.name} | Actividades de repaso`,
    description: subject.description,
    alternates: { canonical: `/asignatura/${subject.slug}` },
  } : {};
}

export default async function SubjectPage({ params }: { params: Promise<{ subjectSlug: string }> }) {
  const subject = subjectBySlug.get((await params).subjectSlug);
  if (!subject || subject.status !== "active") notFound();
  const subjectTopics = getSubjectTopics(subject);
  const activityCount = getSubjectActivities(subject).length;
  return (
    <main id="main-content" className="catalog-page site-container">
      <div className="page-heading subject-page-heading" style={visualStyle(subject)}>
        <div className="subject-heading-icon" aria-hidden="true"><CatalogIcon name={subject.visual.icon} /></div>
        <div><p className="eyebrow">Asignatura</p><h1>{subject.name}</h1><p>{subject.description ?? `${activityCount} actividades de repaso.`}</p></div>
      </div>
      <section className="subject-topics" aria-labelledby="subject-topics-heading">
        <div className="section-heading-row"><div><p className="eyebrow">Temas</p><h2 id="subject-topics-heading">Repasar {subject.name}</h2></div><span className="subject-count">{activityCount} actividades</span></div>
        <div className="section-grid">{subjectTopics.map((topic) => <TopicTile key={topic.id} topic={topic} />)}</div>
      </section>
      <section className="subject-activities" aria-labelledby="subject-activities-heading">
        <div className="page-heading compact-heading"><p className="eyebrow">Catálogo de la asignatura</p><h2 id="subject-activities-heading">Todas las actividades de {subject.name}</h2></div>
        <ActivityCatalog lockedSubjectId={subject.id} />
      </section>
    </main>
  );
}

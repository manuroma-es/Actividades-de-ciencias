import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ActivityThumbnail } from "@/components/activity-thumbnail";
import { NewActivityBadge } from "@/components/new-activity-badge";
import { formatCatalogDate } from "@/lib/catalog/dates";
import { languageLabel, platformLabel, typeLabel } from "@/lib/catalog/presentation";
import { getActivitySubjects, getActivityTopics } from "@/lib/catalog/selectors";
import type { Activity, Subject, Topic } from "@/lib/catalog/schema";

export function ActivityCard({
  activity,
  currentTopic,
  currentSubject,
  showPublishedDate = false,
}: {
  activity: Activity;
  currentTopic?: Topic;
  currentSubject?: Subject;
  showPublishedDate?: boolean;
}) {
  const relatedTopics = getActivityTopics(activity);
  const relatedSubjects = getActivitySubjects(activity);
  const primaryTopic = currentTopic ?? relatedTopics[0];
  const primarySubject = currentSubject
    ?? relatedSubjects.find((subject) => subject.id === primaryTopic?.subjectId)
    ?? relatedSubjects[0];
  const sourceLabel = platformLabel(activity);
  const language = languageLabel(activity.language);

  return (
    <article className="activity-card">
      <Link className="thumbnail-link" href={`/actividad/${activity.slug}`} aria-label={`Ver información sobre ${activity.title}`}>
        <ActivityThumbnail activity={activity} topic={currentTopic} subject={currentSubject} />
      </Link>
      <div className="card-content">
        <div className="badge-row">
          <span className={`platform-badge source-${activity.source.kind}${activity.source.kind === "external" ? ` platform-${activity.source.platformId}` : ""}`}>{sourceLabel}</span>
          <span className="language-badge" lang={activity.language}>{language}</span>
          <NewActivityBadge publishedAt={activity.dates.publishedAt} />
        </div>
        <h3><Link href={`/actividad/${activity.slug}`} lang={activity.language}>{activity.title}</Link></h3>
        <p className="card-description">{activity.description}</p>
        <dl className="card-meta">
          <div><dt>Tipo</dt><dd>{typeLabel(activity)}</dd></div>
          <div><dt>Asignatura</dt><dd>{primarySubject?.name ?? "Sin asignatura visible"}{relatedSubjects.length > 1 ? <span className="more-themes"> +{relatedSubjects.length - 1}</span> : null}</dd></div>
          <div><dt>Tema</dt><dd>{primaryTopic?.name ?? "Tema general"}{relatedTopics.length > 1 ? <span className="more-themes"> +{relatedTopics.length - 1} tema</span> : null}</dd></div>
          {showPublishedDate ? <div className="published-meta"><dt>Incorporada</dt><dd>{formatCatalogDate(activity.dates.publishedAt)}</dd></div> : null}
        </dl>
        {activity.source.kind === "external" ? (
          <a className="external-button" href={activity.source.url} target="_blank" rel="noopener noreferrer">
            Abrir actividad <ExternalLink aria-hidden="true" />
            <span className="sr-only"> en {sourceLabel}; se abre en una pestaña nueva</span>
          </a>
        ) : (
          <Link className="external-button native-button" href={`/actividad/${activity.slug}`}>Ver actividad</Link>
        )}
      </div>
    </article>
  );
}

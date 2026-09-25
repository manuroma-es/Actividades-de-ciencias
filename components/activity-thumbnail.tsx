import { CatalogIcon } from "@/components/catalog-icon";
import { activityTypeById, subjectById, topicById } from "@/lib/catalog/indexes";
import { resolveVisual, visualStyle } from "@/lib/catalog/presentation";
import { getPrimarySubject, getPrimaryTopic } from "@/lib/catalog/selectors";
import type { Activity, Subject, Topic } from "@/lib/catalog/schema";

export function ActivityThumbnail({
  activity,
  topic: topicOverride,
  subject: subjectOverride,
}: {
  activity: Activity;
  topic?: Topic;
  subject?: Subject;
}) {
  const topic = topicOverride
    ?? (activity.primaryTopicId ? topicById.get(activity.primaryTopicId) : undefined)
    ?? getPrimaryTopic(activity);
  const subject = subjectOverride
    ?? (topic ? subjectById.get(topic.subjectId) : undefined)
    ?? getPrimarySubject(activity);
  const visual = resolveVisual(subject, topic);
  const activityType = activityTypeById.get(activity.typeId);

  return (
    <div className={`activity-thumbnail${visual.image ? " has-topic-image" : " visual-fallback"}`} style={visualStyle(subject, topic)} aria-hidden="true">
      {visual.image ? <img src={visual.image} alt="" loading="lazy" decoding="async" style={{ objectPosition: visual.imageObjectPosition }} /> : null}
      <div className="thumbnail-shade" />
      <div className="thumbnail-icon"><CatalogIcon name={activityType?.icon ?? visual.icon} /></div>
      <span>{topic?.name ?? subject?.name ?? "Actividad de repaso"}</span>
      {visual.image && topic?.legacy?.sourceId ? <small className="image-signature">Alejandro Castaño Medina</small> : null}
    </div>
  );
}

import { activities, mediaResources, subjects, topics } from "@/lib/catalog/data";
import { subjectById, topicById } from "@/lib/catalog/indexes";
import type { Activity, Subject, Topic } from "@/lib/catalog/schema";

export const activeSubjects = subjects
  .filter((subject) => subject.status === "active")
  .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "es"));

export const activeTopics = topics
  .filter((topic) => topic.status === "active")
  .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "es"));

export const publicActivities = activities.filter(
  (activity) => activity.publicationStatus === "published",
);

export const routableActivities = activities.filter(
  (activity) => activity.publicationStatus === "published" || activity.publicationStatus === "archived",
);

export const publicMediaResources = mediaResources.filter((resource) => resource.status === "active");

export function getActivityMediaResources(activityId: string) {
  return publicMediaResources.filter((resource) => resource.relatedActivityIds.includes(activityId));
}

export function getTopicMediaResources(topicId: string) {
  return publicMediaResources.filter((resource) => resource.primaryTopicId === topicId);
}

export function getSubjectTopics(subjectOrId: Subject | string) {
  const subjectId = typeof subjectOrId === "string" ? subjectOrId : subjectOrId.id;
  return activeTopics.filter((topic) => topic.subjectId === subjectId);
}

export function getActivitySubjects(activity: Activity) {
  return activity.subjectIds
    .map((subjectId) => subjectById.get(subjectId))
    .filter((subject): subject is Subject => Boolean(subject));
}

export function getActivityTopics(activity: Activity) {
  return activity.topicIds
    .map((topicId) => topicById.get(topicId))
    .filter((topic): topic is Topic => Boolean(topic));
}

export function getPrimarySubject(activity: Activity) {
  return subjectById.get(activity.primarySubjectId) ?? getActivitySubjects(activity)[0];
}

export function getPrimaryTopic(activity: Activity) {
  return (activity.primaryTopicId ? topicById.get(activity.primaryTopicId) : undefined)
    ?? getActivityTopics(activity)[0];
}

export function getSubjectActivities(subjectOrId: Subject | string) {
  const subjectId = typeof subjectOrId === "string" ? subjectOrId : subjectOrId.id;
  return publicActivities.filter((activity) => activity.subjectIds.includes(subjectId));
}

export function getTopicActivities(topicOrId: Topic | string) {
  const topicId = typeof topicOrId === "string" ? topicOrId : topicOrId.id;
  return publicActivities.filter((activity) => activity.topicIds.includes(topicId));
}

export function getTopicForSubject(subject: Subject, topicSlug: string) {
  return getSubjectTopics(subject).find((topic) => topic.slug === topicSlug);
}

export function getTopicHref(topic: Topic) {
  const subject = subjectById.get(topic.subjectId);
  return subject ? `/asignatura/${subject.slug}/${topic.slug}` : "/explorar";
}

export function resolveTopicFilter(value: string) {
  return topicById.get(value)
    ?? topics.find((topic) => topic.legacy?.sourceId === value || topic.slug === value);
}

import { activities, activityTypes, credits, mediaResources, platforms, subjects, topics } from "@/lib/catalog/data";

export const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
export const subjectBySlug = new Map(subjects.map((subject) => [subject.slug, subject]));
export const topicById = new Map(topics.map((topic) => [topic.id, topic]));
export const topicBySlug = new Map(topics.map((topic) => [topic.slug, topic]));
export const activityById = new Map(activities.map((activity) => [activity.id, activity]));
export const activityBySlug = new Map(activities.map((activity) => [activity.slug, activity]));
export const mediaResourceById = new Map(mediaResources.map((resource) => [resource.id, resource]));
export const activityTypeById = new Map(activityTypes.map((type) => [type.id, type]));
export const platformById = new Map(platforms.map((platform) => [platform.id, platform]));
export const creditById = new Map(credits.map((credit) => [credit.id, credit]));

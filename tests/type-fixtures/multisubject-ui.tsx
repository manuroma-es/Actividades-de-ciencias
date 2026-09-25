import { ActivityCard } from "@/components/activity-card";
import { ActivityThumbnail } from "@/components/activity-thumbnail";
import { TopicTile } from "@/components/topic-tile";
import { languageLabel, resolveVisual } from "@/lib/catalog/presentation";
import type { Activity, Subject, Topic } from "@/lib/catalog/schema";

const subjectWithoutAssets: Subject = {
  id: "subject-fixture",
  name: "Asignatura de prueba",
  slug: "asignatura-de-prueba",
  order: 99,
  visual: { icon: "unknown-future-icon" },
  status: "active",
};

const topicWithoutAssets: Topic = {
  id: "topic-fixture",
  subjectId: subjectWithoutAssets.id,
  name: "Tema sin imagen",
  slug: "tema-sin-imagen",
  order: 1,
  status: "active",
};

const nativeActivity: Activity = {
  schemaVersion: 1,
  id: "NAT-FIXTURE",
  slug: "actividad-nativa-de-prueba",
  title: "Actividad nativa de prueba",
  description: "Fixture de tipos; no forma parte del catálogo público.",
  primarySubjectId: subjectWithoutAssets.id,
  subjectIds: [subjectWithoutAssets.id],
  primaryTopicId: topicWithoutAssets.id,
  topicIds: [topicWithoutAssets.id],
  language: "fr",
  typeId: "cuestionario",
  tags: [],
  keywords: [],
  dates: { createdAt: null, publishedAt: null, updatedAt: null },
  publicationStatus: "review",
  source: {
    kind: "native",
    native: { engineVersion: 1, activityType: "quiz", contentPath: "data/native/fixture.json" },
  },
};

export const multisubjectUiTypeFixtures = (
  <>
    <ActivityCard activity={nativeActivity} currentSubject={subjectWithoutAssets} currentTopic={topicWithoutAssets} />
    <ActivityThumbnail activity={nativeActivity} subject={subjectWithoutAssets} topic={topicWithoutAssets} />
    <TopicTile topic={topicWithoutAssets} />
  </>
);

export const frenchLanguageLabel: string = languageLabel("fr");
export const fallbackVisual = resolveVisual(subjectWithoutAssets, topicWithoutAssets);

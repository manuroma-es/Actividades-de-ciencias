export type ISODate = `${number}-${number}-${number}`;
export type SubjectId = string;
export type TopicId = string;
export type ActivityId = string;
export type LanguageTag = string;

export type PublicationStatus = "draft" | "review" | "published" | "archived";
export type LinkStatus = "unverified" | "verified" | "limited" | "redirected" | "broken";
export type EntityStatus = "active" | "hidden" | "archived";

export interface VisualConfig {
  accent?: string;
  accentSoft?: string;
  icon?: string;
  image?: string;
  imageAlt?: string;
  imageObjectPosition?: string;
  creditId?: string;
}

export interface Subject {
  id: SubjectId;
  name: string;
  shortName?: string;
  slug: string;
  legacySlugs?: string[];
  order: number;
  description?: string;
  visual: VisualConfig;
  status: EntityStatus;
}

export interface TopicLegacyMetadata {
  sourceId: string;
  originalName?: string;
  historicalCourse?: string;
  declaredCount?: number;
}

export interface Topic {
  id: TopicId;
  subjectId: SubjectId;
  name: string;
  slug: string;
  legacySlugs?: string[];
  order: number;
  description?: string;
  visual?: VisualConfig;
  status: EntityStatus;
  legacy?: TopicLegacyMetadata;
}

export interface ActivityTypeDefinition {
  id: string;
  name: string;
  icon?: string;
  order: number;
}

export interface PlatformDefinition {
  id: string;
  name: string;
  hostnames: string[];
  color?: string;
  order: number;
}

export interface ActivityDates {
  createdAt: ISODate | null;
  publishedAt: ISODate | null;
  updatedAt: ISODate | null;
}

export interface ExternalSource {
  kind: "external";
  platformId: string;
  resourceId?: string;
  url: string;
  canonicalUrl?: string;
  originalUrl?: string;
  linkStatus: LinkStatus;
  lastVerifiedAt: ISODate | null;
  titleVerified?: boolean;
  titleSource?: string;
  descriptionSource?: string;
  verificationNote?: string;
}

export interface NativeSourceData {
  engineVersion: number;
  activityType: string;
  contentPath: string;
}

export interface NativeSource {
  kind: "native";
  native: NativeSourceData;
}

export interface ActivityLegacyMetadata {
  subjectLabel?: string;
  linkStatusLabel?: string;
}

export interface Activity {
  schemaVersion: 1;
  id: ActivityId;
  slug: string;
  legacySlugs?: string[];
  title: string;
  sourceTitle?: string;
  description: string;
  primarySubjectId: SubjectId;
  subjectIds: SubjectId[];
  primaryTopicId: TopicId | null;
  topicIds: TopicId[];
  language: LanguageTag;
  typeId: string;
  originCourseLabel?: string;
  tags: string[];
  keywords: string[];
  dates: ActivityDates;
  publicationStatus: PublicationStatus;
  source: ExternalSource | NativeSource;
  legacy?: ActivityLegacyMetadata;
}

export interface MediaResource {
  id: string;
  kind: "video";
  title: string;
  description: string;
  language: LanguageTag;
  originCourseLabel?: string;
  subjectId: SubjectId;
  primaryTopicId: TopicId;
  topicIds: TopicId[];
  relatedActivityIds: ActivityId[];
  src: string;
  poster: string;
  visualDescriptionPath?: string;
  status: EntityStatus;
}

export interface AssetCredit {
  id: string;
  title: string;
  author?: string;
  sourceName: string;
  sourceUrl?: string;
  license: string;
  licenseUrl?: string;
  note?: string;
}

export interface QualityIssue {
  activityId: ActivityId;
  url: string;
  issueType: string;
  explanation: string;
  recommendedAction: string;
  status: string;
}

export interface CatalogInformation {
  field: string;
  explanation: string;
}

export interface CatalogMigration {
  legacySource?: string;
  legacySourceSha256?: string;
  topicIdMap: Record<string, TopicId>;
}

export interface Catalog {
  schemaVersion: 1;
  source: {
    file: string;
    sha256: string;
  };
  subjects: Subject[];
  topics: Topic[];
  activityTypes: ActivityTypeDefinition[];
  platforms: PlatformDefinition[];
  activities: Activity[];
  mediaResources: MediaResource[];
  credits: AssetCredit[];
  qualityIssues: QualityIssue[];
  information: CatalogInformation[];
  migration: CatalogMigration;
}

export interface SearchIndexEntry {
  id: ActivityId;
  title: string;
  sourceTitle: string;
  description: string;
  subjects: string[];
  topics: string[];
  tags: string[];
  keywords: string[];
  type: string;
  language: string;
  platform: string;
  source: string;
}

export interface SearchIndex {
  schemaVersion: 1;
  entries: SearchIndexEntry[];
}

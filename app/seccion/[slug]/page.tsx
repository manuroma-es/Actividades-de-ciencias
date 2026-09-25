import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicPageContent } from "@/components/topic-page-content";
import { subjectById, topicBySlug } from "@/lib/catalog/indexes";
import { activeTopics, getTopicHref } from "@/lib/catalog/selectors";

export const dynamicParams = false;

export function generateStaticParams() {
  return activeTopics.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const topic = topicBySlug.get((await params).slug);
  const subject = topic ? subjectById.get(topic.subjectId) : undefined;
  return subject && topic ? {
    title: `${topic.name} | ${subject.name}`,
    description: topic.description,
    alternates: { canonical: getTopicHref(topic) },
    robots: { index: false, follow: true },
  } : {};
}

export default async function LegacyTopicAliasPage({ params }: { params: Promise<{ slug: string }> }) {
  const topic = topicBySlug.get((await params).slug);
  const subject = topic ? subjectById.get(topic.subjectId) : undefined;
  if (!topic || !subject || topic.status !== "active" || subject.status !== "active") notFound();
  return <TopicPageContent subject={subject} topic={topic} />;
}

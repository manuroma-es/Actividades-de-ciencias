import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicPageContent } from "@/components/topic-page-content";
import { subjectBySlug } from "@/lib/catalog/indexes";
import { activeSubjects, getSubjectTopics, getTopicForSubject } from "@/lib/catalog/selectors";

export const dynamicParams = false;

export function generateStaticParams() {
  return activeSubjects.flatMap((subject) =>
    getSubjectTopics(subject).map((topic) => ({ subjectSlug: subject.slug, topicSlug: topic.slug })),
  );
}

export async function generateMetadata({ params }: { params: Promise<{ subjectSlug: string; topicSlug: string }> }): Promise<Metadata> {
  const { subjectSlug, topicSlug } = await params;
  const subject = subjectBySlug.get(subjectSlug);
  const topic = subject ? getTopicForSubject(subject, topicSlug) : undefined;
  return subject && topic ? {
    title: `${topic.name} | ${subject.name}`,
    description: topic.description,
    alternates: { canonical: `/asignatura/${subject.slug}/${topic.slug}` },
  } : {};
}

export default async function TopicPage({ params }: { params: Promise<{ subjectSlug: string; topicSlug: string }> }) {
  const { subjectSlug, topicSlug } = await params;
  const subject = subjectBySlug.get(subjectSlug);
  const topic = subject ? getTopicForSubject(subject, topicSlug) : undefined;
  if (!subject || subject.status !== "active" || !topic) notFound();
  return <TopicPageContent subject={subject} topic={topic} />;
}

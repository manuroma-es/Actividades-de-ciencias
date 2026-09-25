import type { Metadata } from "next";
import { ExplorePageContent } from "@/components/explore-page-content";

export const metadata: Metadata = {
  title: "Explorar actividades | Actividades de repaso",
  alternates: { canonical: "/explorar" },
  robots: { index: false, follow: true },
};

export default function ActivitiesAliasPage() { return <ExplorePageContent />; }

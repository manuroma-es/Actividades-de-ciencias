import type { Metadata } from "next";
import { ExplorePageContent } from "@/components/explore-page-content";

export const metadata: Metadata = {
  title: "Explorar actividades | Actividades de repaso",
  description: "Busca y filtra actividades de repaso por asignatura, tema, idioma, tipo, plataforma y origen.",
  alternates: { canonical: "/explorar" },
};

export default function ExplorePage() { return <ExplorePageContent />; }

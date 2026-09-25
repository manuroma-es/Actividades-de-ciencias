import type { Metadata } from "next";
import { RecentActivities } from "@/components/recent-activities";

export const metadata: Metadata = {
  title: "Actividades recientes | Actividades de repaso",
  description: "Últimas actividades incorporadas al catálogo de repaso.",
  alternates: { canonical: "/recientes" },
};

export default function RecentPage() {
  return <main id="main-content" className="recent-page site-container">
    <div className="page-heading"><p className="eyebrow">Nuevas incorporaciones</p><h1>Actividades recientes</h1><p>Ordenadas por la fecha en que se incorporaron públicamente al catálogo. Esta fecha es independiente de la creación original y de la comprobación de sus enlaces.</p></div>
    <RecentActivities />
  </main>;
}

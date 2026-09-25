import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { activeSubjects, publicActivities } from "@/lib/catalog/selectors";
import "./globals.css";

const subjectNames = activeSubjects.map((subject) => subject.name).join(", ");

export const metadata: Metadata = {
  title: "Actividades de repaso",
  description: `${publicActivities.length} actividades de repaso organizadas por asignaturas y temas. Contenido actual: ${subjectNames}.`,
  authors: [{ name: "Alejandro Castaño Medina" }],
  creator: "Alejandro Castaño Medina",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es"><body><a className="skip-link" href="#main-content">Saltar al contenido</a><SiteHeader />{children}<SiteFooter /></body></html>
  );
}

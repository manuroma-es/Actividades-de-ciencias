"use client";

import Link from "next/link";
import { BookOpenCheck, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { platforms } from "@/lib/catalog/data";
import { formatCatalogDate } from "@/lib/catalog/presentation";
import { publicActivities } from "@/lib/catalog/selectors";

const nav = [
  { href: "/", label: "Inicio" },
  { href: "/explorar", label: "Explorar" },
  { href: "/recientes", label: "Recientes" },
  { href: "/sobre-el-proyecto", label: "Sobre el proyecto" },
];

const platformNames = platforms.map((platform) => platform.name);
const platformSummary = platformNames.length > 1
  ? `${platformNames.slice(0, -1).join(", ")} o ${platformNames.at(-1)}`
  : platformNames[0] ?? "sus plataformas originales";
const lastVerifiedAt = publicActivities
  .flatMap((activity) => activity.source.kind === "external" && activity.source.lastVerifiedAt ? [activity.source.lastVerifiedAt] : [])
  .sort()
  .at(-1);

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <Link href="/" className="brand" aria-label="Actividades de repaso, inicio">
          <span className="brand-mark" aria-hidden="true"><BookOpenCheck /></span>
          <span>Actividades de repaso</span>
        </Link>
        <nav className="desktop-nav" aria-label="Navegación principal">
          {nav.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button className="mobile-menu-button" variant="outline" size="icon-lg" aria-label="Abrir menú">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent className="mobile-nav-sheet" showCloseButton={false}>
            <SheetHeader>
              <SheetTitle>Actividades de repaso</SheetTitle>
              <SheetDescription>Navegación principal</SheetDescription>
            </SheetHeader>
            <SheetClose className="sheet-close-button" aria-label="Cerrar menú"><X /></SheetClose>
            <nav className="mobile-nav" aria-label="Navegación móvil">
              {nav.map((item) => (
                <SheetClose asChild key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-inner">
        <div>
          <strong>Actividades de repaso</strong>
          <p>Actividades, recopilación y web creadas por <strong>Alejandro Castaño Medina</strong>.</p>
        </div>
        <nav aria-label="Enlaces del pie">
          <Link href="/explorar">Explorar</Link>
          <Link href="/recientes">Recientes</Link>
          <Link href="/sobre-el-proyecto">Sobre el proyecto</Link>
          <Link href="/sobre-el-proyecto#creditos-imagenes">Créditos</Link>
        </nav>
        <p className="footer-note"><span className="footer-signature">Alejandro Castaño Medina</span>{lastVerifiedAt ? ` Enlaces revisados el ${formatCatalogDate(lastVerifiedAt)}.` : ""} Las actividades externas se abren en {platformSummary}.</p>
      </div>
    </footer>
  );
}

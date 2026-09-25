import Link from "next/link";
import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { ActivityCard } from "@/components/activity-card";
import { HomeSearch } from "@/components/home-search";
import { SubjectTile } from "@/components/subject-tile";
import { platforms } from "@/lib/catalog/data";
import { sortRecentActivities } from "@/lib/catalog/dates";
import { activeSubjects, publicActivities } from "@/lib/catalog/selectors";

const recentActivities = sortRecentActivities(publicActivities).slice(0, 6);

export default function Home() {
  return <main id="main-content">
    <section className="home-intro site-container">
      <p className="eyebrow">Recursos educativos</p>
      <h1>Actividades de repaso</h1>
      <p className="home-subtitle">Encuentra una actividad y vuelve a practicar lo aprendido</p>
      <p className="home-description">Una biblioteca educativa organizada por asignaturas y temas, con actividades creadas y recopiladas por Alejandro Castaño Medina.</p>
      <HomeSearch />
    </section>
    <section className="home-section site-container" aria-labelledby="subjects-heading">
      <div className="section-heading-row"><div><p className="eyebrow">Asignaturas</p><h2 id="subjects-heading">Elige por dónde empezar</h2></div><Link href="/explorar" className="text-link">Explorar todo <ArrowRight aria-hidden="true" /></Link></div>
      <div className="subject-grid">{activeSubjects.map((subject) => <SubjectTile key={subject.id} subject={subject} />)}</div>
    </section>
    <section className="home-section recent-home site-container" aria-labelledby="recent-heading">
      <div className="section-heading-row"><div><p className="eyebrow">Incorporaciones al catálogo</p><h2 id="recent-heading">Actividades recientes</h2></div><Link href="/recientes" className="text-link">Ver todas las recientes <ArrowRight aria-hidden="true" /></Link></div>
      {recentActivities.length ? <div className="activity-grid">{recentActivities.map((activity) => <ActivityCard key={activity.id} activity={activity} showPublishedDate />)}</div> : <div className="empty-state"><p>Todavía no hay actividades con fecha pública de incorporación.</p><Link href="/explorar" className="primary-link-button">Explorar el catálogo</Link></div>}
      <div className="catalog-callout"><div><strong>{publicActivities.length} actividades disponibles</strong><span>Busca por asignatura, tema, idioma o tipo de actividad.</span></div><Link href="/explorar" className="primary-link-button">Abrir el catálogo completo <ArrowRight aria-hidden="true" /></Link></div>
    </section>
    <section className="about-teaser"><div className="site-container about-teaser-inner"><div className="about-icon" aria-hidden="true"><BookOpen /></div><div><h2>Un proyecto que nació estudiando Ciencias</h2><p>La colección empezó con actividades de Ciencias y ahora reúne también otras asignaturas, sin perder su organización ni su historia.</p><Link href="/sobre-el-proyecto" className="text-link">Conocer el proyecto <ArrowRight aria-hidden="true" /></Link></div><p className="external-note"><ExternalLink aria-hidden="true" /> Las actividades interactivas se abren en {platforms.map((platform) => platform.name).join(" o ")}.</p></div></section>
  </main>;
}

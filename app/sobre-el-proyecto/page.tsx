import Link from "next/link";
import { ArrowRight, ExternalLink, History, Layers3, PenLine } from "lucide-react";
import { credits, platforms } from "@/lib/catalog/data";
import { activeSubjects, activeTopics, publicActivities } from "@/lib/catalog/selectors";

export default function AboutPage() {
  return (
    <main id="main-content" className="about-page site-container">
      <div className="page-heading about-heading"><p className="eyebrow">Sobre el proyecto</p><h1>Una biblioteca de repaso que empezó con Ciencias</h1><p>El proyecto nació reuniendo actividades de Ciencias y Conocimiento del Medio creadas por Alejandro Castaño Medina a lo largo de sus estudios. Ahora la web está organizada como una plataforma multiasignatura. {activeSubjects.length === 1 ? `Por ahora, las actividades disponibles corresponden a ${activeSubjects[0].name}.` : `Actualmente hay actividades de ${activeSubjects.length} asignaturas.`}</p></div>
      <section className="author-panel"><div className="about-section-icon" aria-hidden="true"><PenLine /></div><div><p className="eyebrow">Autoría</p><h2>Alejandro Castaño Medina</h2><p>Creador de las actividades y autor de esta web; responsable de su recopilación, organización y revisión.</p></div><span className="author-mark" aria-hidden="true">ACM</span></section>
      <div className="about-grid">
        <section><div className="about-section-icon" aria-hidden="true"><History /></div><h2>De una lista de enlaces a una plataforma</h2><p>El proyecto surgió al reunir actividades de repaso para que una profesora pudiera encontrarlas y utilizarlas con facilidad. Cada recurso conserva su título, descripción, idioma, formato y enlace original.</p></section>
        <section><div className="about-section-icon" aria-hidden="true"><Layers3 /></div><h2>Organización por temas</h2><p>Las actividades se agrupan en {activeTopics.length} temas. Algunas pertenecen a dos temas, pero siempre son un único recurso y tienen una sola ficha. El catálogo permite buscarlas y filtrarlas sin duplicarlas.</p></section>
      </div>
      <section className="course-explanation"><h2>Qué significa “Curso en que la creé”</h2><p>Ese dato indica el curso en el que estudié el tema o creé la actividad. Es un contexto histórico personal. No indica la edad, el nivel o el curso para los que se recomienda el recurso. Cuando no recuerdo el curso con certeza, la ficha lo dice expresamente.</p></section>
      <section className="external-explanation"><ExternalLink aria-hidden="true" /><div><h2>Recursos actuales en plataformas externas</h2><p>Las actividades disponibles ahora se abren en {platforms.map((platform) => platform.name).join(" o ")}, en una pestaña nueva. Esta web organiza los recursos y conserva una ficha propia para cada uno.</p></div></section>
      <section className="image-credits" id="creditos-imagenes" aria-labelledby="credits-heading">
        <div className="credits-heading"><p className="eyebrow">Imágenes de los temas</p><h2 id="credits-heading">Créditos y procedencia</h2><p>Las imágenes originales de Ciencias conservan sus créditos y atribuciones. Las imágenes de los demás temas fueron preparadas para este proyecto; su procedencia figura junto a cada tema.</p></div>
        <div className="credits-list">
          {credits.map((credit) => <article className="credit-item" key={credit.id}>
            <h3>{credit.title}</h3>
            <p><strong>Autoría:</strong> {credit.author}</p>
            <p><strong>Procedencia:</strong> {credit.sourceUrl ? <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">{credit.sourceName}<ExternalLink aria-hidden="true" /></a> : credit.sourceName}</p>
            <p><strong>Licencia:</strong> {credit.license}</p>
          </article>)}
        </div>
        <p className="magnific-attribution"><a href="https://www.magnific.com" target="_blank" rel="noopener noreferrer">designed by rawpixel.com - Magnific.com</a></p>
      </section>
      <div className="about-cta"><p>Explora las {publicActivities.length} actividades y combina asignatura, tema, idioma, tipo y plataforma.</p><Link href="/explorar" className="primary-link-button">Abrir el catálogo <ArrowRight aria-hidden="true" /></Link></div>
    </main>
  );
}

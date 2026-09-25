import type { MediaResource } from "@/lib/catalog/schema";

export function RelatedVideo({ resource }: { resource: MediaResource }) {
  return (
    <section className="related-video detail-section" aria-labelledby={`media-${resource.id}`}>
      <p className="eyebrow">Ver explicación · después practicar</p>
      <h2 id={`media-${resource.id}`}>Videotutorial</h2>
      <h3 lang={resource.language}>{resource.title}</h3>
      <p>{resource.description}</p>
      <video controls playsInline preload="metadata" poster={resource.poster} width="910" height="512" aria-label={resource.title}>
        <source src={resource.src} type="video/mp4" />
        Tu navegador no puede reproducir el vídeo. <a href={resource.src}>Descarga el archivo MP4</a>.
      </video>
      {resource.visualDescriptionPath ? <p className="video-guide"><a href={resource.visualDescriptionPath}>Leer la guía visual del vídeo</a></p> : null}
    </section>
  );
}

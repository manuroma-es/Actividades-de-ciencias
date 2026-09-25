import { ActivityCatalog } from "@/components/activity-catalog";

export function ExplorePageContent() {
  return <main id="main-content" className="catalog-page site-container">
    <div className="page-heading"><p className="eyebrow">Catálogo general</p><h1>Explorar actividades</h1><p>Busca en todas las asignaturas y combina filtros para encontrar el repaso que necesitas.</p></div>
    <ActivityCatalog globalFilters />
  </main>;
}

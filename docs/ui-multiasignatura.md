# UI multiasignatura: Fase 2

Este documento registra el alcance histórico de la Fase 2. La experiencia de Fase 3, ya incorporada, se documenta en [experiencia-multiasignatura.md](experiencia-multiasignatura.md).

La Fase 2 conecta las rutas y componentes React directamente con el contrato general del catálogo. El producto público continúa mostrando únicamente Ciencias y mantiene su marca y navegación actuales.

## Rutas

- `/asignatura/[subjectSlug]`: página de asignatura, temas y actividades relacionados.
- `/asignatura/[subjectSlug]/[topicSlug]`: página canónica de tema. Solo se genera si el tema pertenece a la asignatura.
- `/seccion/[slug]`: alias estático legado. Conserva el contenido y declara como canónica la ruta de tema nueva, con `noindex, follow`.
- `/actividad/[slug]`: ficha única de actividad. Conserva los 65 slugs y declara su propia URL canónica.
- `/actividades`: se mantiene como catálogo público hasta Fase 3.

Todas las rutas dinámicas se generan desde `catalog.json` y declaran `dynamicParams = false`. Las combinaciones inexistentes o incoherentes no se exportan.

## API de interfaz

- `lib/catalog/selectors.ts` resuelve relaciones entre asignaturas, temas y actividades sin asumir una única asignatura o un único tema.
- `lib/catalog/presentation.ts` centraliza etiquetas de idiomas BCP 47, tipos, plataformas, estados de enlace y configuración visual segura.
- `components/catalog-icon.tsx` traduce tokens de icono del catálogo a iconos de interfaz y aporta un fallback genérico.
- `TopicTile`, `ActivityThumbnail`, `ActivityCard` y `ActivityCatalog` reciben entidades generales, no secciones científicas.

`lib/science-data.ts` y `lib/section-media.ts` se retiraron. Ningún componente de producción depende ya de IDs `SEC-xx`, nombres de idioma legados ni clases `section-theme-N`.

## Visuales

La configuración de cada asignatura o tema puede aportar color principal, color suave, icono, imagen, posición y crédito. La UI valida los colores antes de aplicarlos y usa una combinación sobria con texto blanco cuando no hay imagen o la configuración no es válida.

Los once temas de Ciencias conservan sus imágenes, posiciones y colores anteriores. Estos valores se migran al Excel general y se publican en `Topic.visual`.

## External y native

Las fichas y tarjetas bifurcan por `activity.source.kind`:

- `external`: plataforma, URL, estado del enlace, fecha de comprobación y CTA externa;
- `native`: presentación de catálogo y aviso preparado, sin motor de ejecución ni actividades nativas versionadas.

Una fixture TypeScript en memoria comprueba que una actividad `native`, un idioma `fr` y un tema sin imagen pueden atravesar los componentes sin modificar el catálogo público.

## Límites de la fase

No existen todavía `/explorar` ni `/recientes`; la portada, el header y el footer mantienen la experiencia pública previa. Fase 3 podrá construir esas vistas sobre los selectores e índices generales sin recuperar el adaptador histórico.

# Experiencia multiasignatura: Fase 3

La portada usa las asignaturas activas del catálogo y las seis últimas actividades publicadas; la búsqueda lleva a `/explorar?q=…`. La navegación pública ofrece Inicio, Explorar, Recientes y Sobre el proyecto. No hay asignaturas ficticias ni creador público.

`/explorar` busca sobre `data/generated/search-index.json`, generado de `catalogo-actividades.xlsx` junto a `catalog.json`; CI comprueba ambos artefactos. El índice guarda texto normalizado para ranking sin duplicar el contrato editorial. La búsqueda exige todos los términos, pondera título > título de origen/tema > etiquetas/descripción > metadatos y resuelve empates por título e ID. Las facetas derivadas del catálogo combinan OR dentro de cada grupo y AND entre grupos; una actividad multitema se muestra una sola vez. La URL acepta `q`, `subject`, `topic`, `language`, `type`, `platform`, `source`, `sort`. Los alias `section` y `lang` se normalizan en cliente, y se descartan filtros inválidos o temas ajenos a la asignatura seleccionada. Orden disponible: relevancia, recientes, título A–Z y temático.

`/actividades` sigue siendo un HTML estático operativo con el mismo catálogo; declara canónica `/explorar` y `noindex, follow`. Sus consultas antiguas se interpretan al hidratar el catálogo y la URL se actualiza a parámetros nuevos en la propia ruta alias. Los enlaces de navegación conducen a `/explorar`.

`/recientes` ordena únicamente actividades publicadas con `publishedAt`, después `updatedAt` e ID; muestra 24 y carga otros 24 a petición. La etiqueta «Nueva» depende de `publishedAt`, una ventana inclusiva de 21 días y `NEW_BADGE_START_DATE` en `lib/catalog/dates-core.mjs` (inicio de esta experiencia: 2026-09-23), para no etiquetar retrospectivamente las 65 actividades migradas. Ni el índice ni estas fechas usan `lastVerifiedAt` o tiempo de compilación.

El índice actual ocupa aproximadamente 49,6 kB sin comprimir y 6,8 kB con gzip. El catálogo editorial permanece intacto: 1 asignatura, 11 temas, 65 actividades, 69 relaciones y 4 actividades multitema. La siguiente fase podrá incorporar asignaturas y contenido mediante datos sin editar componentes React por asignatura.

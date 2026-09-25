# Catálogo multiasignatura: flujo de datos

La web pública reúne Ciencias, Francés, Lengua, Matemáticas e Inglés. Las actividades interactivas y los recursos multimedia relacionados son entidades distintas.

## Fuente de verdad

`data/catalogo-actividades.xlsx` es la fuente editable activa. `data/Actividades_Ciencias_para_Sites.xlsx` se conserva intacto como origen histórico de la migración.

El libro general contiene:

- `ASIGNATURAS`: configuración y presentación de cada asignatura.
- `TEMAS`: temas asociados a una asignatura, con assets y metadatos legados cuando existen.
- `MIGRACIÓN_TEMAS`: mapa auditable de los once IDs `SEC-xx` a los nuevos `TopicId`.
- `TIPOS_ACTIVIDAD`: vocabulario de tipos estable.
- `PLATAFORMAS`: plataformas externas y hosts conocidos.
- `ACTIVIDADES`: entidad única, fechas, estado editorial y origen external/native. Las 82 actividades actuales son externas; el vídeo no se mezcla en esta hoja.
- `ACTIVIDAD_TEMA`: relaciones muchos-a-muchos.
- `RECURSOS_RELACIONADOS`: recursos multimedia con IDs, temas, actividades relacionadas y rutas locales verificadas.
- `ENTRADA_ORIGINAL`: encabezados y notas del material de entrada, incluido «Adjetivos» para WW-55409289.
- `REVISION`: observaciones editoriales no bloqueantes aún abiertas.
- `CRÉDITOS`: autoría, procedencia y licencia de assets.
- `CONTROL_DE_CALIDAD`: incidencias que no deben perderse durante la generación.
- `INFORMACIÓN`: reglas del libro y procedencia.

Las celdas multivalor usan ` | ` como separador. Las etiquetas y palabras clave se convierten a arrays en el JSON.

## Archivos generados

`scripts/generate-catalog.py` lee el Excel, valida sus relaciones y escribe de manera determinista:

- `data/generated/catalog.json`;
- `data/generated/generation-report.json`.

El informe incluye la huella SHA-256 del libro, recuentos, distribución por plataforma e idioma, actividades multitema, errores y avisos. No contiene un timestamp de ejecución porque impediría comprobar un diff limpio sin aportar una fecha editorial válida.

Los JSON son artefactos. No deben editarse a mano.

## Comandos

Instalación:

```bash
npm ci
python -m pip install --requirement requirements.txt
```

Mantenimiento normal:

```bash
npm run catalog:generate
npm run catalog:validate
npm test
npm run lint
```

Repetir o comprobar la migración inicial:

```bash
npm run catalog:migrate
npm run catalog:migrate:check
```

`catalog:migrate` reconstruye el libro inicial de Ciencias y **sobrescribiría las nuevas asignaturas**. No debe ejecutarse para mantener el catálogo ampliado. `catalog:migrate:check` compara las filas históricas iniciales con la migración reproducible y admite filas y hojas posteriores.

## Recursos multimedia relacionados

`MediaResource` aparece en `catalog.json` como `mediaResources`, separado de `activities`. El generador lee `RECURSOS_RELACIONADOS`; el validador exige ID único, tipo `video`, idioma BCP 47, asignatura, tema principal incluido, temas de esa asignatura, al menos una actividad válida y archivos existentes bajo `public/media/`. El reproductor se muestra en la ficha de cada actividad relacionada y la página del tema principal ofrece un enlace. No hay ruta `/video/` ni filtro de actividad para multimedia.

El recurso `MEDIA-MATES-53716987` enlaza `WW-53716987`. El autor confirmó que el QR conduce a `https://wordwall.net/es/resource/53716987` y decidió publicar el vídeo histórico tal como fue creado en 4.º de Primaria. La copia distribuida `public/media/repaso-mates-web.mp4` se creó a partir de `REPASO DE MATES.mp4` mediante `ffmpeg -c copy -movflags +faststart`: no se recodificaron imagen ni audio. Original SHA-256 `ff0899000f1b0cabd82251d9e0d6a3797f3a8107724f03986cf25d3e22d93365`; derivada SHA-256 `9d09ab18703823ae6d3eb3c357b4fb9e74fae4760a5a83d733044e76e6e42d9f`. Se conserva una portada real del vídeo y una guía descriptiva de las pantallas. Según confirma el autor, el audio contiene únicamente música y no hay contenido verbal que transcribir o subtitular. La guía describe la información visual; no se añade ningún track de captions ficticio.

Tras desplegar en Hostinger, comprobar `Content-Type: video/mp4`, solicitudes `Range`, carga del póster y reproducción en Safari/iPadOS y Chrome/Android. La exportación estática sirve los assets sin API.

La comprobación de migración compara semánticamente el libro versionado con uno temporal: orden y nombres de hojas, dimensiones, valores, tipos y fórmulas de celdas, estilos, anchos y altos, filtros, paneles inmovilizados y propiedades deliberadas del documento. Un XLSX es un contenedor ZIP/XML, por lo que diferencias irrelevantes de serialización o metadatos ZIP se diagnostican pero no provocan un fallo si el libro lógico es idéntico.

## Contrato y validación

`lib/catalog/schema.ts` define el contrato TypeScript explícito. `data.ts` carga el catálogo e `indexes.ts` ofrece índices por ID y slug.

El generador bloquea, entre otros casos:

- IDs o slugs duplicados;
- colisiones de slugs históricos;
- referencias huérfanas;
- asignatura o tema principal fuera de sus arrays;
- plataformas, tipos o idiomas inválidos;
- actividades publicadas sin fecha;
- fuentes externas o nativas incompletas;
- cronologías incoherentes;
- URL canónicas o recursos de plataforma duplicados;
- imágenes sin crédito.

Los avisos no bloquean la generación. El estado inicial avisa de 65 fechas de creación desconocidas, el enlace limitado `EP-28734734` y dos actividades distintas que comparten el título “The European Union”.

## Consumo desde la interfaz

La interfaz consume `lib/catalog/data.ts`, `indexes.ts`, `selectors.ts` y `presentation.ts`. Los componentes trabajan con `Subject`, `Topic` y `Activity`, con idiomas BCP 47 y con la unión `external`/`native`.

El adaptador temporal `lib/science-data.ts` se retiró en Fase 2 porque ya no tiene consumidores. También se retiró `lib/section-media.ts`: colores, iconos, imágenes, posiciones y créditos se resuelven desde `Subject.visual` y `Topic.visual`, con un fallback accesible cuando faltan assets.

`tests/fixtures/science-data.legacy.json` se conserva exclusivamente como fixture de regresión para demostrar la paridad de la migración; no es una fuente activa.

## Imágenes de los temas

Cada Topic público tiene su propio WebP de 1600 × 900 bajo `public/images/topics/`. Los 21 visuales añadidos en esta fase proceden de la selección aprobada; sus hashes, PNG de origen, fecha, posición de recorte y método de preparación se registran en `data/topic-image-sources.json`. Los once WebP históricos de Ciencias permanecen en `public/sections/` sin cambios. El ZIP original aprobado se conserva fuera del repositorio para evitar versionar también los PNG de alta resolución.

Para añadir un tema: colocar un WebP con nombre basado en el ID del Topic, rellenar `Imagen`, `Posición de imagen` cuando haga falta y `ID de crédito` en `TEMAS`, y añadir la procedencia a `CRÉDITOS`. `Presentación de cabecera = contain` reserva la imagen completa para diagramas en el hero; el valor vacío usa `cover`. `Icono` es opcional y solo actúa como apoyo/fallback. El texto alternativo se rellena si la imagen comunica algo que el nombre y la descripción no explican. Después, ejecutar `npm run catalog:generate`, `npm run catalog:validate` y las pruebas. El validador rechaza rutas ausentes, créditos inexistentes, imágenes duplicadas y presentaciones no admitidas.

Las imágenes nuevas se cargan localmente y las tarjetas usan carga diferida. El nombre de Alejandro superpuesto se mantiene únicamente en los once visuales históricos de Ciencias; los créditos de procedencia están en «Sobre el proyecto».

## Añadir datos en fases posteriores

Una nueva asignatura se añadirá mediante filas en `ASIGNATURAS`, `TEMAS`, `ACTIVIDADES` y `ACTIVIDAD_TEMA`, más créditos cuando use imágenes. Las rutas de asignatura y tema se generan ya desde esos datos. La portada general, `/explorar`, `/recientes` y la navegación de producto pertenecen a Fase 3.

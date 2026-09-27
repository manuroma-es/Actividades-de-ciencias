# Actividades de repaso

Web educativa creada por Alejandro Castaño Medina. Nació con 65 actividades de Ciencias y Conocimiento del Medio organizadas en 11 temas y publicadas originalmente en Wordwall y Educaplay. Ahora reúne 82 actividades en cinco asignaturas y un videotutorial relacionado, sin contar el vídeo como actividad interactiva.

## Tecnología

- Next.js y React para el código fuente.
- Exportación estática a HTML, CSS y JavaScript.
- Sin base de datos ni servicios de ChatGPT Sites. El panel privado requiere un proceso Node.js y secretos del servidor.
- La carpeta de producción generada es `out/`.

## Requisitos

- Node.js 20.9 o posterior. Se recomienda Node.js 22.
- npm.
- Python 3.12 y las dependencias de `requirements.txt` para regenerar el catálogo.

## Desarrollo local

```bash
npm ci
npm run build
npm run dev
```

La dirección local predeterminada es `http://localhost:5173`. El servidor de desarrollo muestra la exportación estática generada en `out/`.

## Compilación de producción

```bash
npm ci
npm run build
```

Next.js genera la web estática completa en `out/`. El servidor Node sirve esos archivos y añade la API privada:

```bash
NODE_ENV=development npm start
```

En producción, `npm start` exige la contraseña hasheada, el token y el origen HTTPS antes de escuchar peticiones.

## Comprobaciones

```bash
npm run catalog:generate
npm run catalog:validate
npm test
npm run lint
```

Las pruebas compilan la web y comprueban el contrato, la migración, los recuentos, las relaciones, las rutas canónicas y legadas, las imágenes, los enlaces externos y los archivos exportados.

La exportación incluye rutas generadas desde el catálogo para cada asignatura y tema. Con los datos actuales están disponibles `/asignatura/ciencias` y once rutas `/asignatura/ciencias/{tema}`; las once rutas históricas `/seccion/{slug}` continúan como aliases estáticos canonicalizados.


## Panel en Cloudflare Workers

La exportación estática se mantiene en Hostinger; el proceso Node ya no hace falta para usar el panel. GitHub Actions despliega una copia estática del sitio con la API privada en un Cloudflare Worker con URL `workers.dev`. Abre `/admin/` en la URL mostrada en el resumen del workflow. El dominio principal y DNS no cambian.

En **Settings → Secrets and variables → Actions**, configura:

| Nombre | Tipo | Valor |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | Token limitado a **Edit Cloudflare Workers** en una sola cuenta Cloudflare. |
| `ADMIN_PASSWORD` | Secret | Contraseña larga, mínimo 16 caracteres. |
| `ACTIVITY_PUBLISH_TOKEN` | Secret | Fine-grained token para este repo con `Actions: write`, usado por el Worker para disparar y consultar publicación. |
| `CLOUDFLARE_ACCOUNT_ID` | Variable | ID de la cuenta Cloudflare. |

No pegues estos valores en el repositorio, issues ni chat. El workflow transfiere `ADMIN_PASSWORD` y `ACTIVITY_PUBLISH_TOKEN` al Worker como secretos cifrados. No se incluyen en el JavaScript público.

El workflow **Desplegar panel en Cloudflare Workers** se ejecuta al actualizar `main` y también puede iniciarse desde **Actions → Run workflow**. Después de desplegar, la URL del Worker aparece en el resumen. Guarda esa URL para abrir el panel. La publicación de una actividad actualiza también la copia estática del Worker mediante un segundo workflow dispatch.

La publicación normal conserva `data/catalogo-actividades.xlsx` como fuente única. El importador valida y regenera el catálogo antes del commit. Un commit con `GITHUB_TOKEN` no inicia workflows de tipo `push`; por eso el importador dispara explícitamente el despliegue de la copia Worker después del commit.

Para rotar `ADMIN_PASSWORD` o `ACTIVITY_PUBLISH_TOKEN`, actualiza el secreto de GitHub y ejecuta **Desplegar panel en Cloudflare Workers**. La sesión dura dos horas; cambiar la contraseña invalida las sesiones existentes. Para rotar Cloudflare API Token, crea otro con el mismo alcance, cambia `CLOUDFLARE_API_TOKEN` y revoca el anterior.

Hostinger debe continuar sirviendo `out/` para el sitio principal. Su ruta `/admin/` no contiene backend; utiliza `workers.dev/admin/`. La automatización de despliegue de Hostinger aún debe comprobarse desde hPanel cuando sea posible.

## Datos y recursos

- `data/Actividades_Ciencias_para_Sites.xlsx`: fuente histórica de Ciencias. No se modifica.
- `data/catalogo-actividades.xlsx`: fuente de verdad editable del catálogo general.
- `RECURSOS_RELACIONADOS` dentro de ese libro: videotutoriales y futuros recursos multimedia; se generan aparte de `Activity`.
- `data/generated/catalog.json`: catálogo generado usado por la aplicación.
- `data/generated/search-index.json`: índice ligero de búsqueda y facetas, generado del catálogo.
- `data/generated/generation-report.json`: huella, recuentos y avisos de cada generación, incluida la huella del índice.
- `tests/fixtures/science-data.legacy.json`: fixture de regresión; no es una fuente activa.
- `public/sections/`: once imágenes temáticas reutilizadas por las actividades.
- `public/media/`: MP4 de distribución, portada y guía visual del vídeo original de Matemáticas.
- La página **Sobre el proyecto** contiene los créditos y las licencias de las imágenes.

Después de editar el libro general, ejecuta:

```bash
python -m pip install --requirement requirements.txt
npm run catalog:generate
npm run catalog:validate
```

No edites los JSON generados a mano. CI vuelve a generarlos y falla si no coinciden con el Excel. No ejecutes `npm run catalog:migrate` sobre este libro: sobrescribiría las asignaturas añadidas tras Ciencias. `npm run catalog:migrate:check` contrasta las filas históricas de Ciencias con la migración inicial sin exigir que desaparezcan las filas nuevas.

El esquema y las hojas están documentados en [`docs/catalogo-multiasignatura.md`](docs/catalogo-multiasignatura.md). Las rutas y la compatibilidad de UI se describen en [`docs/ui-multiasignatura.md`](docs/ui-multiasignatura.md), y el flujo público de búsqueda en [`docs/experiencia-multiasignatura.md`](docs/experiencia-multiasignatura.md).

No se incluye una licencia para el código del repositorio.

## Gestión editorial desde el navegador

El panel de `workers.dev/admin/` permite consultar y filtrar actividades y temas, crear nuevos registros, editar campos editoriales y borrar registros recientes. «Añadir sección» equivale a crear un Topic dentro de una asignatura: el build genera `/asignatura/{asignatura}/{tema}/`. Una Activity puede pertenecer a varios Topics. Los IDs y slugs se conservan en las ediciones para no romper enlaces. El borrado de un Topic con actividades exige elegir un Topic de destino de la misma asignatura; los recursos multimedia y las rutas históricas bloquean el borrado. Las 65 actividades y 11 temas de la migración original siguen protegidos por la comprobación de paridad: el panel no permite borrarlos. Para un cambio histórico excepcional, revisa primero las relaciones y el fixture de migración en un PR específico.

La casilla **Mantener la sesión en este dispositivo** emite una cookie `HttpOnly`, `Secure`, `SameSite=Lax`, con expiración firmada de 30 días. Sin la casilla dura dos horas. La contraseña `ADMIN_PASSWORD` firma las sesiones: rotarla en Settings → Secrets and variables → Actions → Secrets y ejecutar el workflow de despliegue invalida las cookies anteriores. El logout borra la cookie de este navegador. No hay lista central de sesiones, así que una cookie robada no se puede revocar individualmente antes de expirar; rota la contraseña y redespliega el Worker si necesitas invalidarlas todas. El Worker comprueba `Origin` y un token CSRF en cada escritura. Usa la sesión larga solo en dispositivos de confianza.

El analizador admite URL HTTPS de hosts exactos de Wordwall o Educaplay, con redirecciones al mismo recurso, límite de 450 KB y tiempo de espera. La descripción de tipo nunca se toma como descripción de una actividad. Si la metadata parece genérica, deja el campo vacío para completarlo manualmente. No hay integración de IA ni clave de modelo: el flujo determinista y manual basta para esta versión.

La miniatura se elige desde el selector de archivos de Safari, incluido Fotos en iPad. Acepta PNG, JPEG y WebP de hasta 1 MB, dimensiones de 100 a 4096 píxeles y máximo 8 millones de píxeles. El Worker verifica firma y dimensiones; el runner vuelve a decodificarla con Pillow. GitHub almacena temporalmente un blob sin referencia y el workflow incorpora el archivo a `public/images/admin/` junto con el Excel, JSON generados y crédito en un único commit. Un blob de una operación abandonada no aparece en la web; GitHub gestiona su limpieza. No se borran assets anteriores automáticamente al reemplazar una imagen, porque podrían tener otros usos. Consulta `CRÉDITOS` y el catálogo antes de retirarlos en un PR separado. Los créditos se muestran en «Sobre el proyecto».

**Permiso necesario antes de usar la carga de imágenes:** cambia los permisos del token fine-grained que ya está en `ACTIVITY_PUBLISH_TOKEN` para el repositorio original: `Actions: write` y `Contents: write` (permite crear blobs sueltos). No copies ese secreto al fork ni lo pegues en el chat. Después de actualizar el token en GitHub Actions, ejecuta **Desplegar panel en Cloudflare Workers** para transmitirlo al Worker. Las operaciones sin imagen solo requieren `Actions: write`.

Cada publicación comprueba la huella SHA-256 del Excel, valida y regenera en GitHub Actions, ejecuta build, tests y lint y hace un commit en `main`. La concurrencia del workflow es serial y una petición basada en un Excel obsoleto se rechaza: recarga el panel cuando el Worker haya terminado su despliegue. GitHub Actions indica si el commit se completó; el despliegue de la copia del Worker ocurre después. El fork de `manuroma-es` se sincroniza, según la configuración comunicada por el propietario, cada tres a cinco horas, y Hostinger se sincroniza con ese fork aproximadamente cada veinte minutos. Esos intervalos no están verificados desde este repositorio. Comprueba la URL pública antes de afirmar que se publicó allí.

Para revertir, localiza el commit `catalog: admin change (admin:...)` en GitHub, haz `git revert <sha>` en una rama, regenera el catálogo y abre un PR. Incluye el asset nuevo si no tiene otros usos. Si el workflow falla, abre el enlace de la ejecución en el panel; los fallos de huella piden recargar después del despliegue, las referencias y datos inválidos aparecen en el paso de validación, y los permisos de blobs se resuelven en el token indicado arriba. Prueba el flujo completo en una rama o repositorio de ensayo con secretos ficticios antes de usar imágenes reales; la prueba de CI no llama a cuentas externas.

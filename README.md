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

## Despliegue en Hostinger desde GitHub

En hPanel, añade una web mediante **Deploy Web App** y selecciona este repositorio privado mediante **Connect with GitHub**.

Usa estos valores si Hostinger no los detecta automáticamente:

- Versión de Node.js: `22.x`
- Comando de instalación: `npm ci`
- Comando de compilación: `npm run build`
- Directorio de salida: `out` para la modalidad estática actual. Esta modalidad **no ejecuta el panel**.
- Para activar el panel, configura una Web App Node.js con build `npm run build`, arranque `npm start` (`server/index.mjs`) y las variables descritas abajo. Comprueba cómo hPanel enlaza el dominio antes de cambiar la web activa.

El workflow actual de GitHub solo valida y publica un ZIP de preview local. La integración real GitHub → Hostinger, su automatización y el plan concreto deben comprobarse en hPanel antes de afirmar que una actividad aparece en producción tras el commit.

También puedes ejecutar `npm run build` en un ordenador y subir el contenido de `out/` al directorio `public_html` de un hosting web tradicional.

## Panel privado: configuración y publicación

El panel está en `/admin/`. La página HTML se exporta estáticamente; las rutas `/api/admin/*` funcionan únicamente cuando `npm start` ejecuta el proceso Node.js. No publiques una exportación estática sola esperando que el formulario guarde cambios.

Configura estas variables **solo en el proceso servidor** de Hostinger:

| Variable | Uso |
| --- | --- |
| `ADMIN_PASSWORD_HASH` | Hash `scrypt` con sal de la contraseña del propietario. |
| `GITHUB_ACTIONS_TOKEN` | Fine-grained PAT, limitado a este repositorio con `Actions: read and write`. Permite disparar y consultar el workflow; no necesita permiso de escritura de Contents. |
| `ADMIN_ORIGIN` | Origen HTTPS exacto del panel, por ejemplo `https://tudominio.es`, sin `/` final. |
| `NODE_ENV` | `production` en el servidor público. |
| `PORT` | Puerto proporcionado por Hostinger; Node usa 3000 cuando falta en local. |

Genera el hash sin colocar la contraseña en el historial del shell: `read -rs ADMIN_INPUT; printf '%s' "$ADMIN_INPUT" | node server/hash-password.mjs; unset ADMIN_INPUT`. La contraseña debe tener al menos 16 caracteres. Copia **solo el hash** a `ADMIN_PASSWORD_HASH`. Nunca incluyas hash, contraseña ni token en Git o en `NEXT_PUBLIC_*`.

Para rotar la contraseña, genera un hash nuevo, reemplaza `ADMIN_PASSWORD_HASH` y reinicia la app. Para rotar el token, crea otro con el mismo alcance, reemplaza `GITHUB_ACTIONS_TOKEN` y revoca el anterior. Las sesiones viven en memoria del proceso durante ocho horas; reiniciar invalida todas las sesiones.

El servidor analiza la página pública de Wordwall/Educaplay con límite de tiempo y tamaño, permite corregir datos y envía el resultado a `.github/workflows/import-activity.yml`. Si falla la extracción, «Introducir datos manualmente» permite indicar ID, título, descripción, tipo, idioma y temas; el enlace queda sin verificar. El workflow modifica **solo** el Excel y los tres JSON generados, ejecuta validaciones, tests y lint y confirma en `main` si todo pasa. El panel consulta el run cada seis segundos. Un run verde indica commit; la ficha aparece cuando el alojamiento termina de desplegar ese commit. Un push creado con `GITHUB_TOKEN` no dispara automáticamente otros workflows de GitHub: por eso el importador ejecuta las comprobaciones dentro del mismo run. Comprueba por separado el redeploy automático de Hostinger.

Si falla, abre la ejecución enlazada en el panel y lee el paso fallido. Un Excel obsoleto requiere refrescar la app tras el siguiente despliegue; un duplicado se puede corregir sin perder la actividad original. Para revertir una publicación, revierte su commit `catalog: publish activity (admin:…)`, deja correr la validación y comprueba el nuevo despliegue. No edites `data/generated/` manualmente.

La escritura concurrente normal desde el panel se bloquea mientras hay un importador activo. El workflow serializa ejecuciones, comprueba la huella del Excel al empezar y hace push sin forzar; si alguien edita el libro mientras tanto, falla sin pisar esos cambios. GitHub Actions puede sustituir una ejecución pendiente por otra con la misma clave de concurrencia si se dispara manualmente más de una vez fuera del panel; usa el panel para publicaciones habituales.

### Prueba de integración antes de producción

Con un repo de prueba o una rama aislada, configura el backend con un PAT restringido a ese repo y adapta el owner/repo fijos solo en el entorno de prueba. Publica una actividad de prueba y verifica: login, análisis, selección de varios temas, commit del XLSX/JSON, run verde, ficha, búsqueda y Recientes. No uses `main` ni credenciales de producción para esta prueba. Después verifica el mecanismo de despliegue de Hostinger desde hPanel antes de cambiar la app pública de modalidad estática a Node.js.

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

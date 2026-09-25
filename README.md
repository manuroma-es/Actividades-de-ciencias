# Actividades de repaso

Web educativa creada por Alejandro Castaño Medina. Nació con 65 actividades de Ciencias y Conocimiento del Medio organizadas en 11 temas y publicadas originalmente en Wordwall y Educaplay. Ahora reúne 82 actividades en cinco asignaturas y un videotutorial relacionado, sin contar el vídeo como actividad interactiva.

## Tecnología

- Next.js y React para el código fuente.
- Exportación estática a HTML, CSS y JavaScript.
- Sin base de datos, servidor, credenciales ni servicios de ChatGPT Sites.
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

Next.js genera la web estática completa en `out/`. Puede servirse localmente con:

```bash
npm start
```

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
- Directorio de salida: `out`
- Archivo de entrada: ninguno; el resultado es estático

No se necesitan variables de entorno.

También puedes ejecutar `npm run build` en un ordenador y subir el contenido de `out/` al directorio `public_html` de un hosting web tradicional.

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

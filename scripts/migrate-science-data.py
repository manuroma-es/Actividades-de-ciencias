#!/usr/bin/env python3
"""Create the general catalog workbook from the historical Science workbook."""

from __future__ import annotations

import argparse
import hashlib
import re
import tempfile
from datetime import date, datetime
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

import openpyxl
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "data" / "Actividades_Ciencias_para_Sites.xlsx"
DEFAULT_OUTPUT = ROOT / "data" / "catalogo-actividades.xlsx"
PUBLISHED_DATE = date(2026, 9, 6)
VERIFIED_DATE = date(2026, 9, 5)
FIXED_DOCUMENT_TIME = datetime(2026, 9, 6, 10, 41, 43)
DELIMITER = " | "


TOPIC_ID_MAP = {f"SEC-{number:02d}": f"topic-ciencias-{number:03d}" for number in range(1, 12)}

TOPIC_MEDIA = {
    "SEC-01": ("/sections/historia.webp", "Biblia antigua, brújula y mapa histórico sobre una mesa", "center 58%"),
    "SEC-02": ("/sections/alimentacion.webp", "Platos con verduras, legumbres, frutos secos y otros alimentos", ""),
    "SEC-03": ("/sections/politica-y-organizacion-de-espana.webp", "Una persona deposita un sobre en una urna ante la bandera de España", ""),
    "SEC-04": ("/sections/sociedad-y-poblacion.webp", "Figuras de personas distribuidas sobre un mapa de Europa", ""),
    "SEC-05": ("/sections/medio-ambiente-y-sostenibilidad.webp", "Manos sostienen símbolos de la Tierra, el agua, la energía y las plantas", ""),
    "SEC-06": ("/sections/la-transicion-espanola.webp", "Proclamación de Juan Carlos I como rey de España en 1975", "center 38%"),
    "SEC-07": ("/sections/derechos-y-deberes.webp", "Puños alzados de distintos tonos de piel como símbolo de igualdad", "center 50%"),
    "SEC-08": ("/sections/union-europea.webp", "Estrellas de la bandera de la Unión Europea sobre un mapa de Europa", ""),
    "SEC-09": ("/sections/reproduccion-humana.webp", "Ilustración científica de espermatozoides aproximándose a un óvulo", ""),
    "SEC-10": ("/sections/cuerpo-humano.webp", "Ilustración anatómica del esqueleto, los órganos y el sistema circulatorio", "center 42%"),
    "SEC-11": ("/sections/relieve-y-geografia.webp", "Brújula sobre un mapa físico y político de Europa", ""),
}

TOPIC_COLORS = {
    "SEC-01": ("#285F79", "#DFEAF0"),
    "SEC-02": ("#4F722B", "#E6EFD9"),
    "SEC-03": ("#72549A", "#ECE5F3"),
    "SEC-04": ("#A35145", "#F3E3DE"),
    "SEC-05": ("#1E725E", "#D9EEE7"),
    "SEC-06": ("#946128", "#F2E8D6"),
    "SEC-07": ("#3567A1", "#DDE9F5"),
    "SEC-08": ("#296B88", "#DCECF2"),
    "SEC-09": ("#A14468", "#F3DFE7"),
    "SEC-10": ("#8B5741", "#EFE3DC"),
    "SEC-11": ("#376D63", "#DFECE9"),
}

MAGNIFIC_LICENSE = "Licencia gratuita de Magnific para uso comercial con atribución, según el certificado aportado."
TOPIC_CREDITS = {
    "SEC-01": ("rawpixel.com", "Magnific", "https://www.magnific.com/es/foto-gratis/vieja-biblia-mesa-madera_3012291.htm", MAGNIFIC_LICENSE),
    "SEC-02": ("jcomp", "Magnific", "https://www.magnific.com/es/foto-gratis/plato-tazon-fuente-buda-verduras-legumbres-vista-superior_13807905.htm", MAGNIFIC_LICENSE),
    "SEC-03": ("Magnific", "Magnific", "https://www.magnific.com/es/foto-gratis/persona-poniendo-sobre-cuadro-votacion-fondo-bandera-espanola_5866126.htm", MAGNIFIC_LICENSE),
    "SEC-04": ("Magnific", "Magnific", "https://www.magnific.com/es/foto-gratis/vista-superior-comunidad-estilo-papel-mapa_25403800.htm", MAGNIFIC_LICENSE),
    "SEC-05": ("rawpixel.com", "Magnific", "https://www.magnific.com/es/foto-gratis/presentando-mano-remix-medio-ambiente-sostenible-tierra_17602071.htm", MAGNIFIC_LICENSE),
    "SEC-06": ("Autoría no indicada en la documentación aportada", "EL PAÍS", "https://elpais.com/elpais/2006/02/07/album/1139297868_910215.html", "La documentación aportada no especifica la licencia de reutilización."),
    "SEC-07": ("Magnific", "Magnific", "https://www.magnific.com/es/vector-gratis/detener-concepto-racismo_8850000.htm", MAGNIFIC_LICENSE),
    "SEC-08": ("Autoría no indicada en la documentación aportada", "MARCA", "https://www.marca.com/futbol/primera-division/2025/05/10/bandera-union-europea-lado-marcadores-retransmision-partidos-futbol.html", "La documentación aportada no especifica la licencia de reutilización."),
    "SEC-09": ("Autoría no indicada en la documentación aportada", "Archivo facilitado para el proyecto", "", "No se aportó información de procedencia o licencia para esta imagen."),
    "SEC-10": ("brgfx", "Magnific", "https://www.magnific.com/es/vector-gratis/estructura-anatomica-cuerpos-humanos_26353260.htm", MAGNIFIC_LICENSE),
    "SEC-11": ("snowing", "Magnific", "https://www.magnific.com/es/foto-gratis/ompass-mapa-turistico-enfoque-aguja-brujula_1203158.htm", MAGNIFIC_LICENSE),
}

TYPE_DEFINITIONS = [
    ("cuestionario", "Cuestionario", "circle-help", 1),
    ("mapa-interactivo", "Mapa interactivo", "map-pinned", 2),
    ("clasificar-por-grupos", "Clasificar por grupos", "group", 3),
    ("relacionar-columnas", "Relacionar columnas", "columns-3", 4),
    ("diagrama-con-etiquetas", "Diagrama con etiquetas", "tags", 5),
    ("completar-frases", "Completar frases", "book-open-check", 6),
    ("relacionar-grupos", "Relacionar grupos", "network", 7),
    ("emparejar", "Emparejar", "puzzle", 8),
    ("juego-de-preguntas", "Juego de preguntas", "mouse-pointer-click", 9),
    ("ordenar-secuencia", "Ordenar secuencia", "arrow-down-up", 10),
    ("concurso-de-preguntas", "Concurso de preguntas", "list-checks", 11),
    ("ordenar-palabras", "Ordenar palabras", "rows-3", 12),
]
TYPE_ID_BY_NAME = {name: type_id for type_id, name, _icon, _order in TYPE_DEFINITIONS}

PLATFORM_DEFINITIONS = [
    ("wordwall", "Wordwall", "wordwall.net", "#1e625d", 1),
    ("educaplay", "Educaplay", "es.educaplay.com", "#7a3d22", 2),
]
PLATFORM_ID_BY_NAME = {name: platform_id for platform_id, name, _hosts, _color, _order in PLATFORM_DEFINITIONS}
LANGUAGE_CODES = {"Español": "es", "Inglés": "en", "Francés": "fr"}
LINK_STATUS = {
    "Verificado": "verified",
    "Accesible pero información limitada": "limited",
    "No accesible": "broken",
    "Redirección problemática": "redirected",
    "Requiere revisión": "unverified",
}


def clean(value):
    return value.strip() if isinstance(value, str) else value


def rows_as_dicts(sheet):
    rows = list(sheet.iter_rows(values_only=True))
    headers = [clean(value) for value in rows[0]]
    return [
        {headers[index]: clean(value) for index, value in enumerate(row)}
        for row in rows[1:]
        if any(value is not None for value in row)
    ]


def split_terms(value: str | None) -> list[str]:
    if not value:
        return []
    result = []
    seen = set()
    for item in str(value).split(","):
        term = item.strip()
        key = term.casefold()
        if term and key not in seen:
            seen.add(key)
            result.append(term)
    return result


def resource_id(activity_id: str, declared) -> str:
    if declared not in (None, ""):
        return str(declared).strip()
    return activity_id.split("-", 1)[1] if "-" in activity_id else activity_id


def append_sheet(workbook: Workbook, name: str, headers: list[str], rows: list[list], widths: dict[int, float] | None = None):
    sheet = workbook.create_sheet(name)
    sheet.sheet_view.showGridLines = False
    sheet.append(headers)
    for row in rows:
        sheet.append(row)
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    header_fill = PatternFill("solid", fgColor="175B72")
    header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    body_font = Font(name="Arial", size=10, color="172534")
    for cell in sheet[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for row in sheet.iter_rows(min_row=2):
        for cell in row:
            cell.font = body_font
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            if isinstance(cell.value, (date, datetime)):
                cell.number_format = "yyyy-mm-dd"
    for index in range(1, len(headers) + 1):
        sheet.column_dimensions[get_column_letter(index)].width = (widths or {}).get(index, 20)
    sheet.row_dimensions[1].height = 30
    return sheet


def deterministic_save(workbook: Workbook, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    workbook.properties.creator = "Alejandro Castaño Medina"
    workbook.properties.lastModifiedBy = "Alejandro Castaño Medina"
    workbook.properties.created = FIXED_DOCUMENT_TIME
    workbook.properties.modified = FIXED_DOCUMENT_TIME
    workbook.properties.title = "Catálogo general de actividades"
    workbook.properties.subject = "Fuente editable multiasignatura"
    with tempfile.TemporaryDirectory() as directory:
        raw_path = Path(directory) / "raw.xlsx"
        workbook.save(raw_path)
        with ZipFile(raw_path, "r") as source, ZipFile(destination, "w", compression=ZIP_DEFLATED, compresslevel=9) as target:
            for filename in sorted(source.namelist()):
                source_info = source.getinfo(filename)
                info = ZipInfo(filename, date_time=(1980, 1, 1, 0, 0, 0))
                info.compress_type = ZIP_DEFLATED
                info.external_attr = source_info.external_attr
                info.create_system = source_info.create_system
                content = source.read(filename)
                if filename == "docProps/core.xml":
                    text = content.decode("utf-8")
                    text = re.sub(
                        r"(<dcterms:modified[^>]*>)[^<]+(</dcterms:modified>)",
                        r"\g<1>2026-09-06T10:41:43Z\g<2>",
                        text,
                    )
                    content = text.encode("utf-8")
                target.writestr(info, content)


def build_workbook(source_path: Path) -> Workbook:
    source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
    legacy = openpyxl.load_workbook(source_path, data_only=False)
    required = {"ACTIVIDADES", "SECCIONES", "RELACIONES", "CONTROL DE CALIDAD", "INFORMACIÓN", "AUDITORÍA"}
    missing = required.difference(legacy.sheetnames)
    if missing:
        raise SystemExit(f"Faltan hojas en el libro histórico: {', '.join(sorted(missing))}")

    activity_rows = rows_as_dicts(legacy["ACTIVIDADES"])
    section_rows = sorted(rows_as_dicts(legacy["SECCIONES"]), key=lambda row: row["Orden original"])
    relation_rows = rows_as_dicts(legacy["RELACIONES"])
    quality_rows = rows_as_dicts(legacy["CONTROL DE CALIDAD"])

    section_by_id = {row["ID de sección"]: row for row in section_rows}
    relations_by_activity: dict[str, list[str]] = {}
    for row in relation_rows:
        relations_by_activity.setdefault(row["ID de actividad"], []).append(row["ID de sección"])

    workbook = Workbook()
    workbook.remove(workbook.active)

    append_sheet(
        workbook,
        "ASIGNATURAS",
        ["ID", "Nombre", "Nombre corto", "Slug", "Slugs históricos", "Orden", "Descripción", "Color principal", "Color suave", "Icono", "Imagen", "Texto alternativo", "Posición de imagen", "ID de crédito", "Estado"],
        [["ciencias", "Ciencias", "Ciencias", "ciencias", "", 1, "Actividades de Ciencias y Conocimiento del Medio.", "#175B72", "#E6F1EF", "microscope", "", "", "", "", "active"]],
        {1: 16, 2: 20, 4: 18, 7: 44, 8: 16, 9: 16, 10: 18, 15: 14},
    )

    topic_rows = []
    migration_rows = []
    for row in section_rows:
        legacy_id = row["ID de sección"]
        topic_id = TOPIC_ID_MAP[legacy_id]
        image, image_alt, image_position = TOPIC_MEDIA[legacy_id]
        accent, accent_soft = TOPIC_COLORS[legacy_id]
        credit_id = f"credit-{topic_id}"
        topic_rows.append([
            topic_id,
            "ciencias",
            row["Nombre para la web"],
            _slugify(row["Nombre para la web"]),
            "",
            int(row["Orden original"]),
            row["Notas"] or "",
            accent,
            accent_soft,
            image,
            image_alt,
            image_position,
            credit_id,
            "active",
            legacy_id,
            row["Nombre original del documento"],
            row["Curso de origen indicado en el documento"],
            int(row["Número de actividades únicas relacionadas"]),
        ])
        migration_rows.append([legacy_id, topic_id, row["Nombre para la web"], "Mapeo fijo; no se reconstruye desde el nombre."])

    append_sheet(
        workbook,
        "TEMAS",
        ["ID", "ID de asignatura", "Nombre", "Slug", "Slugs históricos", "Orden", "Descripción", "Color principal", "Color suave", "Imagen", "Texto alternativo", "Posición de imagen", "ID de crédito", "Estado", "ID legado", "Nombre original", "Curso histórico", "Conteo declarado legado"],
        topic_rows,
        {1: 24, 2: 18, 3: 34, 4: 34, 7: 55, 8: 18, 9: 18, 10: 48, 11: 60, 12: 20, 13: 30, 15: 14, 16: 65, 17: 24},
    )

    append_sheet(
        workbook,
        "MIGRACIÓN_TEMAS",
        ["ID legado de sección", "Nuevo ID de tema", "Nombre comprobado", "Criterio"],
        migration_rows,
        {1: 22, 2: 26, 3: 38, 4: 58},
    )

    append_sheet(
        workbook,
        "TIPOS_ACTIVIDAD",
        ["ID", "Nombre", "Icono", "Orden"],
        [list(item) for item in TYPE_DEFINITIONS],
        {1: 28, 2: 30, 3: 24, 4: 12},
    )
    append_sheet(
        workbook,
        "PLATAFORMAS",
        ["ID", "Nombre", "Hosts", "Color", "Orden"],
        [list(item) for item in PLATFORM_DEFINITIONS],
        {1: 18, 2: 20, 3: 32, 4: 16, 5: 12},
    )

    activity_output_rows = []
    for row in activity_rows:
        activity_id = row["ID de actividad"]
        legacy_sections = sorted(relations_by_activity[activity_id], key=lambda section_id: section_by_id[section_id]["Orden original"])
        subject_ids = ["ciencias"]
        language = LANGUAGE_CODES.get(row["Idioma"])
        type_id = TYPE_ID_BY_NAME.get(row["Tipo de actividad"])
        platform_id = PLATFORM_ID_BY_NAME.get(row["Plataforma"])
        if not language:
            raise SystemExit(f"Idioma sin mapeo en ACTIVIDADES para {activity_id}: {row['Idioma']}")
        if not type_id:
            raise SystemExit(f"Tipo sin mapeo en ACTIVIDADES para {activity_id}: {row['Tipo de actividad']}")
        if not platform_id:
            raise SystemExit(f"Plataforma sin mapeo en ACTIVIDADES para {activity_id}: {row['Plataforma']}")
        verified_value = row["Fecha de verificación"]
        if isinstance(verified_value, datetime):
            verified_value = verified_value.date()
        if verified_value != VERIFIED_DATE:
            raise SystemExit(f"Fecha de verificación inesperada en {activity_id}: {verified_value}")
        activity_output_rows.append([
            activity_id,
            row["Slug o identificador web"],
            "",
            row["Título para la web"],
            row["Título original"],
            row["Descripción para la web"],
            "ciencias",
            DELIMITER.join(subject_ids),
            TOPIC_ID_MAP[legacy_sections[0]],
            language,
            type_id,
            row["Curso de origen"],
            DELIMITER.join(split_terms(row["Etiquetas"])),
            DELIMITER.join(split_terms(row["Palabras clave de búsqueda"])),
            None,
            PUBLISHED_DATE,
            PUBLISHED_DATE,
            "published",
            "external",
            platform_id,
            resource_id(activity_id, row["ID de recurso en plataforma"]),
            row["URL pública"],
            row["URL canónica"],
            row["URL original del Word"],
            LINK_STATUS.get(row["Estado del enlace"], "unverified"),
            VERIFIED_DATE,
            str(row["Título verificado en la página"]).casefold() in {"sí", "si", "true", "1"},
            row["Fuente del título"],
            row["Fuente de la descripción"],
            row["Notas de revisión"] or "",
            row["Asignatura"],
            row["Estado del enlace"],
            None,
            "",
            "",
        ])

    append_sheet(
        workbook,
        "ACTIVIDADES",
        ["ID", "Slug", "Slugs históricos", "Título", "Título de origen", "Descripción", "ID de asignatura principal", "IDs de asignatura", "ID de tema principal", "Idioma", "ID de tipo", "Curso histórico", "Etiquetas", "Palabras clave", "Fecha de creación", "Fecha de publicación", "Fecha de actualización", "Estado editorial", "Clase de origen", "ID de plataforma", "ID de recurso", "URL pública", "URL canónica", "URL original", "Estado del enlace", "Última verificación", "Título verificado", "Fuente del título", "Fuente de la descripción", "Notas de verificación", "Asignatura original", "Estado de enlace original", "Versión de motor nativo", "Tipo de actividad nativa", "Ruta de contenido nativo"],
        activity_output_rows,
        {1: 18, 2: 58, 4: 52, 5: 52, 6: 85, 7: 26, 8: 24, 9: 28, 10: 12, 11: 28, 12: 24, 13: 55, 14: 65, 18: 18, 19: 18, 20: 18, 21: 18, 22: 80, 23: 80, 24: 44, 25: 20, 28: 34, 29: 34, 30: 60, 31: 34, 32: 34, 33: 24, 34: 30, 35: 45},
    )

    activity_topic_rows = []
    for row in relation_rows:
        legacy_id = row["ID de sección"]
        activity_topic_rows.append([
            row["ID de actividad"],
            TOPIC_ID_MAP[legacy_id],
            row["Orden de la sección"],
            row["Nota de la relación"] or "",
            legacy_id,
        ])
    append_sheet(
        workbook,
        "ACTIVIDAD_TEMA",
        ["ID de actividad", "ID de tema", "Orden legado del tema", "Nota", "ID legado de sección"],
        activity_topic_rows,
        {1: 20, 2: 26, 3: 22, 4: 60, 5: 22},
    )

    credit_rows = []
    for section in section_rows:
        legacy_id = section["ID de sección"]
        author, source_name, source_url, license_text = TOPIC_CREDITS[legacy_id]
        credit_rows.append([
            f"credit-{TOPIC_ID_MAP[legacy_id]}",
            section["Nombre para la web"],
            author,
            source_name,
            source_url,
            license_text,
            "",
            "Pendiente de aclaración antes de una publicación futura." if "no" in license_text.casefold() else "",
        ])
    append_sheet(
        workbook,
        "CRÉDITOS",
        ["ID", "Título", "Autoría", "Fuente", "URL de fuente", "Licencia", "URL de licencia", "Nota"],
        credit_rows,
        {1: 32, 2: 38, 3: 44, 4: 28, 5: 90, 6: 90, 7: 50, 8: 58},
    )

    append_sheet(
        workbook,
        "CONTROL_DE_CALIDAD",
        ["ID de actividad", "URL", "Tipo de incidencia", "Explicación", "Acción recomendada", "Estado"],
        [[row["ID de actividad"], row["URL"], row["Tipo de incidencia"], row["Explicación"], row["Acción recomendada"], "open"] for row in quality_rows],
        {1: 20, 2: 80, 3: 46, 4: 95, 5: 95, 6: 16},
    )

    info_rows = [
        ["Finalidad", "Fuente editable multiasignatura para generar el catálogo estático."],
        ["Fuente histórica", source_path.name],
        ["SHA-256 de la fuente histórica", source_hash],
        ["Versión de esquema", 1],
        ["Separador multivalor", DELIMITER],
        ["Asignatura inicial", "ciencias"],
        ["Fechas heredadas", "createdAt desconocida; publishedAt y updatedAt 2026-09-06; lastVerifiedAt 2026-09-05."],
        ["IDs de tema", "El mapeo SEC-xx → topic-ciencias-xxx se conserva en MIGRACIÓN_TEMAS."],
        ["Actividades externas", "Las 65 actividades actuales usan Clase de origen = external."],
        ["Actividades nativas", "El esquema las admite; este libro inicial no contiene ninguna."],
        ["Curso histórico", "Contexto personal de creación. No representa nivel recomendado."],
        ["Edición", "Editar este libro y ejecutar npm run catalog:generate. No editar los JSON generados a mano."],
    ]
    append_sheet(workbook, "INFORMACIÓN", ["Campo", "Explicación"], info_rows, {1: 36, 2: 110})
    return workbook


def _slugify(value: str) -> str:
    import re
    import unicodedata

    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = "".join(character for character in normalized if not unicodedata.combining(character))
    return re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text).strip("-").lower()


def xlsx_container_differences(expected: Path, candidate: Path) -> list[str]:
    """Describe binary container differences without treating them as data errors."""
    differences = []
    with ZipFile(expected) as expected_zip, ZipFile(candidate) as candidate_zip:
        expected_names = expected_zip.namelist()
        candidate_names = candidate_zip.namelist()
        if expected_names != candidate_names:
            differences.append("orden o conjunto de entradas ZIP distinto")
        for name in sorted(set(expected_names).intersection(candidate_names)):
            expected_info = expected_zip.getinfo(name)
            candidate_info = candidate_zip.getinfo(name)
            if expected_zip.read(name) != candidate_zip.read(name):
                differences.append(f"contenido XML/binario distinto: {name}")
            metadata = (
                expected_info.date_time,
                expected_info.compress_type,
                expected_info.create_system,
                expected_info.external_attr,
                expected_info.flag_bits,
                expected_info.extra,
            )
            candidate_metadata = (
                candidate_info.date_time,
                candidate_info.compress_type,
                candidate_info.create_system,
                candidate_info.external_attr,
                candidate_info.flag_bits,
                candidate_info.extra,
            )
            if metadata != candidate_metadata:
                differences.append(f"metadatos ZIP distintos: {name}")
    return differences


def dimension_signature(dimension) -> tuple:
    return (
        dimension.width if hasattr(dimension, "width") else dimension.height,
        dimension.hidden,
        dimension.outlineLevel,
        dimension.collapsed,
    )


def semantic_workbook_differences(expected: Path, candidate: Path) -> list[str]:
    """Compare the workbook contract while ignoring irrelevant ZIP serialization."""
    expected_book = openpyxl.load_workbook(expected, data_only=False)
    candidate_book = openpyxl.load_workbook(candidate, data_only=False)
    differences: list[str] = []

    if expected_book.sheetnames != candidate_book.sheetnames:
        differences.append(
            f"libro/hojas: {expected_book.sheetnames!r} != {candidate_book.sheetnames!r}"
        )
        return differences

    property_names = ("creator", "lastModifiedBy", "title", "subject", "created", "modified")
    for name in property_names:
        expected_value = getattr(expected_book.properties, name)
        candidate_value = getattr(candidate_book.properties, name)
        if expected_value != candidate_value:
            differences.append(f"libro/propiedad {name}: {expected_value!r} != {candidate_value!r}")

    for sheet_name in expected_book.sheetnames:
        expected_sheet = expected_book[sheet_name]
        candidate_sheet = candidate_book[sheet_name]
        prefix = f"{sheet_name}"
        sheet_properties = {
            "dimensiones": (
                (expected_sheet.max_row, expected_sheet.max_column),
                (candidate_sheet.max_row, candidate_sheet.max_column),
            ),
            "estado": (expected_sheet.sheet_state, candidate_sheet.sheet_state),
            "panel inmovilizado": (expected_sheet.freeze_panes, candidate_sheet.freeze_panes),
            "autofiltro": (expected_sheet.auto_filter.ref, candidate_sheet.auto_filter.ref),
            "cuadrícula": (
                expected_sheet.sheet_view.showGridLines,
                candidate_sheet.sheet_view.showGridLines,
            ),
            "celdas combinadas": (
                tuple(str(item) for item in expected_sheet.merged_cells.ranges),
                tuple(str(item) for item in candidate_sheet.merged_cells.ranges),
            ),
        }
        for label, (expected_value, candidate_value) in sheet_properties.items():
            if expected_value != candidate_value:
                differences.append(
                    f"{prefix}/{label}: {expected_value!r} != {candidate_value!r}"
                )

        max_row = max(expected_sheet.max_row, candidate_sheet.max_row)
        max_column = max(expected_sheet.max_column, candidate_sheet.max_column)
        for row in range(1, max_row + 1):
            for column in range(1, max_column + 1):
                expected_cell = expected_sheet.cell(row, column)
                candidate_cell = candidate_sheet.cell(row, column)
                properties = {
                    "valor": (expected_cell.value, candidate_cell.value),
                    "tipo": (expected_cell.data_type, candidate_cell.data_type),
                    "tipo Python": (
                        type(expected_cell.value).__name__,
                        type(candidate_cell.value).__name__,
                    ),
                    "estilo": (expected_cell._style, candidate_cell._style),
                }
                for label, (expected_value, candidate_value) in properties.items():
                    if expected_value != candidate_value:
                        differences.append(
                            f"{prefix}/{expected_cell.coordinate}/{label}: "
                            f"{expected_value!r} != {candidate_value!r}"
                        )

        column_keys = sorted(set(expected_sheet.column_dimensions).union(candidate_sheet.column_dimensions))
        for key in column_keys:
            expected_dimension = expected_sheet.column_dimensions[key]
            candidate_dimension = candidate_sheet.column_dimensions[key]
            if dimension_signature(expected_dimension) != dimension_signature(candidate_dimension):
                differences.append(
                    f"{prefix}/columna {key}/formato: "
                    f"{dimension_signature(expected_dimension)!r} != "
                    f"{dimension_signature(candidate_dimension)!r}"
                )
        row_keys = sorted(set(expected_sheet.row_dimensions).union(candidate_sheet.row_dimensions))
        for key in row_keys:
            expected_dimension = expected_sheet.row_dimensions[key]
            candidate_dimension = candidate_sheet.row_dimensions[key]
            if dimension_signature(expected_dimension) != dimension_signature(candidate_dimension):
                differences.append(
                    f"{prefix}/fila {key}/formato: "
                    f"{dimension_signature(expected_dimension)!r} != "
                    f"{dimension_signature(candidate_dimension)!r}"
                )
    return differences


def historical_prefix_differences(extended: Path, baseline: Path) -> list[str]:
    """Keep the migrated Sciences rows intact after the catalog grows.

    The historical migration only creates the initial workbook. New subjects,
    media sheets and rows must not be wiped by the migration check.
    """
    extended_book = openpyxl.load_workbook(extended, data_only=False)
    baseline_book = openpyxl.load_workbook(baseline, data_only=False)
    differences = []
    def equal_cell(left, right):
        # Spreadsheet serialization may turn an empty cell into an empty string.
        if left in (None, "") and right in (None, ""):
            return True
        if isinstance(left, (date, datetime)) and isinstance(right, (date, datetime)):
            return left.isoformat()[:10] == right.isoformat()[:10]
        return left == right
    for name in baseline_book.sheetnames:
        if name not in extended_book:
            differences.append(f"Falta hoja histórica {name}")
            continue
        actual_rows = list(extended_book[name].values)
        baseline_rows = list(baseline_book[name].values)
        for index, row in enumerate(baseline_rows):
            # TEMAS may gain editable visual columns after the historical ones.
            # Compare every original cell while allowing only this appended schema.
            expected_width = len(row)
            actual_width = len(actual_rows[index]) if index < len(actual_rows) else 0
            width_valid = actual_width >= expected_width if name == "TEMAS" else actual_width == expected_width
            if not width_valid or any(not equal_cell(a, b) for a, b in zip(actual_rows[index][:expected_width], row)):
                differences.append(f"{name}, fila {index + 1}: datos históricos modificados")
        if len(actual_rows) < len(baseline_rows):
            differences.append(f"{name}: se han eliminado filas históricas")
    return differences


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true", help="Comprueba semánticamente el libro versionado frente a una migración nueva.")
    args = parser.parse_args()
    workbook = build_workbook(args.input)
    if args.check:
        if not args.output.exists():
            raise SystemExit(f"No existe el libro general esperado: {args.output}")
        with tempfile.TemporaryDirectory() as directory:
            candidate = Path(directory) / args.output.name
            deterministic_save(workbook, candidate)
            expected_hash = hashlib.sha256(args.output.read_bytes()).hexdigest()
            candidate_hash = hashlib.sha256(candidate.read_bytes()).hexdigest()
            if expected_hash != candidate_hash:
                print(
                    "Los contenedores XLSX tienen SHA-256 distinto; se comprobará su contenido lógico. "
                    f"Versionado={expected_hash}, regenerado={candidate_hash}."
                )
                print("Se comprobarán las filas históricas; los datos nuevos cambian el contenedor.")
            differences = historical_prefix_differences(args.output, candidate)
            if differences:
                details = "\n".join(f"- {difference}" for difference in differences[:50])
                remainder = len(differences) - 50
                if remainder > 0:
                    details += f"\n- … y {remainder} diferencias más"
                raise SystemExit(
                    "Las filas de la migración histórica han cambiado:\n"
                    f"{details}\nNo sobrescribas el catálogo ampliado con catalog:migrate."
                )
            print("Filas históricas de Ciencias conservadas frente a la migración reproducible.")
        return
    deterministic_save(workbook, args.output)
    print(f"Libro general creado: {args.output}")
    print(f"SHA-256: {hashlib.sha256(args.output.read_bytes()).hexdigest()}")


if __name__ == "__main__":
    main()

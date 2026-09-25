"""Shared helpers and invariant validation for the generated catalog."""

from __future__ import annotations

import re
from datetime import date
from pathlib import Path
from urllib.parse import urlparse


ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
BCP47 = re.compile(r"^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$")


def parse_date(value: str | None) -> date | None:
    if value in (None, ""):
        return None
    if not isinstance(value, str) or not ISO_DATE.fullmatch(value):
        raise ValueError(f"fecha ISO inválida: {value!r}")
    return date.fromisoformat(value)


def problem(code: str, entity_id: str, issue: str, expected: str, locations=None, column: str | None = None):
    location = (locations or {}).get(entity_id, {})
    return {
        "code": code,
        "sheet": location.get("sheet", "catalog.json"),
        "row": location.get("row"),
        "column": column or location.get("column"),
        "id": entity_id,
        "problem": issue,
        "expected": expected,
    }


def validate_catalog(catalog: dict, locations=None) -> tuple[list[dict], list[dict]]:
    errors: list[dict] = []
    warnings: list[dict] = []

    if catalog.get("schemaVersion") != 1:
        errors.append(problem("schema-version", "catalog", f"Versión {catalog.get('schemaVersion')!r}", "schemaVersion debe ser 1", locations))

    collections = {
        "subject": catalog.get("subjects", []),
        "topic": catalog.get("topics", []),
        "activity-type": catalog.get("activityTypes", []),
        "platform": catalog.get("platforms", []),
        "activity": catalog.get("activities", []),
        "media-resource": catalog.get("mediaResources", []),
        "credit": catalog.get("credits", []),
    }
    for kind, records in collections.items():
        seen = set()
        for record in records:
            record_id = record.get("id")
            if not record_id:
                errors.append(problem("missing-id", kind, f"Registro {kind} sin ID", "Añadir un ID estable", locations, "ID"))
            elif record_id in seen:
                errors.append(problem("duplicate-id", record_id, f"ID duplicado en {kind}", "Cada ID debe ser único en su entidad", locations, "ID"))
            seen.add(record_id)

    subjects = {record["id"]: record for record in collections["subject"] if record.get("id")}
    topics = {record["id"]: record for record in collections["topic"] if record.get("id")}
    activity_types = {record["id"]: record for record in collections["activity-type"] if record.get("id")}
    platforms = {record["id"]: record for record in collections["platform"] if record.get("id")}
    credits = {record["id"]: record for record in collections["credit"] if record.get("id")}

    for kind in ("subject", "topic", "activity"):
        current_slugs: dict[str, str] = {}
        legacy_slugs: dict[str, str] = {}
        for record in collections[kind]:
            record_id = record.get("id", kind)
            slug = record.get("slug")
            if not slug:
                errors.append(problem("missing-slug", record_id, "Falta slug", "Añadir un slug público estable", locations, "Slug"))
                continue
            if slug in current_slugs:
                errors.append(problem("duplicate-slug", record_id, f"Slug actual duplicado con {current_slugs[slug]}: {slug}", "Usar slugs únicos", locations, "Slug"))
            current_slugs[slug] = record_id
            for legacy_slug in record.get("legacySlugs", []):
                if legacy_slug == slug or legacy_slug in current_slugs or legacy_slug in legacy_slugs:
                    errors.append(problem("legacy-slug-collision", record_id, f"Slug histórico en colisión: {legacy_slug}", "Cada slug actual o histórico debe resolver a una sola entidad", locations, "Slugs históricos"))
                legacy_slugs[legacy_slug] = record_id

    for topic in collections["topic"]:
        topic_id = topic.get("id", "topic")
        if topic.get("subjectId") not in subjects:
            errors.append(problem("orphan-topic-subject", topic_id, f"Asignatura inexistente: {topic.get('subjectId')}", "Usar un ID de ASIGNATURAS", locations, "ID de asignatura"))
        visual = topic.get("visual") or {}
        if visual.get("image") and visual.get("creditId") not in credits:
            errors.append(problem("missing-image-credit", topic_id, f"Imagen sin crédito válido: {visual.get('creditId')!r}", "Referenciar un ID de CRÉDITOS", locations, "ID de crédito"))

    canonical_urls: dict[str, str] = {}
    resource_keys: dict[tuple[str, str], str] = {}
    title_groups: dict[str, list[str]] = {}
    for activity in collections["activity"]:
        activity_id = activity.get("id", "activity")
        subject_ids = activity.get("subjectIds", [])
        primary_subject_id = activity.get("primarySubjectId")
        topic_ids = activity.get("topicIds", [])
        primary_topic_id = activity.get("primaryTopicId")

        if not subject_ids:
            errors.append(problem("missing-subjects", activity_id, "La actividad no tiene asignaturas", "subjectIds debe contener al menos una asignatura", locations, "IDs de asignatura"))
        for subject_id in subject_ids:
            if subject_id not in subjects:
                errors.append(problem("orphan-activity-subject", activity_id, f"Asignatura inexistente: {subject_id}", "Usar IDs de ASIGNATURAS", locations, "IDs de asignatura"))
        if primary_subject_id not in subject_ids:
            errors.append(problem("invalid-primary-subject", activity_id, f"primarySubjectId {primary_subject_id!r} no está en subjectIds", "Incluir la asignatura principal en subjectIds", locations, "ID de asignatura principal"))
        for topic_id in topic_ids:
            topic = topics.get(topic_id)
            if not topic:
                errors.append(problem("orphan-activity-topic", activity_id, f"Tema inexistente: {topic_id}", "Usar IDs de TEMAS", locations, "ID de tema"))
            elif topic.get("subjectId") not in subject_ids:
                errors.append(problem("topic-subject-mismatch", activity_id, f"El tema {topic_id} pertenece a {topic.get('subjectId')}, ausente en subjectIds", "Incluir la asignatura del tema", locations, "IDs de asignatura"))
        if primary_topic_id is not None and primary_topic_id not in topic_ids:
            errors.append(problem("invalid-primary-topic", activity_id, f"primaryTopicId {primary_topic_id!r} no está en topicIds", "Incluir el tema principal en topicIds", locations, "ID de tema principal"))
        if not topic_ids:
            warnings.append(problem("activity-without-topic", activity_id, "Actividad sin tema", "Asignar un tema cuando exista clasificación fiable", locations, "ID de tema"))

        language = activity.get("language", "")
        if not isinstance(language, str) or not BCP47.fullmatch(language):
            errors.append(problem("invalid-language", activity_id, f"Código BCP 47 inválido: {language!r}", "Usar es, en, fr u otro código BCP 47", locations, "Idioma"))
        if activity.get("typeId") not in activity_types:
            errors.append(problem("unknown-type", activity_id, f"Tipo desconocido: {activity.get('typeId')!r}", "Usar un ID de TIPOS_ACTIVIDAD", locations, "ID de tipo"))

        dates = activity.get("dates") or {}
        parsed_dates = {}
        for field in ("createdAt", "publishedAt", "updatedAt"):
            try:
                parsed_dates[field] = parse_date(dates.get(field))
            except ValueError as error:
                errors.append(problem("invalid-date", activity_id, str(error), "Usar YYYY-MM-DD o vacío", locations, field))
                parsed_dates[field] = None
        if activity.get("publicationStatus") == "published" and not dates.get("publishedAt"):
            errors.append(problem("published-without-date", activity_id, "Actividad publicada sin publishedAt", "Añadir la fecha de incorporación al catálogo", locations, "Fecha de publicación"))
        created_at, published_at, updated_at = (parsed_dates.get(field) for field in ("createdAt", "publishedAt", "updatedAt"))
        if created_at and published_at and created_at > published_at:
            errors.append(problem("date-order", activity_id, "createdAt es posterior a publishedAt", "createdAt <= publishedAt", locations, "Fecha de creación"))
        if published_at and updated_at and published_at > updated_at:
            errors.append(problem("date-order", activity_id, "publishedAt es posterior a updatedAt", "publishedAt <= updatedAt", locations, "Fecha de actualización"))

        source = activity.get("source") or {}
        if source.get("kind") == "external":
            platform_id = source.get("platformId")
            if platform_id not in platforms:
                errors.append(problem("unknown-platform", activity_id, f"Plataforma desconocida: {platform_id!r}", "Usar un ID de PLATAFORMAS", locations, "ID de plataforma"))
            url = source.get("url")
            if not isinstance(url, str) or urlparse(url).scheme not in {"http", "https"} or not urlparse(url).netloc:
                errors.append(problem("invalid-external-url", activity_id, f"URL externa inválida: {url!r}", "Usar una URL HTTP(S) completa", locations, "URL pública"))
            canonical_url = source.get("canonicalUrl")
            if canonical_url:
                if canonical_url in canonical_urls:
                    errors.append(problem("duplicate-canonical-url", activity_id, f"URL canónica duplicada con {canonical_urls[canonical_url]}", "Cada recurso externo debe tener una URL canónica única", locations, "URL canónica"))
                canonical_urls[canonical_url] = activity_id
            resource_id = source.get("resourceId")
            if platform_id and resource_id:
                key = (platform_id, str(resource_id))
                if key in resource_keys:
                    errors.append(problem("duplicate-platform-resource", activity_id, f"Recurso duplicado con {resource_keys[key]}: {key}", "Cada ID de recurso debe ser único dentro de su plataforma", locations, "ID de recurso"))
                resource_keys[key] = activity_id
            try:
                parse_date(source.get("lastVerifiedAt"))
            except ValueError as error:
                errors.append(problem("invalid-verification-date", activity_id, str(error), "Usar YYYY-MM-DD o vacío", locations, "Última verificación"))
            if source.get("linkStatus") == "limited":
                warnings.append(problem("limited-link", activity_id, "El recurso tiene información pública limitada", "Mantenerlo publicado y pendiente de revisión", locations, "Estado del enlace"))
        elif source.get("kind") == "native":
            native = source.get("native") or {}
            if not native.get("contentPath") or not native.get("activityType") or not isinstance(native.get("engineVersion"), int):
                errors.append(problem("invalid-native-source", activity_id, "La fuente nativa está incompleta", "Añadir contentPath, activityType y engineVersion", locations, "Clase de origen"))
        else:
            errors.append(problem("unknown-source-kind", activity_id, f"Origen desconocido: {source.get('kind')!r}", "Usar external o native", locations, "Clase de origen"))

        title_key = str(activity.get("title", "")).casefold().strip()
        if title_key:
            title_groups.setdefault(title_key, []).append(activity_id)

    for title, ids in title_groups.items():
        if len(ids) > 1:
            warnings.append({
                "code": "possible-duplicate-title",
                "sheet": "ACTIVIDADES",
                "row": None,
                "column": "Título",
                "id": " | ".join(ids),
                "problem": f"Título compartido por {len(ids)} actividades: {title}",
                "expected": "Revisar; no fusionar automáticamente si son recursos distintos",
            })

    asset_root = Path(__file__).resolve().parents[1] / "public"
    for media in collections["media-resource"]:
        media_id = media.get("id", "media-resource")
        if media_id in {activity.get("id") for activity in collections["activity"]}:
            errors.append(problem("media-id-collision", media_id, "ID compartido con una actividad", "Usar un ID de recurso independiente", locations))
        if media.get("kind") != "video":
            errors.append(problem("invalid-media-kind", media_id, f"Tipo inválido: {media.get('kind')!r}", "Usar video", locations))
        if media.get("status") not in {"active", "hidden", "archived"}:
            errors.append(problem("invalid-media-status", media_id, f"Estado inválido: {media.get('status')!r}", "Usar active, hidden o archived", locations))
        if not isinstance(media.get("language"), str) or not BCP47.fullmatch(media["language"]):
            errors.append(problem("invalid-media-language", media_id, f"Idioma inválido: {media.get('language')!r}", "Usar código BCP 47", locations))
        subject_id = media.get("subjectId")
        if subject_id not in subjects:
            errors.append(problem("orphan-media-subject", media_id, f"Asignatura inexistente: {subject_id!r}", "Usar un ID de ASIGNATURAS", locations))
        topic_ids = media.get("topicIds", [])
        if not topic_ids or media.get("primaryTopicId") not in topic_ids or len(topic_ids) != len(set(topic_ids)):
            errors.append(problem("invalid-media-topics", media_id, "Temas vacíos, repetidos o tema principal ausente", "Definir temas únicos e incluir el principal", locations))
        for topic_id in topic_ids:
            topic = topics.get(topic_id)
            if not topic or topic.get("subjectId") != subject_id:
                errors.append(problem("orphan-media-topic", media_id, f"Tema no perteneciente a la asignatura: {topic_id}", "Usar tema existente de la asignatura", locations))
        related = media.get("relatedActivityIds", [])
        activity_ids = {activity.get("id") for activity in collections["activity"]}
        if not related or len(related) != len(set(related)) or any(item not in activity_ids for item in related):
            errors.append(problem("orphan-media-activity", media_id, f"Actividades relacionadas no válidas: {related}", "Referenciar actividades existentes sin duplicados", locations))
        for field, suffix in (("src", ".mp4"), ("poster", ".png"), ("visualDescriptionPath", ".txt")):
            path = media.get(field)
            if path is None and field == "visualDescriptionPath":
                continue
            if not isinstance(path, str) or not re.fullmatch(r"/media/[A-Za-z0-9._/-]+", path) or ".." in Path(path).parts or not path.endswith(suffix) or not (asset_root / path.lstrip("/")).is_file():
                errors.append(problem("invalid-media-asset", media_id, f"Ruta inexistente o no permitida en {field}: {path!r}", "Usar archivo local bajo public/media", locations, field))

    return errors, warnings

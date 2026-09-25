"use client";

import { useMemo, useState } from "react";
import { ActivityCard } from "@/components/activity-card";
import { Button } from "@/components/ui/button";
import { activeSubjects, publicActivities } from "@/lib/catalog/selectors";
import { sortRecentActivities } from "@/lib/catalog/dates";

const PAGE_SIZE = 24;

export function RecentActivities() {
  const [subjectId, setSubjectId] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const activities = useMemo(() => sortRecentActivities(publicActivities)
    .filter((activity) => !subjectId || activity.subjectIds.includes(subjectId)), [subjectId]);
  const visible = activities.slice(0, visibleCount);

  function changeSubject(value: string) { setSubjectId(value); setVisibleCount(PAGE_SIZE); }

  return <>
    {activeSubjects.length > 1 ? <div className="recent-filter"><label htmlFor="recent-subject">Asignatura</label><select id="recent-subject" value={subjectId} onChange={(event) => changeSubject(event.target.value)}><option value="">Todas las asignaturas</option>{activeSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div> : null}
    {visible.length ? <><div className="activity-grid recent-grid">{visible.map((activity) => <ActivityCard key={activity.id} activity={activity} showPublishedDate />)}</div>{visibleCount < activities.length ? <div className="load-more"><Button onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Cargar más actividades</Button></div> : null}</> : <div className="empty-state" role="status"><h2>No hay incorporaciones disponibles</h2><p>En este momento no hay actividades públicas con fecha de incorporación para esta asignatura.</p><a className="primary-link-button" href="/explorar">Explorar el catálogo</a></div>}
  </>;
}

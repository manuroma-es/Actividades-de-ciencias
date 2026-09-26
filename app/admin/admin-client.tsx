'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import './admin.css';

type Option = { id: string; name: string; subjectId?: string };
type CatalogOptions = { subjects: Option[]; topics: Option[]; types: Option[]; platforms: Option[] };
type Draft = { url: string; platformId: string; resourceId: string; title: string; description: string; subjectId: string; topicIds: string[]; typeId: string; language: string; verified: boolean; manual?: boolean; sourceTitle?: string };

async function json(response: Response) {
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'No se pudo completar la petición.');
  return value;
}

export function AdminClient() {
  const [loading, setLoading] = useState(true);
  const [csrf, setCsrf] = useState('');
  const [catalog, setCatalog] = useState<CatalogOptions | null>(null);
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState('');
  const [status, setStatus] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [runUrl, setRunUrl] = useState('');
  const [activityHref, setActivityHref] = useState('');
  const [expectedHref, setExpectedHref] = useState('');
  const [deployed, setDeployed] = useState(false);

  const restore = useCallback(async () => {
    try {
      const value = await json(await fetch('/api/admin/session', { credentials: 'same-origin', cache: 'no-store' }));
      setCsrf(value.csrf); setCatalog(value.catalog);
    } catch { setCsrf(''); setCatalog(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void restore(), 0); return () => clearTimeout(timer); }, [restore]);

  async function post(path: string, data: unknown, token = csrf) {
    return json(await fetch(`/api/admin/${path}`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-admin-csrf': token }, body: JSON.stringify(data) }));
  }
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const value = await post('login', { password }, ''); setCsrf(value.csrf); setPassword(''); await restore(); }
    catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }
  async function logout() {
    try { await post('logout', {}); setCsrf(''); setCatalog(null); setDraft(null); setRequest(''); }
    catch (caught) { setError((caught as Error).message); }
  }
  async function analyze(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setWarning(''); setRequest('');
    try {
      const value = await post('analyze', { url });
      setWarning(value.warning || '');
      setDraft({ url: value.url, platformId: value.platformId, resourceId: value.resourceId, title: value.title || '', sourceTitle: value.title || undefined, description: value.description || '', subjectId: '', topicIds: [], typeId: '', language: 'es', verified: value.verified });
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }
  function manual() {
    setError(''); setWarning('Comprueba el enlace y el ID externo antes de publicar. Quedará pendiente de verificación.');
    setDraft({ url, platformId:'', resourceId:'', title:'', description:'', subjectId:'', topicIds:[], typeId:'', language:'es', verified:false, manual:true });
  }
  function change(part: Partial<Draft>) { setDraft(current => current ? { ...current, ...part } : null); }
  async function publish(event: React.FormEvent) {
    event.preventDefault(); if (!draft) return;
    setBusy(true); setError('');
    try {
      const value = await post('publish', draft);
      setRequest(value.requestId); setStatus('queued'); setSourceId(`${draft.platformId === 'wordwall' ? 'WW' : 'EP'}-${draft.resourceId}`);
      const base = draft.title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 75).replace(/-$/, '');
      setExpectedHref(`/actividad/${base || 'actividad'}-${draft.resourceId}/`);
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (!request || ['committed', 'failed'].includes(status)) return;
    const check = async () => {
      try {
        const value = await json(await fetch(`/api/admin/status/${request}`, { credentials: 'same-origin', cache: 'no-store' }));
        setStatus(value.status); setRunUrl(value.runUrl || ''); if (value.status === 'committed') setActivityHref(expectedHref);
        if (value.message) setError(value.message);
      } catch (caught) { setError((caught as Error).message); }
    };
    void check(); const timer = setInterval(() => void check(), 6000);
    return () => clearInterval(timer);
  }, [request, status, expectedHref]);
  useEffect(() => {
    if (!activityHref || deployed) return;
    const check = async () => {
      try { const response = await fetch(activityHref, { method: 'HEAD', cache: 'no-store' }); if (response.ok) setDeployed(true); }
      catch { /* El despliegue aún no está disponible. */ }
    };
    void check(); const timer = setInterval(() => void check(), 10000);
    return () => clearInterval(timer);
  }, [activityHref, deployed]);
  const topics = useMemo(() => (catalog?.topics || []).filter(topic => topic.subjectId === draft?.subjectId), [catalog, draft?.subjectId]);

  return <main id="main-content" className="admin-wrap">
    <div className="admin-head"><span className="admin-eyebrow">Área privada</span><h1>Administrar actividades</h1><p>Añade una actividad al catálogo desde su enlace.</p>{csrf && <button className="admin-plain" onClick={() => void logout()}>Cerrar sesión</button>}</div>
    {loading ? <p>Comprobando sesión…</p> : !csrf ? <form className="admin-panel" onSubmit={login}>
      <h2>Entrar</h2><label>Contraseña <input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button disabled={busy}>{busy ? 'Comprobando…' : 'Entrar'}</button>
    </form> : <div className="admin-grid">
      <section className="admin-panel"><h2>1. Enlace</h2><form onSubmit={analyze}><label>URL pública de Wordwall o Educaplay<input type="url" inputMode="url" placeholder="https://wordwall.net/es/resource/…" required value={url} onChange={e => setUrl(e.target.value)} /></label><button disabled={busy}>{busy ? 'Analizando…' : 'Analizar enlace'}</button></form><button className="admin-manual" type="button" onClick={manual} disabled={!url}>Introducir datos manualmente</button>{warning && <p className="admin-warning" role="status">{warning}</p>}</section>
      {draft && catalog && <form className="admin-panel" onSubmit={publish}><h2>2. Revisar datos</h2>
        {draft.manual ? <div className="admin-fields"><label>Plataforma<select required value={draft.platformId} onChange={e => change({platformId:e.target.value})}><option value="">Elige una</option>{catalog.platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>ID externo<input required inputMode="numeric" pattern="[0-9]+" maxLength={20} value={draft.resourceId} onChange={e => change({resourceId:e.target.value})} /></label></div> : <p className="admin-detected">{catalog.platforms.find(p => p.id === draft.platformId)?.name || draft.platformId} · {draft.resourceId}</p>}
        <label>Título<input maxLength={180} required value={draft.title} onChange={e => change({ title: e.target.value })} /></label>
        <label>Descripción<textarea maxLength={1200} required rows={3} value={draft.description} onChange={e => change({ description: e.target.value })} /></label>
        <div className="admin-fields"><label>Asignatura<select required value={draft.subjectId} onChange={e => change({ subjectId: e.target.value, topicIds: [] })}><option value="">Elige una</option>{catalog.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Tipo<select required value={draft.typeId} onChange={e => change({ typeId: e.target.value })}><option value="">Elige uno</option>{catalog.types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>Idioma<input required pattern="[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*" maxLength={35} value={draft.language} onChange={e => change({ language: e.target.value })} /></label></div>
        {draft.subjectId && <fieldset><legend>Temas · selecciona uno o varios</legend><div className="admin-topics">{topics.map(t => <label key={t.id}><input type="checkbox" checked={draft.topicIds.includes(t.id)} onChange={e => change({ topicIds: e.target.checked ? [...draft.topicIds, t.id] : draft.topicIds.filter(id => id !== t.id) })} />{t.name}</label>)}</div></fieldset>}
        <details open={draft.manual || undefined}><summary>Enlace</summary><label>URL pública<input type="url" value={draft.url} onChange={e => change({ url: e.target.value, verified: false, manual: true })} /></label><p>Si cambias el enlace, comprueba el ID y la plataforma. Quedará pendiente de verificación.</p></details>
        <div className="admin-preview"><span>Vista previa</span><strong>{draft.title || 'Título de la actividad'}</strong><p>{draft.description || 'Descripción'}</p><small>{catalog.subjects.find(s => s.id === draft.subjectId)?.name || 'Asignatura'} · {draft.topicIds.map(id => topics.find(t => t.id === id)?.name).join(', ') || 'Temas pendientes'}</small></div>
        <button disabled={busy || !draft.topicIds.length || !draft.title.trim() || !draft.description.trim() || !draft.typeId}>{busy ? 'Enviando…' : 'Publicar actividad'}</button>
      </form>}
      {request && <section className="admin-panel" aria-live="polite"><h2>3. Publicación</h2><p>{deployed ? 'La actividad ya está disponible en la web.' : status === 'committed' ? 'Cambio validado y guardado en Git. Esperando el despliegue del sitio.' : status === 'failed' ? 'La publicación falló. No se añadieron datos al catálogo.' : status === 'validating' ? 'Validando el catálogo y compilando…' : 'Solicitud recibida. Esperando GitHub Actions…'}</p><p>Actividad: {sourceId}</p>{deployed && activityHref && <p><a href={activityHref}>Abrir actividad publicada</a></p>}{runUrl && <a href={runUrl} target="_blank" rel="noopener noreferrer">Ver ejecución en GitHub</a>}</section>}
    </div>}
    {error && <p className="admin-error" role="alert">{error}</p>}
  </main>;
}

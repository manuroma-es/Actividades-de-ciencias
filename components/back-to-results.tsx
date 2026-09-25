"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

export function BackToResults() {
  const [hasResultsHistory, setHasResultsHistory] = useState(false);
  useEffect(() => {
    try {
      const referrer = new URL(document.referrer);
      // Referrer history is available only in the browser after static hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasResultsHistory(referrer.origin === window.location.origin && (/^\/(explorar|actividades|recientes)/.test(referrer.pathname) || /^\/seccion\//.test(referrer.pathname) || /^\/asignatura\//.test(referrer.pathname)));
    } catch { setHasResultsHistory(false); }
  }, []);
  if (hasResultsHistory) {
    return <button className="back-link button-link" onClick={() => history.back()}><ArrowLeft aria-hidden="true" /> Volver a resultados</button>;
  }
  return <Link href="/explorar" className="back-link"><ArrowLeft aria-hidden="true" /> Volver a Explorar</Link>;
}

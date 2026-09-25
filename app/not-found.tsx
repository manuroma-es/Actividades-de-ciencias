import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return <main id="main-content" className="not-found site-container"><p className="eyebrow">Error 404</p><h1>Esta página no existe</h1><p>Puede que el enlace haya cambiado o que la dirección no sea correcta.</p><Link href="/explorar" className="primary-link-button">Explorar actividades <ArrowRight aria-hidden="true" /></Link></main>;
}

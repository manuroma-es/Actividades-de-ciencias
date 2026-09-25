"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function HomeSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  function submit(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/explorar?q=${encodeURIComponent(value)}` : "/explorar");
  }
  return (
    <form className="home-search" role="search" onSubmit={submit}>
      <label htmlFor="home-search">¿Qué quieres repasar?</label>
      <div className="search-field">
        <Search aria-hidden="true" />
        <input id="home-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca una asignatura, un tema o una actividad" />
        <button type="submit">Buscar</button>
      </div>
    </form>
  );
}

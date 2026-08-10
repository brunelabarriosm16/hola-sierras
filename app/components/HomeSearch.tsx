"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

const QUICK_LINKS = [
  { label: "Qué hacer", href: "/explorar/que-hacer" },
  { label: "Dónde comer", href: "/explorar/donde-comer" },
  { label: "Alojamientos", href: "/explorar/alojamientos" },
  { label: "Eventos", href: "/explorar/eventos" },
]

type Suggestion = { id: string; name: string; meta: string; href: string }

export function HomeSearch() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  useEffect(() => {
    const value = query.trim()
    if (value.length < 1) {
      setSuggestions([])
      setLoadingSuggestions(false)
      return
    }
    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const response = await fetch(`/api/buscar/sugerencias?q=${encodeURIComponent(value)}`, { signal: controller.signal, cache: "no-store" })
        if (response.ok) setSuggestions(await response.json())
      } catch {
        if (!controller.signal.aborted) setSuggestions([])
      } finally {
        if (!controller.signal.aborted) setLoadingSuggestions(false)
      }
    }, 250)
    return () => { window.clearTimeout(timeoutId); controller.abort() }
  }, [query])

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const value = query.trim()
    router.push(value ? `/buscar?q=${encodeURIComponent(value)}` : "/buscar")
  }

  return (
    <div className="mx-auto mt-9 w-full max-w-4xl text-left">
      <form onSubmit={submit} className="relative flex flex-col gap-2 rounded-[22px] bg-white p-2 shadow-[0_20px_55px_-20px_rgba(20,83,45,0.42)] sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 150)}
            placeholder="¿Qué querés descubrir?"
            aria-label="Buscar en Hola Sierras"
            autoComplete="off"
            className="h-14 w-full rounded-2xl bg-white pl-12 pr-4 text-base text-slate-900 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-700/25 sm:h-16 sm:text-lg"
          />
          {focused && query.trim().length >= 1 ? (
            <div className="absolute inset-x-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
              {loadingSuggestions ? <div className="px-4 py-3 text-sm text-slate-500">Buscando coincidencias…</div> : suggestions.length ? suggestions.map((suggestion) => (
                <button key={suggestion.id} type="button" onMouseDown={() => router.push(suggestion.href)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-emerald-50">
                  <Search className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{suggestion.name}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{suggestion.meta}</span></span>
                </button>
              )) : <div className="px-4 py-3 text-sm text-slate-500">No encontramos coincidencias.</div>}
            </div>
          ) : null}
        </div>
        <button type="submit" className="h-14 rounded-2xl bg-emerald-800 px-8 text-base font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:h-16">Buscar</button>
      </form>
      <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Búsquedas rápidas">
        {QUICK_LINKS.map((item) => (
          <button key={item.href} type="button" onClick={() => router.push(item.href)} className="rounded-full border border-emerald-950/15 bg-white/75 px-3.5 py-2 text-xs font-semibold text-emerald-950 shadow-sm backdrop-blur transition hover:bg-white sm:text-sm">{item.label}</button>
        ))}
      </div>
    </div>
  )
}

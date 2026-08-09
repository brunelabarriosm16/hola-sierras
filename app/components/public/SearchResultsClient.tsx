"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, ImageIcon, MapPin, Search } from "lucide-react"
import { PublicHeader } from "../PublicHeader"
import { SEARCH_CATEGORIES, normalizeSearchText, searchScore, type SearchCategory, type SearchItem } from "../../lib/search"

const LOCATIONS = ["Toda la región", "Aiguá", "Mariscala", "Alrededores"]

export function SearchResultsClient({ items }: { items: SearchItem[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const query = params.get("q") || ""
  const category = params.get("categoria") || "todo"
  const location = params.get("ubicacion") || "Toda la región"

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (!value || value === "todo" || value === "Toda la región") next.delete(key)
    else next.set(key, value)
    router.push(`${pathname}${next.size ? `?${next}` : ""}`)
  }

  const results = useMemo(() => items
    .map((item) => ({ item, score: searchScore(item, query) }))
    .filter(({ item, score }) => score > 0 && (category === "todo" || item.category === category) && (location === "Toda la región" || (location === "Alrededores" ? !["aigua", "mariscala"].includes(normalizeSearchText(item.location)) : normalizeSearchText(item.location).includes(normalizeSearchText(location)))))
    .sort((a, b) => b.score - a.score || (b.item.date || "").localeCompare(a.item.date || "") || b.item.recentOrder - a.item.recentOrder), [items, query, category, location])

  const grouped = useMemo(() => SEARCH_CATEGORIES.slice(1).map((group) => ({ ...group, items: results.filter(({ item }) => item.category === group.value).map(({ item }) => item) })).filter((group) => group.items.length), [results])

  return (
    <div className="min-h-screen bg-[#eef4ef] text-slate-900">
      <PublicHeader items={[]} />
      <main>
        <section className="border-b border-emerald-900/10 bg-[linear-gradient(180deg,#dce9df,#c9dbce)] px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">Explorá Hola Sierras</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-5xl">Resultados de búsqueda</h1>
            <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); update("q", String(data.get("q") || "").trim()) }} className="mt-7 flex flex-col gap-2 rounded-[20px] bg-white p-2 shadow-lg sm:flex-row">
              <div className="relative flex-1"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700" /><input name="q" defaultValue={query} placeholder="¿Qué querés descubrir?" className="h-14 w-full rounded-2xl pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-700/25" /></div>
              <button className="h-14 rounded-2xl bg-emerald-800 px-8 font-semibold text-white hover:bg-emerald-700">Buscar</button>
            </form>
          </div>
        </section>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-4 rounded-3xl border border-emerald-900/10 bg-white p-5 shadow-sm md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Por categoría<select value={category} onChange={(e) => update("categoria", e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"><option value="todo">Todo</option>{SEARCH_CATEGORIES.slice(1).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700">Por ubicación<select value={location} onChange={(e) => update("ubicacion", e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal">{LOCATIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <p className="mt-6 text-sm text-slate-600">{results.length} {results.length === 1 ? "resultado" : "resultados"}{query ? <> para <strong>“{query}”</strong></> : null}</p>
          {grouped.length ? grouped.map((group) => <section key={group.value} className="mt-9"><h2 className="text-2xl font-bold text-slate-950">{group.label} <span className="text-base font-normal text-slate-500">({group.items.length})</span></h2><div className="mt-4 grid gap-4 md:grid-cols-2">{group.items.map((item) => <ResultCard key={item.id} item={item} />)}</div></section>) : <EmptyState />}
        </div>
      </main>
    </div>
  )
}

function ResultCard({ item }: { item: SearchItem }) {
  return <article className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="relative min-h-36 w-28 shrink-0 bg-emerald-50 sm:w-40">{item.image ? <Image src={item.image} alt="" fill sizes="160px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-emerald-700/50"><ImageIcon className="h-8 w-8" /></div>}</div><div className="flex min-w-0 flex-1 flex-col p-4"><span className="text-xs font-bold uppercase tracking-wide text-emerald-700">{item.categoryLabel}</span><h3 className="mt-1 text-lg font-bold text-slate-950">{item.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{item.location}</p><p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{item.description || "Conocé más sobre esta propuesta."}</p><Link href={item.href} className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-emerald-800">Ver más información <ArrowRight className="h-4 w-4" /></Link></div></article>
}

function EmptyState() {
  const links: Array<[string, SearchCategory]> = [["Qué hacer", "que-hacer"], ["Dónde comer", "donde-comer"], ["Qué conocer", "que-conocer"], ["Dónde quedarse", "donde-quedarse"]]
  return <div className="mt-9 rounded-3xl border border-slate-200 bg-white p-8 text-center sm:p-12"><Search className="mx-auto h-10 w-10 text-emerald-700" /><h2 className="mt-4 text-2xl font-bold">No encontramos resultados para tu búsqueda.</h2><p className="mt-2 text-slate-600">Probá con otra palabra o explorá las categorías de Hola Sierras.</p><div className="mt-6 flex flex-wrap justify-center gap-2">{links.map(([label, value]) => <Link key={value} href={`/buscar?categoria=${value}`} className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">{label}</Link>)}</div></div>
}

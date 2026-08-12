"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, ImageIcon, MapPin } from "lucide-react"
import { OptimizedImage } from "../OptimizedImage"
import { PublicHeader } from "../PublicHeader"
import { buildPublicNav } from "../../lib/publicNav"

export type ExploreItem = {
  id: string
  name: string
  location: string
  description: string
  image: string | null
  href: string
  subtype: string
}

export type ExploreConfig = {
  title: string
  description: string
  types: Array<{ value: string; label: string }>
}

const LOCATIONS = ["Todos", "Aiguá", "Mariscala"] as const

export function ExploreCategoryClient({ config, items }: { config: ExploreConfig; items: ExploreItem[] }) {
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]>("Todos")
  const [type, setType] = useState("todos")
  const filteredItems = useMemo(() => items.filter((item) =>
    (location === "Todos" || item.location.toLocaleLowerCase("es") === location.toLocaleLowerCase("es")) &&
    (type === "todos" || item.subtype === type)
  ), [items, location, type])

  return <div className="min-h-screen bg-[linear-gradient(180deg,#dce9df_0%,#edf4ef_45%,#f8faf8_100%)] text-slate-900">
    <PublicHeader items={buildPublicNav()} />
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{config.title}</h1>
        <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{config.description}</p>
      </header>

      <div className="mt-9 space-y-5 rounded-[28px] border border-emerald-900/10 bg-white/85 p-5 shadow-sm backdrop-blur sm:p-6">
        <FilterGroup label="Localidad" options={LOCATIONS.map((value) => ({ value, label: value }))} value={location} onChange={(value) => setLocation(value as typeof location)} />
        <FilterGroup label="Tipo" options={[{ value: "todos", label: "Todos" }, ...config.types]} value={type} onChange={setType} />
      </div>

      {filteredItems.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredItems.map((item) => <Link key={item.id} href={item.href} aria-label={`Ver información de ${item.name}`} className="group flex min-h-full flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] transition hover:-translate-y-1 hover:border-emerald-800/20 hover:shadow-[0_24px_55px_-30px_rgba(15,23,42,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40">
          <div className="relative aspect-[4/3] bg-slate-100">{item.image ? <OptimizedImage src={item.image} alt={item.name} sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw" className="object-cover transition duration-300 group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center text-emerald-700/40"><ImageIcon className="h-10 w-10" /></div>}</div>
          <div className="flex flex-1 flex-col p-5">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">{config.types.find((entry) => entry.value === item.subtype)?.label || config.title}</div>
            <h2 className="mt-2 text-xl font-bold leading-tight text-slate-950">{item.name}</h2>
            <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" />{item.location}</div>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.description || "Conocé más sobre esta propuesta."}</p>
            <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-emerald-800">Ver tarjeta <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </div>
        </Link>)}
      </div> : <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-600">Todavía no hay resultados para estos filtros.</div>}
    </main>
  </div>
}

function FilterGroup({ label, options, value, onChange }: { label: string; options: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void }) {
  return <div><div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="flex flex-wrap gap-2">{options.map((option) => <button key={option.value} type="button" onClick={() => onChange(option.value)} aria-pressed={value === option.value} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${value === option.value ? "bg-emerald-800 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-800"}`}>{option.label}</button>)}</div></div>
}

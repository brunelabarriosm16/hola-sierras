import { unstable_cache } from "next/cache"
import { supabaseServer } from "../lib/supabaseServer"
import { classifyListing, type SearchItem } from "../lib/search"
import { SearchResultsClient } from "../components/public/SearchResultsClient"
import { Suspense } from "react"

export const revalidate = 900

const getSearchItems = unstable_cache(async () => {
  const [{ data: comercios }, { data: servicios }, { data: eventos }, { data: cursos }, { data: instituciones }] = await Promise.all([
    supabaseServer.from("comercios").select("id,nombre,categoria,descripcion,direccion,localidad,imagen,imagen_url").or("estado.is.null,estado.eq.activo").order("id", { ascending: false }),
    supabaseServer.from("servicios").select("id,nombre,categoria,descripcion,direccion,localidad,imagen").or("estado.is.null,estado.eq.activo").order("id", { ascending: false }),
    supabaseServer.from("eventos").select("id,titulo,categoria,descripcion,ubicacion,localidad,imagen,fecha").or("estado.is.null,estado.eq.activo").order("fecha", { ascending: false }),
    supabaseServer.from("cursos").select("id,nombre,descripcion,responsable,localidad,imagen").or("estado.is.null,estado.eq.activo").order("id", { ascending: false }),
    supabaseServer.from("instituciones").select("id,nombre,descripcion,direccion,localidad,foto").or("estado.is.null,estado.eq.activo").order("id", { ascending: false }),
  ])

  const items: SearchItem[] = []
  for (const item of comercios || []) {
    const category = classifyListing("comercio", item.categoria)
    items.push({ id: `comercio-${item.id}`, name: item.nombre, category, categoryLabel: item.categoria || "Comercio", location: item.localidad || "Alrededores", description: item.descripcion || item.direccion || "", image: item.imagen_url || item.imagen || null, href: `/comercios/${item.id}`, tags: ["comercio", item.categoria || ""], date: null, recentOrder: Number(item.id) })
  }
  for (const item of servicios || []) {
    const category = classifyListing("servicio", item.categoria)
    items.push({ id: `servicio-${item.id}`, name: item.nombre, category, categoryLabel: item.categoria || "Servicio", location: item.localidad || "Alrededores", description: item.descripcion || item.direccion || "", image: item.imagen || null, href: `/servicios/${item.id}`, tags: ["servicio", item.categoria || ""], date: null, recentOrder: Number(item.id) })
  }
  for (const item of eventos || []) items.push({ id: `evento-${item.id}`, name: item.titulo, category: "eventos", categoryLabel: item.categoria || "Evento", location: item.localidad || item.ubicacion || "Alrededores", description: item.descripcion || "", image: item.imagen || null, href: `/eventos/${item.id}`, tags: ["evento", item.categoria || ""], date: item.fecha || null, recentOrder: Number(item.id) })
  for (const item of cursos || []) items.push({ id: `curso-${item.id}`, name: item.nombre, category: "que-hacer", categoryLabel: "Cursos y clases", location: item.localidad || "Alrededores", description: item.descripcion || "", image: item.imagen || null, href: `/cursos/${item.id}`, tags: ["curso", "clase", item.responsable || ""], date: null, recentOrder: Number(item.id) })
  for (const item of instituciones || []) items.push({ id: `institucion-${item.id}`, name: item.nombre, category: "comercios-servicios", categoryLabel: "Institución", location: item.localidad || "Alrededores", description: item.descripcion || item.direccion || "", image: item.foto || null, href: `/instituciones/${item.id}`, tags: ["institucion", "organizacion"], date: null, recentOrder: Number(item.id) })
  return items
}, ["search-index-v1"], { revalidate: 900 })

export default async function BuscarPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#eef4ef]" />}><SearchResultsClient items={await getSearchItems()} /></Suspense>
}

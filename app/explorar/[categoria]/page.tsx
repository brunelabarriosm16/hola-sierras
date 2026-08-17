import { notFound } from "next/navigation"
import { ExploreCategoryClient, type ExploreConfig, type ExploreItem } from "../../components/public/ExploreCategoryClient"
import { buildActiveEventsFilter } from "../../lib/eventDates"
import { supabaseServer } from "../../lib/supabaseServer"

export const dynamic = "force-dynamic"

const CONFIG: Record<string, ExploreConfig> = {
  "que-hacer": { title: "Qué hacer", description: "Paseos, naturaleza y experiencias para disfrutar las sierras.", types: [{ value: "paseos", label: "Paseos" }, { value: "naturaleza", label: "Naturaleza" }, { value: "experiencias", label: "Experiencias" }] },
  "donde-comer": { title: "Dónde comer", description: "Restaurantes, cafeterías y opciones de comida para llevar.", types: [{ value: "restaurantes", label: "Restaurantes" }, { value: "cafeterias", label: "Cafeterías" }, { value: "para-llevar", label: "Comida para llevar" }] },
  alojamientos: { title: "Alojamientos", description: "Lugares para quedarse en Aiguá, Mariscala y la región.", types: [{ value: "hoteles", label: "Hoteles" }, { value: "posadas", label: "Posadas" }, { value: "cabanas", label: "Cabañas" }, { value: "campings", label: "Campings" }] },
  eventos: { title: "Eventos", description: "Próximos eventos y propuestas de la región.", types: [{ value: "proximos", label: "Próximos eventos" }] },
}

const normalize = (value?: string | null) => (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
const findType = (text: string, options: Array<[string, string[]]>, fallback: string) => options.find(([, terms]) => terms.some((term) => text.includes(term)))?.[0] || fallback

export default async function ExplorePage({ params }: { params: Promise<{ categoria: string }> }) {
  const { categoria } = await params
  const config = CONFIG[categoria]
  if (!config) notFound()
  const items = await loadItems(categoria)
  return <ExploreCategoryClient config={config} items={items} />
}

async function loadItems(category: string): Promise<ExploreItem[]> {
  if (category === "eventos") {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabaseServer.from("eventos").select("id,titulo,categoria,descripcion,ubicacion,localidad,telefono,imagen,fecha,fecha_fin,fecha_solo_mes").eq("estado", "activo").or(buildActiveEventsFilter(today)).order("fecha", { ascending: true })
    return (data || []).map((item) => ({ id: `evento-${item.id}`, name: item.titulo, location: item.localidad || "Toda la región", description: item.descripcion || "", image: item.imagen || null, href: `/eventos?item=${item.id}`, subtype: "proximos", kind: "evento" as const, category: item.categoria, date: item.fecha, dateEnd: item.fecha_fin, dateOnlyMonth: item.fecha_solo_mes, address: item.ubicacion, phone: item.telefono }))
  }

  const [{ data: servicios }, { data: comercios }] = await Promise.all([
    supabaseServer.from("servicios").select("id,nombre,categoria,descripcion,localidad,direccion,contacto,imagen").or("estado.is.null,estado.eq.activo").order("id", { ascending: false }),
    supabaseServer.from("comercios").select("id,nombre,categoria,descripcion,localidad,direccion,telefono,imagen,imagen_url").or("estado.is.null,estado.eq.activo").order("id", { ascending: false }),
  ])
  const candidates = [
    ...(servicios || []).map((item) => ({ ...item, id: `servicio-${item.id}`, href: `/servicios/${item.id}`, image: item.imagen || null, kind: "servicio" as const, phone: item.contacto || null })),
    ...(comercios || []).map((item) => ({ ...item, id: `comercio-${item.id}`, href: `/comercios/${item.id}`, image: item.imagen_url || item.imagen || null, kind: "comercio" as const, phone: item.telefono || null })),
  ]

  return candidates.flatMap((item) => {
    const text = normalize(`${item.nombre} ${item.categoria || ""} ${item.descripcion || ""}`)
    let subtype = ""
    if (category === "que-hacer") subtype = findType(text, [["naturaleza", ["naturaleza", "sender", "reserva", "cerro", "parque"]], ["paseos", ["paseo", "recorrido", "visita", "cabalgata"]], ["experiencias", ["experiencia", "actividad", "turismo", "aventura", "taller"]]], "")
    if (category === "donde-comer") {
      const itemCategory = normalize(item.categoria)
      subtype = findType(itemCategory, [["cafeterias", ["cafeteria"]], ["para-llevar", ["comida para llevar"]], ["restaurantes", ["restaurante"]]], "")
    }
    if (category === "alojamientos") subtype = findType(text, [["campings", ["camping"]], ["cabanas", ["cabana"]], ["posadas", ["posada", "hostel", "hospedaje"]], ["hoteles", ["hotel", "alojamiento"]]], "")
    if (!subtype) return []
    return [{ id: item.id, name: item.nombre, location: item.localidad || "Toda la región", description: item.descripcion || "", image: item.image, href: item.href, subtype, kind: item.kind, category: item.categoria, address: item.direccion, phone: item.phone }]
  })
}

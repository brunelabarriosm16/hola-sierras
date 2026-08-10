import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "../../../lib/supabaseServer"
import { normalizeSearchText } from "../../../lib/search"

type Suggestion = { id: string; name: string; meta: string; href: string }

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || ""
  if (query.length < 2) return NextResponse.json([])

  const [{ data: comercios }, { data: servicios }, { data: eventos }, { data: cursos }, { data: instituciones }] = await Promise.all([
    supabaseServer.from("comercios").select("id,nombre,categoria,descripcion,localidad").or("estado.is.null,estado.eq.activo").order("id", { ascending: false }),
    supabaseServer.from("servicios").select("id,nombre,categoria,descripcion,localidad").or("estado.is.null,estado.eq.activo").order("id", { ascending: false }),
    supabaseServer.from("eventos").select("id,titulo,categoria,descripcion,localidad,ubicacion").or("estado.is.null,estado.eq.activo").order("id", { ascending: false }),
    supabaseServer.from("cursos").select("id,nombre,descripcion,responsable,localidad").or("estado.is.null,estado.eq.activo").order("id", { ascending: false }),
    supabaseServer.from("instituciones").select("id,nombre,descripcion,localidad").or("estado.is.null,estado.eq.activo").order("id", { ascending: false }),
  ])

  const candidates: Array<Suggestion & { searchable: string }> = [
    ...(comercios || []).map((item) => ({ id: `comercio-${item.id}`, name: item.nombre, meta: [item.categoria || "Comercio", item.localidad].filter(Boolean).join(" · "), href: `/comercios/${item.id}`, searchable: `${item.nombre} ${item.categoria || ""} ${item.descripcion || ""} ${item.localidad || ""}` })),
    ...(servicios || []).map((item) => ({ id: `servicio-${item.id}`, name: item.nombre, meta: [item.categoria || "Servicio", item.localidad].filter(Boolean).join(" · "), href: `/servicios/${item.id}`, searchable: `${item.nombre} ${item.categoria || ""} ${item.descripcion || ""} ${item.localidad || ""}` })),
    ...(eventos || []).map((item) => ({ id: `evento-${item.id}`, name: item.titulo, meta: [item.categoria || "Evento", item.localidad || item.ubicacion].filter(Boolean).join(" · "), href: `/eventos/${item.id}`, searchable: `${item.titulo} ${item.categoria || ""} ${item.descripcion || ""} ${item.localidad || ""} ${item.ubicacion || ""}` })),
    ...(cursos || []).map((item) => ({ id: `curso-${item.id}`, name: item.nombre, meta: ["Curso o clase", item.localidad].filter(Boolean).join(" · "), href: `/cursos/${item.id}`, searchable: `${item.nombre} ${item.descripcion || ""} ${item.responsable || ""} ${item.localidad || ""}` })),
    ...(instituciones || []).map((item) => ({ id: `institucion-${item.id}`, name: item.nombre, meta: ["Institución", item.localidad].filter(Boolean).join(" · "), href: `/instituciones/${item.id}`, searchable: `${item.nombre} ${item.descripcion || ""} ${item.localidad || ""}` })),
  ]
  const normalizedQuery = normalizeSearchText(query)
  const results = candidates
    .map((item) => {
      const name = normalizeSearchText(item.name)
      const searchable = normalizeSearchText(item.searchable)
      const score = name === normalizedQuery ? 10 : name.startsWith(normalizedQuery) ? 7 : name.includes(normalizedQuery) ? 5 : searchable.includes(normalizedQuery) ? 2 : 0
      return { item, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ item }) => ({ id: item.id, name: item.name, meta: item.meta, href: item.href }))

  return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } })
}

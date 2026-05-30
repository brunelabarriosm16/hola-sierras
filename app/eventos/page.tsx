import { EventosPageClient } from "../components/public/EventosPageClient"
import { buildActiveEventsFilter } from "../lib/eventDates"
import { supabaseServer } from "../lib/supabaseServer"
import { unstable_cache } from "next/cache"

export const revalidate = 3600
export const fetchCache = "default-cache"

const getEventos = unstable_cache(
  async () => {
    const today = new Date().toISOString().slice(0, 10)

    const { data } = await supabaseServer
      .from("eventos")
      .select("id, titulo, categoria, descripcion, fecha, fecha_fin, fecha_solo_mes, ubicacion, telefono, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp")
      .eq("estado", "activo")
      .or(buildActiveEventsFilter(today))
      .order("fecha", { ascending: true })

    return data || []
  },
  ["public-eventos"],
  { revalidate: 3600 }
)

export default async function EventosPage() {
  const data = await getEventos()

  return <EventosPageClient initialEventos={data} />
}

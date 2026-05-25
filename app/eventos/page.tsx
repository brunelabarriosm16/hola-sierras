import { EventosPageClient } from "../components/public/EventosPageClient"
import { buildActiveEventsFilter } from "../lib/eventDates"
import { supabaseServer } from "../lib/supabaseServer"

export const revalidate = 3600
export const fetchCache = "default-cache"

export default async function EventosPage() {
  const today = new Date().toISOString().slice(0, 10)

  const { data } = await supabaseServer
    .from("eventos")
    .select("id, titulo, categoria, descripcion, fecha, fecha_fin, fecha_solo_mes, ubicacion, telefono, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp")
    .eq("estado", "activo")
    .or(buildActiveEventsFilter(today))
    .order("fecha", { ascending: true })

  return <EventosPageClient initialEventos={data || []} />
}

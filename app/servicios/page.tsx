import { ServiciosPageClient } from "../components/public/ServiciosPageClient"
import { supabaseServer } from "../lib/supabaseServer"

export const revalidate = 3600
export const fetchCache = "default-cache"

export default async function ServiciosPage() {
  const { data } = await supabaseServer
    .from("servicios")
    .select("id, nombre, categoria, descripcion, premium_detalle, premium_galeria, premium_activo, responsable, contacto, direccion, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp")
    .or("estado.is.null,estado.eq.activo")
    .order("id", { ascending: false })

  return <ServiciosPageClient initialServicios={data || []} />
}

import { CursosPageClient } from "../components/public/CursosPageClient"
import { supabaseServer } from "../lib/supabaseServer"

export const revalidate = 3600
export const fetchCache = "default-cache"

export default async function CursosPage() {
  const { data } = await supabaseServer
    .from("cursos")
    .select("id, nombre, descripcion, responsable, contacto, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp")
    .eq("estado", "activo")
    .order("id", { ascending: false })

  return <CursosPageClient initialCursos={data || []} />
}

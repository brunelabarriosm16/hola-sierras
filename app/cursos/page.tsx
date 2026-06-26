import { CursosPageClient } from "../components/public/CursosPageClient"
import { supabaseServer } from "../lib/supabaseServer"
import { unstable_cache } from "next/cache"

export const revalidate = 3600
export const fetchCache = "default-cache"

const getCursos = unstable_cache(
  async () => {
    const { data } = await supabaseServer
      .from("cursos")
      .select("id, nombre, descripcion, responsable, contacto, localidad, edades, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp")
      .eq("estado", "activo")
      .order("id", { ascending: false })

    return data || []
  },
  ["public-cursos"],
  { revalidate: 3600 }
)

export default async function CursosPage() {
  const data = await getCursos()

  return <CursosPageClient initialCursos={data} />
}

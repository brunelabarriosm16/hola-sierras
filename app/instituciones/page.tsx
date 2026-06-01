import { unstable_cache } from "next/cache"
import { InstitucionesPageClient } from "../components/public/InstitucionesPageClient"
import { supabaseServer } from "../lib/supabaseServer"

export const revalidate = 3600
export const fetchCache = "default-cache"

const getInstituciones = unstable_cache(
  async () => {
    const { data } = await supabaseServer
      .from("instituciones")
      .select("id, nombre, descripcion, direccion, localidad, telefono, web_url, instagram_url, facebook_url, foto, estado, usa_whatsapp")
      .or("estado.is.null,estado.eq.activo")
      .order("id", { ascending: false })

    return data || []
  },
  ["public-instituciones"],
  { revalidate: 3600 }
)

export default async function InstitucionesPage() {
  const instituciones = await getInstituciones()

  return <InstitucionesPageClient initialInstituciones={instituciones} />
}

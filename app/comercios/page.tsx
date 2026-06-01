import { ComerciosPageClient } from "../components/public/ComerciosPageClient"
import { supabaseServer } from "../lib/supabaseServer"
import { unstable_cache } from "next/cache"

export const revalidate = 3600
export const fetchCache = "default-cache"

const getComercios = unstable_cache(
  async () => {
    const { data } = await supabaseServer
      .from("comercios")
      .select("id, nombre, descripcion, premium_detalle, premium_galeria, premium_activo, direccion, localidad, telefono, web_url, instagram_url, facebook_url, imagen, imagen_url, usa_whatsapp")
      .eq("estado", "activo")
      .order("id", { ascending: false })

    return data || []
  },
  ["public-comercios"],
  { revalidate: 3600 }
)

export default async function ComerciosPage() {
  const data = await getComercios()

  return <ComerciosPageClient initialComercios={data} />
}

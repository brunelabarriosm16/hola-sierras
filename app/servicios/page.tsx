import { ServiciosPageClient } from "../components/public/ServiciosPageClient"
import { supabaseServer } from "../lib/supabaseServer"
import { unstable_cache } from "next/cache"

export const revalidate = 3600
export const fetchCache = "default-cache"

const getServicios = unstable_cache(
  async () => {
    const { data } = await supabaseServer
      .from("servicios")
      .select("id, nombre, categoria, descripcion, premium_detalle, premium_galeria, premium_activo, responsable, contacto, direccion, localidad, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp")
      .or("estado.is.null,estado.eq.activo")
      .order("id", { ascending: false })

    return data || []
  },
  ["public-servicios"],
  { revalidate: 3600 }
)

export default async function ServiciosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const data = await getServicios()
  const params = await searchParams

  return (
    <ServiciosPageClient
      initialServicios={data}
      tourismOnly={params.tipo === "turismo"}
    />
  )
}

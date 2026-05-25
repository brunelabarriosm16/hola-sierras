import { notFound, redirect } from "next/navigation"
import { PremiumListingPage } from "../../components/public/PremiumListingPage"
import { buildActiveEventsFilter } from "../../lib/eventDates"
import { supabaseServer } from "../../lib/supabaseServer"

export const revalidate = 7200
export const fetchCache = "default-cache"

export default async function ComercioSharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data } = await supabaseServer
    .from("comercios")
    .select("id, nombre, descripcion, premium_detalle, premium_galeria, premium_extra_titulo, premium_extra_detalle, premium_extra_galeria, premium_activo, direccion, telefono, web_url, instagram_url, facebook_url, imagen, imagen_url, usa_whatsapp, estado, owner_email")
    .eq("id", Number(id))
    .maybeSingle()

  if (!data) {
    notFound()
  }

  if (data.estado && data.estado !== "activo") {
    notFound()
  }

  if (!data.premium_activo) {
    redirect(`/comercios?item=${encodeURIComponent(id)}`)
  }

  const today = new Date().toISOString().slice(0, 10)
  const { data: relatedEventsRaw } = await supabaseServer
    .from("eventos")
    .select("id, titulo, categoria, fecha, fecha_fin, fecha_solo_mes, descripcion, imagen, owner_email, related_entity_type, related_entity_id")
    .eq("estado", "activo")
    .or(buildActiveEventsFilter(today))
    .order("fecha", { ascending: true })

  const relatedEvents = (relatedEventsRaw || []).filter((event) => {
    const explicitlyLinked =
      event.related_entity_type === "comercio" && event.related_entity_id === data.id
    const legacyLinked =
      !event.related_entity_type && !event.related_entity_id && data.owner_email
        ? event.owner_email === data.owner_email
        : false

    return explicitlyLinked || legacyLinked
  })

  return (
    <PremiumListingPage
      kind="comercio"
      id={data.id}
      title={data.nombre}
      imageSrc={data.imagen_url || data.imagen || null}
      description={data.descripcion}
      premiumDetail={data.premium_detalle}
      premiumGallery={data.premium_galeria}
      premiumExtraTitle={data.premium_extra_titulo}
      premiumExtraDetail={data.premium_extra_detalle}
      premiumExtraGallery={data.premium_extra_galeria}
      address={data.direccion}
      phone={data.telefono}
      webUrl={data.web_url}
      instagramUrl={data.instagram_url}
      facebookUrl={data.facebook_url}
      usesWhatsapp={data.usa_whatsapp}
      relatedEvents={relatedEvents}
    />
  )
}

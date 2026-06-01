import { notFound, redirect } from "next/navigation"
import { PremiumListingPage } from "../../components/public/PremiumListingPage"
import { buildActiveEventsFilter } from "../../lib/eventDates"
import { supabaseServer } from "../../lib/supabaseServer"

export const revalidate = 7200
export const fetchCache = "default-cache"

export default async function ServicioSharePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data } = await supabaseServer
    .from("servicios")
    .select("id, nombre, categoria, descripcion, premium_detalle, premium_galeria, premium_extra_titulo, premium_extra_detalle, premium_extra_galeria, premium_activo, responsable, contacto, direccion, localidad, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp, owner_email")
    .eq("id", Number(id))
    .maybeSingle()

  if (!data) {
    notFound()
  }

  if (data.estado && data.estado !== "activo") {
    notFound()
  }

  if (!data.premium_activo) {
    redirect(`/servicios?item=${encodeURIComponent(id)}`)
  }

  const today = new Date().toISOString().slice(0, 10)
  const relatedEventSelect =
    "id, titulo, categoria, fecha, fecha_fin, fecha_solo_mes, descripcion, imagen, related_entity_type, related_entity_id, owner_email"
  const [explicitRelatedEvents, legacyRelatedEvents] = await Promise.all([
    supabaseServer
      .from("eventos")
      .select(relatedEventSelect)
      .eq("estado", "activo")
      .eq("related_entity_type", "servicio")
      .eq("related_entity_id", data.id)
      .or(buildActiveEventsFilter(today))
      .order("fecha", { ascending: true }),
    data.owner_email
      ? supabaseServer
          .from("eventos")
          .select(relatedEventSelect)
          .eq("estado", "activo")
          .is("related_entity_type", null)
          .is("related_entity_id", null)
          .eq("owner_email", data.owner_email)
          .or(buildActiveEventsFilter(today))
          .order("fecha", { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const relatedEvents = [
    ...(explicitRelatedEvents.data || []),
    ...(legacyRelatedEvents.data || []),
  ]

  return (
    <PremiumListingPage
      kind="servicio"
      id={data.id}
      title={data.nombre}
      imageSrc={data.imagen || null}
      description={data.descripcion}
      premiumDetail={data.premium_detalle}
      premiumGallery={data.premium_galeria}
      premiumExtraTitle={data.premium_extra_titulo}
      premiumExtraDetail={data.premium_extra_detalle}
      premiumExtraGallery={data.premium_extra_galeria}
      address={data.direccion}
      location={data.localidad}
      phone={data.contacto}
      contactName={data.responsable}
      category={data.categoria}
      webUrl={data.web_url}
      instagramUrl={data.instagram_url}
      facebookUrl={data.facebook_url}
      usesWhatsapp={data.usa_whatsapp}
      relatedEvents={relatedEvents}
    />
  )
}

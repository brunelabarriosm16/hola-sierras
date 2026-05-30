'use client'

import Link from "next/link"
import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, MapPin, Phone, Search } from "lucide-react"
import { ContactActionLink } from "../ContactActionLink"
import { ExternalLinksButtons } from "../ExternalLinksButtons"
import { OptimizedImage } from "../OptimizedImage"
import { PrimaryExternalLinkButton } from "../PrimaryExternalLinkButton"
import { PublicDetailModal } from "../PublicDetailModal"
import { PublicHeader } from "../PublicHeader"
import { ShareButton } from "../ShareButton"
import { recordContentVisit, recordSiteVisit } from "../../lib/contentVisits"
import { buildPublicNav } from "../../lib/publicNav"
import { recordViewMore } from "../../lib/viewMoreTracking"

export type Comercio = {
  id: number
  nombre: string
  descripcion: string
  premium_detalle?: string | null
  premium_galeria?: string[] | null
  premium_activo?: boolean | null
  direccion: string
  telefono: string
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen?: string | null
  imagen_url?: string | null
  usa_whatsapp?: boolean | null
}

export function ComerciosPageClient({
  initialComercios,
}: {
  initialComercios: Comercio[]
}) {
  const router = useRouter()
  const [comercios] = useState<Comercio[]>(initialComercios)
  const [search, setSearch] = useState("")
  const [selectedComercioId, setSelectedComercioId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("item")
  )

  const getShareUrl = (id: number) => {
    if (typeof window === "undefined") return `/comercios/${id}`
    return `${window.location.origin}/comercios/${id}`
  }
  const selectedComercio = useMemo(
    () =>
      comercios.find((comercio) => String(comercio.id) === selectedComercioId) || null,
    [comercios, selectedComercioId]
  )

  useEffect(() => {
    void recordSiteVisit("comercios-page", "Listado de comercios")
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (selectedComercioId) {
      url.searchParams.set("item", selectedComercioId)
    } else {
      url.searchParams.delete("item")
    }
    window.history.replaceState({}, "", url)
  }, [selectedComercioId])

  const getWhatsappLink = (telefono: string) => {
    const limpio = telefono.replace(/\D/g, "")
    const numero = limpio.startsWith("598")
      ? limpio
      : `598${limpio.replace(/^0+/, "")}`

    return `https://wa.me/${numero}`
  }

  const getContactHref = (telefono: string, usaWhatsapp?: boolean | null) =>
    usaWhatsapp === false ? `tel:${telefono}` : getWhatsappLink(telefono)

  const getContactLabel = (usaWhatsapp?: boolean | null) =>
    usaWhatsapp === false ? "Llamar por telefono" : "Contactar por WhatsApp"

  const handleOpenComercio = (comercio: Comercio) => {
    void recordViewMore("comercios", String(comercio.id), comercio.nombre)
    void recordContentVisit("comercios", String(comercio.id), comercio.nombre)
    setSelectedComercioId(String(comercio.id))
  }

  const handleOpenPremiumProfile = (comercio: Comercio) => {
    void recordViewMore("comercios", String(comercio.id), comercio.nombre)
    void recordContentVisit("comercios", String(comercio.id), comercio.nombre)
    router.push(`/comercios/${comercio.id}`)
  }

  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    action: () => void
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      action()
    }
  }

  const comerciosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return comercios

    return comercios.filter((comercio) =>
      `${comercio.nombre} ${comercio.descripcion || ""} ${comercio.direccion || ""} ${comercio.telefono || ""}`
        .toLowerCase()
        .includes(term)
    )
  }, [comercios, search])

  return (
    <main className="min-h-screen bg-white">
      <PublicDetailModal
        open={Boolean(selectedComercio)}
        onClose={() => setSelectedComercioId(null)}
        title={selectedComercio?.nombre || ""}
        imageSrc={
          selectedComercio
            ? selectedComercio.imagen || selectedComercio.imagen_url || null
            : null
        }
        imageAlt={selectedComercio?.nombre || "Comercio"}
        description={selectedComercio?.descripcion || null}
        extraContent={
          selectedComercio?.premium_activo ? (
            <div className="space-y-4">
              {selectedComercio.premium_detalle ? (
                <div className="rounded-[24px] border border-violet-100 bg-violet-50/70 p-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
                    Perfil ampliado
                  </div>
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                    {selectedComercio.premium_detalle}
                  </p>
                </div>
              ) : null}

              {selectedComercio.premium_galeria?.length ? (
                <div>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Galeria
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedComercio.premium_galeria.map((image, index) => (
                      <div key={`${image}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <OptimizedImage
                          src={image}
                          alt={`${selectedComercio.nombre} ${index + 1}`}
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-contain p-2"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null
        }
        meta={[
          ...(selectedComercio?.direccion
            ? [{ icon: MapPin, text: selectedComercio.direccion }]
            : []),
          ...(selectedComercio?.telefono
            ? [{ icon: Phone, text: selectedComercio.telefono }]
            : []),
        ]}
        actions={
          selectedComercio ? (
            <>
              {selectedComercio.telefono ? (
                <ContactActionLink
                  href={getContactHref(
                    selectedComercio.telefono,
                    selectedComercio.usa_whatsapp
                  )}
                  mode={selectedComercio.usa_whatsapp === false ? "phone" : "whatsapp"}
                  section="comercios"
                  itemId={String(selectedComercio.id)}
                  itemTitle={selectedComercio.nombre}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-500"
                >
                  <Phone className="h-4 w-4" />
                  {getContactLabel(selectedComercio.usa_whatsapp)}
                </ContactActionLink>
              ) : null}
              <ShareButton
                title={selectedComercio.nombre}
                text={selectedComercio.descripcion}
                url={getShareUrl(selectedComercio.id)}
                section="comercios"
                itemId={String(selectedComercio.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              />
              <ExternalLinksButtons
                webUrl={selectedComercio.web_url}
                instagramUrl={selectedComercio.instagram_url}
                facebookUrl={selectedComercio.facebook_url}
                section="comercios"
                itemId={String(selectedComercio.id)}
                itemTitle={selectedComercio.nombre}
              />
              {selectedComercio.premium_activo ? (
                <Link
                  href={`/comercios/${selectedComercio.id}`}
                  onClick={() => handleOpenPremiumProfile(selectedComercio)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
                >
                  Ver perfil completo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </>
          ) : null
        }
      />

      <PublicHeader items={buildPublicNav("comercios")} />

      <div className="mx-auto max-w-7xl px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900">Comercios</h1>

        <div className="mt-6 max-w-xl">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, direccion o descripcion"
              className="w-full text-sm outline-none"
            />
          </div>
        </div>

        {comerciosFiltrados.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">
              {comercios.length === 0
                ? "Todavía no hay comercios cargados."
                : "No se encontraron comercios con esa busqueda."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {comerciosFiltrados.map((comercio) => {
              const imagenSrc = comercio.imagen || comercio.imagen_url

              return (
                <div
                  key={comercio.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (comercio.premium_activo) {
                      handleOpenPremiumProfile(comercio)
                      return
                    }

                    handleOpenComercio(comercio)
                  }}
                  onKeyDown={(event) =>
                    handleCardKeyDown(event, () => {
                      if (comercio.premium_activo) {
                        handleOpenPremiumProfile(comercio)
                        return
                      }

                      handleOpenComercio(comercio)
                    })
                  }
                  className={`cursor-pointer rounded-xl border p-5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${comercio.premium_activo ? "border-violet-200 bg-violet-50/20" : "border-gray-200"}`}
                >
                  {imagenSrc && (
                    <div className="relative mb-3 h-40 w-full overflow-hidden rounded-lg bg-slate-50">
                      <OptimizedImage
                        src={imagenSrc}
                        alt={comercio.nombre}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        className="object-contain p-3"
                      />
                    </div>
                  )}

                  <h2 className="text-lg font-semibold text-gray-900">
                    {comercio.nombre}
                  </h2>

                  <p className="line-clamp-3 whitespace-pre-line text-sm text-gray-600">
                    {comercio.descripcion}
                  </p>

                  <p className="mt-2 text-sm text-gray-600">
                    Direccion: {comercio.direccion}
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    Telefono: {comercio.telefono}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {comercio.premium_activo ? (
                      <Link
                        href={`/comercios/${comercio.id}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleOpenPremiumProfile(comercio)
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
                      >
                        Ver perfil completo
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleOpenComercio(comercio)
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                      >
                        Ver mas
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}

                      {comercio.telefono && comercio.usa_whatsapp !== false ? (
                        <ContactActionLink
                          href={getContactHref(comercio.telefono, comercio.usa_whatsapp)}
                          mode="whatsapp"
                          section="comercios"
                          itemId={String(comercio.id)}
                          itemTitle={comercio.nombre}
                          onClick={(event) => event.stopPropagation()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block rounded-lg bg-green-600 px-4 py-2 text-sm text-white"
                        >
                          Contactar por WhatsApp
                        </ContactActionLink>
                      ) : (
                        <PrimaryExternalLinkButton
                          webUrl={comercio.web_url}
                          instagramUrl={comercio.instagram_url}
                          facebookUrl={comercio.facebook_url}
                          section="comercios"
                          itemId={String(comercio.id)}
                          itemTitle={comercio.nombre}
                          onClick={(event) => event.stopPropagation()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                        />
                      )}

                    <div onClick={(event) => event.stopPropagation()}>
                      <ShareButton
                        title={comercio.nombre}
                        text={comercio.descripcion}
                        url={getShareUrl(comercio.id)}
                        section="comercios"
                        itemId={String(comercio.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

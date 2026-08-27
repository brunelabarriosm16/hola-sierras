'use client'

import Link from "next/link"
import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, MapPin, Phone, Search, UserRound } from "lucide-react"
import { ContactActionLink } from "../ContactActionLink"
import { ExternalLinksButtons } from "../ExternalLinksButtons"
import { OptimizedImage } from "../OptimizedImage"
import { PrimaryExternalLinkButton } from "../PrimaryExternalLinkButton"
import { PublicDetailModal } from "../PublicDetailModal"
import { PublicHeader } from "../PublicHeader"
import { ShareButton } from "../ShareButton"
import { recordContentVisit, recordSiteVisit } from "../../lib/contentVisits"
import { getGoogleMapsSearchUrl } from "../../lib/maps"
import { buildPublicNav } from "../../lib/publicNav"
import { recordViewMore } from "../../lib/viewMoreTracking"
import { isTourismProposal } from "../../lib/tourism"

export type Servicio = {
  id: number
  nombre: string
  categoria: string
  descripcion: string | null
  premium_detalle?: string | null
  premium_galeria?: string[] | null
  premium_activo?: boolean | null
  responsable: string | null
  contacto: string | null
  direccion: string | null
  localidad?: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
}

export function ServiciosPageClient({
  initialServicios,
  tourismOnly = false,
}: {
  initialServicios: Servicio[]
  tourismOnly?: boolean
}) {
  const router = useRouter()
  const [servicios] = useState<Servicio[]>(initialServicios)
  const [search, setSearch] = useState("")
  const [selectedServicioId, setSelectedServicioId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("item")
  )

  const getShareUrl = (id: number) => {
    if (typeof window === "undefined") return `/servicios/${id}`
    return `${window.location.origin}/servicios/${id}`
  }
  const selectedServicio = useMemo(
    () =>
      servicios.find((servicio) => String(servicio.id) === selectedServicioId) ||
      null,
    [servicios, selectedServicioId]
  )

  useEffect(() => {
    void recordSiteVisit("servicios-page", "Listado de servicios")
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (selectedServicioId) {
      url.searchParams.set("item", selectedServicioId)
    } else {
      url.searchParams.delete("item")
    }
    window.history.replaceState({}, "", url)
  }, [selectedServicioId])

  const whatsappLink = (telefono: string | null) => {
    if (!telefono) return "#"
    const limpio = telefono.replace(/\D/g, "")
    const numero = limpio.startsWith("598")
      ? limpio
      : `598${limpio.replace(/^0+/, "")}`

    return `https://wa.me/${numero}`
  }

  const getContactHref = (contacto: string | null, usaWhatsapp?: boolean | null) => {
    if (!contacto) return "#"
    return usaWhatsapp === false ? `tel:${contacto}` : whatsappLink(contacto)
  }

  const serviciosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    return servicios.filter((servicio) => {
      if (tourismOnly && !isTourismProposal(servicio)) return false
      if (!term) return true

      return `${servicio.nombre} ${servicio.categoria} ${servicio.descripcion || ""} ${servicio.responsable || ""} ${servicio.contacto || ""} ${servicio.direccion || ""} ${servicio.localidad || ""}`
        .toLowerCase()
        .includes(term)
    })
  }, [servicios, search, tourismOnly])

  const serviciosAgrupados = useMemo(() => {
    return serviciosFiltrados.reduce<Record<string, Servicio[]>>((acc, servicio) => {
      const categoria = servicio.categoria?.trim() || "Otros"
      if (!acc[categoria]) {
        acc[categoria] = []
      }
      acc[categoria].push(servicio)
      return acc
    }, {})
  }, [serviciosFiltrados])

  const handleOpenServicio = (servicio: Servicio) => {
    void recordViewMore("servicios", String(servicio.id), servicio.nombre)
    void recordContentVisit("servicios", String(servicio.id), servicio.nombre)
    setSelectedServicioId(String(servicio.id))
  }

  const handleOpenPremiumProfile = (servicio: Servicio) => {
    void recordViewMore("servicios", String(servicio.id), servicio.nombre)
    void recordContentVisit("servicios", String(servicio.id), servicio.nombre)
    router.push(`/servicios/${servicio.id}`)
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

  return (
    <main className="min-h-screen bg-white">
      <PublicDetailModal
        open={Boolean(selectedServicio)}
        onClose={() => setSelectedServicioId(null)}
        title={selectedServicio?.nombre || ""}
        imageSrc={selectedServicio?.imagen || null}
        imageAlt={selectedServicio?.nombre || "Servicio"}
        imagePlacement={selectedServicio?.premium_activo ? "side" : "top"}
        badge={selectedServicio?.categoria || null}
        description={selectedServicio?.descripcion || null}
        extraContent={
          selectedServicio?.premium_activo ? (
            <div className="space-y-4">
              {selectedServicio.premium_detalle ? (
                <div className="rounded-[24px] border border-violet-100 bg-violet-50/70 p-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
                    Perfil ampliado
                  </div>
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                    {selectedServicio.premium_detalle}
                  </p>
                </div>
              ) : null}
              {selectedServicio.premium_galeria?.length ? (
                <div>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Galeria
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedServicio.premium_galeria.map((image, index) => (
                      <div key={`${image}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <OptimizedImage
                          src={image}
                          alt={`${selectedServicio.nombre} ${index + 1}`}
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
          ...(selectedServicio?.responsable
            ? [{ icon: UserRound, text: selectedServicio.responsable }]
            : []),
          ...(selectedServicio?.contacto
            ? [{ icon: Phone, text: selectedServicio.contacto }]
            : []),
          ...(selectedServicio?.direccion
            ? [{
                icon: MapPin,
                text: selectedServicio.direccion,
                href: getGoogleMapsSearchUrl(
                  selectedServicio.nombre,
                  selectedServicio.direccion,
                  selectedServicio.localidad
                ),
              }]
            : []),
          ...(selectedServicio?.localidad
            ? [{ icon: MapPin, text: selectedServicio.localidad }]
            : []),
        ]}
        actions={
          selectedServicio ? (
            <>
              {selectedServicio.contacto ? (
                <ContactActionLink
                  href={getContactHref(
                    selectedServicio.contacto,
                    selectedServicio.usa_whatsapp
                  )}
                  mode={selectedServicio.usa_whatsapp === false ? "phone" : "whatsapp"}
                  section="servicios"
                  itemId={String(selectedServicio.id)}
                  itemTitle={selectedServicio.nombre}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                >
                  <Phone className="h-4 w-4" />
                  {selectedServicio.usa_whatsapp === false ? "Llamar" : "Contactar"}
                </ContactActionLink>
              ) : null}
              <ShareButton
                title={selectedServicio.nombre}
                text={selectedServicio.descripcion || undefined}
                url={getShareUrl(selectedServicio.id)}
                section="servicios"
                itemId={String(selectedServicio.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              />
              <ExternalLinksButtons
                webUrl={selectedServicio.web_url}
                instagramUrl={selectedServicio.instagram_url}
                facebookUrl={selectedServicio.facebook_url}
                section="servicios"
                itemId={String(selectedServicio.id)}
                itemTitle={selectedServicio.nombre}
              />
              {selectedServicio.premium_activo ? (
                <Link
                  href={`/servicios/${selectedServicio.id}`}
                  onClick={() => handleOpenPremiumProfile(selectedServicio)}
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

      <PublicHeader items={buildPublicNav("servicios")} />

      <div className="mx-auto max-w-7xl px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900">
          {tourismOnly ? "Propuestas Turísticas" : "Servicios y Profesionales"}
        </h1>
        <p className="mt-2 text-gray-600">
          {tourismOnly
            ? "Todos los alojamientos y las actividades para disfrutar de la región."
            : "Profesionales, alojamientos y otros servicios disponibles en la ciudad"}
        </p>

        <div className="mt-6 max-w-xl">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, categoria o responsable"
              className="w-full text-sm outline-none"
            />
          </div>
        </div>

        {serviciosFiltrados.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">
              {servicios.length === 0
                ? "Todavía no hay servicios cargados."
                : tourismOnly
                  ? "No se encontraron propuestas turísticas con esa búsqueda."
                  : "No se encontraron servicios con esa búsqueda."}
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {Object.entries(serviciosAgrupados).map(([categoria, items]) => (
              <section key={categoria}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-amber-100" />
                  <h2 className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                    {categoria}
                  </h2>
                  <div className="h-px flex-1 bg-amber-100" />
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-6 xl:grid-cols-4">
                  {items.map((servicio) => (
                    <div
                      key={servicio.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (servicio.premium_activo) {
                          handleOpenPremiumProfile(servicio)
                          return
                        }

                        handleOpenServicio(servicio)
                      }}
                      onKeyDown={(event) =>
                        handleCardKeyDown(event, () => {
                          if (servicio.premium_activo) {
                            handleOpenPremiumProfile(servicio)
                            return
                          }

                          handleOpenServicio(servicio)
                        })
                      }
                      className={`cursor-pointer overflow-hidden rounded-xl border shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${servicio.premium_activo ? "border-violet-200 bg-violet-50/20" : "border-gray-200"}`}
                    >
                      {servicio.imagen && (
                        <div className="relative h-32 w-full bg-slate-50 sm:h-56">
                          <OptimizedImage
                            src={servicio.imagen}
                            alt={servicio.nombre}
                            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 50vw, 25vw"
                            className="object-contain p-3"
                          />
                        </div>
                      )}

                      <div className="p-3 md:p-5">
                        <h3 className="text-base font-semibold text-gray-900 md:text-xl">
                          {servicio.nombre}
                        </h3>

                        {servicio.descripcion && (
                          <p className="line-clamp-2 mt-2 whitespace-pre-line text-xs leading-relaxed text-gray-700 md:line-clamp-3 md:mt-3 md:text-sm">
                            {servicio.descripcion}
                          </p>
                        )}

                        <div className="mt-4 space-y-2 text-sm text-gray-600">
                          {servicio.responsable && (
                            <div className="flex items-center gap-2">
                              <UserRound className="h-4 w-4" />
                              <span>{servicio.responsable}</span>
                            </div>
                          )}

                          {servicio.contacto && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>{servicio.contacto}</span>
                            </div>
                          )}

                          {servicio.direccion && (
                            <a
                              href={
                                getGoogleMapsSearchUrl(
                                  servicio.nombre,
                                  servicio.direccion,
                                  servicio.localidad
                                ) || "#"
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="flex items-center gap-2 text-sky-700 transition hover:text-sky-800"
                            >
                              <MapPin className="h-4 w-4" />
                              <span>{servicio.direccion}</span>
                            </a>
                          )}
                          {servicio.localidad ? (
                            <div className="flex items-center gap-2 font-medium text-sky-700">
                              <MapPin className="h-4 w-4" />
                              <span>{servicio.localidad}</span>
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          {servicio.premium_activo ? (
                            <Link
                              href={`/servicios/${servicio.id}`}
                              onClick={(event) => {
                                event.stopPropagation()
                                handleOpenPremiumProfile(servicio)
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
                                handleOpenServicio(servicio)
                              }}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                            >
                              Ver mas
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          )}

                            {servicio.contacto && servicio.usa_whatsapp !== false ? (
                              <ContactActionLink
                                href={getContactHref(servicio.contacto, servicio.usa_whatsapp)}
                                mode="whatsapp"
                                section="servicios"
                                itemId={String(servicio.id)}
                                itemTitle={servicio.nombre}
                                onClick={(event) => event.stopPropagation()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                              >
                                Contactar
                              </ContactActionLink>
                            ) : (
                              <PrimaryExternalLinkButton
                                webUrl={servicio.web_url}
                                instagramUrl={servicio.instagram_url}
                                facebookUrl={servicio.facebook_url}
                                section="servicios"
                                itemId={String(servicio.id)}
                                itemTitle={servicio.nombre}
                                onClick={(event) => event.stopPropagation()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                              />
                            )}

                          <div onClick={(event) => event.stopPropagation()}>
                            <ShareButton
                              title={servicio.nombre}
                              text={servicio.descripcion || undefined}
                              url={getShareUrl(servicio.id)}
                              section="servicios"
                              itemId={String(servicio.id)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

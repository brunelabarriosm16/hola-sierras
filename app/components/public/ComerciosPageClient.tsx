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
import { getGoogleMapsSearchUrl } from "../../lib/maps"
import { buildPublicNav } from "../../lib/publicNav"
import { recordViewMore } from "../../lib/viewMoreTracking"

export type Comercio = {
  id: number
  nombre: string
  categoria?: string | null
  descripcion: string
  premium_detalle?: string | null
  premium_galeria?: string[] | null
  premium_activo?: boolean | null
  direccion: string
  localidad?: string | null
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
  const [localidadFilter, setLocalidadFilter] = useState("Todos")
  const [categoriaFilter, setCategoriaFilter] = useState("Todas")
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
    return comercios.filter((comercio) => {
      const matchesSearch = !term || `${comercio.nombre} ${comercio.categoria || ""} ${comercio.descripcion || ""} ${comercio.direccion || ""} ${comercio.localidad || ""} ${comercio.telefono || ""}`.toLowerCase().includes(term)
      const matchesLocalidad = localidadFilter === "Todos" || comercio.localidad === localidadFilter
      const matchesCategoria = categoriaFilter === "Todas" || (comercio.categoria || "Comercio") === categoriaFilter
      return matchesSearch && matchesLocalidad && matchesCategoria
    })
  }, [categoriaFilter, comercios, localidadFilter, search])

  const localidades = useMemo(() => ["Todos", ...Array.from(new Set(comercios.map((item) => item.localidad).filter((value): value is string => Boolean(value))))], [comercios])
  const categorias = useMemo(() => ["Todas", ...Array.from(new Set(comercios.map((item) => item.categoria || "Comercio")))], [comercios])

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#edf4ef_0%,#f8faf8_42%,#ffffff_100%)]">
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
        imagePlacement={selectedComercio?.premium_activo ? "side" : "top"}
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
            ? [{
                icon: MapPin,
                text: selectedComercio.direccion,
                href: getGoogleMapsSearchUrl(
                  selectedComercio.nombre,
                  selectedComercio.direccion,
                  selectedComercio.localidad
                ),
              }]
            : []),
          ...(selectedComercio?.localidad
            ? [{ icon: MapPin, text: selectedComercio.localidad }]
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

      <section className="border-b border-emerald-900/10 bg-[radial-gradient(circle_at_top,#f8fbf7_0%,#dce9df_56%,#cfdfd3_100%)]">
        <div className="mx-auto max-w-7xl px-6 py-14 text-center sm:py-20">
          <div className="inline-flex rounded-full border border-emerald-900/10 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-800 shadow-sm">
            Guía local
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Comercios</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Descubrí tiendas, emprendimientos y propuestas de Aiguá, Mariscala y la región.
          </p>

          <div className="mx-auto mt-8 max-w-2xl rounded-[20px] bg-white p-2 shadow-[0_20px_55px_-28px_rgba(6,78,59,0.42)]">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-900/10 px-4 py-3.5 focus-within:border-emerald-600/40 focus-within:ring-2 focus-within:ring-emerald-600/10">
              <Search className="h-5 w-5 shrink-0 text-emerald-700" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, categoría o descripción"
              className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
            />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[24px] border border-emerald-900/10 bg-white/85 p-5 shadow-sm backdrop-blur sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Localidad</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {localidades.map((localidad) => <button key={localidad} type="button" onClick={() => setLocalidadFilter(localidad)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${localidadFilter === localidad ? "bg-emerald-800 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-800"}`}>{localidad}</button>)}
              </div>
            </div>
            {categorias.length > 2 ? <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Categoría<select value={categoriaFilter} onChange={(event) => setCategoriaFilter(event.target.value)} className="mt-2 block h-11 min-w-52 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-emerald-500">{categorias.map((categoria) => <option key={categoria}>{categoria}</option>)}</select></label> : null}
          </div>
        </div>

        <div className="mt-7 flex items-end justify-between gap-4">
          <div><h2 className="text-2xl font-bold text-slate-950">Explorá los comercios</h2><p className="mt-1 text-sm text-slate-500">{comerciosFiltrados.length} {comerciosFiltrados.length === 1 ? "resultado" : "resultados"}</p></div>
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
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  className={`group flex min-h-full cursor-pointer flex-col overflow-hidden rounded-[24px] border bg-white/95 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.5)] transition hover:-translate-y-1 hover:shadow-[0_26px_55px_-28px_rgba(15,23,42,0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${comercio.premium_activo ? "border-violet-200" : "border-white/80"}`}
                >
                  <div className="relative h-48 w-full overflow-hidden bg-[linear-gradient(145deg,#f7faf7,#edf3ee)]">
                  {imagenSrc ? (
                      <OptimizedImage
                        src={imagenSrc}
                        alt={comercio.nombre}
                        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 50vw, 25vw"
                        className="object-contain p-5 transition duration-300 group-hover:scale-[1.03]"
                      />
                  ) : <div className="flex h-full items-center justify-center text-emerald-700/35"><MapPin className="h-10 w-10" /></div>}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex items-center justify-between gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">{comercio.categoria || "Comercio"}</span>{comercio.premium_activo ? <span className="text-xs font-bold text-violet-600">Destacado</span> : null}</div>
                  <h2 className="text-lg font-bold leading-tight text-slate-950 md:text-xl">
                    {comercio.nombre}
                  </h2>

                  <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                    {comercio.descripcion}
                  </p>

                  <a
                    href={
                      getGoogleMapsSearchUrl(
                        comercio.nombre,
                        comercio.direccion,
                        comercio.localidad
                      ) || "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="mt-4 flex items-start gap-2 text-sm leading-5 text-emerald-800 transition hover:text-emerald-700"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> <span>{comercio.direccion}</span>
                  </a>

                  {comercio.localidad ? <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">{comercio.localidad}</p> : null}

                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    {comercio.premium_activo ? (
                      <Link
                        href={`/comercios/${comercio.id}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleOpenPremiumProfile(comercio)
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
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
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
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
                          className="inline-flex items-center rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-100"
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
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                        />
                      )}

                    <div onClick={(event) => event.stopPropagation()}>
                      <ShareButton
                        title={comercio.nombre}
                        text={comercio.descripcion}
                        url={getShareUrl(comercio.id)}
                        section="comercios"
                        itemId={String(comercio.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                      />
                    </div>
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

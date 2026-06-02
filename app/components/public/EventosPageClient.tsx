'use client'

import Link from "next/link"
import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { ArrowRight, CalendarDays, MapPin, Phone, Search } from "lucide-react"
import { ContactActionLink } from "../ContactActionLink"
import { ExternalLinksButtons } from "../ExternalLinksButtons"
import { EventLikeButton } from "../EventLikeButton"
import { OptimizedImage } from "../OptimizedImage"
import { PublicDetailModal } from "../PublicDetailModal"
import { PublicHeader } from "../PublicHeader"
import { ShareButton } from "../ShareButton"
import { SorteoParticipationForm } from "../SorteoParticipationForm"
import { recordContentVisit, recordSiteVisit } from "../../lib/contentVisits"
import { formatEventDateRange } from "../../lib/eventDates"
import { fetchEventLikes, recordEventLike } from "../../lib/eventLikes"
import { parseEventDescription } from "../../lib/eventSubmissionMeta"
import { getGoogleMapsSearchUrl } from "../../lib/maps"
import { buildPublicNav } from "../../lib/publicNav"
import { recordViewMore } from "../../lib/viewMoreTracking"

export type Evento = {
  id: string
  titulo: string
  categoria?: string | null
  descripcion: string
  fecha: string
  fecha_fin?: string | null
  fecha_solo_mes?: boolean | null
  ubicacion: string
  localidad?: string | null
  telefono?: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen: string
  estado: string
  usa_whatsapp?: boolean | null
}

const normalizeEventCategory = (categoria?: string | null) => {
  const value = categoria?.trim()
  if (!value || value.toUpperCase() === "NOT NULL") return "Evento"
  if (value.toLowerCase() === "beneficios") return "Beneficio"
  return value
}

const isSorteoEvent = (categoria?: string | null) =>
  normalizeEventCategory(categoria) === "Sorteo"

export function EventosPageClient({ initialEventos }: { initialEventos: Evento[] }) {
  const [eventos] = useState<Evento[]>(initialEventos)
  const [search, setSearch] = useState("")
  const [categoria, setCategoria] = useState("Todos")
  const [eventLikeCounts, setEventLikeCounts] = useState<Record<string, number>>({})
  const [likedEvents, setLikedEvents] = useState<Record<string, boolean>>({})
  const [likingEventId, setLikingEventId] = useState<string | null>(null)
  const [selectedEventoId, setSelectedEventoId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("item")
  )

  const getShareUrl = (id: string) => {
    if (typeof window === "undefined") return `/eventos/${id}`
    return `${window.location.origin}/eventos/${id}`
  }
  const selectedEvento = useMemo(
    () => eventos.find((evento) => String(evento.id) === selectedEventoId) || null,
    [eventos, selectedEventoId]
  )

  useEffect(() => {
    const url = new URL(window.location.href)
    if (selectedEventoId) {
      url.searchParams.set("item", selectedEventoId)
    } else {
      url.searchParams.delete("item")
    }
    window.history.replaceState({}, "", url)
  }, [selectedEventoId])

  useEffect(() => {
    void recordSiteVisit("eventos-page", "Listado de eventos")
  }, [])

  useEffect(() => {
    const loadEventLikes = async () => {
      const eventIds = eventos.map((evento) => String(evento.id))
      const { countMap, likedMap } = await fetchEventLikes(eventIds)
      setEventLikeCounts(countMap)
      setLikedEvents(likedMap)
    }

    void loadEventLikes()
  }, [eventos])

  const whatsappLink = (telefono: string | null) => {
    if (!telefono) return "#"
    const limpio = telefono.replace(/\D/g, "")
    const numero = limpio.startsWith("598")
      ? limpio
      : `598${limpio.replace(/^0+/, "")}`

    return `https://wa.me/${numero}`
  }

  const getContactHref = (telefono: string | null, usaWhatsapp?: boolean | null) => {
    if (!telefono) return "#"
    return usaWhatsapp === false ? `tel:${telefono}` : whatsappLink(telefono)
  }

  const handleEventLike = async (eventId: string, eventTitle: string) => {
    if (likedEvents[eventId] || likingEventId === eventId) return

    setLikingEventId(eventId)
    const result = await recordEventLike(eventId, eventTitle)

    if (result.status === "liked") {
      setEventLikeCounts((prev) => ({
        ...prev,
        [eventId]: (prev[eventId] || 0) + 1,
      }))
    }

    if (result.status === "liked" || result.status === "exists") {
      setLikedEvents((prev) => ({
        ...prev,
        [eventId]: true,
      }))
    }

    setLikingEventId(null)
  }

  const handleOpenEvento = (evento: Evento) => {
    void recordViewMore("eventos", String(evento.id), evento.titulo)
    void recordContentVisit("eventos", String(evento.id), evento.titulo)
    setSelectedEventoId(String(evento.id))
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

  const eventosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    return eventos.filter((evento) => {
      const matchesCategoria =
        categoria === "Todos" ||
        normalizeEventCategory(evento.categoria) === categoria
      const matchesSearch =
        !term ||
        `${evento.titulo} ${parseEventDescription(evento.descripcion).baseDescription} ${evento.ubicacion || ""} ${evento.localidad || ""} ${evento.fecha || ""} ${normalizeEventCategory(evento.categoria)}`
          .toLowerCase()
          .includes(term)

      return matchesCategoria && matchesSearch
    })
  }, [categoria, eventos, search])

  return (
    <main className="min-h-screen bg-white">
      <PublicDetailModal
        open={Boolean(selectedEvento)}
        onClose={() => setSelectedEventoId(null)}
        title={selectedEvento?.titulo || ""}
        imageSrc={selectedEvento?.imagen || null}
        imageAlt={selectedEvento?.titulo || "Evento"}
        badge={selectedEvento ? normalizeEventCategory(selectedEvento.categoria) : null}
        description={selectedEvento ? parseEventDescription(selectedEvento.descripcion).baseDescription || null : null}
        meta={[
          ...(selectedEvento?.fecha
            ? [{
                icon: CalendarDays,
                text: formatEventDateRange(
                  selectedEvento.fecha,
                  selectedEvento.fecha_fin,
                  selectedEvento.fecha_solo_mes ?? false
                ),
              }]
            : []),
          ...(selectedEvento?.ubicacion
            ? [{
                icon: MapPin,
                text: selectedEvento.ubicacion,
                href: getGoogleMapsSearchUrl(
                  selectedEvento.titulo,
                  selectedEvento.ubicacion,
                  selectedEvento.localidad
                ),
              }]
            : []),
          ...(selectedEvento?.localidad
            ? [{ icon: MapPin, text: selectedEvento.localidad }]
            : []),
          ...(selectedEvento?.telefono
            ? [{ icon: Phone, text: selectedEvento.telefono }]
            : []),
        ]}
        actions={
          <>
            {selectedEvento?.telefono?.trim() ? (
              <ContactActionLink
                href={getContactHref(
                  selectedEvento.telefono,
                  selectedEvento.usa_whatsapp
                )}
                mode={selectedEvento.usa_whatsapp === false ? "phone" : "whatsapp"}
                section="eventos"
                itemId={String(selectedEvento.id)}
                itemTitle={selectedEvento.titulo}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  selectedEvento.usa_whatsapp === false
                    ? "inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    : "inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-500"
                }
              >
                <Phone className="h-4 w-4" />
                {selectedEvento.usa_whatsapp === false ? "Llamar" : "WhatsApp"}
              </ContactActionLink>
            ) : null}
            {selectedEvento ? (
              <EventLikeButton
                count={eventLikeCounts[String(selectedEvento.id)] || 0}
                liked={Boolean(likedEvents[String(selectedEvento.id)])}
                onClick={() =>
                  void handleEventLike(String(selectedEvento.id), selectedEvento.titulo)
                }
                disabled={likingEventId === String(selectedEvento.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-default disabled:opacity-70"
              />
            ) : null}
            {selectedEvento ? (
              <ShareButton
                title={selectedEvento.titulo}
                text={parseEventDescription(selectedEvento.descripcion).baseDescription}
                url={getShareUrl(String(selectedEvento.id))}
                section="eventos"
                itemId={String(selectedEvento.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              />
            ) : null}
            {selectedEvento ? (
              <ExternalLinksButtons
                webUrl={selectedEvento.web_url}
                instagramUrl={selectedEvento.instagram_url}
                facebookUrl={selectedEvento.facebook_url}
                section="eventos"
                itemId={String(selectedEvento.id)}
                itemTitle={selectedEvento.titulo}
              />
            ) : null}
            {selectedEvento && isSorteoEvent(selectedEvento.categoria) ? (
              <SorteoParticipationForm
                eventId={String(selectedEvento.id)}
                eventTitle={selectedEvento.titulo}
              />
            ) : null}
            <Link
              href="/eventos"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Ver todos los eventos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      <PublicHeader items={buildPublicNav("eventos")} />

      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Eventos</h1>
            <p className="mt-2 text-gray-600">
              Descubri los proximos eventos de Hola Varela
            </p>
          </div>

          <div className="w-full max-w-sm rounded-2xl border border-blue-100 bg-blue-50 p-4 lg:w-auto">
            <Link
              href="/usuarios/eventos/nuevo?public=1"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
            >
              Agregar mi evento
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-6 max-w-xl">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por evento, ubicacion o descripcion"
              className="w-full text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {["Todos", "Evento", "Promocion", "Sorteo", "Beneficio", "Consulta", "Aviso"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategoria(item)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                categoria === item
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {eventosFiltrados.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">
              {eventos.length === 0
                ? "Todavía no hay eventos cargados."
                : "No se encontraron eventos con esos filtros."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {eventosFiltrados.map((evento) => (
              <div
                key={evento.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenEvento(evento)}
                onKeyDown={(event) => handleCardKeyDown(event, () => handleOpenEvento(evento))}
                className="cursor-pointer rounded-xl border border-gray-200 p-5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                {evento.imagen && (
                  <div className="relative mb-4 h-48 w-full overflow-hidden rounded-lg bg-slate-50">
                    <OptimizedImage
                      src={evento.imagen}
                      alt={evento.titulo}
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                      className="object-contain p-3"
                    />
                  </div>
                )}

                <h2 className="text-xl font-semibold text-gray-900">
                  {evento.titulo}
                </h2>
                <div className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {normalizeEventCategory(evento.categoria)}
                </div>

                <p className="mt-2 text-sm text-gray-600">
                  Fecha: {formatEventDateRange(evento.fecha, evento.fecha_fin, evento.fecha_solo_mes ?? false)}
                </p>

                <a
                  href={
                    getGoogleMapsSearchUrl(
                      evento.titulo,
                      evento.ubicacion,
                      evento.localidad
                    ) || "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="mt-1 block text-sm text-sky-700 transition hover:text-sky-800"
                >
                  Ubicacion: {evento.ubicacion}
                </a>

                {evento.localidad ? (
                  <p className="mt-1 text-sm font-medium text-sky-700">
                    Localidad: {evento.localidad}
                  </p>
                ) : null}

                {evento.telefono && (
                  <p className="mt-1 text-sm text-gray-600">
                    Telefono: {evento.telefono}
                  </p>
                )}

                <p className="line-clamp-3 mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                  {parseEventDescription(evento.descripcion).baseDescription}
                </p>

                <div className="mt-4" onClick={(event) => event.stopPropagation()}>
                  <EventLikeButton
                    count={eventLikeCounts[String(evento.id)] || 0}
                    liked={Boolean(likedEvents[String(evento.id)])}
                    onClick={() => void handleEventLike(String(evento.id), evento.titulo)}
                    disabled={likingEventId === String(evento.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-default disabled:opacity-70"
                  />
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleOpenEvento(evento)
                  }}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Ver mas
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div onClick={(event) => event.stopPropagation()}>
                  <ShareButton
                    title={evento.titulo}
                    text={parseEventDescription(evento.descripcion).baseDescription}
                    url={getShareUrl(String(evento.id))}
                    section="eventos"
                    itemId={String(evento.id)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

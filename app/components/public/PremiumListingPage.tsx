'use client'

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, MapPin, Phone, UserRound, X } from "lucide-react"
import { ContactActionLink } from "../ContactActionLink"
import { ExternalLinksButtons } from "../ExternalLinksButtons"
import { OptimizedImage } from "../OptimizedImage"
import { PublicHeader } from "../PublicHeader"
import { ShareButton } from "../ShareButton"
import { recordContentVisit, recordSiteVisit } from "../../lib/contentVisits"
import { formatEventDateRange } from "../../lib/eventDates"
import { parseEventDescription } from "../../lib/eventSubmissionMeta"
import { buildPublicNav } from "../../lib/publicNav"

type RelatedEvent = {
  id: number
  titulo: string
  categoria?: string | null
  fecha: string
  fecha_fin?: string | null
  fecha_solo_mes?: boolean | null
  descripcion?: string | null
  imagen?: string | null
}

type PremiumListingPageProps = {
  kind: "comercio" | "servicio" | "institucion"
  id: number
  title: string
  imageSrc?: string | null
  description?: string | null
  premiumDetail?: string | null
  premiumGallery?: string[] | null
  premiumExtraTitle?: string | null
  premiumExtraDetail?: string | null
  premiumExtraGallery?: string[] | null
  address?: string | null
  location?: string | null
  phone?: string | null
  contactName?: string | null
  category?: string | null
  webUrl?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  usesWhatsapp?: boolean | null
  relatedEvents?: RelatedEvent[]
}

export function PremiumListingPage({
  kind,
  id,
  title,
  imageSrc,
  description,
  premiumDetail,
  premiumGallery,
  premiumExtraTitle,
  premiumExtraDetail,
  premiumExtraGallery,
  address,
  location,
  phone,
  contactName,
  category,
  webUrl,
  instagramUrl,
  facebookUrl,
  usesWhatsapp,
  relatedEvents = [],
}: PremiumListingPageProps) {
  const sectionConfig = {
    comercio: {
      basePath: "/comercios",
      nav: "comercios",
      singular: "comercio",
      plural: "comercios",
      contentSection: "comercios",
      visitKey: `comercio-premium-${id}`,
      activityLabel: "Actividad del local",
    },
    servicio: {
      basePath: "/servicios",
      nav: "servicios",
      singular: "servicio",
      plural: "servicios",
      contentSection: "servicios",
      visitKey: `servicio-premium-${id}`,
      activityLabel: "Actividad del perfil",
    },
    institucion: {
      basePath: "/instituciones",
      nav: "instituciones",
      singular: "institución",
      plural: "instituciones",
      contentSection: "instituciones",
      visitKey: `institucion-premium-${id}`,
      activityLabel: "Actividad de la institución",
    },
  } as const
  const config = sectionConfig[kind]
  const basePath = config.basePath
  const normalizedCategory = (category || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  const backDestination = ["paseos", "naturaleza", "experiencias", "actividades para hacer"].includes(normalizedCategory)
    ? { href: "/explorar/que-hacer", label: "Qué hacer" }
    : ["alojamientos", "hoteles", "posadas", "cabanas", "campings"].includes(normalizedCategory)
      ? { href: "/explorar/alojamientos", label: "Alojamientos" }
      : ["restaurantes", "cafeterias", "comida para llevar"].includes(normalizedCategory)
        ? { href: "/explorar/donde-comer", label: "Dónde comer" }
        : { href: basePath, label: config.plural }
  const isTourismProfile = backDestination.href.startsWith("/explorar/")
  const shareUrl =
    typeof window === "undefined"
      ? `${basePath}/${id}`
      : `${window.location.origin}${basePath}/${id}`

  const whatsappLink = (telefono: string) => {
    const limpio = telefono.replace(/\D/g, "")
    const numero = limpio.startsWith("598")
      ? limpio
      : `598${limpio.replace(/^0+/, "")}`

    return `https://wa.me/${numero}`
  }

  const contactHref = phone
    ? usesWhatsapp === false
      ? `tel:${phone}`
      : whatsappLink(phone)
    : null
  const directionsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${title} ${address}`.trim()
      )}`
    : null

  const galleryImages = useMemo(
    () =>
      [imageSrc, ...(premiumGallery || []), ...(premiumExtraGallery || [])].filter(
        Boolean
      ) as string[],
    [imageSrc, premiumGallery, premiumExtraGallery]
  )
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const selectedImage = galleryImages[selectedImageIndex] || imageSrc || null

  useEffect(() => {
    void recordSiteVisit(config.visitKey, title)
    void recordContentVisit(config.contentSection, String(id), title)
  }, [config.contentSection, config.visitKey, id, title])

  useEffect(() => {
    if (!isGalleryOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsGalleryOpen(false)
      }

      if (event.key === "ArrowLeft") {
        goToPrevious()
      }

      if (event.key === "ArrowRight") {
        goToNext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isGalleryOpen, galleryImages.length])

  const openGalleryAt = (index: number) => {
    if (index < 0 || galleryImages.length === 0) return

    setSelectedImageIndex(index)
    setIsGalleryOpen(true)
  }

  const goToPrevious = () => {
    setSelectedImageIndex((current) =>
      current === 0 ? Math.max(galleryImages.length - 1, 0) : current - 1
    )
  }

  const goToNext = () => {
    setSelectedImageIndex((current) =>
      current >= galleryImages.length - 1 ? 0 : current + 1
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e5f3e9_0%,#f5f8f3_32%,#f8fbff_70%,#ffffff_100%)]">
      <PublicHeader items={buildPublicNav(config.nav)} />

      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={backDestination.href}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:-translate-x-0.5 hover:border-emerald-300 hover:text-emerald-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a {backDestination.label}
          </Link>
        </div>

        <section className="overflow-hidden rounded-[38px] border border-white/80 bg-white shadow-[0_28px_90px_-40px_rgba(15,23,42,0.38)]">
          <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
            <div className="order-2 bg-[radial-gradient(circle_at_top_left,#dff1e5_0%,#edf6f0_44%,#eef4ff_100%)] p-5 sm:p-7 lg:order-1 lg:p-9 xl:p-11">
              <div className="overflow-hidden rounded-[30px] border border-white/90 bg-white shadow-[0_32px_80px_-38px_rgba(15,23,42,0.5)]">
                {selectedImage ? (
                  <button
                    type="button"
                    onClick={() => openGalleryAt(selectedImageIndex)}
                    onMouseDown={() => openGalleryAt(selectedImageIndex)}
                    className="group relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-slate-100"
                    aria-label={`Abrir imagen grande de ${title}`}
                  >
                    <OptimizedImage
                      src={selectedImage}
                      alt={title}
                      sizes="(max-width: 1024px) 100vw, 58vw"
                      priority
                      className="pointer-events-none object-cover transition duration-700 group-hover:scale-[1.025]"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/45 to-transparent" />
                    <span className="absolute bottom-4 right-4 rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-white backdrop-blur">
                      Ampliar
                    </span>
                  </button>
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center text-slate-400">
                    Sin imagen principal
                  </div>
                )}
              </div>

              {galleryImages.length > 1 ? (
                <div className="mt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Imágenes
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        Elegí una foto para verla en grande.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={goToPrevious}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={goToNext}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
                    {galleryImages.map((image, index) => (
                      <button
                        type="button"
                        key={`${image}-${index}`}
                        onClick={() => openGalleryAt(index)}
                        onMouseDown={() => openGalleryAt(index)}
                        className={`relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition hover:-translate-y-0.5 ${
                          selectedImageIndex === index
                            ? "border-blue-400 ring-2 ring-blue-100"
                            : "border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        <OptimizedImage
                          src={image}
                          alt={`${title} ${index + 1}`}
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="pointer-events-none object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="order-1 flex bg-white p-6 sm:p-8 lg:order-2 lg:p-9 xl:p-11">
              <div className="flex w-full flex-col justify-center rounded-[30px] border border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f7fbf8_52%,#f7faff_100%)] p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.35)] sm:p-8">
                {category ? (
                  <div className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                    {category}
                  </div>
                ) : null}

                <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.4rem]">
                  {title}
                </h1>

                <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {address ? <InfoPill icon={<MapPin className="h-4 w-4" />} text={address} /> : null}
                  {location ? <InfoPill icon={<MapPin className="h-4 w-4" />} text={location} /> : null}
                  {phone ? <InfoPill icon={<Phone className="h-4 w-4" />} text={phone} /> : null}
                  {contactName ? (
                    <InfoPill icon={<UserRound className="h-4 w-4" />} text={contactName} />
                  ) : null}
                </div>

                <div className="mt-9 border-t border-slate-200/80 pt-7">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Acciones
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {contactHref ? (
                      <ContactActionLink
                        href={contactHref}
                        mode={usesWhatsapp === false ? "phone" : "whatsapp"}
                        section={config.contentSection}
                        itemId={String(id)}
                        itemTitle={title}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-500"
                      >
                        <Phone className="h-4 w-4" />
                        {usesWhatsapp === false ? "Llamar" : "WhatsApp"}
                      </ContactActionLink>
                    ) : null}

                    {directionsUrl ? (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                      >
                        <MapPin className="h-4 w-4" />
                        Como llegar
                      </a>
                    ) : null}

                    <ShareButton
                      title={title}
                      text={description || premiumDetail || undefined}
                      url={shareUrl}
                      section={config.contentSection}
                      itemId={String(id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    />

                    <ExternalLinksButtons
                      webUrl={webUrl}
                      instagramUrl={instagramUrl}
                      facebookUrl={facebookUrl}
                      section={config.contentSection}
                      itemId={String(id)}
                      itemTitle={title}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="order-3 grid gap-5 border-t border-slate-100 bg-white p-6 sm:p-8 lg:col-span-2 lg:grid-cols-2 lg:p-10 xl:p-11">
              {description ? (
                <div className={`rounded-[26px] border border-emerald-100 bg-emerald-50/45 p-6 sm:p-7 ${!premiumDetail ? "lg:col-span-2" : ""}`}>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {isTourismProfile ? "Sobre la experiencia" : "Sobre este perfil"}
                  </div>
                  <p className="whitespace-pre-line text-base leading-8 text-slate-700">
                    {description}
                  </p>
                </div>
              ) : null}

              {premiumDetail ? (
                <div className={`rounded-[26px] border border-sky-100 bg-sky-50/60 p-6 sm:p-7 ${!description ? "lg:col-span-2" : ""}`}>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                    Información ampliada
                  </div>
                  <p className="whitespace-pre-line text-base leading-8 text-slate-700">
                    {premiumDetail}
                  </p>
                </div>
              ) : null}

              {premiumExtraTitle || premiumExtraDetail || premiumExtraGallery?.length ? (
                <div className="rounded-[26px] border border-amber-100 bg-amber-50/70 p-6 sm:p-7 lg:col-span-2">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                    Bloque extra
                  </div>
                  {premiumExtraTitle ? (
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {premiumExtraTitle}
                    </h3>
                  ) : null}
                  {premiumExtraDetail ? (
                    <p className="mt-3 whitespace-pre-line text-base leading-8 text-slate-700">
                      {premiumExtraDetail}
                    </p>
                  ) : null}
                  {premiumExtraGallery?.length ? (
                    <div className="mt-5 grid grid-cols-2 gap-4">
                      {premiumExtraGallery.map((image, index) => (
                        <button
                          type="button"
                          key={`${image}-${index}`}
                          onClick={() => openGalleryAt(galleryImages.indexOf(image))}
                          onMouseDown={() => openGalleryAt(galleryImages.indexOf(image))}
                          className="relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-[22px] border border-amber-200 bg-white"
                        >
                          <OptimizedImage
                            src={image}
                            alt={`${premiumExtraTitle || title} ${index + 1}`}
                            sizes="(max-width: 768px) 50vw, 33vw"
                            className="pointer-events-none object-contain p-2"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section id="eventos-del-local" className="mt-8 rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.2)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {config.activityLabel}
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Próximos eventos de {title}
              </h2>
            </div>
            <Link
              href="/eventos"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Ver todos los eventos
            </Link>
          </div>

          {relatedEvents.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#f4faf6_100%)] p-8">
              <h3 className="text-lg font-semibold text-slate-900">Todavía no tiene eventos activos</h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                Cuando este {config.singular} publique eventos y queden activos en Hola Varela, van a aparecer en esta sección.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-3">
              {relatedEvents.map((event) => (
                <article key={event.id} className="overflow-hidden rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-sm md:rounded-[28px]">
                  {event.imagen ? (
                    <div className="relative h-32 w-full bg-slate-50 sm:h-48">
                      <OptimizedImage
                        src={event.imagen}
                        alt={event.titulo}
                        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-contain p-3"
                      />
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center bg-slate-100 text-slate-400 sm:h-48">
                      Sin imagen
                    </div>
                  )}
                  <div className="p-3 md:p-5">
                    {event.categoria ? (
                      <div className="mb-2 inline-flex rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700 md:mb-3 md:px-3 md:text-xs">
                        {event.categoria}
                      </div>
                    ) : null}
                    <h3 className="text-base font-semibold text-slate-900 md:text-xl">{event.titulo}</h3>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 md:mt-3 md:text-sm">
                      <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>{formatEventDateRange(event.fecha, event.fecha_fin, event.fecha_solo_mes ?? false)}</span>
                    </div>
                    {event.descripcion ? (
                      <p className="mt-3 line-clamp-2 whitespace-pre-line text-xs leading-6 text-slate-500 md:mt-4 md:line-clamp-4 md:text-sm md:leading-7">
                        {parseEventDescription(event.descripcion).baseDescription}
                      </p>
                    ) : null}
                    <div className="mt-5">
                      <Link
                        href={`/eventos?item=${event.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                      >
                        Ver evento
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {isGalleryOpen && selectedImage ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 px-4 pb-24 pt-16 sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Galeria de imagenes de ${title}`}
        >
          <button
            type="button"
            onClick={() => setIsGalleryOpen(false)}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Cerrar vista grande"
          >
            <X className="h-5 w-5" />
          </button>

          {galleryImages.length > 1 ? (
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 sm:inline-flex"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : null}

          <div className="relative h-[68vh] w-full max-w-6xl sm:h-[82vh]">
            <OptimizedImage
              src={selectedImage}
              alt={`${title} ${selectedImageIndex + 1}`}
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          {galleryImages.length > 1 ? (
            <>
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 sm:inline-flex"
                aria-label="Imagen siguiente"
              >
                <ChevronRight className="h-6 w-6" />
              </button>

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 sm:hidden"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                <div className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                  {selectedImageIndex + 1} / {galleryImages.length}
                </div>
                <button
                  type="button"
                  onClick={goToNext}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 sm:hidden"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </main>
  )
}

function InfoPill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
        {icon}
      </div>
      <span className="leading-6">{text}</span>
    </div>
  )
}

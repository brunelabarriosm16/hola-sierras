'use client'

import dynamic from "next/dynamic"
import Link from "next/link"
import Image from "next/image"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { ContactActionLink } from "./ContactActionLink"
import { ExternalLinksButtons } from "./ExternalLinksButtons"
import { OptimizedImage } from "./OptimizedImage"
import { isAccommodationProposal, isTourismProposal } from "../lib/tourism"
import { PublicHeader } from "./PublicHeader"
import { ShareButton } from "./ShareButton"
import { HomeSearch } from "./HomeSearch"
import { SorteoParticipationForm } from "./SorteoParticipationForm"
import { formatEventDateRange } from "../lib/eventDates"
import { parseEventDescription } from "../lib/eventSubmissionMeta"
import { getGoogleMapsSearchUrl } from "../lib/maps"
import { recordContentVisit, recordSiteVisit } from "../lib/contentVisits"
import { buildHomePublicNav } from "../lib/publicNav"
import { recordViewMore, type ViewMoreSection } from "../lib/viewMoreTracking"
import { supabase } from "../supabase"
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSun,
  GraduationCap,
  MapPin,
  Phone,
  PlusCircle,
  UserRound,
  X,
} from "lucide-react"

const PublicDetailModal = dynamic(
  () => import("./PublicDetailModal").then((module) => module.PublicDetailModal),
  {
    ssr: false,
  }
)

const getEventShareUrl = (id: string) => {
  if (typeof window === "undefined") return `/eventos/${id}`
  return `${window.location.origin}/eventos/${id}`
}

type Comercio = {
  id: number
  nombre: string
  descripcion: string | null
  premium_detalle?: string | null
  premium_galeria?: string[] | null
  premium_activo?: boolean | null
  direccion: string | null
  localidad?: string | null
  telefono: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen?: string | null
  imagen_url?: string | null
  destacado?: boolean | null
  plan_suscripcion?: string | null
  usa_whatsapp?: boolean | null
}

type Evento = {
  id: number
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
  imagen?: string | null
  estado?: string | null
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

type Curso = {
  id: number
  nombre: string
  descripcion: string
  responsable: string
  contacto: string
  localidad?: string | null
  edades?: string[] | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen: string | null
  destacado?: boolean | null
  plan_suscripcion?: string | null
  usa_whatsapp?: boolean | null
}

type Servicio = {
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
  destacado?: boolean | null
  plan_suscripcion?: string | null
  usa_whatsapp?: boolean | null
}

type UnifiedDirectoryItem =
  | {
      key: string
      type: "comercio"
      id: number
      nombre: string
      image: string | null
      destacado: boolean
      item: Comercio
    }
  | {
      key: string
      type: "servicio"
      id: number
      nombre: string
      image: string | null
      destacado: boolean
      item: Servicio
    }

type Institucion = {
  id: number
  nombre: string
  descripcion: string | null
  premium_activo?: boolean | null
  direccion: string | null
  localidad?: string | null
  telefono: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  foto: string | null
  usa_whatsapp?: boolean | null
}

type HighlightProposalType = "institucion" | "comercio" | "servicio" | "curso" | "turismo"

type FeaturedNotice = {
  id: number
  imagen: string
  tipo_propuesta: HighlightProposalType
  propuesta_id: number
  espera_segundos: number
}

type SobreVarelaConfig = {
  titulo: string
  texto_1: string
  texto_2: string
  texto_3: string
  imagen_url: string | null
}

type ContactLeadForm = {
  nombre: string
  telefono: string
  mensaje: string
}

export type WeatherData = {
  location: string
  temperature: number
  weatherCode: number
  tempMax: number
  tempMin: number
  windSpeed: number
}

export type HomePageData = {
  featuredNotices: FeaturedNotice[]
  featuredBusinesses: Comercio[]
  eventos: Evento[]
  cursos: Curso[]
  servicios: Servicio[]
  instituciones: Institucion[]
  allCursos: Curso[]
  allServicios: Servicio[]
  sobreVarela: SobreVarelaConfig
  weather: WeatherData[]
}

const WEATHER_LABELS: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Niebla con escarcha",
  51: "Llovizna leve",
  53: "Llovizna moderada",
  55: "Llovizna intensa",
  61: "Lluvia leve",
  63: "Lluvia moderada",
  65: "Lluvia intensa",
  71: "Nieve leve",
  73: "Nieve moderada",
  75: "Nieve intensa",
  80: "Chaparrones leves",
  81: "Chaparrones moderados",
  82: "Chaparrones intensos",
  95: "Tormenta",
}

const WEATHER_LOCATIONS = [
  { name: "Mariscala", latitude: -34.04085, longitude: -54.77732 },
  { name: "Aiguá", latitude: -34.20498, longitude: -54.75665 },
] as const

async function fetchWeatherItems() {
  const results: Array<WeatherData | null> = await Promise.all(
    WEATHER_LOCATIONS.map(async (location) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FMontevideo&forecast_days=1`
        )

        if (response.ok) {
          const data = await response.json()

          if (data?.current && data?.daily) {
            return {
              location: location.name,
              temperature: data.current.temperature_2m,
              weatherCode: data.current.weather_code,
              tempMax: data.daily.temperature_2m_max?.[0] ?? data.current.temperature_2m,
              tempMin: data.daily.temperature_2m_min?.[0] ?? data.current.temperature_2m,
              windSpeed: data.current.wind_speed_10m ?? 0,
            } satisfies WeatherData
          }
        }

        const fallbackResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true&timezone=America%2FMontevideo`
        )

        if (!fallbackResponse.ok) return null

        const fallbackData = await fallbackResponse.json()
        const currentWeather = fallbackData?.current_weather

        if (!currentWeather) return null

        return {
          location: location.name,
          temperature: currentWeather.temperature,
          weatherCode: currentWeather.weathercode,
          tempMax: currentWeather.temperature,
          tempMin: currentWeather.temperature,
          windSpeed: currentWeather.windspeed ?? 0,
        } satisfies WeatherData
      } catch {
        return null
      }
    })
  )

  return results.filter((item): item is WeatherData => item !== null)
}

type WelcomeHighlight = {
  key: string
  id: number
  kind: HighlightProposalType
  proposalId: number
  image: string
  waitSeconds: number
}

const getWelcomeSection = (kind: WelcomeHighlight["kind"]): ViewMoreSection => {
  if (kind === "comercio") return "comercios"
  if (kind === "servicio" || kind === "turismo") return "servicios"
  if (kind === "institucion") return "instituciones"
  return "cursos"
}

const getNoticeDetailPath = (notice: WelcomeHighlight) => {
  if (notice.kind === "institucion") return `/instituciones/${notice.proposalId}`
  if (notice.kind === "comercio") return `/comercios/${notice.proposalId}`
  if (notice.kind === "curso") return `/cursos/${notice.proposalId}`
  return `/servicios/${notice.proposalId}`
}

const getInitialWelcomeHighlight = (featuredNotices: FeaturedNotice[]): WelcomeHighlight | null => {
  if (typeof window === "undefined") return null

  const alreadyShownThisSession =
    window.sessionStorage.getItem(WELCOME_SESSION_KEY) === "true"

  if (alreadyShownThisSession) return null

  const seenKeys = new Set(
    (window.sessionStorage.getItem(WELCOME_SEEN_KEY) || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  )
  const welcomeItems = featuredNotices
    .filter((item) => item.imagen)
    .map((item) => ({
      key: `aviso-${item.id}`,
      id: item.id,
      kind: item.tipo_propuesta,
      proposalId: item.propuesta_id,
      image: item.imagen,
      waitSeconds: item.espera_segundos ?? 20,
    }))

  if (welcomeItems.length === 0) return null

  const unseenItems = welcomeItems.filter((item) => !seenKeys.has(item.key))
  const availableItems = unseenItems.length > 0 ? unseenItems : welcomeItems
  const lastShownKey = window.localStorage.getItem(WELCOME_LAST_KEY)
  const lastIndex = availableItems.findIndex((item) => item.key === lastShownKey)
  const nextIndex =
    lastIndex >= 0 ? (lastIndex + 1) % availableItems.length : Math.floor(Math.random() * availableItems.length)
  const nextItem = availableItems[nextIndex]

  window.localStorage.setItem(WELCOME_LAST_KEY, nextItem.key)
  window.sessionStorage.setItem(
    WELCOME_SEEN_KEY,
    [...seenKeys, nextItem.key].join(",")
  )
  return nextItem
}

const defaultSobreVarela: SobreVarelaConfig = {
  titulo: "Hola Sierras",
  texto_1:
    "Hola Sierras reúne propuestas, servicios y novedades de Aiguá, Mariscala y la región en un solo lugar.",
  texto_2:
    "Un espacio pensado para mostrar comercios, eventos, cursos, instituciones y servicios de la zona.",
  texto_3:
    "Cartelera online de las sierras. Todo lo que pasa en Aiguá, Mariscala y la región.",
  imagen_url: null,
}

const WELCOME_PROMOTION_ENABLED = true
const WELCOME_SESSION_KEY = "guia-varela-welcome-shown-v2"
const WELCOME_LAST_KEY = "guia-varela-last-highlight"
const WELCOME_SEEN_KEY = "guia-varela-seen-highlights-v1"

async function recordFeaturedNoticeAppearance(avisoId: number) {
  const response = await fetch("/api/destacados/aparicion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avisoId }),
    keepalive: true,
  })

  if (!response.ok) {
    throw new Error("No se pudo registrar la aparición del destacado.")
  }
}

const initialContactLeadForm: ContactLeadForm = {
  nombre: "",
  telefono: "",
  mensaje: "",
}

const SOCIAL_LINKS = [
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/hola.sierras/",
    className:
      "border-pink-100 bg-[linear-gradient(135deg,#fff1f7_0%,#f5ecff_100%)] text-pink-700 hover:border-pink-200 hover:text-pink-800",
  },
  {
    id: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61590474178915",
    className:
      "border-blue-100 bg-[linear-gradient(135deg,#eef5ff_0%,#f3f8ff_100%)] text-blue-700 hover:border-blue-200 hover:text-blue-800",
  },
]

const ITEMS_PER_ROTATION = 8
const FEATURED_ROTATION_DAYS = 2
const SHOW_COURSES_AND_INSTITUTIONS_ON_HOME = false

function isFeaturedListing(item: {
  destacado?: boolean | null
  plan_suscripcion?: string | null
}) {
  return (
    item.destacado === true ||
    item.plan_suscripcion === "destacado" ||
    item.plan_suscripcion === "destacado_plus"
  )
}

function sliceRotatingItemsCircular<T>(
  items: T[],
  page: number,
  pageSize = ITEMS_PER_ROTATION
) {
  if (items.length <= pageSize) return items

  const start = (page * pageSize) % items.length
  return Array.from({ length: pageSize }, (_, index) => items[(start + index) % items.length])
}

function getScheduledRotationPage(totalPages: number, rotationDays = FEATURED_ROTATION_DAYS) {
  if (totalPages <= 1) return 0

  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24))
  return Math.floor(daysSinceEpoch / rotationDays) % totalPages
}

function LogoGridCard({
  image,
  name,
  fallback,
  showName = true,
  onClick,
  onKeyDown,
}: {
  image: string | null
  name: string
  fallback: ReactNode
  showName?: boolean
  onClick: () => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}) {
  const [imageFailed, setImageFailed] = useState(false)

  const imageFrameClass = showName
    ? "relative flex h-full max-h-32 w-full items-center justify-center overflow-hidden rounded-[14px] bg-slate-50"
    : "relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-[14px] bg-slate-50"

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className="group flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-[18px] border border-white/80 bg-white/92 p-2 text-center shadow-[0_14px_34px_-26px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_22px_46px_-28px_rgba(15,23,42,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:p-3"
      aria-label={`Ver ficha de ${name}`}
    >
      <div className={imageFrameClass}>
        {image && !imageFailed ? (
          <OptimizedImage
            src={image}
            alt={name}
            sizes="(max-width: 768px) 33vw, 20vw"
            className="object-contain p-1 transition duration-200 group-hover:scale-[1.03] sm:p-2"
            onError={() => setImageFailed(true)}
          />
        ) : (
          fallback
        )}
      </div>
      {showName ? (
        <span className="mt-2 line-clamp-2 text-[11px] font-semibold leading-tight text-slate-700 sm:text-sm">
          {name}
        </span>
      ) : null}
    </div>
  )
}

function hasValidListingName(name: string | null | undefined) {
  const normalizedName = name?.trim() || ""
  return /[\p{L}\p{N}]/u.test(normalizedName) && !/[<>]/.test(normalizedName)
}

type TourismFilter = "todos" | "alojamientos" | "actividades"

export function HomePage({ initialData }: { initialData: HomePageData }) {
  const router = useRouter()
  const featuredNotices = initialData.featuredNotices
  const featuredBusinesses = initialData.featuredBusinesses
  const eventos = initialData.eventos
  const cursos = initialData.cursos
  const servicios = initialData.servicios
  const instituciones = initialData.instituciones
  const sobreVarela = initialData.sobreVarela || defaultSobreVarela
  const [selectedComercio, setSelectedComercio] = useState<Comercio | null>(null)
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null)
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null)
  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null)
  const [selectedInstitucion, setSelectedInstitucion] = useState<Institucion | null>(null)
  const [tourismFilter, setTourismFilter] = useState<TourismFilter>("todos")
  const [contactLeadForm, setContactLeadForm] = useState<ContactLeadForm>(
    initialContactLeadForm
  )
  const [contactLeadStatus, setContactLeadStatus] = useState("")

  useEffect(() => {
    void recordSiteVisit("home", "Inicio")
  }, [])
  const [contactLeadLoading, setContactLeadLoading] = useState(false)
  const [isContactLeadOpen, setIsContactLeadOpen] = useState(false)
  const [welcomeHighlight, setWelcomeHighlight] = useState<WelcomeHighlight | null>(null)
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null)
  const eventsSectionRef = useRef<HTMLElement | null>(null)

  const orderedServicios = useMemo(
    () =>
      [...servicios].sort((a, b) => Number(isFeaturedListing(b)) - Number(isFeaturedListing(a))),
    [servicios]
  )
  const directoryItems = useMemo<UnifiedDirectoryItem[]>(
    () => {
      const businessItems: UnifiedDirectoryItem[] = featuredBusinesses
        .filter((business) => hasValidListingName(business.nombre))
        .map((business) => ({
          key: `comercio-${business.id}`,
          type: "comercio" as const,
          id: business.id,
          nombre: business.nombre,
          image: business.imagen_url || business.imagen || null,
          destacado: isFeaturedListing(business),
          item: business,
        }))
        .sort((a, b) => {
          const featuredDiff = Number(b.destacado) - Number(a.destacado)
          return featuredDiff || b.id - a.id
        })

      const serviceItems: UnifiedDirectoryItem[] = orderedServicios
        .filter((servicio) => hasValidListingName(servicio.nombre))
        .map((servicio) => ({
          key: `servicio-${servicio.id}`,
          type: "servicio" as const,
          id: servicio.id,
          nombre: servicio.nombre,
          image: servicio.imagen || null,
          destacado: isFeaturedListing(servicio),
          item: servicio,
        }))
        .sort((a, b) => {
          const featuredDiff = Number(b.destacado) - Number(a.destacado)
          return featuredDiff || b.id - a.id
        })

      const mixedItems: UnifiedDirectoryItem[] = []
      const maxLength = Math.max(businessItems.length, serviceItems.length)

      for (let index = 0; index < maxLength; index += 1) {
        if (businessItems[index]) mixedItems.push(businessItems[index])
        if (serviceItems[index]) mixedItems.push(serviceItems[index])
      }

      return mixedItems
    },
    [featuredBusinesses, orderedServicios]
  )
  const directoryPageCount = Math.max(1, Math.ceil(directoryItems.length / ITEMS_PER_ROTATION))
  const scheduledDirectoryPage = useMemo(
    () => getScheduledRotationPage(directoryPageCount),
    [directoryPageCount]
  )
  const visibleDirectoryItems = useMemo(
    () => sliceRotatingItemsCircular(directoryItems, scheduledDirectoryPage),
    [directoryItems, scheduledDirectoryPage]
  )
  const tourismProposals = useMemo(
    () => orderedServicios.filter((servicio) => isTourismProposal(servicio)),
    [orderedServicios]
  )
  const filteredTourismProposals = useMemo(
    () => tourismProposals.filter((servicio) => {
      if (tourismFilter === "todos") return true
      const isAccommodation = isAccommodationProposal(servicio)
      return tourismFilter === "alojamientos" ? isAccommodation : !isAccommodation
    }),
    [tourismFilter, tourismProposals]
  )
  const tourismProposalPageCount = Math.max(
    1,
    Math.ceil(filteredTourismProposals.length / ITEMS_PER_ROTATION)
  )
  const scheduledTourismProposalPage = useMemo(
    () => getScheduledRotationPage(tourismProposalPageCount),
    [tourismProposalPageCount]
  )
  const visibleTourismProposals = useMemo(
    () => sliceRotatingItemsCircular(filteredTourismProposals, scheduledTourismProposalPage),
    [filteredTourismProposals, scheduledTourismProposalPage]
  )
  const visibleEventos = useMemo(() => eventos.slice(0, 8), [eventos])
  const visibleCursos = useMemo(() => cursos.slice(0, 8), [cursos])
  const visibleInstituciones = useMemo(() => instituciones.slice(0, 10), [instituciones])

  const [weatherItems, setWeatherItems] = useState<WeatherData[]>(initialData.weather)
  const [weatherStatus, setWeatherStatus] = useState<"loading" | "ready" | "unavailable">(
    initialData.weather.length > 0 ? "ready" : "loading"
  )

  useEffect(() => {
    let isMounted = true

    const refreshWeather = async () => {
      try {
        const nextWeatherItems = await fetchWeatherItems()
        if (isMounted && nextWeatherItems.length > 0) {
          setWeatherItems(nextWeatherItems)
          setWeatherStatus("ready")
          return
        }

        if (isMounted) {
          setWeatherStatus("unavailable")
        }
      } catch {
        if (isMounted) {
          setWeatherStatus("unavailable")
        }
      }
    }

    void refreshWeather()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!WELCOME_PROMOTION_ENABLED) return

    const nextHighlight = getInitialWelcomeHighlight(featuredNotices)
    if (!nextHighlight) return

    const timeoutId = window.setTimeout(() => {
      setWelcomeHighlight(nextHighlight)
      void recordFeaturedNoticeAppearance(nextHighlight.id).catch((error) => {
        console.error(error)
      })
    }, Math.max(0, nextHighlight.waitSeconds) * 1000)

    return () => window.clearTimeout(timeoutId)
  }, [featuredNotices])

  const getWeatherIcon = (weatherCode: number) => {
    if ([61, 63, 65, 80, 81, 82].includes(weatherCode)) return CloudRain
    if ([51, 53, 55].includes(weatherCode)) return CloudDrizzle
    if ([1, 2].includes(weatherCode)) return CloudSun
    return Cloud
  }

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

  const getContactLabel = (usaWhatsapp?: boolean | null) =>
    usaWhatsapp === false ? "Llamar" : "Contactar por WhatsApp"

  const handleViewMoreClick = (
    section: ViewMoreSection,
    itemId: string,
    itemTitle: string,
    open: () => void
  ) => {
    void recordViewMore(section, itemId, itemTitle)
    void recordContentVisit(section, itemId, itemTitle)
    open()
  }

  const handleOpenInstitucion = (institucion: Institucion) => {
    handleViewMoreClick(
      "instituciones",
      String(institucion.id),
      institucion.nombre,
      () => {
        if (institucion.premium_activo) {
          router.push(`/instituciones/${institucion.id}`)
          return
        }

        setSelectedInstitucion(institucion)
      }
    )
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

  const closeWelcomeHighlight = () => {
    window.sessionStorage.setItem(WELCOME_SESSION_KEY, "true")
    setWelcomeHighlight(null)
  }

  const handleContactLeadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setContactLeadLoading(true)
    setContactLeadStatus("")

    const payload = {
      nombre: contactLeadForm.nombre.trim(),
      email: null,
      telefono: contactLeadForm.telefono.trim(),
      mensaje: contactLeadForm.mensaje.trim(),
    }

    const { error } = await supabase.from("contacto_solicitudes").insert([payload])

    if (error) {
      setContactLeadStatus("No pudimos enviar tu solicitud. Probá de nuevo.")
      setContactLeadLoading(false)
      return
    }

    setContactLeadForm(initialContactLeadForm)
    setContactLeadStatus("Recibimos tu mensaje. Te contactaremos a la brevedad.")
    setContactLeadLoading(false)
  }

  const openWelcomeDetail = () => {
    if (!welcomeHighlight) return

    void recordViewMore(
      getWelcomeSection(welcomeHighlight.kind),
      String(welcomeHighlight.proposalId),
      "Aviso destacado"
    )
    closeWelcomeHighlight()
    router.push(getNoticeDetailPath(welcomeHighlight))
  }

  const contactLeadIntro =
    "Déjanos tu nombre, teléfono y mensaje para responderte."
  const contactLeadSubmitHint =
    "Te vamos a contactar usando el teléfono que nos compartas."
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#d7e6db_0%,#b6cdbd_46%,#95b19f_100%)] text-slate-900">
      {zoomedImage ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/92 p-4">
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
            aria-label="Cerrar imagen ampliada"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            className="relative h-[88vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white/5"
            aria-label="Cerrar imagen ampliada"
          >
            <OptimizedImage
              src={zoomedImage.src}
              alt={zoomedImage.alt}
              sizes="100vw"
              priority
              className="object-contain p-4"
            />
          </button>
        </div>
      ) : null}
      {WELCOME_PROMOTION_ENABLED && welcomeHighlight && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <button
              type="button"
              onClick={closeWelcomeHighlight}
              className="absolute right-3 top-3 z-10 rounded-full bg-white/95 p-2 text-slate-700 shadow-sm transition hover:bg-white"
              aria-label="Cerrar destacado"
            >
              <X className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={openWelcomeDetail}
              className="relative block h-[min(82vh,620px)] w-full bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:h-[min(84vh,680px)]"
              aria-label="Abrir detalle del destacado"
            >
              <OptimizedImage
                src={welcomeHighlight.image}
                alt="Aviso destacado"
                sizes="(max-width: 768px) 96vw, 760px"
                priority
                className="object-contain"
              />
            </button>
          </div>
        </div>
      )}

      {isContactLeadOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setIsContactLeadOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              aria-label="Cerrar formulario"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="pr-10">
              <div className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Quiero estar en Hola Sierras
              </div>
              <h3 className="mt-4 text-[30px] font-semibold text-slate-900">
                Completa tu propuesta
              </h3>
              <p className="hidden mt-3 text-base leading-7 text-slate-500">
                Elige qué quieres sumar, completa los datos y después te avisamos por email cómo seguir con tu usuario.
              </p>
              <p className="mt-3 text-base leading-7 text-slate-500">{contactLeadIntro}</p>
            </div>

            <form onSubmit={handleContactLeadSubmit} className="mt-8 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-4 text-sm font-semibold text-slate-800">
                  Tus datos de contacto
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={contactLeadForm.nombre}
                      onChange={(e) =>
                        setContactLeadForm((prev) => ({
                          ...prev,
                          nombre: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Telefono
                    </label>
                    <input
                      type="tel"
                      value={contactLeadForm.telefono}
                      onChange={(e) =>
                        setContactLeadForm((prev) => ({
                          ...prev,
                          telefono: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Mensaje
                </label>
                <textarea
                  value={contactLeadForm.mensaje}
                  onChange={(e) =>
                    setContactLeadForm((prev) => ({
                      ...prev,
                      mensaje: e.target.value,
                    }))
                  }
                  className="min-h-28 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-400"
                  placeholder="Cuéntanos brevemente qué necesitas o cómo quieres estar en Hola Sierras."
                  required
                />
              </div>

              {contactLeadStatus && (
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  {contactLeadStatus}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">{contactLeadSubmitHint}</p>
                <button
                  type="submit"
                  disabled={contactLeadLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
                >
                  {contactLeadLoading ? "Enviando..." : "Enviar"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedComercio ? (
      <PublicDetailModal
        open={Boolean(selectedComercio)}
        onClose={() => setSelectedComercio(null)}
        title={selectedComercio?.nombre || ""}
        imageSrc={selectedComercio ? selectedComercio.imagen_url || selectedComercio.imagen || null : null}
        imageAlt={selectedComercio?.nombre || "Comercio"}
        imagePlacement={selectedComercio?.premium_activo ? "side" : "top"}
        badge={selectedComercio?.premium_activo ? "Premium" : null}
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
          ...(selectedComercio?.localidad ? [{ icon: MapPin, text: selectedComercio.localidad }] : []),
          ...(selectedComercio?.telefono ? [{ icon: Phone, text: selectedComercio.telefono }] : []),
        ]}
        actions={
          <>
            {selectedComercio?.telefono ? (
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

            {selectedComercio ? (
              <ExternalLinksButtons
                webUrl={selectedComercio.web_url}
                instagramUrl={selectedComercio.instagram_url}
                facebookUrl={selectedComercio.facebook_url}
                section="comercios"
                itemId={String(selectedComercio.id)}
                itemTitle={selectedComercio.nombre}
              />
            ) : null}
            {selectedComercio?.premium_activo ? (
              <Link
                href={`/comercios/${selectedComercio.id}`}
                onClick={() =>
                  void recordViewMore(
                    "comercios",
                    String(selectedComercio.id),
                    selectedComercio.nombre
                  )
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
              >
                Ver perfil completo
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </>
        }
      />
      ) : null}

      {selectedServicio ? (
      <PublicDetailModal
        open={Boolean(selectedServicio)}
        onClose={() => setSelectedServicio(null)}
        title={selectedServicio?.nombre || ""}
        imageSrc={selectedServicio?.imagen || null}
        imageAlt={selectedServicio?.nombre || "Servicio"}
        imagePlacement={selectedServicio?.premium_activo ? "side" : "top"}
        badge={selectedServicio?.premium_activo ? "Premium" : selectedServicio?.categoria || null}
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
          ...(selectedServicio?.responsable ? [{ icon: UserRound, text: selectedServicio.responsable }] : []),
          ...(selectedServicio?.contacto ? [{ icon: Phone, text: selectedServicio.contacto }] : []),
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
          ...(selectedServicio?.localidad ? [{ icon: MapPin, text: selectedServicio.localidad }] : []),
        ]}
        actions={
          <>
            {selectedServicio?.contacto ? (
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
                {getContactLabel(selectedServicio.usa_whatsapp)}
              </ContactActionLink>
            ) : null}

            {selectedServicio ? (
              <ExternalLinksButtons
                webUrl={selectedServicio.web_url}
                instagramUrl={selectedServicio.instagram_url}
                facebookUrl={selectedServicio.facebook_url}
                section="servicios"
                itemId={String(selectedServicio.id)}
                itemTitle={selectedServicio.nombre}
              />
            ) : null}
            {selectedServicio?.premium_activo ? (
              <Link
                href={`/servicios/${selectedServicio.id}`}
                onClick={() =>
                  void recordViewMore(
                    "servicios",
                    String(selectedServicio.id),
                    selectedServicio.nombre
                  )
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
              >
                Ver perfil completo
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </>
        }
      />
      ) : null}

      {selectedEvento ? (
      <PublicDetailModal
        open={Boolean(selectedEvento)}
        onClose={() => setSelectedEvento(null)}
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
          ...(selectedEvento?.localidad ? [{ icon: MapPin, text: selectedEvento.localidad }] : []),
          ...(selectedEvento?.telefono
            ? [{ icon: Phone, text: selectedEvento.telefono }]
            : []),
        ]}
        actions={
          <>
            <Link
              href="/usuarios/eventos/nuevo?public=1"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
            >
              Agregar mi evento
              <ArrowRight className="h-4 w-4" />
            </Link>

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

            {selectedEvento ? (
              <ShareButton
                title={selectedEvento.titulo}
                text={parseEventDescription(selectedEvento.descripcion).baseDescription}
                url={getEventShareUrl(String(selectedEvento.id))}
                section="eventos"
                itemId={String(selectedEvento.id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
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
      ) : null}

      {selectedCurso && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedCurso(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
              aria-label="Cerrar detalle"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_0.55fr]">
                <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)]">
                  {selectedCurso.imagen ? (
                    <div className="flex min-h-[320px] w-full items-center justify-center bg-slate-100 p-6 md:min-h-[420px]">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomedImage({
                            src: selectedCurso.imagen!,
                            alt: selectedCurso.nombre,
                          })
                        }
                        className="relative aspect-[4/5] h-[380px] w-full max-w-[680px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] transition hover:scale-[1.01] md:h-[560px]"
                        aria-label="Ver imagen mas grande"
                      >
                        <OptimizedImage
                          src={selectedCurso.imagen}
                          alt={selectedCurso.nombre}
                          sizes="(max-width: 1024px) 100vw, 60vw"
                          className="object-contain p-3 sm:p-4"
                        />
                      </button>
                    </div>
                  ) : (
                  <div className="flex min-h-[320px] items-center justify-center text-slate-400">
                    Sin imagen
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8">
                <h3 className="text-3xl font-semibold leading-tight text-slate-900">
                  {selectedCurso.nombre}
                </h3>

                <div className="mt-4 flex items-center gap-2 text-slate-500">
                  <GraduationCap className="h-4 w-4" />
                  <span>{selectedCurso.responsable}</span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-slate-500">
                  <Phone className="h-4 w-4" />
                  <span>{selectedCurso.contacto}</span>
                </div>

                  <p className="mt-6 whitespace-pre-line text-lg leading-8 text-slate-600">
                    {selectedCurso.descripcion}
                  </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  {selectedCurso.contacto?.trim() ? (
                    <ContactActionLink
                      href={getContactHref(
                        selectedCurso.contacto,
                        selectedCurso.usa_whatsapp
                      )}
                      mode={selectedCurso.usa_whatsapp === false ? "phone" : "whatsapp"}
                      section="cursos"
                      itemId={String(selectedCurso.id)}
                      itemTitle={selectedCurso.nombre}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                    >
                      <Phone className="h-4 w-4" />
                      {getContactLabel(selectedCurso.usa_whatsapp)}
                    </ContactActionLink>
                  ) : null}

                  <ExternalLinksButtons
                    webUrl={selectedCurso.web_url}
                    instagramUrl={selectedCurso.instagram_url}
                    facebookUrl={selectedCurso.facebook_url}
                    section="cursos"
                    itemId={String(selectedCurso.id)}
                    itemTitle={selectedCurso.nombre}
                  />

                  <button
                    type="button"
                    onClick={() => setSelectedCurso(null)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedInstitucion && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedInstitucion(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
              aria-label="Cerrar detalle"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_0.55fr]">
              <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)]">
                {selectedInstitucion.foto ? (
                  <div className="flex min-h-[320px] w-full items-center justify-center bg-slate-100 p-6 md:min-h-[420px]">
                    <button
                      type="button"
                      onClick={() =>
                        setZoomedImage({
                          src: selectedInstitucion.foto!,
                          alt: selectedInstitucion.nombre,
                        })
                      }
                      className="relative aspect-[4/5] h-[380px] w-full max-w-[680px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] transition hover:scale-[1.01] md:h-[560px]"
                      aria-label="Ver imagen mas grande"
                    >
                      <OptimizedImage
                        src={selectedInstitucion.foto}
                        alt={selectedInstitucion.nombre}
                        sizes="(max-width: 1024px) 100vw, 60vw"
                        className="object-contain p-3 sm:p-4"
                      />
                    </button>
                  </div>
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center text-slate-400">
                    Sin imagen
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8">
                <div className="mb-4 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">
                    Institución
                </div>

                <h3 className="text-3xl font-semibold leading-tight text-slate-900">
                  {selectedInstitucion.nombre}
                </h3>

                {selectedInstitucion.direccion && (
                  <a
                    href={
                      getGoogleMapsSearchUrl(
                        selectedInstitucion.nombre,
                        selectedInstitucion.direccion,
                        selectedInstitucion.localidad
                      ) || "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center gap-2 text-sky-700 transition hover:text-sky-800"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>{selectedInstitucion.direccion}</span>
                  </a>
                )}

                {selectedInstitucion.telefono && (
                  <div className="mt-3 flex items-center gap-2 text-slate-500">
                    <Phone className="h-4 w-4" />
                    <span>{selectedInstitucion.telefono}</span>
                  </div>
                )}

                {selectedInstitucion.descripcion && (
                  <p className="mt-6 whitespace-pre-line text-lg leading-8 text-slate-600">
                    {selectedInstitucion.descripcion}
                  </p>
                )}

                <div className="mt-8 flex flex-wrap gap-3">
                  {selectedInstitucion.telefono?.trim() ? (
                    <ContactActionLink
                      href={getContactHref(
                        selectedInstitucion.telefono,
                        selectedInstitucion.usa_whatsapp
                      )}
                      mode={selectedInstitucion.usa_whatsapp === false ? "phone" : "whatsapp"}
                      section="instituciones"
                      itemId={String(selectedInstitucion.id)}
                      itemTitle={selectedInstitucion.nombre}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        selectedInstitucion.usa_whatsapp === false
                          ? "inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                          : "inline-flex items-center gap-2 rounded-2xl bg-green-500 px-5 py-3 font-semibold text-white transition hover:bg-green-600"
                      }
                    >
                      <Phone className="h-4 w-4" />
                      {selectedInstitucion.usa_whatsapp === false ? "Llamar" : "WhatsApp"}
                    </ContactActionLink>
                  ) : null}

                  <ExternalLinksButtons
                    webUrl={selectedInstitucion.web_url}
                    instagramUrl={selectedInstitucion.instagram_url}
                    facebookUrl={selectedInstitucion.facebook_url}
                    section="instituciones"
                    itemId={String(selectedInstitucion.id)}
                    itemTitle={selectedInstitucion.nombre}
                  />

                  <Link
                    href="/instituciones"
                    className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 font-semibold text-white transition hover:bg-cyan-500"
                  >
                    Ver todas las instituciones
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setSelectedInstitucion(null)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <PublicHeader
        items={buildHomePublicNav()}
        borderClassName="border-white/60"
        backgroundClassName="bg-white/80"
      />

      <section
        id="inicio"
        className="relative overflow-hidden bg-[linear-gradient(180deg,#edf3ee_0%,#dce8df_24%,#c7d8cc_62%,#b7cabd_100%)] py-20 md:py-28"
      >
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(255,245,220,0.42),transparent_25%),radial-gradient(circle_at_12%_24%,rgba(154,185,164,0.28),transparent_27%),radial-gradient(circle_at_86%_18%,rgba(180,203,187,0.3),transparent_24%)]" />
        <div
          className="absolute inset-x-0 bottom-0 z-0 h-32 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(202,217,206,0.84))] sm:h-40"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 z-0 h-28 bg-[linear-gradient(180deg,rgba(139,169,136,0.16),rgba(98,133,110,0.42))] sm:h-32"
          style={{
            clipPath:
              "polygon(0% 100%, 0% 72%, 8% 76%, 16% 58%, 25% 68%, 34% 44%, 45% 66%, 55% 50%, 66% 72%, 77% 54%, 87% 70%, 100% 60%, 100% 100%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 z-0 h-36 bg-[linear-gradient(180deg,rgba(118,134,109,0.14),rgba(78,99,79,0.54))] sm:h-44"
          style={{
            clipPath:
              "polygon(0% 100%, 0% 84%, 10% 76%, 21% 82%, 32% 60%, 41% 74%, 52% 52%, 63% 76%, 74% 64%, 84% 80%, 92% 70%, 100% 78%, 100% 100%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 z-0 h-20 bg-[linear-gradient(180deg,rgba(166,149,112,0),rgba(160,141,101,0.16))]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 z-0 h-px bg-[linear-gradient(90deg,transparent,rgba(96,124,104,0.48),transparent)]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-[#f0f3ea]/88 px-4 py-2 text-sm font-medium text-emerald-900 shadow-sm">
            <MapPin className="h-4 w-4" />
            Aiguá, Mariscala y la región
          </div>

          <div className="mx-auto max-w-5xl">
            <h1 className="text-4xl font-bold leading-[1.05] tracking-normal text-slate-950 sm:text-5xl lg:text-7xl">
              Descubrí las Sierras
            </h1>
          </div>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-700 sm:text-xl">
            Naturaleza, sabores, paseos y experiencias para disfrutar Aiguá, Mariscala y toda la región.
          </p>

          <HomeSearch />

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/usuarios/eventos/nuevo?public=1"
              className="inline-flex min-w-[190px] items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#16a34a_0%,#0ea5e9_100%)] px-8 py-4 text-base font-semibold text-white shadow-[0_18px_40px_-20px_rgba(14,165,233,0.85)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_46px_-22px_rgba(22,163,74,0.9)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
            >
              <PlusCircle className="h-5 w-5" />
              Sumar evento
            </Link>
            <button
              onClick={() =>
                document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex min-w-[190px] items-center justify-center gap-3 rounded-2xl bg-slate-950 px-8 py-4 text-base font-semibold text-white shadow-[0_18px_40px_-20px_rgba(15,23,42,0.85)] transition hover:-translate-y-0.5 hover:bg-slate-900"
            >
              Ver novedades
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <section className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-emerald-900/10 bg-[#fbf8f1]/92 p-6 shadow-[0_18px_45px_-30px_rgba(66,95,74,0.18)] backdrop-blur">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
                Estado del tiempo
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                Clima en Mariscala y Aiguá
              </h2>
            </div>

            {weatherItems.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {weatherItems.map((weatherItem) => {
                  const WeatherIcon = getWeatherIcon(weatherItem.weatherCode)
                  const weatherLabel =
                    WEATHER_LABELS[weatherItem.weatherCode] || "Clima actual"

                  return (
                    <div
                      key={weatherItem.location}
                      className="grid gap-4 rounded-[24px] border border-emerald-900/10 bg-[#f1f5ee]/95 p-5 md:grid-cols-[auto_1fr_auto] md:items-center"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fffdf8] text-emerald-700">
                        <WeatherIcon className="h-8 w-8" />
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">
                          {weatherItem.location}
                        </h3>
                        <p className="mt-2 text-base text-slate-600">
                          {weatherLabel}. Min {Math.round(weatherItem.tempMin)}
                          {"\u00B0"}C, max {Math.round(weatherItem.tempMax)}
                          {"\u00B0"}C y viento de{" "}
                          {Math.round(weatherItem.windSpeed)} km/h.
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#fffdf8] px-5 py-4 text-center text-emerald-800">
                        <div className="text-3xl font-bold">
                          {Math.round(weatherItem.temperature)}
                          {"\u00B0"}C
                        </div>
                        <div className="text-sm font-medium">Ahora</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {WEATHER_LOCATIONS.map((location) => (
                  <div
                    key={location.name}
                    className="grid gap-4 rounded-[24px] border border-emerald-900/10 bg-[#f1f5ee]/95 p-5 md:grid-cols-[auto_1fr] md:items-center"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fffdf8] text-emerald-700">
                      <CloudSun className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">
                        {location.name}
                      </h3>
                      <p className="mt-2 text-base text-slate-600">
                        {weatherStatus === "loading"
                          ? "Cargando estado del tiempo..."
                          : "Estado del tiempo no disponible por el momento."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-col">
      <section id="comercios" className="order-5 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Comercios y Servicios
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Lugares, profesionales, alojamientos y soluciones locales para recorrer la zona con todo a mano.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <Link
                href="/comercios"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-600 sm:text-sm"
              >
                Ver todos los comercios
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/servicios"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 sm:text-sm"
              >
                Ver todos los servicios
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {directoryItems.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              Todavía no hay comercios ni servicios cargados.
            </div>
          ) : (
            <>
              <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {visibleDirectoryItems.map((listing) => (
                  <LogoGridCard
                    key={listing.key}
                    image={listing.image}
                    name={listing.nombre}
                    showName={false}
                    fallback={
                      listing.type === "comercio" ? (
                        <Building2 className="h-8 w-8 text-slate-400 sm:h-10 sm:w-10" />
                      ) : (
                        <UserRound className="h-8 w-8 text-slate-400 sm:h-10 sm:w-10" />
                      )
                    }
                    onClick={() => {
                      if (listing.type === "comercio") {
                        const business = listing.item
                        if (business.premium_activo) {
                          void recordViewMore("comercios", String(business.id), business.nombre)
                          router.push(`/comercios/${business.id}`)
                          return
                        }

                        handleViewMoreClick(
                          "comercios",
                          String(business.id),
                          business.nombre,
                          () => setSelectedComercio(business)
                        )
                        return
                      }

                      const servicio = listing.item
                      if (servicio.premium_activo) {
                        void recordViewMore("servicios", String(servicio.id), servicio.nombre)
                        router.push(`/servicios/${servicio.id}`)
                        return
                      }

                      handleViewMoreClick(
                        "servicios",
                        String(servicio.id),
                        servicio.nombre,
                        () => setSelectedServicio(servicio)
                      )
                    }}
                    onKeyDown={(event) =>
                      handleCardKeyDown(event, () => {
                        if (listing.type === "comercio") {
                          const business = listing.item
                          if (business.premium_activo) {
                            void recordViewMore("comercios", String(business.id), business.nombre)
                            router.push(`/comercios/${business.id}`)
                            return
                          }

                          handleViewMoreClick(
                            "comercios",
                            String(business.id),
                            business.nombre,
                            () => setSelectedComercio(business)
                          )
                          return
                        }

                        const servicio = listing.item
                        if (servicio.premium_activo) {
                          void recordViewMore("servicios", String(servicio.id), servicio.nombre)
                          router.push(`/servicios/${servicio.id}`)
                          return
                        }

                        handleViewMoreClick(
                          "servicios",
                          String(servicio.id),
                          servicio.nombre,
                          () => setSelectedServicio(servicio)
                        )
                      })
                    }
                  />
                ))}
              </div>
              {directoryPageCount > 1 ? (
                <div className="mt-7 text-center text-sm text-slate-500">
                  La home muestra una tanda combinada de comercios y servicios, y la rota automáticamente cada 2 días.
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section id="propuestas-turisticas" className="order-6 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Propuestas Turísticas
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Alojamientos y actividades para hacer en Aiguá, Mariscala y las sierras.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Filtrar propuestas turísticas">
              {([
                ["todos", "Todos"],
                ["alojamientos", "Alojamientos"],
                ["actividades", "Actividades para hacer"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTourismFilter(value)}
                  aria-pressed={tourismFilter === value}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    tourismFilter === value
                      ? "border-emerald-800 bg-emerald-800 text-white shadow-sm"
                      : "border-emerald-800/15 bg-white/75 text-emerald-900 hover:bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Link
              href="/servicios?tipo=turismo"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-800/20 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-800/35 hover:bg-emerald-50"
            >
              Ver todas las propuestas turísticas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {filteredTourismProposals.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              Todavía no hay propuestas cargadas en esta categoría.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {visibleTourismProposals.map((servicio) => (
                  <div
                    key={servicio.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (servicio.premium_activo) {
                        void recordViewMore("servicios", String(servicio.id), servicio.nombre)
                        router.push(`/servicios/${servicio.id}`)
                        return
                      }

                      handleViewMoreClick(
                        "servicios",
                        String(servicio.id),
                        servicio.nombre,
                        () => setSelectedServicio(servicio)
                      )
                    }}
                    onKeyDown={(event) =>
                      handleCardKeyDown(event, () => {
                        if (servicio.premium_activo) {
                          void recordViewMore("servicios", String(servicio.id), servicio.nombre)
                          router.push(`/servicios/${servicio.id}`)
                          return
                        }

                        handleViewMoreClick(
                          "servicios",
                          String(servicio.id),
                          servicio.nombre,
                          () => setSelectedServicio(servicio)
                        )
                      })
                    }
                    className="group cursor-pointer overflow-hidden rounded-[20px] border border-white/80 bg-white/92 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-1 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <div className="relative aspect-[4/3] bg-slate-100">
                      {servicio.imagen ? (
                        <OptimizedImage
                          src={servicio.imagen}
                          alt={servicio.nombre}
                          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                          className="object-cover transition duration-200 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <MapPin className="h-9 w-9" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      {servicio.categoria ? (
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          {servicio.categoria}
                        </div>
                      ) : null}
                      <h3 className="line-clamp-2 text-base font-semibold leading-tight text-slate-900 sm:text-lg">
                        {servicio.nombre}
                      </h3>
                    </div>
                  </div>
                ))}
              </div>
              {tourismProposalPageCount > 1 ? (
                <div className="mt-7 text-center text-sm text-slate-500">
                  La home muestra una tanda de 8 propuestas y la rota automáticamente cada 2 días.
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section
        id="eventos"
        ref={eventsSectionRef}
        className="order-2 py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex rounded-full bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              Hoy en las Sierras
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Próximos eventos
            </h2>
            <p className="mt-4 text-xl text-slate-500">
              Eventos, propuestas, promociones y más
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/eventos"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              >
                Ver todos los eventos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div
            className="flex items-stretch snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain pb-6 [scrollbar-color:rgba(6,95,70,0.35)_transparent] [scrollbar-width:thin] md:gap-7"
            aria-label="Eventos destacados; deslizá hacia el costado para ver más"
          >
            {visibleEventos.map((event) => (
              <div
                key={event.id}
                role="button"
                tabIndex={0}
                style={{ flex: "0 0 clamp(19rem, 31.5%, 31.5%)", minWidth: 0 }}
                onClick={() =>
                  handleViewMoreClick(
                    "eventos",
                    String(event.id),
                    event.titulo,
                    () => setSelectedEvento(event)
                  )
                }
                onKeyDown={(eventKey) =>
                  handleCardKeyDown(eventKey, () =>
                    handleViewMoreClick(
                      "eventos",
                      String(event.id),
                      event.titulo,
                      () => setSelectedEvento(event)
                    )
                  )
                }
                className="flex snap-start cursor-pointer flex-col self-stretch overflow-hidden rounded-[20px] border border-emerald-800/18 bg-white/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45),0_0_0_1px_rgba(72,110,82,0.05)] transition hover:-translate-y-1.5 hover:border-emerald-800/24 hover:shadow-[0_28px_60px_-30px_rgba(74,110,82,0.18),0_0_0_1px_rgba(72,110,82,0.07)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/35 md:rounded-[28px]"
              >
                {event.imagen && (
                  <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-slate-100 bg-[radial-gradient(circle_at_center,#ffffff_0%,#f8fafc_72%,#eef2f7_100%)]">
                    <OptimizedImage
                      src={event.imagen}
                      alt={event.titulo}
                      sizes="(max-width: 640px) 19rem, (max-width: 1024px) 46vw, 31vw"
                      className="object-contain p-2 sm:p-3"
                    />
                  </div>
                )}

                <div className="flex flex-1 flex-col p-4 md:p-6">
                  <div className="mb-2 flex items-center gap-2 text-xs text-blue-500 md:mb-4 md:text-lg">
                    <CalendarDays className="h-4 w-4 shrink-0 md:h-5 md:w-5" />
                    <span>{formatEventDateRange(event.fecha, event.fecha_fin, event.fecha_solo_mes ?? false)}</span>
                  </div>

                  <div className="mb-2 inline-flex rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 md:mb-3 md:px-3 md:text-xs">
                    {normalizeEventCategory(event.categoria)}
                  </div>

                  <h3 className="text-base font-semibold leading-tight text-slate-900 md:text-[22px]">
                    {event.titulo}
                  </h3>

                  <a
                    href={
                      getGoogleMapsSearchUrl(
                        event.titulo,
                        event.ubicacion,
                        event.localidad
                      ) || "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(clickEvent) => clickEvent.stopPropagation()}
                    className="mt-2 line-clamp-2 block text-xs text-sky-700 transition hover:text-sky-800 md:text-sm"
                  >
                    {event.ubicacion}
                  </a>

                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {SHOW_COURSES_AND_INSTITUTIONS_ON_HOME ? <>
      <section id="cursos" className="order-3 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Cursos y Clases
            </h2>
            <p className="mt-4 text-xl text-slate-500">
              Propuestas de aprendizaje y formación en la ciudad
            </p>
            <div className="mt-6">
              <Link
                href="/cursos"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Ver todos los cursos y clases
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {cursos.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              Todavía no hay cursos o clases cargados.
            </div>
          ) : (
            <div className="grid grid-flow-col auto-cols-[minmax(16rem,18rem)] gap-4 overflow-x-auto pb-3">
              {visibleCursos.map((curso) => (
                <div
                  key={curso.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    handleViewMoreClick(
                      "cursos",
                      String(curso.id),
                      curso.nombre,
                      () => setSelectedCurso(curso)
                    )
                  }
                  onKeyDown={(event) =>
                    handleCardKeyDown(event, () =>
                      handleViewMoreClick(
                        "cursos",
                        String(curso.id),
                        curso.nombre,
                        () => setSelectedCurso(curso)
                      )
                    )
                  }
                  className="cursor-pointer overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-1.5 hover:shadow-[0_28px_60px_-30px_rgba(71,85,105,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/35"
                >
                  <div className="bg-emerald-800 p-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-800 shadow-sm">
                      <GraduationCap className="h-7 w-7" />
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-xl font-semibold leading-tight text-slate-950 sm:text-2xl">
                      {curso.nombre}
                    </h3>
                      <p className="mt-3 line-clamp-2 whitespace-pre-line text-sm leading-6 text-slate-500 sm:line-clamp-3 sm:text-base sm:leading-7">
                        {curso.descripcion}
                      </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 sm:mt-4 sm:text-sm">
                      <GraduationCap className="h-4 w-4" />
                      <span>{curso.responsable}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="instituciones" className="order-4 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-9 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Instituciones
            </h2>
            <p className="mt-3 text-base text-slate-500 md:text-lg">
              Espacios y organizaciones de referencia en las sierras
            </p>
            <div className="mt-5">
              <Link
                href="/instituciones"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-cyan-600 sm:text-sm"
              >
                Ver todas las instituciones
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {instituciones.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                Todavía no hay instituciones cargadas.
            </div>
          ) : (
            <div className="grid grid-cols-2 justify-items-center gap-4 xl:grid-cols-4">
              {visibleInstituciones.map((institucion) => (
                <div
                  key={institucion.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenInstitucion(institucion)}
                  onKeyDown={(event) =>
                    handleCardKeyDown(event, () =>
                      handleOpenInstitucion(institucion)
                    )
                  }
                  className="w-full max-w-[18rem] cursor-pointer overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-1 hover:shadow-[0_28px_60px_-30px_rgba(71,85,105,0.2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-800/35"
                >
                  <div className="bg-sky-800 p-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sky-800 shadow-sm">
                      <Building2 className="h-7 w-7" />
                    </div>
                  </div>

                  <div className="flex min-h-[170px] flex-col">
                    <div className="flex h-full flex-1 flex-col justify-between p-5">
                      <div>
                        <h3 className="text-xl font-semibold leading-tight text-slate-950 sm:text-2xl">
                          {institucion.nombre}
                        </h3>

                        {institucion.direccion ? (
                          <a
                            href={
                              getGoogleMapsSearchUrl(
                                institucion.nombre,
                                institucion.direccion,
                                institucion.localidad
                              ) || "#"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="mt-3 block line-clamp-2 text-sm text-sky-700 transition hover:text-sky-800"
                          >
                            {institucion.direccion}
                          </a>
                        ) : null}
                      </div>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      </> : null}

      </div>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                {sobreVarela.titulo}
              </h2>

              <div className="mt-8 space-y-6 text-xl leading-10 text-slate-800">
                <p>{sobreVarela.texto_1}</p>
                <p>{sobreVarela.texto_2}</p>
                <p>{sobreVarela.texto_3}</p>
              </div>
            </div>

            {sobreVarela.imagen_url ? (
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-lg">
                <div className="relative h-full min-h-[320px] w-full">
                  <OptimizedImage
                    src={sobreVarela.imagen_url}
                    alt={sobreVarela.titulo}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-slate-200 bg-slate-100 p-8 text-center shadow-lg">
                <div>
                  <MapPin className="mx-auto h-10 w-10 text-slate-400" />
                  <p className="mt-4 text-lg font-medium text-slate-600">
                    Imagen principal pendiente
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Cargala desde el panel admin cuando la tengas pronta.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer id="contacto" className="mt-6 border-t border-slate-200/80 bg-white/80 py-14 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/HolaSierras.png"
                alt="Hola Sierras"
                width={40}
                height={40}
                loading="lazy"
                className="h-10 w-auto"
              />
              <span className="text-[28px] font-semibold">
                Cartelera online de las sierras
              </span>
            </div>

            <p className="mt-6 text-lg leading-8 text-slate-500">
              Todo lo que pasa en Aiguá, Mariscala y la región.
            </p>

          </div>

          <div>
            <h3 className="text-[28px] font-semibold text-slate-900">Contacto</h3>

            <div className="mt-6 space-y-4 text-lg text-slate-500">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-slate-400" />
                <span>Aiguá, Mariscala y la región</span>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {SOCIAL_LINKS.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-3 rounded-full border px-4 py-3 text-sm font-semibold transition ${item.className}`}
                  >
                    {item.id === "instagram" ? <InstagramMark /> : <FacebookMark />}
                    <span>{item.label}</span>
                  </a>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setContactLeadStatus("")
                  setIsContactLeadOpen(true)
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
              >
                Quiero estar en Hola Sierras
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>
      </footer>
    </div>
  )
}

function InstagramMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.75A4 4 0 0 0 3.75 7.75v8.5a4 4 0 0 0 4 4h8.5a4 4 0 0 0 4-4v-8.5a4 4 0 0 0-4-4h-8.5Zm8.94 1.31a1.06 1.06 0 1 1 0 2.12 1.06 1.06 0 0 1 0-2.12ZM12 6.5A5.5 5.5 0 1 1 6.5 12 5.5 5.5 0 0 1 12 6.5Zm0 1.75A3.75 3.75 0 1 0 15.75 12 3.75 3.75 0 0 0 12 8.25Z" />
    </svg>
  )
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M13.5 22v-8.2h2.76l.41-3.2H13.5V8.56c0-.93.26-1.56 1.59-1.56H16.8V4.14c-.29-.04-1.28-.14-2.44-.14-2.42 0-4.08 1.48-4.08 4.2v2.4H7.5v3.2h2.78V22h3.22Z" />
    </svg>
  )
}

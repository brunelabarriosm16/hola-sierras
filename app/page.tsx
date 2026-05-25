import { HomePage, type HomePageData, type WeatherData } from "./components/HomePage"
import { buildActiveEventsFilter } from "./lib/eventDates"
import { supabaseServer } from "./lib/supabaseServer"

export const revalidate = 3600
export const fetchCache = "default-cache"

const defaultSobreVarela = {
  titulo: "Hola Sierras",
  texto_1:
    "Hola Sierras reúne propuestas, servicios y novedades de Aiguá, Mariscala y la región en un solo lugar.",
  texto_2:
    "Un espacio pensado para mostrar comercios, eventos, cursos, instituciones y servicios de la zona.",
  texto_3:
    "Cartelera online de las sierras. Todo lo que pasa en Aiguá, Mariscala y la región.",
  imagen_url: null,
}

export default async function Page() {
  const today = new Date().toISOString().slice(0, 10)
  const weatherLocations = [
    { name: "Mariscala", latitude: -34.04085, longitude: -54.77732 },
    { name: "Aiguá", latitude: -34.20498, longitude: -54.75665 },
  ] as const

  const weatherPromise = Promise.all(
    weatherLocations.map(async (location) => {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FMontevideo&forecast_days=1`,
        {
          next: { revalidate: 3600 },
        }
      )

      if (!response.ok) return null

      const data = await response.json()

      const weather: WeatherData | null =
        data?.current && data?.daily
          ? {
              location: location.name,
              temperature: data.current.temperature_2m,
              weatherCode: data.current.weather_code,
              tempMax: data.daily.temperature_2m_max?.[0] ?? data.current.temperature_2m,
              tempMin: data.daily.temperature_2m_min?.[0] ?? data.current.temperature_2m,
              windSpeed: data.current.wind_speed_10m ?? 0,
            }
          : null

      return weather
    })
  )
    .then((results) => results.filter((item): item is WeatherData => item !== null))
    .catch(() => [])

  const [
    { data: featuredBusinesses },
    { data: eventosData },
    { data: cursos },
    { data: servicios },
    { data: highlightedServicios },
    { data: highlightedCursos },
    { data: instituciones },
    { data: sobreVarelaData },
    weather,
  ] = await Promise.all([
    supabaseServer
      .from("comercios")
      .select("id, nombre, descripcion, premium_detalle, premium_galeria, premium_activo, direccion, telefono, web_url, instagram_url, facebook_url, imagen, imagen_url, destacado, plan_suscripcion, usa_whatsapp")
      .or("estado.is.null,estado.eq.activo")
      .or("destacado.eq.true,plan_suscripcion.eq.destacado,plan_suscripcion.eq.destacado_plus")
      .order("id", { ascending: false })
      .limit(48),
    supabaseServer
      .from("eventos")
      .select("id, titulo, categoria, descripcion, fecha, fecha_fin, fecha_solo_mes, ubicacion, telefono, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp")
      .or("estado.is.null,estado.eq.activo")
      .or(buildActiveEventsFilter(today))
      .order("fecha", { ascending: true }),
    supabaseServer
      .from("cursos")
      .select("id, nombre, descripcion, responsable, contacto, web_url, instagram_url, facebook_url, imagen, destacado, plan_suscripcion, usa_whatsapp")
      .or("estado.is.null,estado.eq.activo")
      .order("id", { ascending: false })
      .limit(8),
    supabaseServer
      .from("servicios")
      .select("id, nombre, categoria, descripcion, premium_detalle, premium_galeria, premium_activo, responsable, contacto, direccion, web_url, instagram_url, facebook_url, imagen, destacado, plan_suscripcion, usa_whatsapp")
      .or("estado.is.null,estado.eq.activo")
      .order("id", { ascending: false })
      .limit(48),
    supabaseServer
      .from("servicios")
      .select("id, nombre, categoria, descripcion, premium_detalle, premium_galeria, premium_activo, responsable, contacto, direccion, web_url, instagram_url, facebook_url, imagen, destacado, plan_suscripcion, usa_whatsapp")
      .or("estado.is.null,estado.eq.activo")
      .or("destacado.eq.true,plan_suscripcion.eq.destacado,plan_suscripcion.eq.destacado_plus")
      .order("id", { ascending: false })
      .limit(24),
    supabaseServer
      .from("cursos")
      .select("id, nombre, descripcion, responsable, contacto, web_url, instagram_url, facebook_url, imagen, destacado, plan_suscripcion, usa_whatsapp")
      .or("estado.is.null,estado.eq.activo")
      .eq("destacado", true)
      .order("id", { ascending: false })
      .limit(12),
    supabaseServer
      .from("instituciones")
      .select("id, nombre, descripcion, direccion, telefono, web_url, instagram_url, facebook_url, foto, usa_whatsapp")
      .or("estado.is.null,estado.eq.activo")
      .order("id", { ascending: false })
      .limit(10),
    supabaseServer
      .from("sitio")
      .select("titulo, texto_1, texto_2, texto_3, imagen_url")
      .eq("id", 1)
      .maybeSingle(),
    weatherPromise,
  ])

  const initialData: HomePageData = {
    featuredBusinesses: featuredBusinesses || [],
    eventos: (eventosData || []).slice(0, 6),
    cursos: cursos || [],
    servicios: servicios || [],
    instituciones: instituciones || [],
    allCursos: highlightedCursos || cursos || [],
    allServicios: highlightedServicios || servicios || [],
    sobreVarela: sobreVarelaData
      ? { ...defaultSobreVarela, ...sobreVarelaData }
      : defaultSobreVarela,
    weather,
  }

  return <HomePage initialData={initialData} />
}

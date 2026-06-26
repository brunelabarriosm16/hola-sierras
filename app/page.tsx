import { HomePage, type HomePageData, type WeatherData } from "./components/HomePage"
import { buildActiveEventsFilter } from "./lib/eventDates"
import { supabaseServer } from "./lib/supabaseServer"
import { unstable_cache } from "next/cache"

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

const getHomeSupabaseData = unstable_cache(
  async () => {
    const today = new Date().toISOString().slice(0, 10)

    const [
      { data: featuredNotices },
      { data: featuredBusinesses },
      { data: eventosData },
      { data: cursos },
      { data: servicios },
      { data: instituciones },
      { data: sobreVarelaData },
    ] = await Promise.all([
      supabaseServer
        .from("avisos_destacados")
        .select("id, imagen, tipo_propuesta, propuesta_id, espera_segundos")
        .eq("activo", true)
        .order("id", { ascending: false })
        .limit(24),
      supabaseServer
        .from("comercios")
        .select("id, nombre, descripcion, premium_detalle, premium_galeria, premium_activo, direccion, localidad, telefono, web_url, instagram_url, facebook_url, imagen, imagen_url, destacado, plan_suscripcion, usa_whatsapp")
        .or("estado.is.null,estado.eq.activo")
        .or("destacado.eq.true,plan_suscripcion.eq.destacado,plan_suscripcion.eq.destacado_plus")
        .order("id", { ascending: false })
        .limit(48),
      supabaseServer
        .from("eventos")
        .select("id, titulo, categoria, descripcion, fecha, fecha_fin, fecha_solo_mes, ubicacion, localidad, telefono, web_url, instagram_url, facebook_url, imagen, estado, usa_whatsapp")
        .or("estado.is.null,estado.eq.activo")
        .or(buildActiveEventsFilter(today))
        .order("fecha", { ascending: true }),
      supabaseServer
        .from("cursos")
        .select("id, nombre, descripcion, responsable, contacto, localidad, edades, web_url, instagram_url, facebook_url, imagen, destacado, plan_suscripcion, usa_whatsapp")
        .or("estado.is.null,estado.eq.activo")
        .order("id", { ascending: false })
        .limit(24),
      supabaseServer
        .from("servicios")
        .select("id, nombre, categoria, descripcion, premium_detalle, premium_galeria, premium_activo, responsable, contacto, direccion, localidad, web_url, instagram_url, facebook_url, imagen, destacado, plan_suscripcion, usa_whatsapp")
        .or("estado.is.null,estado.eq.activo")
        .order("id", { ascending: false })
        .limit(48),
      supabaseServer
        .from("instituciones")
        .select("id, nombre, descripcion, premium_activo, direccion, localidad, telefono, web_url, instagram_url, facebook_url, foto, usa_whatsapp")
        .or("estado.is.null,estado.eq.activo")
        .order("id", { ascending: false })
        .limit(10),
      supabaseServer
        .from("sitio")
        .select("titulo, texto_1, texto_2, texto_3, imagen_url")
        .eq("id", 1)
        .maybeSingle(),
    ])

    return {
      featuredNotices: featuredNotices || [],
      featuredBusinesses: featuredBusinesses || [],
      eventos: (eventosData || []).slice(0, 6),
      cursos: (cursos || []).slice(0, 8),
      servicios: servicios || [],
      instituciones: instituciones || [],
      allCursos: cursos || [],
      allServicios: servicios || [],
      sobreVarela: sobreVarelaData
        ? { ...defaultSobreVarela, ...sobreVarelaData }
        : defaultSobreVarela,
    } satisfies Omit<HomePageData, "weather">
  },
  ["home-supabase-data-v3"],
  { revalidate: 3600 }
)

export default async function Page() {
  const weatherLocations = [
    { name: "Mariscala", latitude: -34.04085, longitude: -54.77732 },
    { name: "Aiguá", latitude: -34.20498, longitude: -54.75665 },
  ] as const

  const weatherPromise = Promise.all<WeatherData | null>(
    weatherLocations.map(async (location) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FMontevideo&forecast_days=1`,
          {
            next: { revalidate: 3600 },
          }
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
          `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true&timezone=America%2FMontevideo`,
          {
            next: { revalidate: 1800 },
          }
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
    .then((results) => results.filter((item): item is WeatherData => item !== null))
    .catch(() => [])

  const [homeData, weather] = await Promise.all([getHomeSupabaseData(), weatherPromise])

  const initialData: HomePageData = {
    ...homeData,
    weather,
  }

  return <HomePage initialData={initialData} />
}

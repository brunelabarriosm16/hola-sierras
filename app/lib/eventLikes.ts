import { supabase } from "../supabase"

const EVENT_LIKES_TABLE = "event_likes"
const EVENT_LIKES_BROWSER_KEY = "hola-varela-event-likes-browser"

export type EventLikeCountMap = Record<string, number>
export type EventLikedMap = Record<string, boolean>

type EventLikeRow = {
  event_id: string | null
  browser_key: string | null
}

export type EventLikeMetricRow = {
  created_at: string | null
}

const createBrowserKey = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `browser-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

export const getEventLikesBrowserKey = () => {
  if (typeof window === "undefined") return ""

  const existingKey = window.localStorage.getItem(EVENT_LIKES_BROWSER_KEY)
  if (existingKey) return existingKey

  const nextKey = createBrowserKey()
  window.localStorage.setItem(EVENT_LIKES_BROWSER_KEY, nextKey)
  return nextKey
}

export const buildEventLikeCountMap = (
  rows: EventLikeRow[]
): EventLikeCountMap =>
  rows.reduce<EventLikeCountMap>((acc, row) => {
    if (!row.event_id) return acc
    acc[row.event_id] = (acc[row.event_id] || 0) + 1
    return acc
  }, {})

export const buildEventLikedMap = (
  rows: EventLikeRow[],
  browserKey: string
): EventLikedMap =>
  rows.reduce<EventLikedMap>((acc, row) => {
    if (!row.event_id || row.browser_key !== browserKey) return acc
    acc[row.event_id] = true
    return acc
  }, {})

export const fetchEventLikes = async (eventIds: string[]) => {
  if (eventIds.length === 0) {
    return {
      countMap: {} as EventLikeCountMap,
      likedMap: {} as EventLikedMap,
    }
  }

  const browserKey = getEventLikesBrowserKey()
  const { data, error } = await supabase
    .from(EVENT_LIKES_TABLE)
    .select("event_id, browser_key")
    .in("event_id", eventIds)

  if (error) {
    console.error("No se pudieron cargar los corazones de eventos:", error)
    return {
      countMap: {} as EventLikeCountMap,
      likedMap: {} as EventLikedMap,
    }
  }

  const rows = (data || []) as EventLikeRow[]

  return {
    countMap: buildEventLikeCountMap(rows),
    likedMap: buildEventLikedMap(rows, browserKey),
  }
}

export const recordEventLike = async (
  eventId: string,
  eventTitle?: string | null
) => {
  const browserKey = getEventLikesBrowserKey()
  const { error } = await supabase.from(EVENT_LIKES_TABLE).insert([
    {
      event_id: eventId,
      browser_key: browserKey,
      event_title: eventTitle || null,
    },
  ])

  if (error) {
    if (error.code === "23505") {
      return { status: "exists" as const }
    }

    console.error("No se pudo registrar el corazón del evento:", error)
    return { status: "error" as const }
  }

  return { status: "liked" as const }
}

export const buildEventLikeTotal = (rows: EventLikeMetricRow[]) => rows.length

import { supabase } from "../supabase"

export const SHARE_SECTIONS = [
  "comercios",
  "eventos",
  "cursos",
  "servicios",
  "instituciones",
] as const

export type ShareSection = (typeof SHARE_SECTIONS)[number]

export type ShareCountMap = Record<string, number>
export type ShareTotals = Record<ShareSection, number>

export const emptyShareTotals = (): ShareTotals => ({
  comercios: 0,
  eventos: 0,
  cursos: 0,
  servicios: 0,
  instituciones: 0,
})

export const recordShare = async (
  section: ShareSection,
  itemId: string,
  itemTitle?: string | null
) => {
  const { error } = await supabase.from("share_events").insert([
    {
      section,
      item_id: itemId,
      item_title: itemTitle || null,
    },
  ])

  if (error) {
    console.error("No se pudo registrar el compartido:", error)
    return false
  }

  return true
}

export const buildShareCountMap = (
  rows: Array<{ item_id: string | null }>
): ShareCountMap =>
  rows.reduce<ShareCountMap>((acc, row) => {
    if (!row.item_id) return acc
    acc[row.item_id] = (acc[row.item_id] || 0) + 1
    return acc
  }, {})

export const buildShareTotals = (
  rows: Array<{ section: string | null }>
): ShareTotals =>
  rows.reduce<ShareTotals>((acc, row) => {
    const section = row.section as ShareSection | null
    if (!section || !SHARE_SECTIONS.includes(section)) return acc
    acc[section] += 1
    return acc
  }, emptyShareTotals())

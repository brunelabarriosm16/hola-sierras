import { supabase } from "../supabase"

export const VIEW_MORE_SECTIONS = [
  "comercios",
  "eventos",
  "cursos",
  "servicios",
  "instituciones",
] as const

export type ViewMoreSection = (typeof VIEW_MORE_SECTIONS)[number]

export type ViewMoreTotals = Record<ViewMoreSection, number>

export const emptyViewMoreTotals = (): ViewMoreTotals => ({
  comercios: 0,
  eventos: 0,
  cursos: 0,
  servicios: 0,
  instituciones: 0,
})

export const recordViewMore = async (
  section: ViewMoreSection,
  itemId: string,
  itemTitle?: string | null
) => {
  const { error } = await supabase.from("view_more_clicks").insert([
    {
      section,
      item_id: itemId,
      item_title: itemTitle || null,
    },
  ])

  if (error) {
    console.error('No se pudo registrar el clic en "Ver más":', error)
  }
}

export const buildViewMoreTotals = (
  rows: Array<{ section: string | null }>
): ViewMoreTotals =>
  rows.reduce<ViewMoreTotals>((acc, row) => {
    const section = row.section as ViewMoreSection | null
    if (!section || !VIEW_MORE_SECTIONS.includes(section)) return acc
    acc[section] += 1
    return acc
  }, emptyViewMoreTotals())

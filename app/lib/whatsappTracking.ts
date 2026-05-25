import { supabase } from "../supabase"

export const WHATSAPP_SECTIONS = [
  "comercios",
  "eventos",
  "cursos",
  "servicios",
  "instituciones",
] as const

export type WhatsappSection = (typeof WHATSAPP_SECTIONS)[number]

export type WhatsappCountMap = Record<string, number>
export type WhatsappTotals = Record<WhatsappSection, number>

export const emptyWhatsappTotals = (): WhatsappTotals => ({
  comercios: 0,
  eventos: 0,
  cursos: 0,
  servicios: 0,
  instituciones: 0,
})

export const recordWhatsappClick = async (
  section: WhatsappSection,
  itemId: string,
  itemTitle?: string | null
) => {
  const { error } = await supabase.from("whatsapp_clicks").insert([
    {
      section,
      item_id: itemId,
      item_title: itemTitle || null,
    },
  ])

  if (error) {
    console.error("No se pudo registrar el clic de WhatsApp:", error)
  }
}

export const buildWhatsappCountMap = (
  rows: Array<{ item_id: string | null }>
): WhatsappCountMap =>
  rows.reduce<WhatsappCountMap>((acc, row) => {
    if (!row.item_id) return acc
    acc[row.item_id] = (acc[row.item_id] || 0) + 1
    return acc
  }, {})

export const buildWhatsappTotals = (
  rows: Array<{ section: string | null }>
): WhatsappTotals =>
  rows.reduce<WhatsappTotals>((acc, row) => {
    const section = row.section as WhatsappSection | null
    if (!section || !WHATSAPP_SECTIONS.includes(section)) return acc
    acc[section] += 1
    return acc
  }, emptyWhatsappTotals())

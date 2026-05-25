import { supabase } from "../supabase"

export const EXTERNAL_LINK_SECTIONS = [
  "comercios",
  "eventos",
  "cursos",
  "servicios",
  "instituciones",
] as const

export const EXTERNAL_LINK_TYPES = ["web", "instagram", "facebook"] as const

export type ExternalLinkSection = (typeof EXTERNAL_LINK_SECTIONS)[number]
export type ExternalLinkType = (typeof EXTERNAL_LINK_TYPES)[number]
export type ExternalLinkTotals = Record<ExternalLinkSection, number>
export type ExternalLinkTypeTotals = Record<ExternalLinkType, number>

export const emptyExternalLinkTotals = (): ExternalLinkTotals => ({
  comercios: 0,
  eventos: 0,
  cursos: 0,
  servicios: 0,
  instituciones: 0,
})

export const emptyExternalLinkTypeTotals = (): ExternalLinkTypeTotals => ({
  web: 0,
  instagram: 0,
  facebook: 0,
})

export const recordExternalLinkClick = async (
  section: ExternalLinkSection,
  itemId: string,
  itemTitle: string | null | undefined,
  linkType: ExternalLinkType
) => {
  const { error } = await supabase.from("external_link_clicks").insert([
    {
      section,
      item_id: itemId,
      item_title: itemTitle || null,
      link_type: linkType,
    },
  ])

  if (error) {
    console.error("No se pudo registrar el clic del enlace externo:", error)
  }
}

export const buildExternalLinkTotals = (
  rows: Array<{ section: string | null }>
): ExternalLinkTotals =>
  rows.reduce<ExternalLinkTotals>((acc, row) => {
    const section = row.section as ExternalLinkSection | null
    if (!section || !EXTERNAL_LINK_SECTIONS.includes(section)) return acc
    acc[section] += 1
    return acc
  }, emptyExternalLinkTotals())

export const buildExternalLinkTypeTotals = (
  rows: Array<{ link_type: string | null }>
): ExternalLinkTypeTotals =>
  rows.reduce<ExternalLinkTypeTotals>((acc, row) => {
    const linkType = row.link_type as ExternalLinkType | null
    if (!linkType || !EXTERNAL_LINK_TYPES.includes(linkType)) return acc
    acc[linkType] += 1
    return acc
  }, emptyExternalLinkTypeTotals())

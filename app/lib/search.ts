export type SearchCategory =
  | "que-hacer"
  | "donde-comer"
  | "que-conocer"
  | "donde-quedarse"
  | "eventos"
  | "comercios-servicios"

export type SearchItem = {
  id: string
  name: string
  category: SearchCategory
  categoryLabel: string
  location: string
  description: string
  image: string | null
  href: string
  tags: string[]
  date: string | null
  recentOrder: number
}

export const SEARCH_CATEGORIES: Array<{ value: "todo" | SearchCategory; label: string }> = [
  { value: "todo", label: "Todo" },
  { value: "que-hacer", label: "Qué hacer" },
  { value: "donde-comer", label: "Dónde comer" },
  { value: "que-conocer", label: "Qué conocer" },
  { value: "donde-quedarse", label: "Dónde quedarse" },
  { value: "eventos", label: "Eventos" },
  { value: "comercios-servicios", label: "Comercios y servicios" },
]

export const normalizeSearchText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

const includesAny = (value: string, terms: string[]) => terms.some((term) => value.includes(term))

export function classifyListing(kind: "comercio" | "servicio", category?: string | null): SearchCategory {
  const value = normalizeSearchText(category || "")
  if (includesAny(value, ["restaurant", "restoran", "cafe", "cafeter", "comida", "gastronom", "bar", "panader", "parrill"])) return "donde-comer"
  if (includesAny(value, ["aloj", "cabana", "hotel", "hostel", "posada", "camping", "hosped"] )) return "donde-quedarse"
  if (includesAny(value, ["turis", "paseo", "cabalg", "aventura", "experiencia", "actividad", "sender", "naturaleza"])) return "que-hacer"
  if (includesAny(value, ["lugar", "museo", "mirador", "patrimonio", "parque", "reserva", "cerro"])) return "que-conocer"
  return "comercios-servicios"
}

export function searchScore(item: SearchItem, query: string) {
  const words = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  if (!words.length) return 1
  const name = normalizeSearchText(item.name)
  const category = normalizeSearchText(`${item.categoryLabel} ${item.tags.join(" ")}`)
  const location = normalizeSearchText(item.location)
  const description = normalizeSearchText(item.description)
  let score = 0
  for (const word of words) {
    if (name === word) score += 12
    else if (name.startsWith(word)) score += 8
    else if (name.includes(word)) score += 6
    if (category.includes(word)) score += 4
    if (location.includes(word)) score += 3
    if (description.includes(word)) score += 2
  }
  return score
}

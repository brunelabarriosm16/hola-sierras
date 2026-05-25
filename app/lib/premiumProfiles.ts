export function parsePremiumGallery(input?: string | null) {
  if (!input) return []

  return input
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
}

export function serializePremiumGallery(urls?: string[] | null) {
  if (!urls || urls.length === 0) return ""
  return urls.join("\n")
}

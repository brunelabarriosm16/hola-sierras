export function getGoogleMapsSearchUrl(...parts: Array<string | null | undefined>) {
  const query = parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")

  if (!query) return null

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

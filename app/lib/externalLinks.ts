export function normalizeExternalUrl(url?: string | null) {
  const value = url?.trim()

  if (!value) return null
  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(value)) return value

  return `https://${value}`
}

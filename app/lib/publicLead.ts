export type PublicLeadType = "comercio" | "servicio" | "curso" | "institucion" | "evento"

export type PublicLeadRecord = {
  version: 1
  type: PublicLeadType
  senderName: string
  senderEmail: string
  senderPhone: string
  listingName: string
  listingDescription: string
  listingAddress: string
  listingPhone: string
  listingImage: string | null
  serviceCategory?: string
  courseResponsible?: string
  courseContact?: string
  notes?: string
  event?: {
    senderName: string
    title: string
    category: string
    description: string
    date: string
    location: string
    image: string | null
  } | null
}

const PUBLIC_LEAD_PREFIX = "HV_PUBLIC_LEAD_V1::"

export function serializePublicLead(record: PublicLeadRecord) {
  return `${PUBLIC_LEAD_PREFIX}${JSON.stringify(record)}`
}

export function parsePublicLead(message: string | null | undefined): PublicLeadRecord | null {
  if (!message || !message.startsWith(PUBLIC_LEAD_PREFIX)) return null

  try {
    const parsed = JSON.parse(message.slice(PUBLIC_LEAD_PREFIX.length)) as PublicLeadRecord
    if (!parsed || parsed.version !== 1 || !parsed.type || !parsed.senderName) return null
    return parsed
  } catch {
    return null
  }
}

export function getPublicLeadTypeLabel(type: PublicLeadType) {
  switch (type) {
    case "comercio":
      return "Comercio"
    case "servicio":
      return "Servicio"
    case "curso":
      return "Curso o clase"
    case "institucion":
      return "Institución"
    case "evento":
      return "Evento"
    default:
      return type
  }
}

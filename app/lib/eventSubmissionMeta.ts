type SubmissionContact = {
  senderName: string
  senderPhone: string
}

const META_MARKER = "[[HV_SUBMISSION_META]]"

export function buildEventDescription(
  description: string,
  contact?: SubmissionContact | null
) {
  const baseDescription = description.trim()

  if (!contact?.senderName?.trim() || !contact?.senderPhone?.trim()) {
    return baseDescription
  }

  return [
    baseDescription,
    META_MARKER,
    `sender_name=${contact.senderName.trim()}`,
    `sender_phone=${contact.senderPhone.trim()}`,
  ]
    .filter(Boolean)
    .join("\n")
}

export function parseEventDescription(rawDescription?: string | null) {
  const content = rawDescription || ""
  const markerIndex = content.indexOf(META_MARKER)

  if (markerIndex === -1) {
    return {
      baseDescription: content.trim(),
      submissionContact: null,
    }
  }

  const baseDescription = content.slice(0, markerIndex).trim()
  const metaLines = content
    .slice(markerIndex + META_MARKER.length)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const senderName =
    metaLines.find((line) => line.startsWith("sender_name="))?.slice("sender_name=".length).trim() || ""
  const senderPhone =
    metaLines.find((line) => line.startsWith("sender_phone="))?.slice("sender_phone=".length).trim() || ""

  return {
    baseDescription,
    submissionContact:
      senderName && senderPhone
        ? {
            senderName,
            senderPhone,
          }
        : null,
  }
}

const parseEventDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatLongDate = (value: string, locale = "es-UY") => {
  const date = parseEventDate(value)
  if (!date) return value

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

const formatMonthDate = (value: string, locale = "es-UY") => {
  const date = parseEventDate(value)
  if (!date) return value

  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
  })
}

export const buildMonthEventRange = (monthValue: string) => {
  if (!/^\d{4}-\d{2}$/.test(monthValue)) return null

  const [yearRaw, monthRaw] = monthValue.split("-")
  const year = Number(yearRaw)
  const month = Number(monthRaw)

  if (!year || !month || month < 1 || month > 12) return null

  const startDate = `${yearRaw}-${monthRaw}-01`
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

  return { startDate, endDate }
}

export const formatEventDateRange = (
  startDate: string,
  endDate?: string | null,
  monthOnly = false,
  locale = "es-UY"
) => {
  if (!startDate) return "Sin fecha"
  if (monthOnly) return formatMonthDate(startDate, locale)
  if (!endDate || endDate === startDate) return formatLongDate(startDate, locale)

  const start = parseEventDate(startDate)
  const end = parseEventDate(endDate)

  if (!start || !end) return `${startDate} al ${endDate}`

  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()

  if (sameMonth) {
    const month = start.toLocaleDateString(locale, { month: "long" })
    return `${start.getDate()} al ${end.getDate()} de ${month} de ${start.getFullYear()}`
  }

  if (sameYear) {
    const startMonth = start.toLocaleDateString(locale, { month: "long" })
    const endMonth = end.toLocaleDateString(locale, { month: "long" })
    return `${start.getDate()} de ${startMonth} al ${end.getDate()} de ${endMonth} de ${start.getFullYear()}`
  }

  return `${formatLongDate(startDate, locale)} al ${formatLongDate(endDate, locale)}`
}

export const buildActiveEventsFilter = (today: string) =>
  `fecha.gte.${today},and(fecha.lte.${today},fecha_fin.gte.${today})`

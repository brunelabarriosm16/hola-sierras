export const LOCALIDADES = ["Mariscala", "Aiguá"] as const

export type Localidad = (typeof LOCALIDADES)[number]

export function normalizeLocalidad(value?: string | null) {
  const normalized = value?.trim().toLowerCase()
  return LOCALIDADES.find((localidad) => localidad.toLowerCase() === normalized) || ""
}

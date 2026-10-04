export const SIERRAS_DESTINATIONS = ["Mariscala", "Aiguá", "Minas"] as const
export type DestinationFilter = "todos" | (typeof SIERRAS_DESTINATIONS)[number]

const normalizeLocation = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es")

export function matchesDestination(location: string | null | undefined, destination: DestinationFilter) {
  return destination === "todos" || normalizeLocation(location || "") === normalizeLocation(destination)
}

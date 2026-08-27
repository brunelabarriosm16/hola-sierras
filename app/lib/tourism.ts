type TourismSearchableItem = {
  nombre?: string | null
  categoria?: string | null
  descripcion?: string | null
  responsable?: string | null
}

function normalizeTourismText(item: TourismSearchableItem) {
  return [item.nombre, item.categoria, item.descripcion, item.responsable]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function isTourismProposal(item: TourismSearchableItem) {
  const searchable = normalizeTourismText(item)
  const terms = [
    "alojamiento", "alojamientos", "cabana", "cabanas", "camping", "hospedaje",
    "hostel", "hotel", "posada", "actividad", "actividades", "astroturismo",
    "cabalgata", "cabalgatas", "experiencia", "experiencias", "guia", "guiada",
    "guiadas", "guiado", "guiados", "museo", "museos", "paseo", "paseos",
    "recreativa", "recreativas", "senderismo", "turismo", "turistica", "turisticas",
    "turistico", "turisticos", "rural", "visita", "visitas",
  ]

  return terms.some((term) => searchable.includes(term))
}

export function isAccommodationProposal(item: TourismSearchableItem) {
  const searchable = normalizeTourismText(item)
  return ["alojamiento", "cabana", "camping", "hospedaje", "hostel", "hotel", "posada"]
    .some((term) => searchable.includes(term))
}

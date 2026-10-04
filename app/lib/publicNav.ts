type PublicNavKey =
  | "inicio"
  | "eventos"
  | "cursos"
  | "instituciones"
  | "comercios"
  | "servicios"
  | "contacto"

const publicNavItems: Record<PublicNavKey, { href: string; label: string }> = {
  inicio: { href: "/#inicio", label: "Inicio" },
  eventos: { href: "/eventos", label: "Eventos" },
  cursos: { href: "/cursos", label: "Cursos y Clases" },
  instituciones: { href: "/instituciones", label: "Instituciones" },
  comercios: { href: "/comercios", label: "Comercios" },
  servicios: { href: "/servicios", label: "Servicios" },
  contacto: { href: "/#contacto", label: "Contacto" },
}

const publicNavOrder: PublicNavKey[] = [
  "inicio",
  "eventos",
  "cursos",
  "instituciones",
  "comercios",
  "servicios",
  "contacto",
]

export function buildPublicNav(active?: PublicNavKey) {
  return publicNavOrder.map((key) => ({
    ...publicNavItems[key],
    active: key === active,
  }))
}

export function buildHomePublicNav() {
  return [
    { href: "/#inicio", label: "Inicio" },
    { href: "/#eventos", label: "Eventos" },
    { href: "/#comercios", label: "Comercios y Servicios" },
    { href: "/#propuestas-turisticas", label: "Turismo" },
    { href: "/#contacto", label: "Contacto" },
  ]
}

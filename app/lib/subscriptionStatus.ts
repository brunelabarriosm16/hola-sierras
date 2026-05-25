export type SubscriptionStatusKey = "pendiente" | "activa" | "pausada" | "cancelada"

export const subscriptionStatusOptions: Array<{
  value: SubscriptionStatusKey
  label: string
}> = [
  { value: "pendiente", label: "Pendiente" },
  { value: "activa", label: "Activa" },
  { value: "pausada", label: "Pausada" },
  { value: "cancelada", label: "Cancelada" },
]

export function getSubscriptionStatusLabel(status?: string | null) {
  const match = subscriptionStatusOptions.find((option) => option.value === status)
  return match?.label || "Pendiente"
}

export function getSubscriptionStatusBadge(status?: string | null) {
  switch (status) {
    case "activa":
      return "bg-emerald-100 text-emerald-700"
    case "pausada":
      return "bg-amber-100 text-amber-700"
    case "cancelada":
      return "bg-rose-100 text-rose-700"
    default:
      return "bg-slate-200 text-slate-700"
  }
}

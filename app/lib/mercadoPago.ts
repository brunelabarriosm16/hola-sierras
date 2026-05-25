import { subscriptionPlans, type SubscriptionPlanKey } from "./subscriptionPlans"

type MercadoPagoPreapproval = {
  id: string
  status?: string | null
  preapproval_plan_id?: string | null
  external_reference?: string | null
  payer_email?: string | null
}

const planIdToKey = Object.entries(subscriptionPlans).reduce<Record<string, SubscriptionPlanKey>>(
  (acc, [key, plan]) => {
    if (plan.preapprovalPlanId) {
      acc[plan.preapprovalPlanId] = key as SubscriptionPlanKey
    }
    return acc
  },
  {}
)

function getMercadoPagoAccessToken() {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("Falta MERCADO_PAGO_ACCESS_TOKEN en variables de entorno.")
  }

  return accessToken
}

async function mercadoPagoRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Mercado Pago respondio ${response.status}: ${message}`)
  }

  return (await response.json()) as T
}

export async function getMercadoPagoPreapproval(preapprovalId: string) {
  return mercadoPagoRequest<MercadoPagoPreapproval>(`/preapproval/${preapprovalId}`)
}

export async function updateMercadoPagoPreapproval(
  preapprovalId: string,
  payload: {
    status?: "authorized" | "paused" | "cancelled"
    preapproval_plan_id?: string
  }
) {
  return mercadoPagoRequest<MercadoPagoPreapproval>(`/preapproval/${preapprovalId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export function mapMercadoPagoStatus(status?: string | null) {
  switch (status) {
    case "authorized":
      return "activa"
    case "paused":
      return "pausada"
    case "cancelled":
      return "cancelada"
    default:
      return "pendiente"
  }
}

export function getPlanKeyFromMercadoPagoPlanId(preapprovalPlanId?: string | null) {
  if (!preapprovalPlanId) return null
  return planIdToKey[preapprovalPlanId] || null
}

export function parseExternalReference(reference?: string | null) {
  if (!reference) return null

  const [type, idRaw] = reference.split(":")
  const id = Number(idRaw)

  if (!type || !idRaw || Number.isNaN(id)) return null
  if (type !== "comercio" && type !== "servicio" && type !== "curso") return null

  return {
    type,
    id,
  } as const
}

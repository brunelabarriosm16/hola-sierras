'use client'

import { logAdminActivity } from "./adminActivity"
import { buildShareCountMap } from "./shareTracking"
import { buildWhatsappCountMap } from "./whatsappTracking"
import { supabase } from "../supabase"

export type AdminContentSection =
  | "Comercios"
  | "Cursos"
  | "Eventos"
  | "Destacados"
  | "Instituciones"
  | "Servicios"

export type AdminContentMetricSection =
  | "comercios"
  | "cursos"
  | "eventos"
  | "instituciones"
  | "servicios"

export type AdminContentState = "activo" | "borrador" | "oculto" | string | null | undefined

type AdminContentItem = {
  id: number
  share_count?: number
  whatsapp_count?: number
}

export async function fetchAdminEngagementMetrics(
  section: AdminContentMetricSection,
  label: string
) {
  const [
    { data: shareRows, error: shareError },
    { data: whatsappRows, error: whatsappError },
  ] = await Promise.all([
    supabase.from("share_events").select("item_id").eq("section", section),
    supabase.from("whatsapp_clicks").select("item_id").eq("section", section),
  ])

  const warnings: string[] = []
  if (shareError) {
    warnings.push(`No se pudieron cargar los compartidos de ${label}: ${shareError.message}`)
  }

  if (whatsappError) {
    warnings.push(`No se pudieron cargar los clics de WhatsApp de ${label}: ${whatsappError.message}`)
  }

  return {
    shareMap: buildShareCountMap(shareRows || []),
    whatsappMap: buildWhatsappCountMap(whatsappRows || []),
    warning: warnings.join(" "),
  }
}

export function mergeAdminEngagement<T extends AdminContentItem>(
  items: T[],
  shareMap: Record<string, number>,
  whatsappMap: Record<string, number>
): T[] {
  return items.map((item) => ({
    ...item,
    share_count: shareMap[String(item.id)] || 0,
    whatsapp_count: whatsappMap[String(item.id)] || 0,
  }))
}

export function getNextContentState(estado: AdminContentState) {
  return estado === "oculto" || estado === "borrador" ? "activo" : "oculto"
}

export function getVisibilityActivityAction(
  currentState: AdminContentState,
  nextState: string
) {
  if (nextState !== "activo") return "Ocultar"
  return currentState === "borrador" ? "Publicar borrador" : "Mostrar"
}

export function getContentStateLabel(estado: AdminContentState) {
  if (estado === "borrador") return "borrador"
  if (estado === "oculto") return "oculto"
  return "visible"
}

export function getContentStateBadgeClass(estado: AdminContentState) {
  if (estado === "borrador") return "bg-amber-100 text-amber-700"
  if (estado === "oculto") return "bg-slate-200 text-slate-700"
  return "bg-emerald-50 text-emerald-700"
}

export async function safeLogAdminActivity(input: {
  action: string
  section: AdminContentSection
  target?: string | null
  details?: string | null
}) {
  try {
    await logAdminActivity(input)
  } catch {
    // El registro de actividad no debe bloquear la tarea administrativa principal.
  }
}

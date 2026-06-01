"use client"

import {
  Building2,
  Facebook,
  Globe,
  Instagram,
  MapPin,
  MessageSquareText,
  Phone,
  Sparkles,
} from "lucide-react"
import type { SubscriptionPlanKey } from "./subscriptionPlans"
import { supabase } from "../supabase"

export type UserEntityType = "comercio" | "servicio" | "curso" | "institucion"

export type UserEntityRecord = {
  id: number
  nombre: string
  descripcion?: string | null
  premium_detalle?: string | null
  premium_galeria?: string[] | null
  premium_extra_titulo?: string | null
  premium_extra_detalle?: string | null
  premium_extra_galeria?: string[] | null
  premium_activo?: boolean | null
  plan_suscripcion?: SubscriptionPlanKey | null
  estado_suscripcion?: string | null
  suscripcion_actualizada_at?: string | null
  mp_preapproval_id?: string | null
  created_at?: string | null
  direccion?: string | null
  localidad?: string | null
  telefono?: string | null
  imagen?: string | null
  imagen_url?: string | null
  foto?: string | null
  categoria?: string | null
  responsable?: string | null
  contacto?: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
  owner_email?: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
}

export type UserOwnedEntity = {
  type: UserEntityType
  record: UserEntityRecord
}

export type UserOwnedEvent = {
  id: number
  titulo: string
  categoria?: string | null
  fecha: string
  fecha_fin?: string | null
  fecha_solo_mes?: boolean | null
  ubicacion: string
  telefono?: string | null
  descripcion: string
  imagen?: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
  owner_email?: string | null
  related_entity_type?: UserEntityType | null
  related_entity_id?: number | null
}

export type SorteoParticipant = {
  id: number
  evento_id: number
  evento_titulo?: string | null
  nombre: string
  telefono: string
  created_at?: string | null
}

const entityConfigs: Array<{
  type: UserEntityType
  table: "comercios" | "servicios" | "cursos" | "instituciones"
}> = [
  { type: "comercio", table: "comercios" },
  { type: "servicio", table: "servicios" },
  { type: "curso", table: "cursos" },
  { type: "institucion", table: "instituciones" },
]

export const userEntityLabels: Record<UserEntityType, string> = {
  comercio: "Comercio",
  servicio: "Servicio",
  curso: "Curso o clase",
  institucion: "Institucion",
}

export const userEntityStatusCopy = {
  activo: {
    label: "Activa",
    badge: "bg-emerald-100 text-emerald-800",
    panel: "border-emerald-200 bg-emerald-50/70",
    accent: "text-emerald-700",
    description: "Tu perfil ya esta visible en Hola Varela.",
  },
  borrador: {
    label: "En revision",
    badge: "bg-amber-100 text-amber-800",
    panel: "border-amber-200 bg-amber-50/70",
    accent: "text-amber-700",
    description: "Tu perfil fue cargado y esta esperando revision.",
  },
  oculto: {
    label: "Pausada",
    badge: "bg-slate-200 text-slate-700",
    panel: "border-slate-200 bg-slate-100",
    accent: "text-slate-700",
    description: "Tu perfil esta guardado, pero no se muestra publicamente.",
  },
} as const

export function supportsPremiumProfile(type: UserEntityType) {
  return type === "comercio" || type === "servicio"
}

export function normalizeUserEntityStatus(status?: string | null) {
  if (status === "oculto") return "oculto"
  if (status === "borrador") return "borrador"
  return "activo"
}

export function getUserProfileTable(type: UserEntityType) {
  switch (type) {
    case "comercio":
      return "comercios"
    case "servicio":
      return "servicios"
    case "curso":
      return "cursos"
    case "institucion":
      return "instituciones"
  }
}

export function getUserProfileImageSrc(entity: UserOwnedEntity | null) {
  if (!entity) return null

  return entity.record.imagen_url || entity.record.imagen || entity.record.foto || null
}

export function buildUserProfileFields(entity: UserOwnedEntity | null) {
  if (!entity) return []

  return [
    entity.record.direccion
      ? { label: "Direccion", value: entity.record.direccion, icon: MapPin }
      : null,
    entity.record.localidad
      ? { label: "Localidad", value: entity.record.localidad, icon: MapPin }
      : null,
    entity.record.telefono || entity.record.contacto
      ? {
          label: "Contacto",
          value: entity.record.telefono || entity.record.contacto || "",
          icon: Phone,
        }
      : null,
    entity.record.responsable
      ? {
          label: "Responsable",
          value: entity.record.responsable,
          icon: MessageSquareText,
        }
      : null,
    entity.record.categoria
      ? { label: "Categoria", value: entity.record.categoria, icon: Sparkles }
      : null,
    entity.record.web_url
      ? { label: "Sitio web", value: entity.record.web_url, icon: Globe }
      : null,
    entity.record.instagram_url
      ? { label: "Instagram", value: entity.record.instagram_url, icon: Instagram }
      : null,
    entity.record.facebook_url
      ? { label: "Facebook", value: entity.record.facebook_url, icon: Facebook }
      : null,
    {
      label: "Tipo de ficha",
      value: userEntityLabels[entity.type],
      icon: Building2,
    },
  ].filter(Boolean) as Array<{
    label: string
    value: string
    icon: typeof MapPin
  }>
}

export async function findUserOwnedEntity(email: string): Promise<UserOwnedEntity | null> {
  for (const config of entityConfigs) {
    const { data, error } = await supabase
      .from(config.table)
      .select("*")
      .eq("owner_email", email)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    if (data) {
      return {
        type: config.type,
        record: data as UserEntityRecord,
      }
    }
  }

  return null
}

export async function fetchUserOwnedEntities(email: string): Promise<UserOwnedEntity[]> {
  const results = await Promise.all(
    entityConfigs.map(async (config) => {
      const { data, error } = await supabase
        .from(config.table)
        .select("*")
        .eq("owner_email", email)
        .order("id", { ascending: false })

      if (error) throw error

      return (data || []).map((record) => ({
        type: config.type,
        record: record as UserEntityRecord,
      }))
    })
  )

  return results.flat()
}

export async function fetchUserOwnedEvents(email: string) {
  const { data, error } = await supabase
    .from("eventos")
    .select("*")
    .eq("owner_email", email)
    .order("fecha", { ascending: false })

  if (error) throw error

  return (data || []) as UserOwnedEvent[]
}

export async function fetchSorteoParticipants(eventIds: number[]) {
  if (eventIds.length === 0) return []

  const { data, error } = await supabase
    .from("sorteo_participantes")
    .select("*")
    .in("evento_id", eventIds)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data || []) as SorteoParticipant[]
}

'use client'

import { supabase } from "../supabase"
import { getAdminSession } from "./adminAuth"

type AdminActivityInput = {
  action: string
  section: string
  target?: string | null
  details?: string | null
}

export async function logAdminActivity(input: AdminActivityInput) {
  const session = getAdminSession()
  if (!session) return

  await supabase.from("admin_actividad").insert([
    {
      admin_username: session.username,
      admin_nombre: session.name,
      admin_rol: session.role,
      accion: input.action,
      seccion: input.section,
      objetivo: input.target || null,
      detalle: input.details || null,
    },
  ])
}

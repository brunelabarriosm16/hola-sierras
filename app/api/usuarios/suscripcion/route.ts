import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"
import { subscriptionPlans, type SubscriptionPlanKey } from "../../../lib/subscriptionPlans"
import { updateMercadoPagoPreapproval } from "../../../lib/mercadoPago"

type EntityType = "comercio" | "servicio" | "curso"
type EntityTable = "comercios" | "servicios" | "cursos"

type ActionPayload =
  | { action: "save_plan"; planKey: SubscriptionPlanKey }
  | { action: "cancel_subscription" }

function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error("Faltan variables de entorno de Supabase.")
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function getAuthenticatedEmail(request: Request) {
  const authHeader = request.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (!token) return null

  const serverSupabase = getServerSupabase()
  const {
    data: { user },
    error,
  } = await serverSupabase.auth.getUser(token)

  if (error || !user?.email) return null
  return user.email
}

async function findOwnedEntity(email: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const configs: Array<{ type: EntityType; table: EntityTable }> = [
    { type: "comercio", table: "comercios" },
    { type: "servicio", table: "servicios" },
    { type: "curso", table: "cursos" },
  ]

  for (const config of configs) {
    const { data, error } = await supabaseAdmin
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
        table: config.table,
        record: data,
      }
    }
  }

  return null
}

export async function POST(request: Request) {
  try {
    const email = await getAuthenticatedEmail(request)

    if (!email) {
      return NextResponse.json({ error: "Sesion no valida." }, { status: 401 })
    }

    const body = (await request.json()) as Partial<ActionPayload>
    const action = body.action

    if (!action) {
      return NextResponse.json({ error: "Falta la accion a ejecutar." }, { status: 400 })
    }

    const ownedEntity = await findOwnedEntity(email)
    if (!ownedEntity) {
      return NextResponse.json({ error: "No encontramos una ficha vinculada a esta cuenta." }, { status: 404 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const changedAt = new Date().toISOString()

    if (action === "save_plan") {
      const planKey = body.planKey

      if (!planKey || !subscriptionPlans[planKey]) {
        return NextResponse.json({ error: "Plan invalido." }, { status: 400 })
      }

      let syncedWithMercadoPago = false

      if (ownedEntity.record.mp_preapproval_id) {
        await updateMercadoPagoPreapproval(ownedEntity.record.mp_preapproval_id, {
          preapproval_plan_id: subscriptionPlans[planKey].preapprovalPlanId,
        })
        syncedWithMercadoPago = true
      }

      const { data: updatedRecord, error: updateError } = await supabaseAdmin
        .from(ownedEntity.table)
        .update({
          plan_suscripcion: planKey,
          premium_activo:
            ownedEntity.record.estado_suscripcion === "activa" && planKey === "destacado_plus",
          suscripcion_actualizada_at: changedAt,
        })
        .eq("id", ownedEntity.record.id)
        .select("*")
        .maybeSingle()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        ok: true,
        action,
        syncedWithMercadoPago,
        record: updatedRecord,
      })
    }

    if (action === "cancel_subscription") {
      let syncedWithMercadoPago = false

      if (ownedEntity.record.mp_preapproval_id) {
        await updateMercadoPagoPreapproval(ownedEntity.record.mp_preapproval_id, {
          status: "cancelled",
        })
        syncedWithMercadoPago = true
      }

      const { data: updatedRecord, error: updateError } = await supabaseAdmin
        .from(ownedEntity.table)
        .update({
          estado_suscripcion: "cancelada",
          estado: "oculto",
          premium_activo: false,
          suscripcion_actualizada_at: changedAt,
        })
        .eq("id", ownedEntity.record.id)
        .select("*")
        .maybeSingle()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      const { error: eventsError } = await supabaseAdmin
        .from("eventos")
        .update({ estado: "oculto" })
        .eq("owner_email", email)
        .neq("estado", "cancelado")

      if (eventsError) {
        return NextResponse.json({ error: eventsError.message }, { status: 500 })
      }

      return NextResponse.json({
        ok: true,
        action,
        syncedWithMercadoPago,
        record: updatedRecord,
      })
    }

    return NextResponse.json({ error: "Accion no soportada." }, { status: 400 })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos gestionar la suscripcion."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

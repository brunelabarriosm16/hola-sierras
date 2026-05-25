import { NextResponse } from "next/server"
import { checkWhatsAppVerification } from "../../../../../lib/twilioVerify"
import {
  createRecoveryToken,
  registerRecoveryAttempt,
} from "../../../../../lib/passwordRecovery"
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin"

function getClientMeta(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null,
    userAgent: request.headers.get("user-agent"),
  }
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { email, code } = (await request.json()) as {
      email?: string
      code?: string
    }
    const normalizedEmail = email?.trim().toLowerCase() || ""
    const normalizedCode = code?.trim() || ""
    const clientMeta = getClientMeta(request)

    if (!normalizedEmail || !normalizedCode) {
      return NextResponse.json(
        { error: "Ingresa tu email y el codigo de WhatsApp." },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("usuarios_registrados")
      .select(
        "user_id, email, phone_e164, phone_verified_at, whatsapp_recovery_enabled"
      )
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (error) throw error

    if (
      !data?.user_id ||
      !data.phone_e164 ||
      !data.phone_verified_at ||
      !data.whatsapp_recovery_enabled
    ) {
      return NextResponse.json(
        { error: "Esta cuenta no tiene recuperacion por WhatsApp habilitada." },
        { status: 400 }
      )
    }

    const verification = await checkWhatsAppVerification(data.phone_e164, normalizedCode)

    if (verification.status !== "approved") {
      await registerRecoveryAttempt({
        supabaseAdmin,
        userId: data.user_id,
        email: data.email,
        phoneE164: data.phone_e164,
        status: "failed",
        ...clientMeta,
      })

      return NextResponse.json(
        { error: "El codigo no es valido o ya vencio." },
        { status: 400 }
      )
    }

    await registerRecoveryAttempt({
      supabaseAdmin,
      userId: data.user_id,
      email: data.email,
      phoneE164: data.phone_e164,
      status: "approved",
      ...clientMeta,
    })

    return NextResponse.json({
      ok: true,
      token: createRecoveryToken(data.user_id, data.email),
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos validar el codigo en este momento."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

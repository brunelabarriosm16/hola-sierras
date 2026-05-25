import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin"
import { registerRecoveryAttempt } from "../../../../../lib/passwordRecovery"
import { startWhatsAppVerification } from "../../../../../lib/twilioVerify"

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
    const { email } = (await request.json()) as { email?: string }
    const normalizedEmail = email?.trim().toLowerCase() || ""
    const clientMeta = getClientMeta(request)

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Ingresa el email con el que accedes a tu cuenta." },
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

    const genericMessage =
      "Si la cuenta tiene recuperacion por WhatsApp activa, te enviamos un codigo."

    if (
      !data?.user_id ||
      !data.phone_e164 ||
      !data.phone_verified_at ||
      !data.whatsapp_recovery_enabled
    ) {
      return NextResponse.json({ ok: true, message: genericMessage })
    }

    await startWhatsAppVerification(data.phone_e164)
    await registerRecoveryAttempt({
      supabaseAdmin,
      userId: data.user_id,
      email: data.email,
      phoneE164: data.phone_e164,
      status: "requested",
      ...clientMeta,
    })

    return NextResponse.json({ ok: true, message: genericMessage })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos iniciar la recuperacion por WhatsApp."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import {
  registerRecoveryAttempt,
  verifyRecoveryToken,
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
    const { token, password } = (await request.json()) as {
      token?: string
      password?: string
    }
    const nextPassword = password || ""
    const clientMeta = getClientMeta(request)

    if (!token || !nextPassword) {
      return NextResponse.json(
        { error: "Faltan datos para cambiar la contrasena." },
        { status: 400 }
      )
    }

    if (nextPassword.length < 6) {
      return NextResponse.json(
        { error: "La nueva contrasena debe tener al menos 6 caracteres." },
        { status: 400 }
      )
    }

    const payload = verifyRecoveryToken(token)
    const { error } = await supabaseAdmin.auth.admin.updateUserById(payload.userId, {
      password: nextPassword,
    })

    if (error) throw error

    await registerRecoveryAttempt({
      supabaseAdmin,
      userId: payload.userId,
      email: payload.email,
      status: "reset_completed",
      ...clientMeta,
    })

    return NextResponse.json({
      ok: true,
      message: "Tu contrasena fue actualizada. Ya puedes volver a entrar.",
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos cambiar la contrasena."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

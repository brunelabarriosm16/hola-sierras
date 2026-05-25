import { createHmac, timingSafeEqual } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

type RecoveryTokenPayload = {
  userId: string
  email: string
  exp: number
}

const TOKEN_TTL_MS = 15 * 60 * 1000

function getRecoverySecret() {
  const secret = process.env.PASSWORD_RECOVERY_SECRET

  if (!secret) {
    throw new Error(
      "Falta PASSWORD_RECOVERY_SECRET. Configura esa variable para habilitar la recuperacion por WhatsApp."
    )
  }

  return secret
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8")
}

function signSegment(segment: string) {
  return createHmac("sha256", getRecoverySecret()).update(segment).digest("base64url")
}

export function createRecoveryToken(userId: string, email: string) {
  const payload: RecoveryTokenPayload = {
    userId,
    email,
    exp: Date.now() + TOKEN_TTL_MS,
  }

  const payloadSegment = toBase64Url(JSON.stringify(payload))
  const signature = signSegment(payloadSegment)

  return `${payloadSegment}.${signature}`
}

export function verifyRecoveryToken(token: string) {
  const [payloadSegment, providedSignature] = token.split(".")

  if (!payloadSegment || !providedSignature) {
    throw new Error("El enlace de recuperacion no es valido.")
  }

  const expectedSignature = signSegment(payloadSegment)
  const providedBuffer = Buffer.from(providedSignature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error("No pudimos validar el token de recuperacion.")
  }

  const payload = JSON.parse(fromBase64Url(payloadSegment)) as RecoveryTokenPayload

  if (!payload.userId || !payload.email || !payload.exp) {
    throw new Error("El token de recuperacion esta incompleto.")
  }

  if (payload.exp < Date.now()) {
    throw new Error("El codigo de recuperacion vencio. Solicita uno nuevo.")
  }

  return payload
}

export async function registerRecoveryAttempt({
  supabaseAdmin,
  userId,
  email,
  phoneE164,
  status,
  ipAddress,
  userAgent,
}: {
  supabaseAdmin: SupabaseClient
  userId?: string | null
  email?: string | null
  phoneE164?: string | null
  status: "requested" | "approved" | "failed" | "expired" | "reset_completed"
  ipAddress?: string | null
  userAgent?: string | null
}) {
  const { error } = await supabaseAdmin.from("password_recovery_attempts").insert([
    {
      user_id: userId || null,
      email: email || null,
      phone_e164: phoneE164 || null,
      channel: "whatsapp",
      status,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    },
  ])

  if (error) {
    console.warn("No pudimos registrar password_recovery_attempts:", error.message)
  }
}

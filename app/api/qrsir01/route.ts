import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

function isSameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin
}

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin().from("qr_links").select("*").order("created_at", { ascending: false })
    if (error) throw error
    return NextResponse.json({ links: data }, { headers: { "Cache-Control": "private, no-store" } })
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar los QR. Revisá la configuración y la migración de la base de datos." }, { status: 503 })
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Origen inválido." }, { status: 403 })
  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  let destination: URL
  try {
    if (typeof body?.destination !== "string" || body.destination.length > 2048) throw new Error()
    destination = new URL(body.destination)
    if (!["https:", "http:"].includes(destination.protocol) || destination.username || destination.password) throw new Error()
  } catch {
    return NextResponse.json({ error: "Ingresá un enlace completo que empiece con https:// o http://." }, { status: 400 })
  }
  if (!name || name.length > 100) return NextResponse.json({ error: "El nombre debe tener entre 1 y 100 caracteres." }, { status: 400 })
  const stores: { android_destination?: string; iphone_destination?: string } = {}
  if (body.mode === "stores") {
    try {
      for (const key of ["android_destination", "iphone_destination"] as const) {
        if (typeof body[key] !== "string" || body[key].length > 2048) throw new Error()
        const url = new URL(body[key])
        const host = key === "android_destination" ? "play.google.com" : "apps.apple.com"
        if (url.protocol !== "https:" || url.hostname !== host || url.username || url.password) throw new Error()
        stores[key] = url.href
      }
    } catch {
      return NextResponse.json({ error: "Ingresá los enlaces HTTPS de Google Play (play.google.com) y App Store (apps.apple.com)." }, { status: 400 })
    }
  }
  try {
    const { data, error } = await getSupabaseAdmin().from("qr_links").insert({ id: randomUUID(), name, destination: destination.href, ...stores }).select("*").single()
    if (error) throw error
    return NextResponse.json({ link: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "No se pudo guardar el QR. Revisá la configuración de la base de datos." }, { status: 503 })
  }
}

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin"

export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" }

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return new NextResponse("QR inexistente.", { status: 404, headers })
  try {
    const supabase = getSupabaseAdmin()
    // Skip known previews and prefetch requests; they do not represent a visit.
    const preview = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|slack/i.test(request.headers.get("user-agent") || "") || /prefetch/i.test(`${request.headers.get("purpose")} ${request.headers.get("sec-purpose")}`)
    const agent = request.headers.get("user-agent") || ""
    const device = /android/i.test(agent) ? "android" : /iphone|ipad|ipod/i.test(agent) ? "iphone" : "other"
    let link: { destination: string; android_destination: string | null; iphone_destination: string | null } | null
    if (preview) {
      const { data, error } = await supabase.from("qr_links").select("destination,android_destination,iphone_destination").eq("id", id).maybeSingle()
      if (error) throw error
      link = data
    } else {
      const { data, error } = await supabase.rpc("register_qr_open", { link_id: id, device_type: device })
      if (error) throw error
      link = data
    }
    if (!link) return new NextResponse("QR inexistente.", { status: 404, headers })
    let destination = link.destination
    if (link.android_destination && link.iphone_destination) {
      if (device === "android") destination = link.android_destination
      else if (device === "iphone") destination = link.iphone_destination
      else return NextResponse.redirect(new URL(`/q/${id}/tiendas`, request.url), { status: 302, headers })
    }
    const target = new URL(destination)
    if (!["https:", "http:"].includes(target.protocol)) throw new Error()
    return NextResponse.redirect(target, { status: 302, headers })
  } catch {
    return new NextResponse("No se pudo abrir el enlace. Intentá nuevamente en unos momentos.", { status: 503, headers })
  }
}

// Next.js otherwise implements HEAD by calling GET, which would count probes.
export async function HEAD() {
  return new NextResponse(null, { status: 200, headers })
}

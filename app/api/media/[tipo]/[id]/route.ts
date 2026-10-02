import { NextResponse } from "next/server"
import { supabaseServer } from "../../../../lib/supabaseServer"

export async function GET(_request: Request, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  const { tipo, id } = await params
  if (!/^\d+$/.test(id) || !["comercio", "servicio"].includes(tipo)) {
    return new NextResponse(null, { status: 404 })
  }

  const { data, error } = tipo === "comercio"
    ? await supabaseServer.from("comercios").select("imagen, imagen_url").eq("id", id).or("estado.is.null,estado.eq.activo").maybeSingle()
    : await supabaseServer.from("servicios").select("imagen").eq("id", id).or("estado.is.null,estado.eq.activo").maybeSingle()
  if (error) return new NextResponse(null, { status: 503 })
  const source = (data && ("imagen_url" in data ? data.imagen_url || data.imagen : data.imagen))?.trim()
  if (!source) return new NextResponse(null, { status: 404 })
  if (/^https?:\/\//i.test(source)) return NextResponse.redirect(source)

  const match = source.match(/^data:(image\/(?:png|jpe?g|webp|gif|avif));base64,([A-Za-z0-9+/=\s]+)$/i)
  if (!match) return new NextResponse(null, { status: 404 })
  return new NextResponse(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

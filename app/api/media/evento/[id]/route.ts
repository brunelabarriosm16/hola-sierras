import { NextResponse } from "next/server"
import { supabaseServer } from "../../../../lib/supabaseServer"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await supabaseServer.from("eventos").select("imagen").eq("id", id).maybeSingle()
  const source = data?.imagen?.trim()
  if (!source) return new NextResponse(null, { status: 404 })

  if (/^https?:\/\//i.test(source)) return NextResponse.redirect(source)

  const match = source.match(/^data:([^;,]+);base64,([\s\S]+)$/)
  if (!match) return new NextResponse(null, { status: 404 })

  try {
    const bytes = Buffer.from(match[2], "base64")
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": match[1],
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}

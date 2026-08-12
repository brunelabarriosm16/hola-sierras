import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { avisoId?: unknown }
    const avisoId = Number(body.avisoId)

    if (!Number.isSafeInteger(avisoId) || avisoId <= 0) {
      return NextResponse.json({ error: "Aviso inválido." }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error: rpcError } = await supabaseAdmin.rpc(
      "registrar_aparicion_aviso_destacado",
      { aviso_id: avisoId }
    )

    if (!rpcError) {
      return NextResponse.json({ counted: true })
    }

    // Compatibilidad para instalaciones donde todavía no se aplicó la función SQL.
    const { data: aviso, error: readError } = await supabaseAdmin
      .from("avisos_destacados")
      .select("id, activo, apariciones")
      .eq("id", avisoId)
      .maybeSingle()

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 })
    }

    if (!aviso || !aviso.activo) {
      return NextResponse.json({ counted: false })
    }

    const nextCount = Number(aviso.apariciones || 0) + 1
    const { error: updateError } = await supabaseAdmin
      .from("avisos_destacados")
      .update({ apariciones: nextCount })
      .eq("id", avisoId)
      .eq("activo", true)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ counted: true, apariciones: nextCount })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar la aparición."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

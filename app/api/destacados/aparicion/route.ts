import { NextResponse } from "next/server"
import { supabaseServer } from "../../../lib/supabaseServer"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { avisoId?: unknown }
    const avisoId = Number(body.avisoId)

    if (!Number.isSafeInteger(avisoId) || avisoId <= 0) {
      return NextResponse.json({ error: "Aviso inválido." }, { status: 400 })
    }

    const { error } = await supabaseServer.rpc(
      "registrar_aparicion_aviso_destacado",
      { aviso_id: avisoId }
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ counted: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar la aparición."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

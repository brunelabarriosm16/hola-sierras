import { NextResponse } from "next/server"
import { supabaseServer } from "../../../lib/supabaseServer"

type CursoPayload = {
  id?: number | null
  nombre?: string
  descripcion?: string
  responsable?: string
  contacto?: string
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen?: string | null
  destacado?: boolean
  estado?: string
  usa_whatsapp?: boolean
}

function cleanText(value?: string | null) {
  return value?.trim() || ""
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CursoPayload
    const id = body.id ? Number(body.id) : null
    const nombre = cleanText(body.nombre)
    const descripcion = cleanText(body.descripcion)
    const responsable = cleanText(body.responsable)
    const contacto = cleanText(body.contacto)

    if (!nombre || !descripcion || !responsable) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios para guardar el curso." },
        { status: 400 }
      )
    }

    const payload = {
      nombre,
      descripcion,
      responsable,
      contacto,
      web_url: cleanText(body.web_url) || null,
      instagram_url: cleanText(body.instagram_url) || null,
      facebook_url: cleanText(body.facebook_url) || null,
      imagen: body.imagen || null,
      destacado: body.destacado ?? false,
      estado: body.estado || "activo",
      usa_whatsapp: contacto ? body.usa_whatsapp ?? true : false,
    }

    const query = id
      ? supabaseServer.from("cursos").update(payload).eq("id", id)
      : supabaseServer.from("cursos").insert([payload])

    const { error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos guardar el curso en este momento."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

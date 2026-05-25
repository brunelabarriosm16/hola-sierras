import { NextResponse } from "next/server"
import { ADMIN_DEFAULT_CREDENTIALS } from "../../../lib/adminAuth"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

type OwnerType = "comercio" | "servicio" | "curso" | "institucion"

type CreateUserPayload = {
  email?: string
  password?: string
  adminUsername?: string
  adminPassword?: string
  ownerType?: OwnerType | ""
  ownerId?: number | null
}

function resolveTable(ownerType: OwnerType) {
  switch (ownerType) {
    case "comercio":
      return "comercios"
    case "servicio":
      return "servicios"
    case "curso":
      return "cursos"
    case "institucion":
      return "instituciones"
  }
}

async function validateAdminCredentials(username: string, password: string) {
  const supabaseAdmin = getSupabaseAdmin()

  if (
    username === ADMIN_DEFAULT_CREDENTIALS.username &&
    password === ADMIN_DEFAULT_CREDENTIALS.password
  ) {
    return { valid: true }
  }

  const { data, error } = await supabaseAdmin
    .from("administradores")
    .select("usuario, contrasena, activo")
    .eq("usuario", username)
    .eq("activo", true)
    .maybeSingle()

  if (error) throw error

  return {
    valid: Boolean(data && data.contrasena === password),
  }
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = (await request.json()) as CreateUserPayload
    const email = body.email?.trim().toLowerCase() || ""
    const password = body.password || ""
    const adminUsername = body.adminUsername?.trim() || ""
    const adminPassword = body.adminPassword || ""
    const ownerType = body.ownerType || ""
    const ownerId = body.ownerId ? Number(body.ownerId) : null
    const hasLinkedOwner = Boolean(ownerType && ownerId)
    const linkedOwnerType = hasLinkedOwner ? (ownerType as OwnerType) : null

    if (!email || !password || !adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: "Faltan datos para crear el usuario." },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contrasena debe tener al menos 6 caracteres." },
        { status: 400 }
      )
    }

    if (!ownerType && ownerId) {
      return NextResponse.json(
        { error: "La asignacion del perfil quedo incompleta." },
        { status: 400 }
      )
    }

    const adminValidation = await validateAdminCredentials(adminUsername, adminPassword)
    if (!adminValidation.valid) {
      return NextResponse.json(
        { error: "La contrasena del administrador no es valida." },
        { status: 401 }
      )
    }

    if (linkedOwnerType && ownerId) {
      const table = resolveTable(linkedOwnerType)
      const { data: ownerData, error: ownerError } = await supabaseAdmin
        .from(table)
        .select("id, owner_email")
        .eq("id", ownerId)
        .maybeSingle()

      if (ownerError) throw ownerError

      if (!ownerData) {
        return NextResponse.json(
          { error: "No encontramos el perfil seleccionado." },
          { status: 404 }
        )
      }

      if (ownerData.owner_email && ownerData.owner_email !== email) {
        return NextResponse.json(
          { error: "Ese perfil ya esta vinculado a otra cuenta." },
          { status: 409 }
        )
      }
    }

    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !createdUser.user) {
      return NextResponse.json(
        { error: createError?.message || "No pudimos crear el usuario en Auth." },
        { status: 400 }
      )
    }

    try {
      const { error: registeredError } = await supabaseAdmin
        .from("usuarios_registrados")
        .upsert(
          {
            user_id: createdUser.user.id,
            email,
          },
          { onConflict: "email" }
        )

      if (registeredError) throw registeredError

      if (linkedOwnerType && ownerId) {
        const table = resolveTable(linkedOwnerType)
        const { error: ownerUpdateError } = await supabaseAdmin
          .from(table)
          .update({ owner_email: email })
          .eq("id", ownerId)

        if (ownerUpdateError) throw ownerUpdateError
      }
    } catch (persistenceError) {
      await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id)
      throw persistenceError
    }

    return NextResponse.json({
      ok: true,
      userId: createdUser.user.id,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos crear el usuario en este momento."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

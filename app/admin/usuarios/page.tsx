'use client'

import { useEffect, useMemo, useState } from "react"
import { Link2, Mail, Plus, Search, UserRound, X } from "lucide-react"
import { supabase } from "../../supabase"
import { getAdminSession } from "../../lib/adminAuth"
import { logAdminActivity } from "../../lib/adminActivity"

type OwnerType = "comercio" | "servicio" | "curso" | "institucion"

type UsuarioRegistrado = {
  id: number
  user_id: string | null
  email: string
  created_at: string | null
}

type OwnerOption = {
  id: number
  nombre: string
  owner_email?: string | null
}

type UserForm = {
  email: string
  password: string
  ownerType: OwnerType | ""
  ownerId: string
  adminPassword: string
}

const initialForm: UserForm = {
  email: "",
  password: "",
  ownerType: "",
  ownerId: "",
  adminPassword: "",
}

const ownerTypeLabels: Record<OwnerType, string> = {
  comercio: "Comercio",
  servicio: "Servicio",
  curso: "Curso o clase",
  institucion: "Institucion",
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioRegistrado[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<UserForm>(initialForm)
  const [ownerOptions, setOwnerOptions] = useState<Record<OwnerType, OwnerOption[]>>({
    comercio: [],
    servicio: [],
    curso: [],
    institucion: [],
  })

  const adminSession = getAdminSession()

  const cargarUsuarios = async () => {
    const { data, error: loadError } = await supabase
      .from("usuarios_registrados")
      .select("*")
      .order("created_at", { ascending: false })

    if (loadError) {
      setError(`Error al cargar usuarios: ${loadError.message}`)
      setLoading(false)
      return
    }

    setUsuarios((data || []) as UsuarioRegistrado[])
    setLoading(false)
  }

  const cargarOpciones = async () => {
    const [
      comerciosResult,
      serviciosResult,
      cursosResult,
      institucionesResult,
    ] = await Promise.all([
      supabase.from("comercios").select("id, nombre, owner_email").order("nombre", { ascending: true }),
      supabase.from("servicios").select("id, nombre, owner_email").order("nombre", { ascending: true }),
      supabase.from("cursos").select("id, nombre, owner_email").order("nombre", { ascending: true }),
      supabase.from("instituciones").select("id, nombre, owner_email").order("nombre", { ascending: true }),
    ])

    const firstError =
      comerciosResult.error ||
      serviciosResult.error ||
      cursosResult.error ||
      institucionesResult.error

    if (firstError) {
      setError(`Error al cargar perfiles para asignar: ${firstError.message}`)
      return
    }

    setOwnerOptions({
      comercio: (comerciosResult.data || []) as OwnerOption[],
      servicio: (serviciosResult.data || []) as OwnerOption[],
      curso: (cursosResult.data || []) as OwnerOption[],
      institucion: (institucionesResult.data || []) as OwnerOption[],
    })
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void Promise.all([cargarUsuarios(), cargarOpciones()])
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const ownerByEmail = useMemo(() => {
    const map = new Map<string, string>()

    ;(Object.keys(ownerOptions) as OwnerType[]).forEach((type) => {
      ownerOptions[type].forEach((item) => {
        if (item.owner_email) {
          map.set(item.owner_email.toLowerCase(), `${ownerTypeLabels[type]}: ${item.nombre}`)
        }
      })
    })

    return map
  }, [ownerOptions])

  const usuariosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return usuarios

    return usuarios.filter((usuario) => {
      const assignment = ownerByEmail.get(usuario.email.toLowerCase()) || ""
      return `${usuario.email} ${usuario.user_id || ""} ${assignment}`.toLowerCase().includes(term)
    })
  }, [ownerByEmail, search, usuarios])

  const selectedOwnerOptions = formData.ownerType ? ownerOptions[formData.ownerType] : []

  const resetForm = () => {
    setFormData(initialForm)
    setIsFormOpen(false)
    setError("")
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSaving(true)

    if (!adminSession?.username) {
      setError("No encontramos la sesion admin actual.")
      setSaving(false)
      return
    }

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        ownerType: formData.ownerType || null,
        ownerId: formData.ownerId ? Number(formData.ownerId) : null,
        adminUsername: adminSession.username,
        adminPassword: formData.adminPassword,
      }),
    })

    const result = (await response.json()) as { error?: string }

    if (!response.ok) {
      setError(result.error || "No pudimos crear el usuario.")
      setSaving(false)
      return
    }

    await logAdminActivity({
      action: "Crear usuario",
      section: "Usuarios",
      target: formData.email,
      details: formData.ownerType && formData.ownerId
        ? `${ownerTypeLabels[formData.ownerType]} ID ${formData.ownerId}`
        : "Sin perfil asignado al crear",
    })

    await Promise.all([cargarUsuarios(), cargarOpciones()])
    resetForm()
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">Usuarios registrados</h1>
          <p className="text-slate-500">
            Crea cuentas desde admin y vincula, si quieres, un comercio, servicio, curso o institucion desde el primer dia.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500"
        >
          <Plus className="h-5 w-5" />
          Crear usuario
        </button>
      </div>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Nuevo usuario</h2>
                <p className="mt-1 text-sm text-slate-500">
                  La cuenta se crea en Supabase Auth y puede quedar vinculada a un perfil existente.
                </p>
              </div>

              <button
                onClick={resetForm}
                className="text-slate-500 transition hover:text-slate-900"
                aria-label="Cerrar formulario"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, email: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">Contrasena</label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, password: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-sm font-medium text-slate-900">Asignacion opcional</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Tipo de perfil</label>
                    <select
                      value={formData.ownerType}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          ownerType: event.target.value as OwnerType | "",
                          ownerId: "",
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    >
                      <option value="">Sin asignar</option>
                      <option value="comercio">Comercio</option>
                      <option value="servicio">Servicio</option>
                      <option value="curso">Curso o clase</option>
                      <option value="institucion">Institucion</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Perfil</label>
                    <select
                      value={formData.ownerId}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, ownerId: event.target.value }))
                      }
                      disabled={!formData.ownerType}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none disabled:bg-slate-100"
                    >
                      <option value="">
                        {formData.ownerType ? "Sin perfil por ahora" : "Primero elige el tipo"}
                      </option>
                      {selectedOwnerOptions.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                          disabled={Boolean(item.owner_email)}
                        >
                          {item.nombre}
                          {item.owner_email ? " - ya vinculado" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Confirma con tu contrasena de admin
                </label>
                <input
                  type="password"
                  value={formData.adminPassword}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, adminPassword: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {saving ? "Creando..." : "Crear usuario"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="mb-6 max-w-xl">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por email, asignacion o ID de usuario"
            className="w-full text-sm outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
          Cargando usuarios...
        </div>
      ) : error && !isFormOpen ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">
          {error}
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
          No hay usuarios registrados todavia.
        </div>
      ) : (
        <div className="space-y-4">
          {usuariosFiltrados.map((usuario) => {
            const linkedProfile = ownerByEmail.get(usuario.email.toLowerCase()) || null

            return (
              <div
                key={usuario.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-900">
                      <Mail className="h-4 w-4 text-sky-600" />
                      <span className="font-medium">{usuario.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <UserRound className="h-4 w-4" />
                      <span>{usuario.user_id || "Sin user_id visible"}</span>
                    </div>

                    {linkedProfile ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Link2 className="h-4 w-4 text-emerald-600" />
                        <span>{linkedProfile}</span>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400">Sin perfil vinculado</div>
                    )}
                  </div>

                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    {usuario.created_at
                      ? new Date(usuario.created_at).toLocaleString("es-UY")
                      : "Sin fecha"}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

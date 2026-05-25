'use client'

import { useEffect, useState } from "react"
import { BadgeCheck, Pencil, Plus, Power, X } from "lucide-react"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"

type Administrador = {
  id: number
  nombre: string
  usuario: string
  contrasena: string
  rol: "superadmin" | "admin"
  activo: boolean
}

type AdministradorForm = {
  nombre: string
  usuario: string
  contrasena: string
  rol: "superadmin" | "admin"
}

const initialForm: AdministradorForm = {
  nombre: "",
  usuario: "",
  contrasena: "",
  rol: "admin",
}

export default function AdminAdministradoresPage() {
  const [administradores, setAdministradores] = useState<Administrador[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Administrador | null>(null)
  const [formData, setFormData] = useState<AdministradorForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const cargarAdministradores = async () => {
    const { data, error } = await supabase
      .from("administradores")
      .select("*")
      .order("id", { ascending: false })

    if (error) {
      setError(`No se pudieron cargar los administradores: ${error.message}`)
      return
    }

    setAdministradores(data || [])
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargarAdministradores()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const resetForm = () => {
    setFormData(initialForm)
    setEditingAdmin(null)
    setIsFormOpen(false)
    setError("")
  }

  const handleEdit = (admin: Administrador) => {
    setEditingAdmin(admin)
    setFormData({
      nombre: admin.nombre,
      usuario: admin.usuario,
      contrasena: admin.contrasena,
      rol: admin.rol,
    })
    setIsFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const payload = {
      nombre: formData.nombre,
      usuario: formData.usuario,
      contrasena: formData.contrasena,
      rol: formData.rol,
      activo: true,
    }

    if (editingAdmin) {
      const { error } = await supabase
        .from("administradores")
        .update(payload)
        .eq("id", editingAdmin.id)

      if (error) {
        setError(`No se pudo actualizar el administrador: ${error.message}`)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: "Editar",
        section: "Administradores",
        target: formData.nombre,
      })
    } else {
      const { error } = await supabase.from("administradores").insert([payload])

      if (error) {
        setError(`No se pudo crear el administrador: ${error.message}`)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: "Crear",
        section: "Administradores",
        target: formData.nombre,
      })
    }

    await cargarAdministradores()
    resetForm()
    setLoading(false)
  }

  const toggleActivo = async (admin: Administrador) => {
    const { error } = await supabase
      .from("administradores")
      .update({ activo: !admin.activo })
      .eq("id", admin.id)

    if (error) {
      setError(`No se pudo actualizar el estado: ${error.message}`)
      return
    }

    setAdministradores((prev) =>
      prev.map((item) =>
        item.id === admin.id ? { ...item, activo: !admin.activo } : item
      )
    )

    await logAdminActivity({
      action: admin.activo ? "Desactivar" : "Activar",
      section: "Administradores",
      target: admin.nombre,
    })
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">
            Administradores
          </h1>
          <p className="text-slate-500">
            Crea administradores y define si son superadministradores o administradores.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500"
        >
          <Plus className="h-5 w-5" />
          Nuevo administrador
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingAdmin ? "Editar administrador" : "Nuevo administrador"}
              </h2>
              <button
                onClick={resetForm}
                className="text-slate-500 transition hover:text-slate-900"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Usuario
                  </label>
                  <input
                    type="text"
                    value={formData.usuario}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, usuario: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Contrasena
                  </label>
                  <input
                    type="text"
                    value={formData.contrasena}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contrasena: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Rol
                </label>
                <select
                  value={formData.rol}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      rol: e.target.value as "superadmin" | "admin",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"
                >
                  <option value="admin">Administrador</option>
                  <option value="superadmin">Superadministrador</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                {loading ? "Guardando..." : editingAdmin ? "Guardar cambios" : "Crear administrador"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {administradores.map((admin) => (
          <div
            key={admin.id}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900">{admin.nombre}</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {admin.rol === "superadmin" ? "Superadministrador" : "Administrador"}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${admin.activo ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {admin.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">@{admin.usuario}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleActivo(admin)}
                className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50"
                title="Activar o desactivar"
              >
                <Power className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleEdit(admin)}
                className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {administradores.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
          <BadgeCheck className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">
            No hay administradores cargados
          </h3>
          <p className="text-slate-500">
            Crea el primer administrador adicional desde este panel.
          </p>
        </div>
      )}
    </div>
  )
}

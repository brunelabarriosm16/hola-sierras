'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LockKeyhole, Radio, UserRound } from "lucide-react"
import { supabase } from "../../supabase"
import {
  ADMIN_DEFAULT_CREDENTIALS,
  saveAdminSession,
} from "../../lib/adminAuth"

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (
      username === ADMIN_DEFAULT_CREDENTIALS.username &&
      password === ADMIN_DEFAULT_CREDENTIALS.password
    ) {
      saveAdminSession({
        username: ADMIN_DEFAULT_CREDENTIALS.username,
        name: ADMIN_DEFAULT_CREDENTIALS.name,
        role: ADMIN_DEFAULT_CREDENTIALS.role,
      })
      router.push("/admin")
      return
    }

    const { data, error } = await supabase
      .from("administradores")
      .select("usuario, nombre, contrasena, rol, activo")
      .eq("usuario", username)
      .eq("activo", true)
      .maybeSingle()

    if (error) {
      setError(`No se pudo iniciar sesion: ${error.message}`)
      setLoading(false)
      return
    }

    if (data && data.contrasena === password) {
      saveAdminSession({
        username: data.usuario,
        name: data.nombre || data.usuario,
        role: data.rol === "superadmin" ? "superadmin" : "admin",
      })
      router.push("/admin")
      return
    }

    setError("Usuario o contrasena incorrectos.")
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Radio className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Admin Login
          </h1>
          <p className="mt-2 text-slate-500">
            Inicia sesion para entrar al panel de administracion
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              Usuario
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <UserRound className="h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full outline-none"
                placeholder="admin"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              Contrasena
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <LockKeyhole className="h-5 w-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full outline-none"
                placeholder="********"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-500"
          >
            {loading ? "Entrando..." : "Entrar al panel"}
          </button>
        </form>
      </div>
    </div>
  )
}

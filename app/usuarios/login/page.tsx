'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserRound, Users } from "lucide-react"
import { PasswordInput } from "../../components/PasswordInput"
import { supabase } from "../../supabase"

export default function UsuariosLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const resetSession = async () => {
      await supabase.auth.signOut()
    }

    void resetSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError("Email o contrasena incorrectos.")
      setLoading(false)
      return
    }

    router.push("/usuarios")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mb-5 flex justify-center">
            <img
              src="/HolaSierras.png"
              alt="Hola Varela"
              className="h-20 w-auto"
            />
          </div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <Users className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">Ingreso de usuarios</h1>
          <p className="mt-2 text-slate-500">
            Inicia sesion con tu email y contrasena para entrar a tu espacio.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">Email</label>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <UserRound className="h-5 w-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full outline-none"
                placeholder="tuemail@ejemplo.com"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <PasswordInput
            label="Contrasena"
            value={password}
            onChange={setPassword}
            placeholder="********"
            autoComplete="current-password"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm">
          <Link href="/usuarios/recuperar-whatsapp" className="font-medium text-emerald-700 hover:text-emerald-600">
            Recuperar contrasena por WhatsApp
          </Link>
        </div>

        <div className="mt-4 text-center text-sm text-slate-500">
          <Link href="/" className="font-medium text-slate-700 hover:text-slate-900">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}

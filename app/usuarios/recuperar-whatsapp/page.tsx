'use client'

import Link from "next/link"
import { useMemo, useState } from "react"
import { MessageCircleMore, ShieldCheck } from "lucide-react"
import { AuthFormStatus } from "../../components/AuthFormStatus"

type RecoveryStep = "start" | "code" | "reset" | "done"

export default function UsuariosRecuperarWhatsappPage() {
  const [step, setStep] = useState<RecoveryStep>("start")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [recoveryToken, setRecoveryToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const canSubmitReset = useMemo(
    () => Boolean(password && confirmPassword && password === confirmPassword),
    [confirmPassword, password]
  )

  const handleStart = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/auth/recovery/whatsapp/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const result = (await response.json()) as { error?: string; message?: string }

      if (!response.ok) {
        throw new Error(result.error || "No pudimos iniciar la recuperacion.")
      }

      setSuccess(
        result.message ||
          "Si tu cuenta tiene WhatsApp habilitado, te enviamos un codigo."
      )
      setStep("code")
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos iniciar la recuperacion."
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCheckCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/auth/recovery/whatsapp/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      })

      const result = (await response.json()) as { error?: string; token?: string }

      if (!response.ok || !result.token) {
        throw new Error(result.error || "No pudimos validar el codigo.")
      }

      setRecoveryToken(result.token)
      setSuccess("Codigo validado. Ya puedes elegir una nueva contrasena.")
      setStep("reset")
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos validar el codigo."
      )
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    if (password.length < 6) {
      setError("La nueva contrasena debe tener al menos 6 caracteres.")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("La confirmacion no coincide con la nueva contrasena.")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/recovery/whatsapp/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: recoveryToken,
          password,
        }),
      })

      const result = (await response.json()) as { error?: string; message?: string }

      if (!response.ok) {
        throw new Error(result.error || "No pudimos actualizar la contrasena.")
      }

      setSuccess(result.message || "Tu contrasena fue actualizada.")
      setStep("done")
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos actualizar la contrasena."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
          <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Recuperacion
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Recupera tu contrasena por WhatsApp
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Te enviamos un codigo a tu numero verificado para que puedas crear una clave nueva sin entrar al panel.
          </p>

          <div className="mt-8 rounded-[24px] border border-white/70 bg-white/85 p-5 backdrop-blur">
            <div className="flex items-start gap-3">
              <MessageCircleMore className="mt-1 h-5 w-5 text-emerald-600" />
              <div>
                <div className="text-sm font-semibold text-slate-900">Antes de empezar</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Este metodo funciona si tu cuenta ya tiene un numero cargado, verificado y habilitado para recuperacion por WhatsApp.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-sky-100 bg-sky-50/80 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-sky-600" />
              <div>
                <div className="text-sm font-semibold text-slate-900">Seguridad</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  El codigo vence rapido y la nueva contrasena se guarda recien cuando validas ese paso.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/usuarios/login"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Volver al login
            </Link>
          </div>
        </section>

        <section className="p-6 sm:p-8 lg:p-10">
          <div className="mb-6 flex flex-wrap gap-2">
            {[
              { id: "start", label: "1. Email" },
              { id: "code", label: "2. Codigo" },
              { id: "reset", label: "3. Nueva clave" },
            ].map((item) => {
              const active =
                (item.id === "start" && step === "start") ||
                (item.id === "code" && step === "code") ||
                (item.id === "reset" && (step === "reset" || step === "done"))

              return (
                <div
                  key={item.id}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
                    active
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {item.label}
                </div>
              )
            })}
          </div>

          {error ? <AuthFormStatus tone="error" message={error} /> : null}
          {success ? <AuthFormStatus tone="success" message={success} /> : null}

          {step === "start" ? (
            <form onSubmit={handleStart} className="mt-5 space-y-5">
              <Field
                label="Email de tu cuenta"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="username"
                placeholder="tuemail@ejemplo.com"
              />

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-70"
              >
                {loading ? "Enviando codigo..." : "Enviar codigo por WhatsApp"}
              </button>
            </form>
          ) : null}

          {step === "code" ? (
            <form onSubmit={handleCheckCode} className="mt-5 space-y-5">
              <Field
                label="Codigo que recibiste"
                type="text"
                value={code}
                onChange={setCode}
                autoComplete="one-time-code"
                placeholder="123456"
              />

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-70"
                >
                  {loading ? "Validando..." : "Validar codigo"}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setStep("start")
                    setCode("")
                    setError("")
                    setSuccess("")
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Cambiar email
                </button>
              </div>
            </form>
          ) : null}

          {step === "reset" ? (
            <form onSubmit={handleReset} className="mt-5 space-y-5">
              <Field
                label="Nueva contrasena"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                placeholder="Minimo 6 caracteres"
              />
              <Field
                label="Confirmar nueva contrasena"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                placeholder="Repite tu nueva clave"
              />

              <button
                type="submit"
                disabled={loading || !canSubmitReset}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-70"
              >
                {loading ? "Guardando..." : "Guardar nueva contrasena"}
              </button>
            </form>
          ) : null}

          {step === "done" ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-6 text-sm leading-7 text-emerald-900">
                Tu contrasena ya fue actualizada. Puedes volver a entrar con la nueva clave.
              </div>

              <Link
                href="/usuarios/login"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Ir al login
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
  type,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  type: string
  placeholder: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
      />
    </div>
  )
}

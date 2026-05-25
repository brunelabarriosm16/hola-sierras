'use client'

import { useState, type FormEvent } from "react"
import { Phone, UserRound } from "lucide-react"
import { supabase } from "../supabase"

type SorteoParticipationFormProps = {
  eventId: string
  eventTitle: string
}

const initialForm = {
  nombre: "",
  telefono: "",
}

export function SorteoParticipationForm({
  eventId,
  eventTitle,
}: SorteoParticipationFormProps) {
  const [formData, setFormData] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState("")
  const [statusTone, setStatusTone] = useState<"success" | "error" | "">("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formData.nombre.trim() || !formData.telefono.trim()) {
      setStatusTone("error")
      setStatus("Completa tu nombre y telefono para participar.")
      return
    }

    setSaving(true)
    setStatus("")
    setStatusTone("")

    const { error } = await supabase.from("sorteo_participantes").insert([
      {
        evento_id: Number(eventId),
        evento_titulo: eventTitle,
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
      },
    ])

    if (error) {
      setStatusTone("error")
      setStatus("No pudimos registrar tu participación. Probá de nuevo.")
      setSaving(false)
      return
    }

    setFormData(initialForm)
    setStatusTone("success")
    setStatus("Tu participación quedó registrada.")
    setSaving(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="basis-full rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 md:p-5"
    >
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          Participar en el sorteo
        </div>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          Despues de ver los links del sorteo, completa tus datos para quedar anotado.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Nombre</span>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={formData.nombre}
              onChange={(event) =>
                setFormData((current) => ({ ...current, nombre: event.target.value }))
              }
              required
              className="w-full rounded-2xl border border-amber-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-amber-400"
            />
          </div>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Telefono</span>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={formData.telefono}
              onChange={(event) =>
                setFormData((current) => ({ ...current, telefono: event.target.value }))
              }
              required
              className="w-full rounded-2xl border border-amber-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-amber-400"
            />
          </div>
        </label>
      </div>

      {status ? (
        <div
          className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
            statusTone === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {status}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-400 disabled:opacity-70"
        >
          {saving ? "Enviando..." : "Enviar"}
        </button>
        <span className="text-xs leading-5 text-slate-500">
          Usaremos estos datos solo para registrar tu participación.
        </span>
      </div>
    </form>
  )
}

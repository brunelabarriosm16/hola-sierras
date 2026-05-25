'use client'

import { useState } from "react"
import { Radio } from "lucide-react"

const RADIO_STORAGE_KEY = "guia-varela-radio-config"

type RadioConfig = {
  title: string
  description: string
  streamUrl: string
  isLive: boolean
}

const defaultConfig: RadioConfig = {
  title: "Delta FM 88.3",
  description: "Escucha Delta FM 88.3 en vivo desde Jose Pedro Varela.",
  streamUrl: "https://radios.com.uy/delta/?utm_source=chatgpt.com",
  isLive: true,
}

export default function AdminRadioPage() {
  const [config, setConfig] = useState<RadioConfig>(() => {
    if (typeof window === "undefined") return defaultConfig

    const raw = window.localStorage.getItem(RADIO_STORAGE_KEY)
    if (!raw) return defaultConfig

    try {
      const parsed = JSON.parse(raw) as RadioConfig
      return { ...defaultConfig, ...parsed }
    } catch {
      window.localStorage.removeItem(RADIO_STORAGE_KEY)
      return defaultConfig
    }
  })
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    window.localStorage.setItem(RADIO_STORAGE_KEY, JSON.stringify(config))
    setSaved(true)
    window.dispatchEvent(new Event("radio-config-updated"))
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">Radio</h1>
        <p className="text-slate-500">
          Configura la transmision que se escucha en la home
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-slate-800 p-3 text-white">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Configuracion de Radio
            </h2>
            <p className="text-sm text-slate-500">
              Guarda una URL de streaming o una pagina para escuchar la radio
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              Título
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-700"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              Descripcion
            </label>
            <input
              type="text"
              value={config.description}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-700"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              URL de streaming o enlace
            </label>
            <input
              type="url"
              value={config.streamUrl}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, streamUrl: e.target.value }))
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-700"
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <input
              type="checkbox"
              checked={config.isLive}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, isLive: e.target.checked }))
              }
            />
            <span className="text-sm text-slate-700">Mostrar radio en vivo</span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="rounded-xl bg-slate-800 px-5 py-3 font-medium text-white transition hover:bg-slate-700"
            >
              Guardar configuración
            </button>

            {saved && (
              <span className="text-sm font-medium text-emerald-600">
                Configuracion guardada
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

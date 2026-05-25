'use client'

import { useEffect, useState } from "react"
import { FileText, ImageIcon, Save } from "lucide-react"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"
import { fileToDataUrl } from "../../lib/fileToDataUrl"

type SitioForm = {
  titulo: string
  texto_1: string
  texto_2: string
  texto_3: string
  imagen_url: string
}

const initialForm: SitioForm = {
  titulo: "Hola Sierras",
  texto_1:
    "Hola Sierras reúne propuestas, servicios y novedades de Aiguá, Mariscala y la región en un solo lugar.",
  texto_2:
    "Un espacio pensado para mostrar comercios, eventos, cursos, instituciones y servicios de la zona.",
  texto_3:
    "Cartelera online de las sierras. Todo lo que pasa en Aiguá, Mariscala y la región.",
  imagen_url: "",
}

export default function AdminSitioPage() {
  const [formData, setFormData] = useState<SitioForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState("")
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    const cargarConfiguracion = async () => {
      const { data, error } = await supabase
        .from("sitio")
        .select("titulo, texto_1, texto_2, texto_3, imagen_url")
        .eq("id", 1)
        .maybeSingle()

      if (!error && data) {
        setFormData({
          titulo: data.titulo || initialForm.titulo,
          texto_1: data.texto_1 || initialForm.texto_1,
          texto_2: data.texto_2 || initialForm.texto_2,
          texto_3: data.texto_3 || initialForm.texto_3,
          imagen_url: data.imagen_url || "",
        })
      }

      setIsInitialLoading(false)
    }

    cargarConfiguracion()
  }, [])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imageDataUrl = await fileToDataUrl(file)
      setFormData((prev) => ({ ...prev, imagen_url: imageDataUrl }))
      setSaveError("")
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudo cargar la imagen."
      )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveMessage("")
    setSaveError("")

    const { error } = await supabase.from("sitio").upsert({
      id: 1,
      titulo: formData.titulo,
      texto_1: formData.texto_1,
      texto_2: formData.texto_2,
      texto_3: formData.texto_3,
      imagen_url: formData.imagen_url || null,
    })

    if (error) {
      setSaveError(`No se pudo guardar la configuración: ${error.message}`)
      setLoading(false)
      return
    }

    await logAdminActivity({
      action: "Editar",
      section: "Sitio",
      target: "Contenido principal",
      details: "Actualizo textos o imagen del bloque institucional.",
    })

    setSaveMessage("Cambios guardados correctamente.")
    setLoading(false)
  }

  if (isInitialLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        Cargando configuración del sitio...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">
          Contenido del Sitio
        </h1>
        <p className="text-slate-500">
          Edita el bloque institucional que aparece en la home.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-3 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Sobre Varela
              </h2>
              <p className="text-sm text-slate-500">
                Cambia el texto y la imagen del bloque institucional.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {saveError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            )}

            {saveMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {saveMessage}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Título
              </label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, titulo: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Primer párrafo
              </label>
              <textarea
                value={formData.texto_1}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, texto_1: e.target.value }))
                }
                className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Segundo párrafo
              </label>
              <textarea
                value={formData.texto_2}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, texto_2: e.target.value }))
                }
                className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Tercer párrafo
              </label>
              <textarea
                value={formData.texto_3}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, texto_3: e.target.value }))
                }
                className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Foto desde tu computadora
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-600 hover:file:bg-blue-100"
              />
              <p className="mt-2 text-sm text-slate-500">
                Selecciona la imagen que quieres mostrar en la home.
              </p>
              {formData.imagen_url && (
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, imagen_url: "" }))
                  }
                  className="mt-3 text-sm font-medium text-red-600 transition hover:text-red-500"
                >
                  Quitar foto
                </button>
              )}
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
            >
              <Save className="h-5 w-5" />
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-3 text-white">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Vista previa</h2>
              <p className="text-sm text-slate-500">
                Así se verá el bloque en la home.
              </p>
            </div>
          </div>

          {formData.imagen_url ? (
            <img
              src={formData.imagen_url}
              alt={formData.titulo}
              className="mb-5 h-64 w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="mb-5 flex h-64 w-full items-center justify-center rounded-2xl bg-slate-100 text-center text-slate-500">
              Sin foto cargada
            </div>
          )}

          <h3 className="text-2xl font-semibold text-slate-900">{formData.titulo}</h3>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-500">
            <p>{formData.texto_1}</p>
            <p>{formData.texto_2}</p>
            <p>{formData.texto_3}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

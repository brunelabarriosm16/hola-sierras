'use client'

import { useEffect, useState } from "react"
import { Building2, Eye, EyeOff, Pencil, Plus, Star, Trash2, X } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import { LOCALIDADES, normalizeLocalidad } from "../../lib/localidades"

type Institucion = {
  id: number
  nombre: string
  descripcion: string | null
  direccion: string | null
  localidad?: string | null
  telefono: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  premium_detalle?: string | null
  premium_galeria?: string[] | null
  premium_extra_titulo?: string | null
  premium_extra_detalle?: string | null
  premium_extra_galeria?: string[] | null
  premium_activo?: boolean | null
  foto: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
}

type InstitucionForm = Omit<
  Institucion,
  "id" | "premium_galeria" | "premium_extra_galeria"
> & {
  premium_galeria: string
  premium_extra_galeria: string
}

const initialForm: InstitucionForm = {
  nombre: "",
  descripcion: "",
  direccion: "",
  localidad: "",
  telefono: "",
  web_url: "",
  instagram_url: "",
  facebook_url: "",
  premium_detalle: "",
  premium_galeria: "",
  premium_extra_titulo: "",
  premium_extra_detalle: "",
  premium_extra_galeria: "",
  premium_activo: false,
  foto: "",
  usa_whatsapp: true,
}

export default function AdminInstitucionesPage() {
  const [instituciones, setInstituciones] = useState<Institucion[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingInstitucion, setEditingInstitucion] = useState<Institucion | null>(null)
  const [formData, setFormData] = useState<InstitucionForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deletingInstitucion, setDeletingInstitucion] = useState<Institucion | null>(null)
  const [search, setSearch] = useState("")

  const normalizedSearch = search.trim().toLowerCase()
  const filteredInstituciones = instituciones.filter((institucion) => {
    if (!normalizedSearch) return true

    return [
      institucion.nombre,
      institucion.descripcion,
      institucion.direccion,
      institucion.localidad,
      institucion.telefono,
    ]
      .map((value) => value || "")
      .some((value) => value.toLowerCase().includes(normalizedSearch))
  })

  const cargarInstituciones = async () => {
    const { data, error } = await supabase
      .from("instituciones")
      .select("*")
      .order("id", { ascending: false })

    if (error) {
      setSaveError(`Error al cargar instituciones: ${error.message}`)
      return
    }

    setInstituciones(data || [])
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargarInstituciones()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const resetForm = () => {
    setFormData(initialForm)
    setEditingInstitucion(null)
    setIsFormOpen(false)
    setSaveError("")
  }

  const handleEdit = (institucion: Institucion) => {
    setEditingInstitucion(institucion)
    setFormData({
      nombre: institucion.nombre || "",
      descripcion: institucion.descripcion || "",
      direccion: institucion.direccion || "",
      localidad: normalizeLocalidad(institucion.localidad),
      telefono: institucion.telefono || "",
      web_url: institucion.web_url || "",
      instagram_url: institucion.instagram_url || "",
      facebook_url: institucion.facebook_url || "",
      premium_detalle: institucion.premium_detalle || "",
      premium_galeria: (institucion.premium_galeria || []).join("\n"),
      premium_extra_titulo: institucion.premium_extra_titulo || "",
      premium_extra_detalle: institucion.premium_extra_detalle || "",
      premium_extra_galeria: (institucion.premium_extra_galeria || []).join("\n"),
      premium_activo: institucion.premium_activo ?? false,
      foto: institucion.foto || "",
      usa_whatsapp: institucion.usa_whatsapp ?? true,
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    const institucion = instituciones.find((item) => item.id === id)
    const { error } = await supabase.from("instituciones").delete().eq("id", id)

    if (error) {
      setSaveError(`Error al eliminar institución: ${error.message}`)
      return
    }

    setInstituciones((prev) => prev.filter((item) => item.id !== id))
    setDeletingInstitucion(null)
    await logAdminActivity({
      action: "Eliminar",
      section: "Instituciones",
      target: institucion?.nombre || `ID ${id}`,
    })
  }

  const toggleVisibility = async (institucion: Institucion) => {
    const nextEstado =
      institucion.estado === "oculto" || institucion.estado === "borrador"
        ? "activo"
        : "oculto"

    const { error } = await supabase
      .from("instituciones")
      .update({ estado: nextEstado })
      .eq("id", institucion.id)

    if (error) {
      setSaveError(`Error al cambiar visibilidad: ${error.message}`)
      return
    }

    setInstituciones((prev) =>
      prev.map((item) =>
        item.id === institucion.id ? { ...item, estado: nextEstado } : item
      )
    )

    await logAdminActivity({
      action:
        nextEstado === "activo"
          ? institucion.estado === "borrador"
            ? "Publicar borrador"
            : "Mostrar"
          : "Ocultar",
      section: "Instituciones",
      target: institucion.nombre,
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imageDataUrl = await fileToDataUrl(file)
      setFormData((prev) => ({ ...prev, foto: imageDataUrl }))
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudo cargar la imagen."
      )
    }
  }

  const handlePremiumGalleryChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "premium_galeria" | "premium_extra_galeria" = "premium_galeria"
  ) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    try {
      const nextImages = await Promise.all(files.map((file) => fileToDataUrl(file)))
      setFormData((prev) => {
        const currentImages = prev[field]
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean)

        return {
          ...prev,
          [field]: [...currentImages, ...nextImages].join("\n"),
        }
      })
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudieron cargar las imágenes premium."
      )
    } finally {
      e.target.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveError("")

    const payload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || null,
      direccion: formData.direccion || null,
      localidad: formData.localidad || null,
      telefono: formData.telefono || null,
      web_url: formData.web_url?.trim() || null,
      instagram_url: formData.instagram_url?.trim() || null,
      facebook_url: formData.facebook_url?.trim() || null,
      premium_detalle: formData.premium_detalle?.trim() || null,
      premium_galeria: formData.premium_galeria
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      premium_extra_titulo: formData.premium_extra_titulo?.trim() || null,
      premium_extra_detalle: formData.premium_extra_detalle?.trim() || null,
      premium_extra_galeria: formData.premium_extra_galeria
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      premium_activo: formData.premium_activo ?? false,
      foto: formData.foto || null,
      estado: editingInstitucion?.estado ?? "activo",
      usa_whatsapp: formData.usa_whatsapp,
    }

    if (editingInstitucion) {
      const { error } = await supabase
        .from("instituciones")
        .update(payload)
        .eq("id", editingInstitucion.id)

      if (error) {
      setSaveError(`Error al actualizar institución: ${error.message}`)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: "Editar",
        section: "Instituciones",
        target: formData.nombre,
      })
    } else {
      const { error } = await supabase.from("instituciones").insert([payload])

      if (error) {
        setSaveError(`Error al guardar institución: ${error.message}`)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: "Crear",
        section: "Instituciones",
        target: formData.nombre,
      })
    }

    await cargarInstituciones()
    resetForm()
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(deletingInstitucion)}
        title="Eliminar institución"
        description={`Vas a eliminar "${deletingInstitucion?.nombre || ""}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeletingInstitucion(null)}
        onConfirm={() => {
          if (deletingInstitucion) {
            void handleDelete(deletingInstitucion.id)
          }
        }}
      />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">Instituciones</h1>
          <p className="text-slate-500">Gestiona instituciones destacadas de la ciudad</p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-medium text-white transition hover:bg-cyan-500"
        >
          <Plus className="h-5 w-5" />
          Agregar institución
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingInstitucion ? "Editar institución" : "Agregar institución"}
              </h2>
              <button
                onClick={resetForm}
                className="text-slate-500 transition hover:text-slate-900"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {saveError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.direccion || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, direccion: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Localidad
                </label>
                <select
                  value={formData.localidad || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, localidad: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
                >
                  <option value="">Sin definir</option>
                  {LOCALIDADES.map((localidad) => (
                    <option key={localidad} value={localidad}>
                      {localidad}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={formData.telefono || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, telefono: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.usa_whatsapp ?? true}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      usa_whatsapp: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span>Este número tiene WhatsApp</span>
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      descripcion: e.target.value,
                    }))
                  }
                  className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
                />
              </div>

              <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.premium_activo ?? false}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        premium_activo: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span>Activar perfil premium para esta institución</span>
                </label>

                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900">
                      Descripción ampliada
                    </label>
                    <textarea
                      value={formData.premium_detalle || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          premium_detalle: e.target.value,
                        }))
                      }
                      disabled={!formData.premium_activo}
                      className="h-32 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900">
                      Galería premium
                    </label>
                    <textarea
                      value={formData.premium_galeria}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          premium_galeria: e.target.value,
                        }))
                      }
                      disabled={!formData.premium_activo}
                      placeholder={"Una URL por línea\nhttps://..."}
                      className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Puedes cargar varias imágenes del perfil ampliado, una por línea.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-900">
                        Título extra
                      </label>
                      <input
                        type="text"
                        value={formData.premium_extra_titulo || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            premium_extra_titulo: e.target.value,
                          }))
                        }
                        disabled={!formData.premium_activo}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-900">
                        Galería extra
                      </label>
                      <textarea
                        value={formData.premium_extra_galeria}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            premium_extra_galeria: e.target.value,
                          }))
                        }
                        disabled={!formData.premium_activo}
                        placeholder={"Una URL por línea\nhttps://..."}
                        className="h-24 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900">
                      Detalle extra
                    </label>
                    <textarea
                      value={formData.premium_extra_detalle || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          premium_extra_detalle: e.target.value,
                        }))
                      }
                      disabled={!formData.premium_activo}
                      className="h-24 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              {formData.premium_activo ? (
                <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                      Galerías premium
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Puedes subir imágenes para la galería principal y para una segunda galería extra.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900">
                      Subir imágenes a galería premium
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePremiumGalleryChange}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-violet-100 file:px-4 file:py-2 file:font-medium file:text-violet-700 hover:file:bg-violet-200"
                    />
                    {formData.premium_galeria.trim() ? (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {formData.premium_galeria
                            .split(/\r?\n/)
                            .map((item) => item.trim())
                            .filter(Boolean)
                            .map((image, index) => (
                              <img
                                key={`${image}-${index}`}
                                src={image}
                                alt={`Galería premium ${index + 1}`}
                                className="h-28 w-full rounded-2xl object-cover"
                              />
                            ))}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, premium_galeria: "" }))
                          }
                          className="text-sm font-medium text-red-600 transition hover:text-red-500"
                        >
                          Limpiar galería premium
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900">
                      Subir imágenes a galería extra
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => void handlePremiumGalleryChange(e, "premium_extra_galeria")}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-violet-100 file:px-4 file:py-2 file:font-medium file:text-violet-700 hover:file:bg-violet-200"
                    />
                    {formData.premium_extra_galeria.trim() ? (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          {formData.premium_extra_galeria
                            .split(/\r?\n/)
                            .map((item) => item.trim())
                            .filter(Boolean)
                            .map((image, index) => (
                              <img
                                key={`${image}-${index}`}
                                src={image}
                                alt={`Galería extra ${index + 1}`}
                                className="h-28 w-full rounded-2xl object-cover"
                              />
                            ))}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, premium_extra_galeria: "" }))
                          }
                          className="text-sm font-medium text-red-600 transition hover:text-red-500"
                        >
                          Limpiar galería extra
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Sitio web
                  </label>
                  <input
                    type="url"
                    value={formData.web_url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, web_url: e.target.value }))
                    }
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={formData.instagram_url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, instagram_url: e.target.value }))
                    }
                    placeholder="https://instagram.com/..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={formData.facebook_url || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, facebook_url: e.target.value }))
                    }
                    placeholder="https://facebook.com/..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Imagen desde tu computadora
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-50 file:px-4 file:py-2 file:font-medium file:text-cyan-700 hover:file:bg-cyan-100"
                />
                {formData.foto && (
                  <div className="mt-4 space-y-3">
                    <img
                      src={formData.foto}
                      alt="Vista previa de la institución"
                      className="h-40 w-full rounded-2xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, foto: "" }))}
                      className="text-sm font-medium text-red-600 transition hover:text-red-500"
                    >
                      Quitar imagen
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-cyan-600 py-3 font-medium text-white transition hover:bg-cyan-500 disabled:opacity-60"
                >
                  {loading
                    ? "Guardando..."
                    : editingInstitucion
                      ? "Guardar Cambios"
                      : "Agregar institución"}
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
      )}

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="institution-search">
          Buscar instituciones
        </label>
        <input
          id="institution-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, dirección, teléfono o descripción"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500"
        />
        <p className="mt-2 text-xs text-slate-500">
          Mostrando {filteredInstituciones.length} de {instituciones.length} instituciones.
        </p>
      </div>

      {filteredInstituciones.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Institución</th>
                  <th className="px-5 py-3">Contacto</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredInstituciones.map((institucion) => (
                  <tr key={institucion.id} className="align-top transition hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="flex min-w-[260px] items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{institucion.nombre}</div>
                          {institucion.descripcion ? (
                            <p className="mt-1 line-clamp-2 max-w-md whitespace-pre-line text-xs leading-5 text-slate-500">
                              {institucion.descripcion}
                            </p>
                          ) : null}
                          {institucion.premium_activo ? (
                            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                              <Star className="h-3 w-3" />
                              Premium
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <div className="space-y-1">
                        <div>{institucion.telefono || "Sin teléfono"}</div>
                        {institucion.direccion ? (
                          <div className="text-xs text-slate-500">{institucion.direccion}</div>
                        ) : null}
                        {institucion.localidad ? (
                          <div className="text-xs font-semibold text-sky-700">{institucion.localidad}</div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          institucion.estado === "borrador"
                            ? "bg-amber-100 text-amber-700"
                            : institucion.estado === "oculto"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {institucion.estado === "borrador"
                          ? "borrador"
                          : institucion.estado === "oculto"
                            ? "oculto"
                            : "visible"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => toggleVisibility(institucion)}
                          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                          title={
                            institucion.estado === "borrador"
                              ? "Publicar borrador"
                              : institucion.estado === "oculto"
                                ? "Mostrar"
                                : "Ocultar"
                          }
                        >
                          {institucion.estado === "oculto" ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(institucion)}
                          className="rounded-lg p-2 text-cyan-600 transition hover:bg-cyan-50"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingInstitucion(institucion)}
                          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {filteredInstituciones.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
          <Building2 className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">
            {instituciones.length === 0 ? "No hay instituciones" : "No encontramos resultados"}
          </h3>
          <p className="mb-4 text-slate-500">
            {instituciones.length === 0
              ? "Comenzá agregando la primera institución"
              : "Prueba con otra búsqueda."}
          </p>
          {instituciones.length === 0 ? (
            <button
              onClick={() => setIsFormOpen(true)}
              className="rounded-xl bg-cyan-600 px-6 py-3 font-medium text-white transition hover:bg-cyan-500"
            >
              Agregar institución
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}


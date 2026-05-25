'use client'

import { useEffect, useMemo, useState } from "react"
import { Eye, EyeOff, MessageCircle, Pencil, Plus, Share2, Star, Store, Trash2, X } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import {
  AdminContentFilters,
  type AdminStatusFilter,
} from "../../components/admin/AdminContentFilters"
import { subscriptionPlans, type SubscriptionPlanKey } from "../../lib/subscriptionPlans"
import { getSubscriptionStatusBadge, getSubscriptionStatusLabel, type SubscriptionStatusKey } from "../../lib/subscriptionStatus"
import { supabase } from "../../supabase"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import {
  fetchAdminEngagementMetrics,
  getContentStateBadgeClass,
  getContentStateLabel,
  getNextContentState,
  getVisibilityActivityAction,
  mergeAdminEngagement,
  safeLogAdminActivity,
} from "../../lib/adminContentActions"

type Comercio = {
  id: number
  nombre: string
  descripcion: string | null
  premium_detalle?: string | null
  premium_galeria?: string[] | null
  premium_extra_titulo?: string | null
  premium_extra_detalle?: string | null
  premium_extra_galeria?: string[] | null
  premium_activo?: boolean | null
  plan_suscripcion?: SubscriptionPlanKey | null
  estado_suscripcion?: SubscriptionStatusKey | null
  direccion: string | null
  telefono: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen?: string | null
  imagen_url?: string | null
  estado?: string | null
  destacado?: boolean | null
  usa_whatsapp?: boolean | null
  share_count?: number
  whatsapp_count?: number
}

type ComercioForm = {
  nombre: string
  direccion: string
  telefono: string
  descripcion: string
  premium_detalle: string
  premium_galeria: string
  premium_extra_titulo: string
  premium_extra_detalle: string
  premium_extra_galeria: string
  premium_activo: boolean
  web_url: string
  instagram_url: string
  facebook_url: string
  imagen_url: string
  usa_whatsapp: boolean
}

const initialForm: ComercioForm = {
  nombre: "",
  direccion: "",
  telefono: "",
  descripcion: "",
  premium_detalle: "",
  premium_galeria: "",
  premium_extra_titulo: "",
  premium_extra_detalle: "",
  premium_extra_galeria: "",
  premium_activo: false,
  web_url: "",
  instagram_url: "",
  facebook_url: "",
  imagen_url: "",
  usa_whatsapp: true,
}

export default function AdminComerciosPage() {
  const [comercios, setComercios] = useState<Comercio[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingComercio, setEditingComercio] = useState<Comercio | null>(null)
  const [formData, setFormData] = useState<ComercioForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deletingComercio, setDeletingComercio] = useState<Comercio | null>(null)
  const [submitMode, setSubmitMode] = useState<"publish" | "draft">("publish")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>("all")

  const filteredComercios = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return comercios.filter((comercio) => {
      const matchesStatus =
        statusFilter === "all" || (comercio.estado || "activo") === statusFilter
      const matchesSearch =
        !normalizedSearch ||
        [
          comercio.nombre,
          comercio.descripcion,
          comercio.direccion,
          comercio.telefono,
        ]
          .map((value) => value || "")
          .some((value) => value.toLowerCase().includes(normalizedSearch))

      return matchesStatus && matchesSearch
    })
  }, [comercios, search, statusFilter])

  const cargarComercios = async () => {
    const [{ data, error }, metrics] = await Promise.all([
      supabase
        .from("comercios")
        .select("*")
        .order("id", { ascending: false }),
      fetchAdminEngagementMetrics("comercios", "comercios"),
    ])

    if (error) {
      setSaveError(`Error al cargar comercios: ${error.message}`)
      return
    }

    setSaveError(metrics.warning)
    setComercios(mergeAdminEngagement(data || [], metrics.shareMap, metrics.whatsappMap))
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargarComercios()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const resetForm = () => {
    setFormData(initialForm)
    setEditingComercio(null)
    setIsFormOpen(false)
    setSaveError("")
    setSubmitMode("publish")
  }

  const handleEdit = (comercio: Comercio) => {
    setEditingComercio(comercio)
    setFormData({
      nombre: comercio.nombre || "",
      direccion: comercio.direccion || "",
      telefono: comercio.telefono || "",
      descripcion: comercio.descripcion || "",
      premium_detalle: comercio.premium_detalle || "",
      premium_galeria: (comercio.premium_galeria || []).join("\n"),
      premium_extra_titulo: comercio.premium_extra_titulo || "",
      premium_extra_detalle: comercio.premium_extra_detalle || "",
      premium_extra_galeria: (comercio.premium_extra_galeria || []).join("\n"),
      premium_activo: comercio.premium_activo ?? false,
      web_url: comercio.web_url || "",
      instagram_url: comercio.instagram_url || "",
      facebook_url: comercio.facebook_url || "",
      imagen_url: comercio.imagen_url || comercio.imagen || "",
      usa_whatsapp: comercio.usa_whatsapp ?? true,
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    const comercio = comercios.find((item) => item.id === id)
    if (!comercio) return

    const { error } = await supabase.from("comercios").delete().eq("id", id)

    if (error) {
      setSaveError(`Error al eliminar comercio: ${error.message}`)
      return
    }

    setComercios((prev) => prev.filter((item) => item.id !== id))
    setDeletingComercio(null)
    await safeLogAdminActivity({
      action: "Eliminar",
      section: "Comercios",
      target: comercio?.nombre || `ID ${id}`,
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imageDataUrl = await fileToDataUrl(file)
      setFormData((prev) => ({ ...prev, imagen_url: imageDataUrl }))
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
    }
  }

  const toggleFeatured = async (comercio: Comercio) => {
    const { error } = await supabase
      .from("comercios")
      .update({ destacado: !comercio.destacado })
      .eq("id", comercio.id)

    if (error) {
      setSaveError(`Error al cambiar destacado: ${error.message}`)
      return
    }

    setComercios((prev) =>
      prev.map((item) =>
        item.id === comercio.id
          ? { ...item, destacado: !comercio.destacado }
          : item
      )
    )

    await safeLogAdminActivity({
      action: !comercio.destacado ? "Destacar" : "Quitar destacado",
      section: "Comercios",
      target: comercio.nombre,
    })
  }

  const toggleVisibility = async (comercio: Comercio) => {
    const nextEstado = getNextContentState(comercio.estado)

    const { error } = await supabase
      .from("comercios")
      .update({ estado: nextEstado })
      .eq("id", comercio.id)

    if (error) {
      setSaveError(`Error al cambiar visibilidad: ${error.message}`)
      return
    }

    setComercios((prev) =>
      prev.map((item) =>
        item.id === comercio.id ? { ...item, estado: nextEstado } : item
      )
    )

    await safeLogAdminActivity({
      action: getVisibilityActivityAction(comercio.estado, nextEstado),
      section: "Comercios",
      target: comercio.nombre,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveError("")
    const isDraft = submitMode === "draft"
    const hasPhone = formData.telefono.trim().length > 0

    if (!isDraft && !editingComercio && !formData.imagen_url) {
      setSaveError("Tenes que cargar una foto para crear un comercio.")
      setLoading(false)
      return
    }

    const payload = {
      nombre: formData.nombre,
      direccion: formData.direccion || null,
      telefono: formData.telefono || null,
      descripcion: formData.descripcion || null,
      premium_detalle: formData.premium_detalle.trim() || null,
      premium_galeria: formData.premium_galeria
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      premium_extra_titulo: formData.premium_extra_titulo.trim() || null,
      premium_extra_detalle: formData.premium_extra_detalle.trim() || null,
      premium_extra_galeria: formData.premium_extra_galeria
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      premium_activo: formData.premium_activo,
      web_url: formData.web_url.trim() || null,
      instagram_url: formData.instagram_url.trim() || null,
      facebook_url: formData.facebook_url.trim() || null,
      imagen_url: formData.imagen_url || null,
        estado: isDraft
          ? "borrador"
          : editingComercio?.estado === "oculto"
            ? "oculto"
            : "activo",
        destacado: editingComercio?.destacado ?? false,
        usa_whatsapp: hasPhone ? formData.usa_whatsapp : false,
      }

    if (editingComercio) {
      const { error } = await supabase
        .from("comercios")
        .update(payload)
        .eq("id", editingComercio.id)

      if (error) {
        const message = `Error al actualizar comercio: ${error.message}${error.details ? ` - ${error.details}` : ""}`
        setSaveError(message)
        setLoading(false)
        return
      }

      await safeLogAdminActivity({
        action: isDraft ? "Guardar borrador" : "Editar",
        section: "Comercios",
        target: formData.nombre || "Sin nombre",
      })
    } else {
      const { error } = await supabase.from("comercios").insert([payload])

      if (error) {
        const message = `Error al guardar comercio: ${error.message}${error.details ? ` - ${error.details}` : ""}`
        setSaveError(message)
        setLoading(false)
        return
      }

      await safeLogAdminActivity({
        action: isDraft ? "Crear borrador" : "Crear",
        section: "Comercios",
        target: formData.nombre || "Sin nombre",
      })
    }

    await cargarComercios()
    resetForm()
    setLoading(false)
  }

  const hasPhone = formData.telefono.trim().length > 0

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(deletingComercio)}
        title="Eliminar comercio"
        description={`Vas a eliminar "${deletingComercio?.nombre || ""}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeletingComercio(null)}
        onConfirm={() => {
          if (deletingComercio) {
            void handleDelete(deletingComercio.id)
          }
        }}
      />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">Comercios</h1>
          <p className="text-slate-500">Gestiona los comercios locales</p>
          <p className="mt-1 text-sm text-slate-400">
            Puedes marcar todos los que quieras. La home muestra tandas de 8 y las rota cada 2 días.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500"
        >
          <Plus className="h-5 w-5" />
          Agregar Comercio
        </button>
      </div>

      {saveError && !isFormOpen && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {saveError}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingComercio ? "Editar Comercio" : "Agregar Comercio"}
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
                  Nombre del Comercio *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, direccion: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, telefono: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasPhone && formData.usa_whatsapp}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        usa_whatsapp: e.target.checked,
                      }))
                    }
                    disabled={!hasPhone}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    {hasPhone
                      ? "Este número tiene WhatsApp"
                      : "Completa un teléfono si quieres habilitar WhatsApp"}
                  </span>
                </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      descripcion: e.target.value,
                    }))
                  }
                  className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.premium_activo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        premium_activo: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Activar perfil premium para este comercio</span>
                </label>

                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900">
                      Descripción ampliada
                    </label>
                    <textarea
                      value={formData.premium_detalle}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          premium_detalle: e.target.value,
                        }))
                      }
                      disabled={!formData.premium_activo}
                      className="h-32 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500 disabled:cursor-not-allowed disabled:bg-slate-100"
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
                      className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Cuando el premium está activo, estas imágenes se muestran como galería extra.
                    </p>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={!formData.premium_activo}
                      onChange={handlePremiumGalleryChange}
                      className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-amber-100 file:px-4 file:py-2 file:font-medium file:text-amber-700 hover:file:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-100"
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

                  <div className="rounded-2xl border border-white/80 bg-white/70 p-4">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
                      Bloque extra
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-900">
                          Título del bloque extra
                        </label>
                        <input
                          type="text"
                          value={formData.premium_extra_titulo}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              premium_extra_titulo: e.target.value,
                            }))
                          }
                          disabled={!formData.premium_activo}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-900">
                          Descripción del bloque extra
                        </label>
                        <textarea
                          value={formData.premium_extra_detalle}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              premium_extra_detalle: e.target.value,
                            }))
                          }
                          disabled={!formData.premium_activo}
                          className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-900">
                          Galería del bloque extra
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
                          className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          Puedes sumar otra galería para destacar promos, marcas o contenido adicional.
                        </p>

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={!formData.premium_activo}
                          onChange={(e) => void handlePremiumGalleryChange(e, "premium_extra_galeria")}
                          className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-amber-100 file:px-4 file:py-2 file:font-medium file:text-amber-700 hover:file:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-100"
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
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Sitio web
                  </label>
                  <input
                    type="url"
                    value={formData.web_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, web_url: e.target.value }))
                    }
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, instagram_url: e.target.value }))
                    }
                    placeholder="https://instagram.com/..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={formData.facebook_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, facebook_url: e.target.value }))
                    }
                    placeholder="https://facebook.com/..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-600 hover:file:bg-blue-100"
                  required={!editingComercio && !formData.imagen_url}
                />
                <p className="mt-2 text-sm text-slate-500">
                  Selecciona una foto para el comercio.
                </p>
                {formData.imagen_url && (
                  <div className="mt-4 space-y-3">
                    <img
                      src={formData.imagen_url}
                      alt="Vista previa del comercio"
                      className="h-40 w-full rounded-2xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, imagen_url: "" }))
                      }
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
                  onClick={() => setSubmitMode("publish")}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {loading
                    ? "Guardando..."
                    : editingComercio
                      ? "Guardar Cambios"
                      : "Guardar y publicar"}
                </button>

                <button
                  type="submit"
                  formNoValidate
                  onClick={() => setSubmitMode("draft")}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Guardar borrador
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

      <AdminContentFilters
        search={search}
        status={statusFilter}
        total={comercios.length}
        visible={filteredComercios.length}
        placeholder="Buscar comercio, dirección o teléfono"
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
      />

      {filteredComercios.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Comercio</th>
                  <th className="px-5 py-3">Contacto</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Métricas</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredComercios.map((comercio) => {
                  const imagenSrc = comercio.imagen_url || comercio.imagen

                  return (
                    <tr key={comercio.id} className="align-top transition hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="flex min-w-[260px] items-start gap-3">
                          {imagenSrc ? (
                            <img
                              src={imagenSrc}
                              alt={comercio.nombre}
                              className="h-12 w-12 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                              <Store className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">{comercio.nombre}</div>
                            {comercio.descripcion ? (
                              <p className="mt-1 line-clamp-2 max-w-sm text-xs leading-5 text-slate-500">
                                {comercio.descripcion}
                              </p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap gap-2">
                              {comercio.destacado ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                                  <Star className="h-3 w-3 fill-current" />
                                  Destacado
                                </span>
                              ) : null}
                              {comercio.premium_activo ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                                  <Star className="h-3 w-3" />
                                  Premium
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <div className="space-y-1">
                          <div>{comercio.telefono || "Sin teléfono"}</div>
                          {comercio.direccion ? (
                            <div className="text-xs text-slate-500">{comercio.direccion}</div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getContentStateBadgeClass(comercio.estado)}`}>
                          {getContentStateLabel(comercio.estado)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-2">
                          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {subscriptionPlans[comercio.plan_suscripcion || "presencia"].shortLabel}
                          </span>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSubscriptionStatusBadge(comercio.estado_suscripcion)}`}>
                            {getSubscriptionStatusLabel(comercio.estado_suscripcion)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2 text-xs font-semibold text-slate-600">
                          <span className="inline-flex items-center gap-2">
                            <Share2 className="h-3.5 w-3.5" />
                            {comercio.share_count || 0} compartidos
                          </span>
                          <span className="inline-flex items-center gap-2 text-green-700">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {comercio.whatsapp_count || 0} WhatsApp
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => toggleVisibility(comercio)}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                            title={
                              comercio.estado === "borrador"
                                ? "Publicar borrador"
                                : comercio.estado === "oculto"
                                  ? "Mostrar"
                                  : "Ocultar"
                            }
                          >
                            {comercio.estado === "oculto" ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => toggleFeatured(comercio)}
                            className={`rounded-lg p-2 transition ${
                              comercio.destacado
                                ? "bg-amber-50 text-amber-600"
                                : "text-slate-500 hover:bg-slate-100"
                            }`}
                            title="Destacar en home"
                          >
                            <Star className={`h-4 w-4 ${comercio.destacado ? "fill-current" : ""}`} />
                          </button>
                          <button
                            onClick={() => handleEdit(comercio)}
                            className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingComercio(comercio)}
                            className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {filteredComercios.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
          <Store className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">
            {comercios.length === 0 ? "No hay comercios" : "No encontramos resultados"}
          </h3>
          <p className="mb-4 text-slate-500">
            {comercios.length === 0
              ? "Comienza agregando tu primer comercio"
              : "Prueba con otra búsqueda o cambia el filtro."}
          </p>
          {comercios.length === 0 ? (
            <button
              onClick={() => setIsFormOpen(true)}
              className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-500"
            >
              Agregar Comercio
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}


'use client'

import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { Eye, EyeOff, MessageCircle, Pencil, Plus, Share2, ShieldAlert, Star, Trash2, X } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import {
  AdminContentFilters,
  type AdminStatusFilter,
} from "../../components/admin/AdminContentFilters"
import { subscriptionPlans, type SubscriptionPlanKey } from "../../lib/subscriptionPlans"
import { getSubscriptionStatusBadge, getSubscriptionStatusLabel, type SubscriptionStatusKey } from "../../lib/subscriptionStatus"
import { supabase } from "../../supabase"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import { LOCALIDADES, normalizeLocalidad } from "../../lib/localidades"
import {
  fetchAdminEngagementMetrics,
  getContentStateBadgeClass,
  getContentStateLabel,
  getNextContentState,
  getVisibilityActivityAction,
  mergeAdminEngagement,
  safeLogAdminActivity,
} from "../../lib/adminContentActions"

type Servicio = {
  id: number
  nombre: string
  categoria: string
  descripcion: string | null
  premium_detalle?: string | null
  premium_galeria?: string[] | null
  premium_extra_titulo?: string | null
  premium_extra_detalle?: string | null
  premium_extra_galeria?: string[] | null
  premium_activo?: boolean | null
  plan_suscripcion?: SubscriptionPlanKey | null
  estado_suscripcion?: SubscriptionStatusKey | null
  responsable: string | null
  contacto: string | null
  direccion: string | null
  localidad?: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  imagen: string | null
  destacado?: boolean | null
  estado?: string | null
  usa_whatsapp?: boolean | null
  share_count?: number
  whatsapp_count?: number
}

type ServicioForm = {
  nombre: string
  categoria: string
  descripcion: string
  premium_detalle: string
  premium_galeria: string
  premium_extra_titulo: string
  premium_extra_detalle: string
  premium_extra_galeria: string
  premium_activo: boolean
  responsable: string
  contacto: string
  direccion: string
  localidad: string
  web_url: string
  instagram_url: string
  facebook_url: string
  imagen: string
  usa_whatsapp: boolean
}

const initialForm: ServicioForm = {
  nombre: "",
  categoria: "Profesionales",
  descripcion: "",
  premium_detalle: "",
  premium_galeria: "",
  premium_extra_titulo: "",
  premium_extra_detalle: "",
  premium_extra_galeria: "",
  premium_activo: false,
  responsable: "",
  contacto: "",
  direccion: "",
  localidad: "",
  web_url: "",
  instagram_url: "",
  facebook_url: "",
  imagen: "",
  usa_whatsapp: true,
}

const categoriasServicio = [
  "Profesionales",
  "Alojamientos",
  "Actividades para hacer",
  "Paseos",
  "Naturaleza",
  "Experiencias",
  "Restaurantes",
  "Cafeterías",
  "Comida para llevar",
  "Hoteles",
  "Posadas",
  "Cabañas",
  "Campings",
  "Oficios",
  "Servicios",
]

const categoriasTurismo = [
  "Alojamientos",
  "Actividades para hacer",
  "Paseos",
  "Naturaleza",
  "Experiencias",
  "Hoteles",
  "Posadas",
  "Cabañas",
  "Campings",
]

const turismoCategoryKeys = new Set(
  categoriasTurismo.map((category) =>
    category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  )
)

function isTourismCategory(category: string) {
  return turismoCategoryKeys.has(
    category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  )
}

export default function AdminServiciosPage() {
  const pathname = usePathname()
  const isTourismAdmin = pathname.startsWith("/admin/turismo")
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null)
  const [formData, setFormData] = useState<ServicioForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deletingServicio, setDeletingServicio] = useState<Servicio | null>(null)
  const [submitMode, setSubmitMode] = useState<"publish" | "draft">("publish")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>("all")

  const filteredServicios = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return servicios.filter((servicio) => {
      const matchesSection = isTourismAdmin
        ? isTourismCategory(servicio.categoria)
        : !isTourismCategory(servicio.categoria)
      const matchesStatus =
        statusFilter === "all" || (servicio.estado || "activo") === statusFilter
      const matchesSearch =
        !normalizedSearch ||
        [
          servicio.nombre,
          servicio.categoria,
          servicio.descripcion,
          servicio.responsable,
          servicio.contacto,
          servicio.direccion,
          servicio.localidad,
        ]
          .map((value) => value || "")
          .some((value) => value.toLowerCase().includes(normalizedSearch))

      return matchesSection && matchesStatus && matchesSearch
    })
  }, [isTourismAdmin, search, servicios, statusFilter])

  const cargarServicios = async () => {
    const [{ data, error }, metrics] = await Promise.all([
      supabase
        .from("servicios")
        .select("*")
        .order("id", { ascending: false }),
      fetchAdminEngagementMetrics("servicios", "servicios"),
    ])

    if (error) {
      setSaveError(`Error al cargar servicios: ${error.message}`)
      return
    }

    setSaveError(metrics.warning)
    setServicios(mergeAdminEngagement(data || [], metrics.shareMap, metrics.whatsappMap))
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargarServicios()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const resetForm = () => {
    setFormData({
      ...initialForm,
      categoria: isTourismAdmin ? categoriasTurismo[0] : initialForm.categoria,
    })
    setEditingServicio(null)
    setIsFormOpen(false)
    setSaveError("")
    setSubmitMode("publish")
  }

  const openNewForm = () => {
    setFormData({
      ...initialForm,
      categoria: isTourismAdmin ? categoriasTurismo[0] : initialForm.categoria,
    })
    setEditingServicio(null)
    setIsFormOpen(true)
  }

  const handleEdit = (servicio: Servicio) => {
    setEditingServicio(servicio)
    setFormData({
      nombre: servicio.nombre || "",
      categoria: servicio.categoria || "",
      descripcion: servicio.descripcion || "",
      premium_detalle: servicio.premium_detalle || "",
      premium_galeria: (servicio.premium_galeria || []).join("\n"),
      premium_extra_titulo: servicio.premium_extra_titulo || "",
      premium_extra_detalle: servicio.premium_extra_detalle || "",
      premium_extra_galeria: (servicio.premium_extra_galeria || []).join("\n"),
      premium_activo: servicio.premium_activo ?? false,
      responsable: servicio.responsable || "",
      contacto: servicio.contacto || "",
      direccion: servicio.direccion || "",
      localidad: normalizeLocalidad(servicio.localidad),
      web_url: servicio.web_url || "",
      instagram_url: servicio.instagram_url || "",
      facebook_url: servicio.facebook_url || "",
      imagen: servicio.imagen || "",
      usa_whatsapp: servicio.usa_whatsapp ?? true,
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    const servicio = servicios.find((item) => item.id === id)
    if (!servicio) return

    const { error } = await supabase.from("servicios").delete().eq("id", id)

    if (error) {
      setSaveError(`Error al eliminar servicio: ${error.message}`)
      return
    }

    setServicios((prev) => prev.filter((item) => item.id !== id))
    setDeletingServicio(null)
    await safeLogAdminActivity({
      action: "Eliminar",
      section: "Servicios",
      target: servicio?.nombre || `ID ${id}`,
    })
  }

  const toggleFeatured = async (servicio: Servicio) => {
    const { error } = await supabase
      .from("servicios")
      .update({ destacado: !servicio.destacado })
      .eq("id", servicio.id)

    if (error) {
      setSaveError(`Error al cambiar destacado: ${error.message}`)
      return
    }

    setServicios((prev) =>
      prev.map((item) =>
        item.id === servicio.id
          ? { ...item, destacado: !servicio.destacado }
          : item
      )
    )

    await safeLogAdminActivity({
      action: !servicio.destacado ? "Destacar" : "Quitar destacado",
      section: "Servicios",
      target: servicio.nombre,
    })
  }

  const toggleVisibility = async (servicio: Servicio) => {
    const nextEstado = getNextContentState(servicio.estado)

    const { error } = await supabase
      .from("servicios")
      .update({ estado: nextEstado })
      .eq("id", servicio.id)

    if (error) {
      setSaveError(`Error al cambiar visibilidad: ${error.message}`)
      return
    }

    setServicios((prev) =>
      prev.map((item) =>
        item.id === servicio.id ? { ...item, estado: nextEstado } : item
      )
    )

    await safeLogAdminActivity({
      action: getVisibilityActivityAction(servicio.estado, nextEstado),
      section: "Servicios",
      target: servicio.nombre,
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const imageDataUrl = await fileToDataUrl(file)
      setFormData((prev) => ({ ...prev, imagen: imageDataUrl }))
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
    const isDraft = submitMode === "draft"
    const hasContact = formData.contacto.trim().length > 0

    if (!isDraft && !editingServicio && !formData.imagen) {
      setSaveError(`Tenes que cargar una foto para crear ${isTourismAdmin ? "una propuesta turística" : "un servicio"}.`)
      setLoading(false)
      return
    }

    const payload = {
      nombre: formData.nombre,
      categoria: formData.categoria,
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
      responsable: formData.responsable || null,
      contacto: formData.contacto || null,
      direccion: formData.direccion || null,
      localidad: formData.localidad || null,
      web_url: formData.web_url.trim() || null,
      instagram_url: formData.instagram_url.trim() || null,
      facebook_url: formData.facebook_url.trim() || null,
      imagen: formData.imagen || null,
      destacado: editingServicio?.destacado ?? false,
        estado: isDraft
          ? "borrador"
          : editingServicio?.estado === "oculto"
            ? "oculto"
            : "activo",
        usa_whatsapp: hasContact ? formData.usa_whatsapp : false,
      }

    if (editingServicio) {
      const { error } = await supabase
        .from("servicios")
        .update(payload)
        .eq("id", editingServicio.id)

      if (error) {
        setSaveError(`Error al actualizar servicio: ${error.message}`)
        setLoading(false)
        return
      }

      await safeLogAdminActivity({
        action: isDraft ? "Guardar borrador" : "Editar",
        section: "Servicios",
        target: formData.nombre || "Sin nombre",
      })
    } else {
      const { error } = await supabase.from("servicios").insert([payload])

      if (error) {
        setSaveError(`Error al guardar servicio: ${error.message}`)
        setLoading(false)
        return
      }

      await safeLogAdminActivity({
        action: isDraft ? "Crear borrador" : "Crear",
        section: "Servicios",
        target: formData.nombre || "Sin nombre",
      })
    }

    await cargarServicios()
    resetForm()
    setLoading(false)
  }

  const hasContact = formData.contacto.trim().length > 0

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(deletingServicio)}
        title="Eliminar servicio"
        description={`Vas a eliminar "${deletingServicio?.nombre || ""}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeletingServicio(null)}
        onConfirm={() => {
          if (deletingServicio) {
            void handleDelete(deletingServicio.id)
          }
        }}
      />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">
            {isTourismAdmin ? "Turismo" : "Servicios"}
          </h1>
          <p className="text-slate-500">
            {isTourismAdmin
              ? "Gestiona alojamientos, paseos, naturaleza y experiencias turísticas"
              : "Gestiona profesionales y otros servicios"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Marca como destacado los que quieres usar en la ventana de bienvenida.
          </p>
        </div>

        <button
          onClick={openNewForm}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-3 font-medium text-white transition hover:bg-amber-500"
        >
          <Plus className="h-5 w-5" />
          {isTourismAdmin ? "Agregar propuesta" : "Agregar Servicio"}
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
                {editingServicio
                  ? isTourismAdmin ? "Editar propuesta turística" : "Editar Servicio"
                  : isTourismAdmin ? "Agregar propuesta turística" : "Agregar Servicio"}
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Categoria *
                </label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(isTourismAdmin
                    ? categoriasTurismo
                    : categoriasServicio.filter((category) => !isTourismCategory(category))
                  ).map((categoria) => (
                    <label
                      key={categoria}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        formData.categoria === categoria
                          ? "border-amber-500 bg-amber-50 text-amber-800"
                          : "border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="categoria"
                        value={categoria}
                        checked={formData.categoria === categoria}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            categoria: e.target.value,
                          }))
                        }
                        className="h-4 w-4 border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span>{categoria}</span>
                    </label>
                  ))}
                </div>
              </div>

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
                  className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
                />
              </div>

              <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
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
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span>
                    Activar perfil premium para {isTourismAdmin ? "esta propuesta" : "este servicio"}
                  </span>
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
                      disabled={!formData.premium_activo && !isTourismAdmin}
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
                </div>
              </div>

              {formData.premium_activo || isTourismAdmin ? (
                <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                      {isTourismAdmin ? "Galería de fotos" : "Galerías premium"}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {isTourismAdmin
                        ? "Puedes cargar varias fotos de la propuesta turística de una sola vez."
                        : "Puedes subir imágenes para la galería principal y otra galería extra para destacar más contenido."}
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900">
                      {isTourismAdmin ? "Subir varias fotos" : "Subir imágenes a galería premium"}
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

                  <div className="rounded-2xl border border-white/80 bg-white/70 p-4">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
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
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
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
                          className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
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
                          placeholder={"Una URL por línea\nhttps://..."}
                          className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          Puedes sumar otra galería para destacar trabajos, ambientes o contenido adicional.
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => void handlePremiumGalleryChange(e, "premium_extra_galeria")}
                          className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-violet-100 file:px-4 file:py-2 file:font-medium file:text-violet-700 hover:file:bg-violet-200"
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
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Responsable
                  </label>
                  <input
                    type="text"
                    value={formData.responsable}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        responsable: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Contacto
                  </label>
                  <input
                    type="text"
                    value={formData.contacto}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contacto: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
                  />
                </div>
              </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasContact && formData.usa_whatsapp}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        usa_whatsapp: e.target.checked,
                      }))
                    }
                    disabled={!hasContact}
                    className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>
                    {hasContact
                      ? "Este contacto tiene WhatsApp"
                      : "Completa un contacto si quieres habilitar WhatsApp"}
                  </span>
                </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      direccion: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Localidad
                </label>
                <select
                  value={formData.localidad}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, localidad: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
                >
                  <option value="">Sin definir</option>
                  {LOCALIDADES.map((localidad) => (
                    <option key={localidad} value={localidad}>
                      {localidad}
                    </option>
                  ))}
                </select>
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-amber-500"
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-amber-50 file:px-4 file:py-2 file:font-medium file:text-amber-700 hover:file:bg-amber-100"
                  required={!editingServicio && !formData.imagen}
                />
                <p className="mt-2 text-sm text-slate-500">
                  Selecciona una foto para el servicio.
                </p>
                {formData.imagen && (
                  <div className="mt-4 space-y-3">
                    <img
                      src={formData.imagen}
                      alt="Vista previa del servicio"
                      className="h-40 w-full rounded-2xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, imagen: "" }))}
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
                  className="flex-1 rounded-xl bg-amber-600 py-3 font-medium text-white transition hover:bg-amber-500 disabled:opacity-60"
                >
                  {loading
                    ? "Guardando..."
                    : editingServicio
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
        total={servicios.length}
        visible={filteredServicios.length}
        placeholder="Buscar servicio, categoría o contacto"
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
      />

      {filteredServicios.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Métricas</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServicios.map((servicio) => (
                  <tr key={servicio.id} className="align-top transition hover:bg-slate-50/80">
                    <td className="max-w-sm px-4 py-4">
                      <div className="flex items-start gap-3">
                        {servicio.imagen ? (
                          <img
                            src={servicio.imagen}
                            alt={servicio.nombre}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                            <ShieldAlert className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-950">{servicio.nombre}</div>
                          <p className="mt-1 text-sm font-medium text-amber-600">
                            {servicio.categoria}
                          </p>
                          {servicio.descripcion ? (
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                              {servicio.descripcion}
                            </p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {servicio.destacado ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                <Star className="h-3 w-3 fill-current" />
                                Destacado
                              </span>
                            ) : null}
                            {servicio.premium_activo ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                                <Star className="h-3 w-3" />
                                Premium
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div className="font-medium text-slate-800">
                        {servicio.responsable || "Sin responsable"}
                      </div>
                      <div className="mt-1 text-slate-500">
                        {servicio.contacto || "Sin contacto"}
                      </div>
                      {servicio.direccion ? (
                        <div className="mt-1 text-slate-500">{servicio.direccion}</div>
                      ) : null}
                      {servicio.localidad ? (
                        <div className="mt-1 text-xs font-semibold text-sky-700">{servicio.localidad}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getContentStateBadgeClass(servicio.estado)}`}
                      >
                        {getContentStateLabel(servicio.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {subscriptionPlans[servicio.plan_suscripcion || "presencia"].shortLabel}
                        </span>
                        <span
                          className={`block w-fit rounded-full px-3 py-1 text-xs font-semibold ${getSubscriptionStatusBadge(servicio.estado_suscripcion)}`}
                        >
                          {getSubscriptionStatusLabel(servicio.estado_suscripcion)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          <Share2 className="h-3.5 w-3.5" />
                          {servicio.share_count || 0}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {servicio.whatsapp_count || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => toggleVisibility(servicio)}
                          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                          title={
                            servicio.estado === "borrador"
                              ? "Publicar borrador"
                              : servicio.estado === "oculto"
                                ? "Mostrar"
                                : "Ocultar"
                          }
                        >
                          {servicio.estado === "oculto" ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFeatured(servicio)}
                          className={`rounded-lg p-2 transition ${
                            servicio.destacado
                              ? "bg-amber-50 text-amber-700"
                              : "text-slate-500 hover:bg-slate-100"
                          }`}
                          title="Destacar"
                        >
                          <Star
                            className={`h-4 w-4 ${servicio.destacado ? "fill-current" : ""}`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(servicio)}
                          className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingServicio(servicio)}
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

      {filteredServicios.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
          <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">
            {servicios.length === 0 ? "No hay servicios" : "No encontramos resultados"}
          </h3>
          <p className="mb-4 text-slate-500">
            {servicios.length === 0
              ? "Agrega profesionales, alojamientos u otros servicios"
              : "Prueba con otra búsqueda o cambia el filtro."}
          </p>
          {servicios.length === 0 ? (
            <button
              onClick={openNewForm}
              className="rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition hover:bg-amber-500"
            >
              Agregar Servicio
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

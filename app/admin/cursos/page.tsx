'use client'

import { useEffect, useMemo, useState } from "react"
import { Eye, EyeOff, GraduationCap, MessageCircle, Pencil, Plus, Share2, Star, Trash2, X } from "lucide-react"
import { supabase } from "../../supabase"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { LOCALIDADES, normalizeLocalidad } from "../../lib/localidades"
import {
  AdminContentFilters,
  type AdminStatusFilter,
} from "../../components/admin/AdminContentFilters"
import { subscriptionPlans, type SubscriptionPlanKey } from "../../lib/subscriptionPlans"
import { getSubscriptionStatusBadge, getSubscriptionStatusLabel, type SubscriptionStatusKey } from "../../lib/subscriptionStatus"
import {
  fetchAdminEngagementMetrics,
  getContentStateBadgeClass,
  getContentStateLabel,
  getNextContentState,
  getVisibilityActivityAction,
  mergeAdminEngagement,
  safeLogAdminActivity,
} from "../../lib/adminContentActions"

type Curso = {
  id: number
  nombre: string
  descripcion: string
  plan_suscripcion?: SubscriptionPlanKey | null
  estado_suscripcion?: SubscriptionStatusKey | null
  responsable: string
  contacto: string
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

type CursoForm = Omit<
  Curso,
  "id" | "plan_suscripcion" | "estado_suscripcion" | "share_count" | "whatsapp_count"
>

const initialForm: CursoForm = {
  nombre: "",
  descripcion: "",
  responsable: "",
  contacto: "",
  localidad: "",
  web_url: "",
  instagram_url: "",
  facebook_url: "",
  imagen: "",
  usa_whatsapp: true,
}

export default function AdminCursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null)
  const [formData, setFormData] = useState<CursoForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deletingCurso, setDeletingCurso] = useState<Curso | null>(null)
  const [submitMode, setSubmitMode] = useState<"publish" | "draft">("publish")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>("all")

  const filteredCursos = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return cursos.filter((curso) => {
      const matchesStatus =
        statusFilter === "all" || (curso.estado || "activo") === statusFilter
      const matchesSearch =
        !normalizedSearch ||
        [curso.nombre, curso.descripcion, curso.responsable, curso.contacto, curso.localidad]
          .map((value) => value || "")
          .some((value) => value.toLowerCase().includes(normalizedSearch))

      return matchesStatus && matchesSearch
    })
  }, [cursos, search, statusFilter])

  const cargarCursos = async () => {
    const [{ data, error }, metrics] = await Promise.all([
      supabase
        .from("cursos")
        .select("*")
        .order("id", { ascending: false }),
      fetchAdminEngagementMetrics("cursos", "cursos"),
    ])

    if (error) {
      setSaveError(`Error al cargar cursos: ${error.message}`)
      return
    }

    setSaveError(metrics.warning)
    setCursos(mergeAdminEngagement(data || [], metrics.shareMap, metrics.whatsappMap))
  }

  const saveCurso = async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/admin/cursos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = (await response.json().catch(() => ({}))) as {
      error?: string
    }

    if (!response.ok) {
      throw new Error(result.error || "No pudimos guardar el curso.")
    }
  }

  const logCursoActivity = async (
    action: string,
    target: string,
  ) => {
    try {
      await safeLogAdminActivity({ action, section: "Cursos", target })
    } catch {
      // El registro de actividad no debe bloquear el guardado del curso.
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargarCursos()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const resetForm = () => {
    setFormData(initialForm)
    setEditingCurso(null)
    setIsFormOpen(false)
    setSaveError("")
    setSubmitMode("publish")
  }

  const toggleFeatured = async (curso: Curso) => {
    const { error } = await supabase
      .from("cursos")
      .update({ destacado: !curso.destacado })
      .eq("id", curso.id)

    if (error) {
      setSaveError(`Error al cambiar destacado: ${error.message}`)
      return
    }

    setCursos((prev) =>
      prev.map((item) =>
        item.id === curso.id ? { ...item, destacado: !curso.destacado } : item
      )
    )

    await safeLogAdminActivity({
      action: !curso.destacado ? "Destacar" : "Quitar destacado",
      section: "Cursos",
      target: curso.nombre,
    })
  }

  const toggleVisibility = async (curso: Curso) => {
    const nextEstado = getNextContentState(curso.estado)

    const { error } = await supabase
      .from("cursos")
      .update({ estado: nextEstado })
      .eq("id", curso.id)

    if (error) {
      setSaveError(`Error al cambiar visibilidad: ${error.message}`)
      return
    }

    setCursos((prev) =>
      prev.map((item) =>
        item.id === curso.id ? { ...item, estado: nextEstado } : item
      )
    )

    await safeLogAdminActivity({
      action: getVisibilityActivityAction(curso.estado, nextEstado),
      section: "Cursos",
      target: curso.nombre,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveError("")
    const isDraft = submitMode === "draft"
    const hasContact = formData.contacto.trim().length > 0

    if (!isDraft && !editingCurso && !formData.imagen) {
      setSaveError("Tenes que cargar una foto para crear un curso o clase.")
      setLoading(false)
      return
    }

    const payload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      responsable: formData.responsable,
      contacto: formData.contacto,
      localidad: formData.localidad || null,
      web_url: formData.web_url?.trim() || null,
      instagram_url: formData.instagram_url?.trim() || null,
      facebook_url: formData.facebook_url?.trim() || null,
      imagen: formData.imagen || null,
      destacado: editingCurso?.destacado ?? false,
        estado: isDraft
          ? "borrador"
          : editingCurso?.estado === "oculto"
            ? "oculto"
            : "activo",
        usa_whatsapp: hasContact ? formData.usa_whatsapp : false,
      }

    try {
      await saveCurso({
        ...payload,
        id: editingCurso?.id ?? null,
      })

      await logCursoActivity(
        editingCurso
          ? isDraft
            ? "Guardar borrador"
            : "Editar"
          : isDraft
            ? "Crear borrador"
            : "Crear",
        formData.nombre || "Sin nombre",
      )

      await cargarCursos()
      resetForm()
    } catch (error) {
      const action = editingCurso ? "actualizar" : "guardar"
      setSaveError(
        `Error al ${action} curso: ${
          error instanceof Error ? error.message : "No pudimos completar la solicitud."
        }`
      )
    } finally {
      setLoading(false)
    }
  }

  const hasContact = formData.contacto.trim().length > 0

  const handleEdit = (curso: Curso) => {
    setEditingCurso(curso)
    setFormData({
      nombre: curso.nombre,
      descripcion: curso.descripcion,
      responsable: curso.responsable,
      contacto: curso.contacto,
      localidad: normalizeLocalidad(curso.localidad),
      web_url: curso.web_url || "",
      instagram_url: curso.instagram_url || "",
      facebook_url: curso.facebook_url || "",
      imagen: curso.imagen,
      usa_whatsapp: curso.usa_whatsapp ?? true,
    })
    setIsFormOpen(true)
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

  const handleDelete = async (id: number) => {
    const curso = cursos.find((item) => item.id === id)

    const { error } = await supabase.from("cursos").delete().eq("id", id)

    if (error) {
      setSaveError(`Error al eliminar curso: ${error.message}`)
      return
    }

    setCursos((prev) => prev.filter((item) => item.id !== id))
    setDeletingCurso(null)
    await safeLogAdminActivity({
      action: "Eliminar",
      section: "Cursos",
      target: curso?.nombre || `ID ${id}`,
    })
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(deletingCurso)}
        title="Eliminar curso o clase"
        description={`Vas a eliminar "${deletingCurso?.nombre || ""}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeletingCurso(null)}
        onConfirm={() => {
          if (deletingCurso) {
            void handleDelete(deletingCurso.id)
          }
        }}
      />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">
            Cursos y Clases
          </h1>
          <p className="text-slate-500">
            Gestiona propuestas educativas y clases de la ciudad
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Marca como destacado los cursos que quieres mostrar al ingresar.
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-medium text-white transition hover:bg-violet-500"
        >
          <Plus className="h-5 w-5" />
          Agregar Curso/Clase
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
                {editingCurso ? "Editar Curso/Clase" : "Agregar Curso/Clase"}
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Descripción *
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      descripcion: e.target.value,
                    }))
                  }
                  className="h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Responsable *
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                    required
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                  />
                </div>
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                >
                  <option value="">Sin definir</option>
                  {LOCALIDADES.map((localidad) => (
                    <option key={localidad} value={localidad}>
                      {localidad}
                    </option>
                  ))}
                </select>
              </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasContact && (formData.usa_whatsapp ?? true)}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        usa_whatsapp: e.target.checked,
                      }))
                    }
                    disabled={!hasContact}
                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span>
                    {hasContact
                      ? "Este contacto tiene WhatsApp"
                      : "Completa un contacto si quieres habilitar WhatsApp"}
                  </span>
                </label>

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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:font-medium file:text-violet-700 hover:file:bg-violet-100"
                  required={!editingCurso && !formData.imagen}
                />
                <p className="mt-2 text-sm text-slate-500">
                  Selecciona una foto para el curso o clase.
                </p>
                {formData.imagen && (
                  <div className="mt-4 space-y-3">
                    <img
                      src={formData.imagen}
                      alt="Vista previa del curso"
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
                  className="flex-1 rounded-xl bg-violet-600 py-3 font-medium text-white transition hover:bg-violet-500 disabled:opacity-60"
                >
                  {loading
                    ? "Guardando..."
                    : editingCurso
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
        total={cursos.length}
        visible={filteredCursos.length}
        placeholder="Buscar curso, responsable o contacto"
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
      />

      {filteredCursos.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-4 py-3">Curso</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Métricas</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCursos.map((curso) => (
                  <tr key={curso.id} className="align-top transition hover:bg-slate-50/80">
                    <td className="max-w-sm px-4 py-4">
                      <div className="flex items-start gap-3">
                        {curso.imagen ? (
                          <img
                            src={curso.imagen}
                            alt={curso.nombre}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                            <GraduationCap className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-950">{curso.nombre}</div>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                            {curso.descripcion}
                          </p>
                          {curso.destacado ? (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                              <Star className="h-3 w-3 fill-current" />
                              Destacado
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div className="font-medium text-slate-800">{curso.responsable}</div>
                      <div className="mt-1 text-slate-500">{curso.contacto || "Sin contacto"}</div>
                      {curso.localidad ? (
                        <div className="mt-1 text-xs font-semibold text-sky-700">{curso.localidad}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getContentStateBadgeClass(curso.estado)}`}
                      >
                        {getContentStateLabel(curso.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {subscriptionPlans[curso.plan_suscripcion || "presencia"].shortLabel}
                        </span>
                        <span
                          className={`block w-fit rounded-full px-3 py-1 text-xs font-semibold ${getSubscriptionStatusBadge(curso.estado_suscripcion)}`}
                        >
                          {getSubscriptionStatusLabel(curso.estado_suscripcion)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          <Share2 className="h-3.5 w-3.5" />
                          {curso.share_count || 0}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {curso.whatsapp_count || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => toggleVisibility(curso)}
                          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                          title={
                            curso.estado === "borrador"
                              ? "Publicar borrador"
                              : curso.estado === "oculto"
                                ? "Mostrar"
                                : "Ocultar"
                          }
                        >
                          {curso.estado === "oculto" ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFeatured(curso)}
                          className={`rounded-lg p-2 transition ${
                            curso.destacado
                              ? "bg-violet-50 text-violet-700"
                              : "text-slate-500 hover:bg-slate-100"
                          }`}
                          title="Destacar"
                        >
                          <Star className={`h-4 w-4 ${curso.destacado ? "fill-current" : ""}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(curso)}
                          className="rounded-lg p-2 text-violet-600 transition hover:bg-violet-50"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCurso(curso)}
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

      {filteredCursos.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
          <GraduationCap className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">
            {cursos.length === 0 ? "No hay cursos o clases" : "No encontramos resultados"}
          </h3>
          <p className="mb-4 text-slate-500">
            {cursos.length === 0
              ? "Comienza agregando tu primera propuesta educativa"
              : "Prueba con otra búsqueda o cambia el filtro."}
          </p>
          {cursos.length === 0 ? (
            <button
              onClick={() => setIsFormOpen(true)}
              className="rounded-xl bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500"
            >
              Agregar Curso/Clase
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

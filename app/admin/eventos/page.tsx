'use client'

import { useEffect, useMemo, useState } from "react"
import { Calendar, Copy, Eye, EyeOff, Pencil, Plus, Share2, Trash2, X } from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { buildShareCountMap } from "../../lib/shareTracking"
import { supabase } from "../../supabase"
import { logAdminActivity } from "../../lib/adminActivity"
import { buildMonthEventRange, formatEventDateRange } from "../../lib/eventDates"
import { buildEventDescription, parseEventDescription } from "../../lib/eventSubmissionMeta"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import { LOCALIDADES, normalizeLocalidad } from "../../lib/localidades"
import { userEntityLabels, type UserEntityType } from "../../lib/userProfiles"

type Evento = {
  id: number
  titulo: string
  categoria?: string | null
  fecha: string
  fecha_fin?: string | null
  fecha_solo_mes?: boolean | null
  ubicacion: string
  localidad?: string | null
  telefono?: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  descripcion: string
  imagen?: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
  share_count?: number
  owner_email?: string | null
  related_entity_type?: UserEntityType | null
  related_entity_id?: number | null
}

type EventoForm = {
  titulo: string
  categoria: string
  fecha: string
  fechaFin: string
  fechaSoloMes: boolean
  mesReferencia: string
  ubicacion: string
  localidad: string
  telefono: string
  web_url: string
  instagram_url: string
  facebook_url: string
  descripcion: string
  imagen: string
  usaWhatsapp: boolean
  relatedEntityType: UserEntityType | ""
  relatedEntityId: string
}

type SorteoEntityType = Extract<UserEntityType, "comercio" | "servicio" | "institucion">
type OwnerOption = {
  id: number
  nombre: string
}

const initialForm: EventoForm = {
  titulo: "",
  categoria: "Evento",
  fecha: "",
  fechaFin: "",
  fechaSoloMes: false,
  mesReferencia: "",
  ubicacion: "",
  localidad: "",
  telefono: "",
  web_url: "",
  instagram_url: "",
  facebook_url: "",
  descripcion: "",
  imagen: "",
  usaWhatsapp: true,
  relatedEntityType: "",
  relatedEntityId: "",
}

const normalizeAdminEventCategory = (categoria?: string | null) => {
  const value = categoria?.trim()
  if (!value) return "Evento"
  if (value.toLowerCase() === "beneficios") return "Beneficio"
  return value
}

const categoriasEvento = ["Evento", "Promocion", "Sorteo", "Beneficio", "Consulta"]

const isMissingRelatedEntityColumn = (message: string) =>
  message.includes("related_entity_id") || message.includes("related_entity_type")

const stripRelatedEntityFields = (payload: Record<string, unknown>) => {
  const nextPayload = { ...payload }
  delete nextPayload.related_entity_type
  delete nextPayload.related_entity_id
  return nextPayload
}

export default function AdminEventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [activeTab, setActiveTab] = useState<"vigentes" | "pasados" | "borradores">("vigentes")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null)
  const [formData, setFormData] = useState<EventoForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deletingEvento, setDeletingEvento] = useState<Evento | null>(null)
  const [submitMode, setSubmitMode] = useState<"publish" | "draft">("publish")
  const [search, setSearch] = useState("")
  const [ownerOptions, setOwnerOptions] = useState<Record<SorteoEntityType, OwnerOption[]>>({
    comercio: [],
    servicio: [],
    institucion: [],
  })
  const today = new Date().toISOString().slice(0, 10)

  const isPastEvent = (evento: Evento) => {
    const endDate = evento.fecha_fin || evento.fecha
    return endDate < today
  }

  const cargarEventos = async () => {
    const [{ data, error }, { data: shareRows, error: shareError }] = await Promise.all([
      supabase
        .from("eventos")
        .select("*")
        .order("fecha", { ascending: true }),
      supabase.from("share_events").select("item_id").eq("section", "eventos"),
    ])

    if (error) {
      setSaveError(`Error al cargar eventos: ${error.message}`)
      return
    }

    const warnings: string[] = []
    if (shareError) {
      warnings.push(`No se pudieron cargar los compartidos de eventos: ${shareError.message}`)
    }

    const shareMap = buildShareCountMap(shareRows || [])
    setSaveError(warnings.join(" "))
    setEventos(
      (data || []).map((evento) => ({
        ...evento,
        share_count: shareMap[String(evento.id)] || 0,
      }))
    )
  }

  const cargarOwnerOptions = async () => {
    const [comerciosResult, serviciosResult, institucionesResult] = await Promise.all([
      supabase.from("comercios").select("id, nombre").order("nombre", { ascending: true }),
      supabase.from("servicios").select("id, nombre").order("nombre", { ascending: true }),
      supabase.from("instituciones").select("id, nombre").order("nombre", { ascending: true }),
    ])

    if (comerciosResult.error || serviciosResult.error || institucionesResult.error) {
      setSaveError(
        comerciosResult.error?.message ||
          serviciosResult.error?.message ||
          institucionesResult.error?.message ||
          "No pudimos cargar los perfiles para sorteos."
      )
      return
    }

    setOwnerOptions({
      comercio: (comerciosResult.data || []) as OwnerOption[],
      servicio: (serviciosResult.data || []) as OwnerOption[],
      institucion: (institucionesResult.data || []) as OwnerOption[],
    })
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void cargarEventos()
      void cargarOwnerOptions()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const normalizedSearch = search.trim().toLowerCase()
  const visibleEventos = eventos.filter((evento) => {
    const matchesTab =
      activeTab === "borradores"
        ? evento.estado === "borrador"
        : evento.estado !== "borrador" &&
          (activeTab === "vigentes" ? !isPastEvent(evento) : isPastEvent(evento))
    const parsedDescription = parseEventDescription(evento.descripcion)
    const matchesSearch =
      !normalizedSearch ||
      [
        evento.titulo,
        normalizeAdminEventCategory(evento.categoria),
        evento.ubicacion,
        evento.localidad,
        evento.telefono,
        parsedDescription.baseDescription,
        parsedDescription.submissionContact?.senderName,
        parsedDescription.submissionContact?.senderPhone,
      ]
        .map((value) => value || "")
        .some((value) => value.toLowerCase().includes(normalizedSearch))

    return matchesTab && matchesSearch
  })
  const vigentesCount = eventos.filter(
    (evento) => evento.estado !== "borrador" && !isPastEvent(evento)
  ).length
  const pasadosCount = eventos.filter(
    (evento) => evento.estado !== "borrador" && isPastEvent(evento)
  ).length
  const borradoresCount = eventos.filter((evento) => evento.estado === "borrador").length

  const resetForm = () => {
    setFormData(initialForm)
    setEditingEvento(null)
    setIsFormOpen(false)
    setSaveError("")
    setSubmitMode("publish")
  }

  const handleEdit = (evento: Evento) => {
    setEditingEvento(evento)
    setFormData({
      titulo: evento.titulo || "",
      categoria: normalizeAdminEventCategory(evento.categoria),
      fecha: evento.fecha || "",
      fechaFin: evento.fecha_fin || "",
      fechaSoloMes: evento.fecha_solo_mes ?? false,
      mesReferencia:
        evento.fecha_solo_mes && evento.fecha ? String(evento.fecha).slice(0, 7) : "",
      ubicacion: evento.ubicacion || "",
      localidad: normalizeLocalidad(evento.localidad),
      telefono: evento.telefono || "",
      web_url: evento.web_url || "",
      instagram_url: evento.instagram_url || "",
      facebook_url: evento.facebook_url || "",
      descripcion: parseEventDescription(evento.descripcion).baseDescription || "",
      imagen: evento.imagen || "",
      usaWhatsapp: evento.usa_whatsapp ?? true,
      relatedEntityType: evento.related_entity_type || "",
      relatedEntityId: evento.related_entity_id ? String(evento.related_entity_id) : "",
    })
    setIsFormOpen(true)
  }

  const availableSorteoTypes = useMemo(
    () =>
      (Object.keys(ownerOptions) as SorteoEntityType[]).filter(
        (type) => ownerOptions[type].length > 0
      ),
    [ownerOptions]
  )

  const selectedSorteoOptions =
    formData.relatedEntityType &&
    ["comercio", "servicio", "institucion"].includes(formData.relatedEntityType)
      ? ownerOptions[formData.relatedEntityType as SorteoEntityType]
      : []

  const getDefaultSorteoSelection = (preferredType?: SorteoEntityType | "") => {
    const fallbackType =
      preferredType && ownerOptions[preferredType]?.length > 0
        ? preferredType
        : availableSorteoTypes[0] || ""

    return {
      relatedEntityType: fallbackType,
      relatedEntityId: fallbackType && ownerOptions[fallbackType][0]
        ? String(ownerOptions[fallbackType][0].id)
        : "",
    }
  }

  const handleDelete = async (id: number) => {
    const evento = eventos.find((item) => item.id === id)
    if (!evento) return

    const { error } = await supabase.from("eventos").delete().eq("id", id)

    if (error) {
      setSaveError(`Error al eliminar evento: ${error.message}`)
      return
    }

    setEventos((prev) => prev.filter((item) => item.id !== id))
    setDeletingEvento(null)
    await logAdminActivity({
      action: "Eliminar",
      section: "Eventos",
      target: evento?.titulo || `ID ${id}`,
    })
  }

  const handleDuplicate = async (evento: Evento) => {
    setLoading(true)
    setSaveError("")

    const payload: Record<string, unknown> = {
      titulo: `${evento.titulo} (copia)`,
      categoria: normalizeAdminEventCategory(evento.categoria),
      fecha: evento.fecha,
      fecha_fin: evento.fecha_fin || null,
      fecha_solo_mes: evento.fecha_solo_mes ?? false,
      ubicacion: evento.ubicacion,
      localidad: evento.localidad || null,
      telefono: evento.telefono || null,
      web_url: evento.web_url?.trim() || null,
      instagram_url: evento.instagram_url?.trim() || null,
      facebook_url: evento.facebook_url?.trim() || null,
      descripcion: evento.descripcion,
      imagen: evento.imagen || null,
      estado: "borrador",
      usa_whatsapp: evento.usa_whatsapp ?? true,
      owner_email: evento.owner_email || null,
    }

    if (evento.related_entity_type && evento.related_entity_id) {
      payload.related_entity_type = evento.related_entity_type
      payload.related_entity_id = evento.related_entity_id
    }

    let { error } = await supabase.from("eventos").insert([payload])

    if (error && isMissingRelatedEntityColumn(error.message)) {
      const retry = await supabase.from("eventos").insert([stripRelatedEntityFields(payload)])
      error = retry.error
    }

    if (error) {
      setSaveError(`Error al duplicar evento: ${error.message}`)
      setLoading(false)
      return
    }

    await logAdminActivity({
      action: "Duplicar a borrador",
      section: "Eventos",
      target: evento.titulo,
    })

    await cargarEventos()
    setLoading(false)
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

  const toggleVisibility = async (evento: Evento) => {
    const nextEstado =
      evento.estado === "oculto" || evento.estado === "borrador"
        ? "activo"
        : "oculto"

    const { error } = await supabase
      .from("eventos")
      .update({ estado: nextEstado })
      .eq("id", evento.id)

    if (error) {
      setSaveError(`Error al cambiar visibilidad: ${error.message}`)
      return
    }

    setEventos((prev) =>
      prev.map((item) =>
        item.id === evento.id ? { ...item, estado: nextEstado } : item
      )
    )

    await logAdminActivity({
      action:
        nextEstado === "activo"
          ? evento.estado === "borrador"
            ? "Publicar borrador"
            : "Mostrar"
          : "Ocultar",
      section: "Eventos",
      target: evento.titulo,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveError("")
    const isDraft = submitMode === "draft"
    const hasPhone = formData.telefono.trim().length > 0

    if (!isDraft && !editingEvento && !formData.imagen) {
      setSaveError("Tenes que cargar una foto para crear un evento.")
      setLoading(false)
      return
    }

    const monthRange = formData.fechaSoloMes
      ? buildMonthEventRange(formData.mesReferencia)
      : null

    if (formData.fechaSoloMes && !monthRange) {
      setSaveError("Selecciona el mes en el que quieres mostrar el evento.")
      setLoading(false)
      return
    }

    const startDate = monthRange?.startDate || formData.fecha
    const endDate = monthRange?.endDate || formData.fechaFin || null

    if (!isDraft && formData.fechaSoloMes && endDate && endDate < today) {
      setSaveError("El mes del evento no puede ser anterior al mes actual.")
      setLoading(false)
      return
    }

    if (!isDraft && !formData.fechaSoloMes && startDate < today) {
      setSaveError("La fecha del evento no puede ser anterior a hoy.")
      setLoading(false)
      return
    }

    if (!isDraft && !formData.fechaSoloMes && endDate && endDate < startDate) {
      setSaveError("La fecha final no puede ser anterior a la fecha inicial.")
      setLoading(false)
      return
    }

    if (formData.categoria === "Sorteo" && (!formData.relatedEntityType || !formData.relatedEntityId)) {
      setSaveError("Selecciona el perfil vinculado al sorteo.")
      setLoading(false)
      return
    }

    const payload: Record<string, unknown> = {
      titulo: formData.titulo,
      categoria: formData.categoria,
      fecha: startDate,
      fecha_fin: endDate,
      fecha_solo_mes: formData.fechaSoloMes,
      ubicacion: formData.ubicacion,
      localidad: formData.localidad || null,
      telefono: formData.telefono || null,
      web_url: formData.web_url.trim() || null,
      instagram_url: formData.instagram_url.trim() || null,
      facebook_url: formData.facebook_url.trim() || null,
      descripcion: buildEventDescription(
        formData.descripcion,
        editingEvento
          ? parseEventDescription(editingEvento.descripcion).submissionContact
          : null
      ),
      imagen: formData.imagen || null,
      estado: isDraft
        ? "borrador"
        : editingEvento?.estado === "oculto"
          ? "oculto"
          : "activo",
      usa_whatsapp: hasPhone ? formData.usaWhatsapp : false,
    }

    if (formData.categoria === "Sorteo") {
      payload.related_entity_type = formData.relatedEntityType
      payload.related_entity_id = Number(formData.relatedEntityId)
    }

    if (editingEvento) {
      let { error } = await supabase
        .from("eventos")
        .update(payload)
        .eq("id", editingEvento.id)

      if (error && isMissingRelatedEntityColumn(error.message)) {
        const retry = await supabase
          .from("eventos")
          .update(stripRelatedEntityFields(payload))
          .eq("id", editingEvento.id)
        error = retry.error
      }

      if (error) {
        setSaveError(`Error al actualizar evento: ${error.message}`)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: isDraft ? "Guardar borrador" : "Editar",
        section: "Eventos",
        target: formData.titulo || "Sin titulo",
      })
    } else {
      let { error } = await supabase.from("eventos").insert([payload])

      if (error && isMissingRelatedEntityColumn(error.message)) {
        const retry = await supabase.from("eventos").insert([stripRelatedEntityFields(payload)])
        error = retry.error
      }

      if (error) {
        setSaveError(`Error al guardar evento: ${error.message}`)
        setLoading(false)
        return
      }

      await logAdminActivity({
        action: isDraft ? "Crear borrador" : "Crear",
        section: "Eventos",
        target: formData.titulo || "Sin titulo",
      })
    }

    await cargarEventos()
    resetForm()
    setLoading(false)
  }

  const hasPhone = formData.telefono.trim().length > 0

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(deletingEvento)}
        title="Eliminar evento"
        description={`Vas a eliminar "${deletingEvento?.titulo || ""}". Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeletingEvento(null)}
        onConfirm={() => {
          if (deletingEvento) {
            void handleDelete(deletingEvento.id)
          }
        }}
      />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">Eventos</h1>
          <p className="text-slate-500">Gestiona los eventos de la ciudad</p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500"
        >
          <Plus className="h-5 w-5" />
          Agregar Evento
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
                {editingEvento ? "Editar Evento" : "Agregar Evento"}
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
                  Título del Evento *
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, titulo: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Categoria *
                </label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {categoriasEvento.map((categoria) => (
                    <label
                      key={categoria}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        formData.categoria === categoria
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="categoria"
                        value={categoria}
                        checked={formData.categoria === categoria}
                        onChange={(e) =>
                          setFormData((prev) => {
                            const nextCategory = e.target.value

                            if (nextCategory !== "Sorteo") {
                              return {
                                ...prev,
                                categoria: nextCategory,
                                relatedEntityType: "",
                                relatedEntityId: "",
                              }
                            }

                            return {
                              ...prev,
                              categoria: nextCategory,
                              ...getDefaultSorteoSelection(prev.relatedEntityType as SorteoEntityType | ""),
                            }
                          })
                        }
                        className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{categoria}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formData.categoria === "Sorteo" ? (
                <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div>
                    <div className="text-sm font-semibold text-amber-950">
                      Perfil vinculado al sorteo
                    </div>
                    <p className="mt-1 text-sm text-amber-900">
                      Elige si este sorteo corresponde a un comercio, servicio o institución.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {availableSorteoTypes.map((type) => (
                      <label
                        key={type}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                          formData.relatedEntityType === type
                            ? "border-amber-500 bg-white text-amber-900"
                            : "border-amber-200 bg-white/80 text-slate-700 hover:border-amber-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="relatedEntityType"
                          value={type}
                          checked={formData.relatedEntityType === type}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              ...getDefaultSorteoSelection(e.target.value as SorteoEntityType),
                            }))
                          }
                          className="h-4 w-4 border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span>{userEntityLabels[type]}</span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900">
                      Selecciona el perfil
                    </label>
                    <select
                      value={formData.relatedEntityId}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, relatedEntityId: e.target.value }))
                      }
                      className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 outline-none transition focus:border-amber-500"
                    >
                      <option value="">Selecciona una opción</option>
                      {selectedSorteoOptions.map((item) => (
                        <option key={`${formData.relatedEntityType}-${item.id}`} value={item.id}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.fechaSoloMes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fechaSoloMes: e.target.checked,
                        mesReferencia: e.target.checked ? prev.mesReferencia : "",
                        fecha: e.target.checked ? "" : prev.fecha,
                        fechaFin: e.target.checked ? "" : prev.fechaFin,
                      }))
                    }
                    className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Todavía no tengo el día exacto, mostrar solo el mes</span>
                </label>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {formData.fechaSoloMes ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-900">
                        Mes del evento *
                      </label>
                      <input
                        type="month"
                        value={formData.mesReferencia}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, mesReferencia: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                        required
                      />
                      <p className="mt-2 text-sm text-slate-500">
                        En la web se mostrará como “abril de 2026”.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-900">
                          Fecha desde *
                        </label>
                        <input
                          type="date"
                          value={formData.fecha}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, fecha: e.target.value }))
                          }
                          min={today}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-900">
                          Fecha hasta
                        </label>
                        <input
                          type="date"
                          value={formData.fechaFin}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, fechaFin: e.target.value }))
                          }
                          min={formData.fecha || today}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                        />
                        <p className="mt-2 text-sm text-slate-500">
                          Opcional. Ejemplo: del 12 al 14 de mayo.
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-900">
                      Ubicacion *
                    </label>
                    <input
                      type="text"
                      value={formData.ubicacion}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ubicacion: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                      required
                    />
                  </div>
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  >
                    <option value="">Sin definir</option>
                    {LOCALIDADES.map((localidad) => (
                      <option key={localidad} value={localidad}>
                        {localidad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Telefono
                </label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      telefono: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                />
                <p className="mt-2 text-sm text-slate-500">
                  Opcional. Si lo completas, se mostrara para llamar o escribir.
                </p>
              </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasPhone && formData.usaWhatsapp}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        usaWhatsapp: e.target.checked,
                      }))
                    }
                    disabled={!hasPhone}
                    className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    {hasPhone
                      ? "Este numero tiene WhatsApp"
                      : "Completa un telefono si quieres habilitar WhatsApp"}
                  </span>
                </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Descripcion *
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      descripcion: e.target.value,
                    }))
                  }
                  className="h-32 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
                  required
                />
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500"
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
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:font-medium file:text-emerald-600 hover:file:bg-emerald-100"
                  required={!editingEvento && !formData.imagen}
                />
                <p className="mt-2 text-sm text-slate-500">
                  Selecciona una foto para el evento.
                </p>
                {formData.imagen && (
                  <div className="mt-4 space-y-3">
                    <img
                      src={formData.imagen}
                      alt="Vista previa del evento"
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
                  className="flex-1 rounded-xl bg-emerald-600 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
                >
                  {loading
                    ? "Guardando..."
                    : editingEvento
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

      <div className="mb-6 flex flex-wrap gap-3">
        {[
          { id: "vigentes" as const, label: `Vigentes (${vigentesCount})` },
          { id: "pasados" as const, label: `Pasados (${pasadosCount})` },
          { id: "borradores" as const, label: `Borradores (${borradoresCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="event-search">
          Buscar eventos
        </label>
        <input
          id="event-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por título, categoría, ubicación o contacto"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
        />
        <p className="mt-2 text-xs text-slate-500">
          Mostrando {visibleEventos.length} de {eventos.length} eventos.
        </p>
      </div>

      {visibleEventos.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Evento</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Contacto</th>
                  <th className="px-5 py-3">Métricas</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visibleEventos.map((evento) => {
                  const parsedDescription = parseEventDescription(evento.descripcion)

                  return (
                    <tr key={evento.id} className="align-top transition hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="flex min-w-[280px] items-start gap-3">
                          {evento.imagen ? (
                            <img
                              src={evento.imagen}
                              alt={evento.titulo}
                              className="h-12 w-12 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                              <Calendar className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">{evento.titulo}</div>
                            <div className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                              {normalizeAdminEventCategory(evento.categoria)}
                            </div>
                            <p className="mt-2 line-clamp-2 max-w-md text-xs leading-5 text-slate-500">
                              {parsedDescription.baseDescription}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <Calendar className="h-4 w-4 text-emerald-600" />
                          {formatEventDateRange(evento.fecha, evento.fecha_fin, evento.fecha_solo_mes ?? false)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{evento.ubicacion}</div>
                        {evento.localidad ? (
                          <div className="mt-1 text-xs font-semibold text-sky-700">{evento.localidad}</div>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            evento.estado === "borrador"
                              ? "bg-amber-100 text-amber-700"
                              : evento.estado === "oculto"
                                ? "bg-slate-200 text-slate-700"
                                : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {evento.estado === "borrador"
                            ? "borrador"
                            : evento.estado === "oculto"
                              ? "oculto"
                              : "visible"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <div className="space-y-1">
                          <div>{evento.telefono || "Sin teléfono"}</div>
                          {parsedDescription.submissionContact ? (
                            <div className="rounded-lg bg-sky-50 px-2 py-1 text-xs text-sky-900">
                              {parsedDescription.submissionContact.senderName} - {parsedDescription.submissionContact.senderPhone}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <Share2 className="h-3.5 w-3.5" />
                          {evento.share_count || 0} compartidos
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => void handleDuplicate(evento)}
                            disabled={loading}
                            className="rounded-lg p-2 text-sky-600 transition hover:bg-sky-50 disabled:opacity-60"
                            title="Duplicar en borrador"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleVisibility(evento)}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                            title={
                              evento.estado === "borrador"
                                ? "Publicar borrador"
                                : evento.estado === "oculto"
                                  ? "Mostrar"
                                  : "Ocultar"
                            }
                          >
                            {evento.estado === "oculto" ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(evento)}
                            className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingEvento(evento)}
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

      {visibleEventos.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
          <Calendar className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">
            {search.trim()
              ? "No encontramos resultados"
              : activeTab === "vigentes"
                ? "No hay eventos vigentes"
                : activeTab === "pasados"
                  ? "No hay eventos pasados"
                  : "No hay borradores"}
          </h3>
          <p className="mb-4 text-slate-500">
            {search.trim()
              ? "Prueba con otra búsqueda o cambia de pestaña."
              : activeTab === "vigentes"
                ? "Comienza agregando tu primer evento"
                : activeTab === "pasados"
                  ? "Todavía no hay eventos que hayan pasado."
                  : "Los eventos guardados como borrador aparecerán acá."}
          </p>
          {activeTab === "vigentes" && !search.trim() ? (
            <button
              onClick={() => setIsFormOpen(true)}
              className="rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-500"
            >
              Agregar Evento
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

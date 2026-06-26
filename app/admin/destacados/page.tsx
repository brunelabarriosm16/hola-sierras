'use client'

import { useEffect, useMemo, useState } from "react"
import {
  Building2,
  Clock,
  Eye,
  EyeOff,
  GraduationCap,
  ImageIcon,
  Megaphone,
  Pencil,
  Plus,
  ShieldAlert,
  Store,
  Trash2,
  X,
} from "lucide-react"
import { AdminConfirmModal } from "../../components/AdminConfirmModal"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import { safeLogAdminActivity } from "../../lib/adminContentActions"
import { supabase } from "../../supabase"

type ProposalType = "institucion" | "comercio" | "servicio" | "curso" | "turismo"
type StatusFilter = "all" | "activo" | "inactivo"

type Highlight = {
  id: number
  imagen: string
  tipo_propuesta: ProposalType
  propuesta_id: number
  activo: boolean
  espera_segundos: number
  created_at?: string | null
}

type ProposalOption = {
  id: number
  label: string
  description?: string | null
}

type HighlightForm = {
  imagen: string
  tipo_propuesta: ProposalType
  propuesta_id: string
  activo: boolean
  espera_segundos: string
}

const proposalTypes: Array<{
  value: ProposalType
  label: string
  table: "instituciones" | "comercios" | "servicios" | "cursos"
  icon: typeof Building2
}> = [
  { value: "institucion", label: "Institución", table: "instituciones", icon: Building2 },
  { value: "comercio", label: "Comercio", table: "comercios", icon: Store },
  { value: "servicio", label: "Servicio", table: "servicios", icon: ShieldAlert },
  { value: "curso", label: "Curso", table: "cursos", icon: GraduationCap },
  { value: "turismo", label: "Propuesta turística", table: "servicios", icon: Megaphone },
]

const initialForm: HighlightForm = {
  imagen: "",
  tipo_propuesta: "institucion",
  propuesta_id: "",
  activo: true,
  espera_segundos: "20",
}

const getProposalTypeConfig = (type: ProposalType) =>
  proposalTypes.find((item) => item.value === type) || proposalTypes[0]

const getHighlightStatusClass = (active: boolean) =>
  active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"

export default function AdminDestacadosPage() {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [proposalOptions, setProposalOptions] = useState<Record<ProposalType, ProposalOption[]>>({
    institucion: [],
    comercio: [],
    servicio: [],
    curso: [],
    turismo: [],
  })
  const [formData, setFormData] = useState<HighlightForm>(initialForm)
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null)
  const [deletingHighlight, setDeletingHighlight] = useState<Highlight | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const filteredHighlights = useMemo(
    () =>
      highlights.filter((highlight) => {
        if (statusFilter === "activo") return highlight.activo
        if (statusFilter === "inactivo") return !highlight.activo
        return true
      }),
    [highlights, statusFilter]
  )

  const currentProposalOptions = proposalOptions[formData.tipo_propuesta] || []

  const getProposalLabel = (highlight: Highlight) => {
    const option = proposalOptions[highlight.tipo_propuesta]?.find(
      (item) => item.id === highlight.propuesta_id
    )

    return option?.label || `ID ${highlight.propuesta_id}`
  }

  const loadHighlights = async () => {
    const { data, error } = await supabase
      .from("avisos_destacados")
      .select("*")
      .order("id", { ascending: false })

    if (error) {
      setSaveError(`Error al cargar destacados: ${error.message}`)
      return
    }

    setHighlights((data || []) as Highlight[])
  }

  const loadProposalOptions = async () => {
    const [
      { data: instituciones },
      { data: comercios },
      { data: servicios },
      { data: cursos },
    ] = await Promise.all([
      supabase
        .from("instituciones")
        .select("id, nombre, direccion, localidad")
        .or("estado.is.null,estado.eq.activo")
        .order("nombre", { ascending: true }),
      supabase
        .from("comercios")
        .select("id, nombre, direccion, localidad")
        .or("estado.is.null,estado.eq.activo")
        .order("nombre", { ascending: true }),
      supabase
        .from("servicios")
        .select("id, nombre, categoria, responsable")
        .or("estado.is.null,estado.eq.activo")
        .order("nombre", { ascending: true }),
      supabase
        .from("cursos")
        .select("id, nombre, responsable")
        .or("estado.is.null,estado.eq.activo")
        .order("nombre", { ascending: true }),
    ])

    const serviceOptions = (servicios || []).map((item) => ({
      id: Number(item.id),
      label: item.nombre || `Servicio ${item.id}`,
      description: item.categoria || item.responsable || null,
    }))

    setProposalOptions({
      institucion: (instituciones || []).map((item) => ({
        id: Number(item.id),
        label: item.nombre || `Institución ${item.id}`,
        description: item.localidad || item.direccion || null,
      })),
      comercio: (comercios || []).map((item) => ({
        id: Number(item.id),
        label: item.nombre || `Comercio ${item.id}`,
        description: item.localidad || item.direccion || null,
      })),
      servicio: serviceOptions,
      curso: (cursos || []).map((item) => ({
        id: Number(item.id),
        label: item.nombre || `Curso ${item.id}`,
        description: item.responsable || null,
      })),
      turismo: serviceOptions,
    })
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHighlights()
      void loadProposalOptions()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const resetForm = () => {
    setFormData(initialForm)
    setEditingHighlight(null)
    setIsFormOpen(false)
    setSaveError("")
    setLoading(false)
  }

  const handleEdit = (highlight: Highlight) => {
    setEditingHighlight(highlight)
    setFormData({
      imagen: highlight.imagen || "",
      tipo_propuesta: highlight.tipo_propuesta,
      propuesta_id: String(highlight.propuesta_id || ""),
      activo: highlight.activo,
      espera_segundos: String(highlight.espera_segundos ?? 20),
    })
    setIsFormOpen(true)
  }

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const imageDataUrl = await fileToDataUrl(file)
      setFormData((prev) => ({ ...prev, imagen: imageDataUrl }))
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "No se pudo cargar la imagen."
      )
    } finally {
      event.target.value = ""
    }
  }

  const handleDelete = async (highlight: Highlight) => {
    const { error } = await supabase
      .from("avisos_destacados")
      .delete()
      .eq("id", highlight.id)

    if (error) {
      setSaveError(`Error al eliminar destacado: ${error.message}`)
      return
    }

    setHighlights((prev) => prev.filter((item) => item.id !== highlight.id))
    setDeletingHighlight(null)
    await safeLogAdminActivity({
      action: "Eliminar",
      section: "Destacados",
      target: getProposalLabel(highlight),
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setSaveError("")

    const proposalId = Number(formData.propuesta_id)
    const waitSeconds = Math.max(0, Number(formData.espera_segundos || 0))

    if (!formData.imagen) {
      setSaveError("Tenes que cargar una imagen para el destacado.")
      setLoading(false)
      return
    }

    if (!proposalId) {
      setSaveError("Selecciona la propuesta relacionada.")
      setLoading(false)
      return
    }

    const payload = {
      imagen: formData.imagen,
      tipo_propuesta: formData.tipo_propuesta,
      propuesta_id: proposalId,
      activo: formData.activo,
      espera_segundos: waitSeconds,
    }

    if (editingHighlight) {
      const { error } = await supabase
        .from("avisos_destacados")
        .update(payload)
        .eq("id", editingHighlight.id)

      if (error) {
        setSaveError(`Error al actualizar destacado: ${error.message}`)
        setLoading(false)
        return
      }

      await safeLogAdminActivity({
        action: "Editar",
        section: "Destacados",
        target: getProposalLabel({ ...editingHighlight, ...payload }),
      })
    } else {
      const { error } = await supabase.from("avisos_destacados").insert([payload])

      if (error) {
        setSaveError(`Error al guardar destacado: ${error.message}`)
        setLoading(false)
        return
      }

      await safeLogAdminActivity({
        action: "Crear",
        section: "Destacados",
        target:
          currentProposalOptions.find((item) => item.id === proposalId)?.label ||
          `ID ${proposalId}`,
      })
    }

    await loadHighlights()
    resetForm()
  }

  const handleTypeChange = (nextType: ProposalType) => {
    setFormData((prev) => ({
      ...prev,
      tipo_propuesta: nextType,
      propuesta_id: "",
    }))
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AdminConfirmModal
        isOpen={Boolean(deletingHighlight)}
        title="Eliminar destacado"
        description="Vas a eliminar este aviso destacado. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onCancel={() => setDeletingHighlight(null)}
        onConfirm={() => {
          if (deletingHighlight) {
            void handleDelete(deletingHighlight)
          }
        }}
      />

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">
            Avisos destacados
          </h1>
          <p className="max-w-2xl text-slate-500">
            Carga imágenes rotativas para mostrar en la web y vincularlas con una propuesta.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700"
        >
          <Plus className="h-5 w-5" />
          Agregar destacado
        </button>
      </div>

      {saveError && !isFormOpen ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {saveError}
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingHighlight ? "Editar destacado" : "Agregar destacado"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-500 transition hover:text-slate-900"
                aria-label="Cerrar formulario"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {saveError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {saveError}
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Imagen del destacado
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleImageChange(event)}
                  required={!editingHighlight && !formData.imagen}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                />
                {formData.imagen ? (
                  <div className="mt-4 space-y-3">
                    <img
                      src={formData.imagen}
                      alt="Vista previa del destacado"
                      className="h-56 w-full rounded-2xl border border-slate-200 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, imagen: "" }))}
                      className="text-sm font-medium text-red-600 transition hover:text-red-500"
                    >
                      Quitar imagen
                    </button>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Tipo de propuesta
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {proposalTypes.map((type) => {
                    const Icon = type.icon
                    const isSelected = formData.tipo_propuesta === type.value

                    return (
                      <label
                        key={type.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="tipo_propuesta"
                          value={type.value}
                          checked={isSelected}
                          onChange={() => handleTypeChange(type.value)}
                          className="sr-only"
                        />
                        <Icon className="h-4 w-4" />
                        <span>{type.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Propuesta relacionada
                </label>
                <select
                  value={formData.propuesta_id}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      propuesta_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-500"
                  required
                >
                  <option value="">Seleccionar propuesta</option>
                  {currentProposalOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.description
                        ? `${option.label} - ${option.description}`
                        : option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        activo: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  <span>Destacado activo</span>
                </label>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">
                    Segundos de espera
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.espera_segundos}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        espera_segundos: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-500"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-slate-900 py-3 font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
                >
                  {loading
                    ? "Guardando..."
                    : editingHighlight
                      ? "Guardar cambios"
                      : "Guardar destacado"}
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
      ) : null}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {[
              { value: "all" as const, label: "Todos" },
              { value: "activo" as const, label: "Activos" },
              { value: "inactivo" as const, label: "Inactivos" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  statusFilter === option.value
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="text-sm text-slate-500">
            {filteredHighlights.length} de {highlights.length}
          </div>
        </div>
      </div>

      {filteredHighlights.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Imagen</th>
                  <th className="px-5 py-3">Propuesta</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Espera</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredHighlights.map((highlight) => {
                  const typeConfig = getProposalTypeConfig(highlight.tipo_propuesta)
                  const Icon = typeConfig.icon

                  return (
                    <tr key={highlight.id} className="align-top transition hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <img
                          src={highlight.imagen}
                          alt="Destacado"
                          className="h-20 w-28 rounded-xl border border-slate-200 object-contain"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex min-w-[220px] items-start gap-3">
                          <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {getProposalLabel(highlight)}
                            </div>
                            <div className="mt-1 text-xs font-medium text-slate-500">
                              {typeConfig.label}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getHighlightStatusClass(highlight.activo)}`}
                        >
                          {highlight.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-slate-600">
                          <Clock className="h-4 w-4" />
                          {highlight.espera_segundos || 0}s
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const nextActive = !highlight.activo
                              const { error } = await supabase
                                .from("avisos_destacados")
                                .update({ activo: nextActive })
                                .eq("id", highlight.id)

                              if (error) {
                                setSaveError(`Error al cambiar estado: ${error.message}`)
                                return
                              }

                              setHighlights((prev) =>
                                prev.map((item) =>
                                  item.id === highlight.id
                                    ? { ...item, activo: nextActive }
                                    : item
                                )
                              )
                            }}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                            title={highlight.activo ? "Desactivar" : "Activar"}
                          >
                            {highlight.activo ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(highlight)}
                            className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingHighlight(highlight)}
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
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
          <ImageIcon className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">
            {highlights.length === 0 ? "No hay destacados" : "No encontramos resultados"}
          </h3>
          <p className="mb-4 text-slate-500">
            {highlights.length === 0
              ? "Carga el primer aviso destacado para mostrarlo en la web."
              : "Cambia el filtro para ver otros avisos."}
          </p>
          {highlights.length === 0 ? (
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="rounded-xl bg-slate-900 px-6 py-3 font-medium text-white transition hover:bg-slate-700"
            >
              Agregar destacado
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

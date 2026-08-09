'use client'

import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, ImageIcon, MapPin, MessageSquareText, Phone, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthFormStatus } from "../../../components/AuthFormStatus"
import { buildMonthEventRange } from "../../../lib/eventDates"
import { buildEventDescription, parseEventDescription } from "../../../lib/eventSubmissionMeta"
import { fileToDataUrl } from "../../../lib/fileToDataUrl"
import { LOCALIDADES, normalizeLocalidad } from "../../../lib/localidades"
import {
  fetchUserOwnedEntities,
  findUserOwnedEntity,
  userEntityLabels,
  type UserEntityType,
  type UserOwnedEntity,
} from "../../../lib/userProfiles"
import { supabase } from "../../../supabase"

type EventForm = {
  titulo: string
  categoria: string
  fecha: string
  fechaFin: string
  fechaSoloMes: boolean
  mesReferencia: string
  ubicacion: string
  localidad: string
  telefono: string
  webUrl: string
  instagramUrl: string
  facebookUrl: string
  descripcion: string
  imagen: string
  usaWhatsapp: boolean
  submitterName: string
  submitterPhone: string
  relatedEntityType: UserEntityType | ""
  relatedEntityId: string
}

const categoriasEvento = ["Evento", "Oportunidad", "Consulta", "Promocion", "Sorteo", "Beneficio", "Aviso"]

const isMissingRelatedEntityColumn = (message: string) =>
  message.includes("related_entity_id") || message.includes("related_entity_type")

const stripRelatedEntityFields = (payload: Record<string, unknown>) => {
  const nextPayload = { ...payload }
  delete nextPayload.related_entity_type
  delete nextPayload.related_entity_id
  return nextPayload
}

const initialForm: EventForm = {
  titulo: "",
  categoria: "Evento",
  fecha: "",
  fechaFin: "",
  fechaSoloMes: false,
  mesReferencia: "",
  ubicacion: "",
  localidad: "",
  telefono: "",
  webUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  descripcion: "",
  imagen: "",
  usaWhatsapp: true,
  submitterName: "",
  submitterPhone: "",
  relatedEntityType: "",
  relatedEntityId: "",
}

type SorteoEntityType = Extract<UserEntityType, "comercio" | "servicio" | "institucion">

export default function UsuariosNuevoEventoPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<EventForm>(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [ownedEntities, setOwnedEntities] = useState<UserOwnedEntity[]>([])
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [publicMode, setPublicMode] = useState(false)

  useEffect(() => {
    const loadContext = async () => {
      const publicFlag =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("public") === "1"
      setPublicMode(publicFlag)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.email && !publicFlag) {
        router.replace("/usuarios/login")
        return
      }

      try {
        if (publicFlag) {
          setLoading(false)
          return
        }

        const userEmail = session?.user?.email
        if (!userEmail) {
          router.replace("/usuarios/login")
          return
        }

        const entity = await findUserOwnedEntity(userEmail)
        const entities = await fetchUserOwnedEntities(userEmail)

        if (!entity) {
          router.replace("/usuarios")
          return
        }

        setOwnerEmail(userEmail)
        setOwnedEntities(entities)

        const editId =
          typeof window === "undefined"
            ? null
            : new URLSearchParams(window.location.search).get("edit")
        if (editId) {
          const { data: existingEvent, error: eventError } = await supabase
            .from("eventos")
            .select("*")
            .eq("id", Number(editId))
            .eq("owner_email", userEmail)
            .maybeSingle()

          if (eventError) {
            setError(`No pudimos cargar el borrador: ${eventError.message}`)
          } else if (existingEvent) {
            setEditingEventId(existingEvent.id)
            setFormData({
              titulo: existingEvent.titulo || "",
              categoria: existingEvent.categoria || "Evento",
              fecha: existingEvent.fecha || "",
              fechaFin: existingEvent.fecha_fin || "",
              fechaSoloMes: existingEvent.fecha_solo_mes ?? false,
              mesReferencia:
                existingEvent.fecha_solo_mes && existingEvent.fecha
                  ? String(existingEvent.fecha).slice(0, 7)
                  : "",
              ubicacion: existingEvent.ubicacion || "",
              localidad: normalizeLocalidad(existingEvent.localidad),
              telefono: existingEvent.telefono || "",
              webUrl: existingEvent.web_url || "",
              instagramUrl: existingEvent.instagram_url || "",
              facebookUrl: existingEvent.facebook_url || "",
              descripcion: parseEventDescription(existingEvent.descripcion).baseDescription || "",
              imagen: existingEvent.imagen || "",
              usaWhatsapp: existingEvent.usa_whatsapp ?? true,
              submitterName: "",
              submitterPhone: "",
              relatedEntityType:
                (existingEvent.related_entity_type as UserEntityType | null) || "",
              relatedEntityId: existingEvent.related_entity_id
                ? String(existingEvent.related_entity_id)
                : "",
            })
          }
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No pudimos preparar tu evento.")
      } finally {
        setLoading(false)
      }
    }

    void loadContext()
  }, [router])

  const sorteoEntityOptions = useMemo(() => {
    const allowedTypes: SorteoEntityType[] = ["comercio", "servicio", "institucion"]
    return allowedTypes.reduce<Record<SorteoEntityType, UserOwnedEntity[]>>(
      (acc, type) => {
        acc[type] = ownedEntities.filter((entity) => entity.type === type)
        return acc
      },
      {
        comercio: [],
        servicio: [],
        institucion: [],
      }
    )
  }, [ownedEntities])

  const availableSorteoTypes = useMemo(
    () =>
      (Object.keys(sorteoEntityOptions) as SorteoEntityType[]).filter(
        (type) => sorteoEntityOptions[type].length > 0
      ),
    [sorteoEntityOptions]
  )

  const selectedSorteoEntities =
    formData.relatedEntityType && formData.relatedEntityType in sorteoEntityOptions
      ? sorteoEntityOptions[formData.relatedEntityType as SorteoEntityType]
      : []

  useEffect(() => {
    if (publicMode || formData.categoria !== "Sorteo") return
    if (availableSorteoTypes.length === 0) return

    const currentTypeValid =
      formData.relatedEntityType &&
      availableSorteoTypes.includes(formData.relatedEntityType as SorteoEntityType)
    const nextType = currentTypeValid
      ? (formData.relatedEntityType as SorteoEntityType)
      : availableSorteoTypes[0]
    const availableEntities = sorteoEntityOptions[nextType]
    const currentIdValid = availableEntities.some(
      (entity) => String(entity.record.id) === formData.relatedEntityId
    )
    const nextId = currentIdValid
      ? formData.relatedEntityId
      : availableEntities[0]
        ? String(availableEntities[0].record.id)
        : ""

    if (nextType !== formData.relatedEntityType || nextId !== formData.relatedEntityId) {
      setFormData((current) => ({
        ...current,
        relatedEntityType: nextType,
        relatedEntityId: nextId,
      }))
    }
  }, [
    availableSorteoTypes,
    formData.categoria,
    formData.relatedEntityId,
    formData.relatedEntityType,
    publicMode,
    sorteoEntityOptions,
  ])

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const imageDataUrl = await fileToDataUrl(file)
      setFormData((current) => ({ ...current, imagen: imageDataUrl }))
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : "No pudimos cargar la imagen.")
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    const today = new Date().toISOString().slice(0, 10)
    const monthRange = formData.fechaSoloMes
      ? buildMonthEventRange(formData.mesReferencia)
      : null

    if (formData.fechaSoloMes && !monthRange) {
      setError("Selecciona el mes en el que quieres mostrar el evento.")
      return
    }

    const startDate = monthRange?.startDate || formData.fecha
    const endDate = monthRange?.endDate || formData.fechaFin || null

    if (formData.fechaSoloMes && endDate && endDate < today) {
      setError("El mes del evento no puede ser anterior al mes actual.")
      return
    }

    if (!formData.fechaSoloMes && startDate < today) {
      setError("La fecha del evento no puede ser anterior a hoy.")
      return
    }

    if (!formData.fechaSoloMes && endDate && endDate < startDate) {
      setError("La fecha final no puede ser anterior a la fecha inicial.")
      return
    }

    if (publicMode && !formData.submitterName.trim()) {
      setError("Necesitamos tu nombre para revisar el evento.")
      return
    }

    if (!publicMode && !ownerEmail) {
      setError("Necesitas una cuenta activa para cargar eventos.")
      return
    }

    if (!publicMode && formData.categoria === "Sorteo") {
      if (!formData.relatedEntityType || !formData.relatedEntityId) {
        setError("Selecciona si el sorteo corresponde a un comercio, servicio o institucion.")
        return
      }
    }

    setSaving(true)

    const payload: Record<string, unknown> = {
      titulo: formData.titulo.trim(),
      categoria: formData.categoria,
      fecha: startDate,
      fecha_fin: endDate,
      fecha_solo_mes: formData.fechaSoloMes,
      ubicacion: formData.ubicacion.trim(),
      localidad: formData.localidad || null,
      telefono: formData.telefono.trim() || null,
      web_url: formData.webUrl.trim() || null,
      instagram_url: formData.instagramUrl.trim() || null,
      facebook_url: formData.facebookUrl.trim() || null,
      descripcion: buildEventDescription(formData.descripcion, publicMode && formData.submitterPhone.trim()
        ? {
            senderName: formData.submitterName,
            senderPhone: formData.submitterPhone,
          }
        : null),
      imagen: formData.imagen || null,
      estado: "borrador",
      usa_whatsapp: formData.usaWhatsapp,
      owner_email: publicMode ? null : ownerEmail,
    }

    if (!publicMode && formData.categoria === "Sorteo") {
      payload.related_entity_type = formData.relatedEntityType
      payload.related_entity_id = Number(formData.relatedEntityId)
    }

    const saveEvent = (eventPayload: Record<string, unknown>) =>
      editingEventId
        ? supabase
            .from("eventos")
            .update(eventPayload)
            .eq("id", editingEventId)
            .eq("owner_email", ownerEmail)
        : supabase.from("eventos").insert([eventPayload])

    let { error: saveError } = await saveEvent(payload)

    if (saveError && isMissingRelatedEntityColumn(saveError.message)) {
      const retry = await saveEvent(stripRelatedEntityFields(payload))
      saveError = retry.error
    }

    if (saveError) {
      setError(`No pudimos guardar el evento: ${saveError.message}`)
      setSaving(false)
      return
    }

    setSuccess(
      publicMode
        ? "Recibimos tu evento y lo vamos a revisar."
        : editingEventId
          ? "Tu borrador quedo actualizado."
          : "Tu evento quedó guardado como borrador."
    )
    setSaving(false)
    window.setTimeout(() => {
      router.push(publicMode ? "/eventos" : "/usuarios")
      router.refresh()
    }, 900)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {loading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)]">
            Preparando formulario...
          </div>
        ) : (
          <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
            <div className="grid lg:grid-cols-[1.05fr_1.15fr]">
              <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
                <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  {publicMode ? "Envio de evento" : editingEventId ? "Editar borrador" : "Nuevo evento"}
                </div>

                <div className="mt-6 max-w-2xl">
                  <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                    {publicMode
                      ? "Envianos tu evento"
                      : editingEventId
                        ? "Continua tu borrador"
                        : "Carga una novedad para tu perfil"}
                  </h1>
                  <p className="mt-4 text-lg leading-8 text-slate-600">
                    {publicMode
                      ? "Completa los datos y nos llega para revisarlo antes de publicarlo en Hola Sierras."
                      : "Puedes publicar eventos, promociones, sorteos, beneficios o consultas. Todo queda como borrador para revisarlo antes de mostrarlo."}
                  </p>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-white p-3 shadow-sm">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Que conviene cargar aca</div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {publicMode
                            ? "Compartenos la informacion principal del evento. Te pedimos tu numero para ponernos en contacto ante cualquier duda."
                            : "Actividades especiales, promos del mes, sorteos, beneficios y cualquier novedad puntual de tu espacio."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={publicMode ? "/eventos" : "/usuarios"}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    {publicMode ? "Volver a eventos" : "Volver al panel"}
                  </Link>
                </div>
              </div>

              <div className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-6 py-8 sm:px-8 sm:py-10">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {publicMode ? (
                    <div className="space-y-5">
                      <div className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-5">
                        <div className="mb-4">
                          <h2 className="text-base font-semibold text-amber-950">Tus datos de contacto</h2>
                          <p className="mt-1 text-sm leading-6 text-amber-900">
                            Estos datos no se publican. Si nos dejas tu numero, podemos contactarte ante cualquier duda.
                          </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Tu nombre</label>
                            <input
                              type="text"
                              value={formData.submitterName}
                              onChange={(event) =>
                                setFormData((current) => ({ ...current, submitterName: event.target.value }))
                              }
                              required
                              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Tu telefono</label>
                            <input
                              type="text"
                              value={formData.submitterPhone}
                              onChange={(event) =>
                                setFormData((current) => ({ ...current, submitterPhone: event.target.value }))
                              }
                              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-sky-200 bg-sky-50/70 p-5">
                        <div className="mb-4">
                          <h2 className="text-base font-semibold text-sky-950">Datos que si quedan publicados</h2>
                          <p className="mt-1 text-sm leading-6 text-sky-900">
                            Esta informacion es la que va a verse en Hola Sierras cuando el evento se publique.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className={publicMode ? "space-y-5 rounded-[28px] border border-sky-200 bg-sky-50/70 p-5" : "space-y-5"}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Título</label>
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(event) => setFormData((current) => ({ ...current, titulo: event.target.value }))}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Categoria</label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {categoriasEvento.map((category) => (
                        <label
                          key={category}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                            formData.categoria === category
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="categoria"
                            value={category}
                            checked={formData.categoria === category}
                            onChange={(event) =>
                              setFormData((current) => ({ ...current, categoria: event.target.value }))
                            }
                            className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {!publicMode && formData.categoria === "Sorteo" ? (
                    <div className="space-y-4 rounded-[24px] border border-amber-200 bg-amber-50/70 p-4">
                      <div>
                        <h2 className="text-sm font-semibold text-amber-950">
                          Vincular sorteo a un perfil
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-amber-900">
                          Elige si este sorteo corresponde a un comercio, servicio o institución.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {availableSorteoTypes.map((type) => (
                          <label
                            key={type}
                            className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                              formData.relatedEntityType === type
                                ? "border-amber-500 bg-white text-amber-900"
                                : "border-amber-200 bg-white/70 text-slate-700 hover:border-amber-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="related-entity-type"
                              value={type}
                              checked={formData.relatedEntityType === type}
                              onChange={(event) =>
                                setFormData((current) => ({
                                  ...current,
                                  relatedEntityType: event.target.value as SorteoEntityType,
                                  relatedEntityId: "",
                                }))
                              }
                              className="h-4 w-4 border-slate-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span>{userEntityLabels[type]}</span>
                          </label>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Perfil del sorteo
                        </label>
                        <select
                          value={formData.relatedEntityId}
                          onChange={(event) =>
                            setFormData((current) => ({
                              ...current,
                              relatedEntityId: event.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400"
                        >
                          <option value="">Selecciona una opción</option>
                          {selectedSorteoEntities.map((entity) => (
                            <option key={`${entity.type}-${entity.record.id}`} value={entity.record.id}>
                              {entity.record.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={formData.fechaSoloMes}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            fechaSoloMes: event.target.checked,
                            mesReferencia: event.target.checked ? current.mesReferencia : "",
                            fecha: event.target.checked ? "" : current.fecha,
                            fechaFin: event.target.checked ? "" : current.fechaFin,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Todavía no tengo el día exacto, mostrar solo el mes</span>
                    </label>

                    {formData.fechaSoloMes ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Mes del evento</label>
                        <input
                          type="month"
                          value={formData.mesReferencia}
                          onChange={(event) =>
                            setFormData((current) => ({ ...current, mesReferencia: event.target.value }))
                          }
                          required
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                        />
                        <p className="text-sm leading-6 text-slate-500">
                          En la web se va a mostrar algo como “abril de 2026” y no un día exacto.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Fecha desde</label>
                          <input
                            type="date"
                            value={formData.fecha}
                            onChange={(event) => setFormData((current) => ({ ...current, fecha: event.target.value }))}
                            required
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Fecha hasta</label>
                          <input
                            type="date"
                            value={formData.fechaFin}
                            onChange={(event) =>
                              setFormData((current) => ({ ...current, fechaFin: event.target.value }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Ubicacion</label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formData.ubicacion}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, ubicacion: event.target.value }))
                        }
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Localidad</label>
                    <select
                      value={formData.localidad}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, localidad: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                    >
                      <option value="">Sin definir</option>
                      {LOCALIDADES.map((localidad) => (
                        <option key={localidad} value={localidad}>
                          {localidad}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Telefono</label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formData.telefono}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, telefono: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.usaWhatsapp}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, usaWhatsapp: event.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Este numero tiene WhatsApp</span>
                  </label>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Sitio web</label>
                      <input
                        type="url"
                        value={formData.webUrl}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, webUrl: event.target.value }))
                        }
                        placeholder="https://..."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Instagram</label>
                      <input
                        type="url"
                        value={formData.instagramUrl}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, instagramUrl: event.target.value }))
                        }
                        placeholder="https://instagram.com/..."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Facebook</label>
                      <input
                        type="url"
                        value={formData.facebookUrl}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, facebookUrl: event.target.value }))
                        }
                        placeholder="https://facebook.com/..."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Descripcion</label>
                    <div className="relative">
                      <MessageSquareText className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-400" />
                      <textarea
                        value={formData.descripcion}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, descripcion: event.target.value }))
                        }
                        rows={6}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Imagen</label>
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-600 hover:file:bg-blue-100"
                      />

                      {formData.imagen ? (
                        <img
                          src={formData.imagen}
                          alt="Vista previa del evento"
                          className="mt-4 h-52 w-full rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="mt-4 flex h-40 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                          <div className="flex items-center gap-2 text-sm">
                            <ImageIcon className="h-5 w-5" />
                            Sin imagen seleccionada
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>

                  {error ? <AuthFormStatus tone="error" message={error} /> : null}
                  {success ? <AuthFormStatus tone="success" message={success} /> : null}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
                    >
                      <Sparkles className="h-4 w-4" />
                      {saving
                        ? "Guardando evento..."
                        : publicMode
                          ? "Enviar evento"
                          : editingEventId
                          ? "Guardar cambios del borrador"
                          : "Guardar evento en borrador"}
                    </button>

                    <Link
                      href={publicMode ? "/eventos" : "/usuarios"}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      Cancelar
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

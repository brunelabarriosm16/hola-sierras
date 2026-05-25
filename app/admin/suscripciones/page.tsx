'use client'

import { useEffect, useMemo, useState } from "react"
import { CreditCard, Save } from "lucide-react"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { logAdminActivity } from "../../lib/adminActivity"
import {
  buildSubscriptionAdminForm,
  subscriptionFormToSitePayload,
  type SubscriptionAdminForm,
  type SubscriptionSiteContent,
} from "../../lib/subscriptionContent"
import {
  getSubscriptionStatusBadge,
  getSubscriptionStatusLabel,
  subscriptionStatusOptions,
  type SubscriptionStatusKey,
} from "../../lib/subscriptionStatus"
import { supabase } from "../../supabase"

type SubscriptionPlanKey = "presencia" | "destacado" | "destacado_plus"
type EntityType = "comercio" | "servicio" | "curso"

type SubscriptionItem = {
  id: number
  nombre: string
  plan_suscripcion: SubscriptionPlanKey | null
  estado_suscripcion: SubscriptionStatusKey | null
  entityType: EntityType
}

const subscriptionPlanOptions: { key: SubscriptionPlanKey; label: string }[] = [
  { key: "presencia", label: "Plan Presencia" },
  { key: "destacado", label: "Plan Destacado" },
  { key: "destacado_plus", label: "Plan Destacado Plus" },
]

const entityLabels: Record<EntityType, string> = {
  comercio: "Comercio",
  servicio: "Servicio",
  curso: "Curso",
}

const siteFieldSelection = `
  plan_presencia_titulo,
  plan_presencia_tagline,
  plan_presencia_descripcion,
  plan_presencia_precio,
  plan_presencia_features,
  plan_destacado_titulo,
  plan_destacado_tagline,
  plan_destacado_descripcion,
  plan_destacado_precio,
  plan_destacado_features,
  plan_destacado_plus_titulo,
  plan_destacado_plus_tagline,
  plan_destacado_plus_descripcion,
  plan_destacado_plus_precio,
  plan_destacado_plus_features
`

export default function AdminSuscripcionesPage() {
  const [formData, setFormData] = useState<SubscriptionAdminForm>(
    buildSubscriptionAdminForm()
  )
  const [items, setItems] = useState<SubscriptionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingCopy, setSavingCopy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const loadPage = async () => {
    setLoading(true)
    setError("")

    const [
      { data: siteData, error: siteError },
      { data: comercios, error: comerciosError },
      { data: servicios, error: serviciosError },
      { data: cursos, error: cursosError },
    ] = await Promise.all([
      supabase.from("sitio").select(siteFieldSelection).eq("id", 1).maybeSingle(),
      supabase
        .from("comercios")
        .select("id, nombre, plan_suscripcion, estado_suscripcion")
        .order("nombre", { ascending: true }),
      supabase
        .from("servicios")
        .select("id, nombre, plan_suscripcion, estado_suscripcion")
        .order("nombre", { ascending: true }),
      supabase
        .from("cursos")
        .select("id, nombre, plan_suscripcion, estado_suscripcion")
        .order("nombre", { ascending: true }),
    ])

    if (siteError || comerciosError || serviciosError || cursosError) {
      setError(
        siteError?.message ||
          comerciosError?.message ||
          serviciosError?.message ||
          cursosError?.message ||
          "No pudimos cargar las suscripciones."
      )
      setLoading(false)
      return
    }

    setFormData(buildSubscriptionAdminForm(siteData as SubscriptionSiteContent))
    setItems([
      ...((comercios || []).map((item) => ({ ...item, entityType: "comercio" as const }))),
      ...((servicios || []).map((item) => ({ ...item, entityType: "servicio" as const }))),
      ...((cursos || []).map((item) => ({ ...item, entityType: "curso" as const }))),
    ])
    setLoading(false)
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPage()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const groupedItems = useMemo(() => {
    return subscriptionPlanOptions.reduce(
      (acc, plan) => {
        acc[plan.key] = items.filter(
          (item) => (item.plan_suscripcion || "presencia") === plan.key
        )
        return acc
      },
      {} as Record<SubscriptionPlanKey, SubscriptionItem[]>
    )
  }, [items])

  const handleSaveCopy = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingCopy(true)
    setError("")
    setSuccess("")

    const { error: saveError } = await supabase
      .from("sitio")
      .upsert(subscriptionFormToSitePayload(formData))

    if (saveError) {
      setError(`No pudimos guardar los textos: ${saveError.message}`)
      setSavingCopy(false)
      return
    }

    await logAdminActivity({
      action: "Editar",
      section: "Suscripciones",
      target: "Textos de planes",
      details: "Actualizo el contenido visible para usuarios.",
    })

    setSuccess("Los textos de suscripciones quedaron guardados.")
    setSavingCopy(false)
  }

  const updateItemSubscription = async (
    item: SubscriptionItem,
    changes: Partial<Pick<SubscriptionItem, "plan_suscripcion" | "estado_suscripcion">>
  ) => {
    const table =
      item.entityType === "comercio"
        ? "comercios"
        : item.entityType === "servicio"
          ? "servicios"
          : "cursos"

    const payload = {
      ...changes,
      suscripcion_actualizada_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from(table)
      .update(payload)
      .eq("id", item.id)

    if (updateError) {
      setError(`No pudimos actualizar la suscripción: ${updateError.message}`)
      return
    }

    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id && currentItem.entityType === item.entityType
          ? { ...currentItem, ...changes }
          : currentItem
      )
    )

    await logAdminActivity({
      action: "Editar",
      section: "Suscripciones",
      target: item.nombre,
      details: "Actualizo plan o estado desde el panel de suscripciones.",
    })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Suscripciones</h1>
          <p className="mt-2 text-slate-500">
            Administra el texto que ve el usuario y revisa qué fichas están en cada plan.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          <CreditCard className="h-4 w-4" />
          {items.length} fichas con plan asignado
        </div>
      </div>

      {error ? <AuthFormStatus tone="error" message={error} /> : null}
      {success ? <AuthFormStatus tone="success" message={success} /> : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
          Cargando suscripciones...
        </div>
      ) : (
        <>
          <form
            onSubmit={handleSaveCopy}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Texto que ve el usuario
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Desde aquí cambias títulos, subtítulos, descripción, precio y beneficios.
                </p>
              </div>
              <button
                type="submit"
                disabled={savingCopy}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingCopy ? "Guardando..." : "Guardar textos"}
              </button>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              {subscriptionPlanOptions.map((plan) => (
                <div
                  key={plan.key}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {plan.label}
                  </div>
                  <div className="space-y-4">
                    <InputField
                      label="Título"
                      value={formData[plan.key].title}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          [plan.key]: { ...current[plan.key], title: value },
                        }))
                      }
                    />
                    <InputField
                      label="Bajada"
                      value={formData[plan.key].tagline}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          [plan.key]: { ...current[plan.key], tagline: value },
                        }))
                      }
                    />
                    <InputField
                      label="Precio"
                      value={formData[plan.key].price}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          [plan.key]: { ...current[plan.key], price: value },
                        }))
                      }
                    />
                    <TextAreaField
                      label="Descripción"
                      value={formData[plan.key].description}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          [plan.key]: {
                            ...current[plan.key],
                            description: value,
                          },
                        }))
                      }
                    />
                    <TextAreaField
                      label="Beneficios"
                      helper="Una línea por beneficio."
                      value={formData[plan.key].features}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          [plan.key]: { ...current[plan.key], features: value },
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Fichas por plan
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Aquí ves qué fichas están en cada plan y puedes moverlas o cambiar su estado.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              {subscriptionPlanOptions.map((plan) => (
                <div
                  key={plan.key}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {plan.label}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {groupedItems[plan.key].length} fichas
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                      {groupedItems[plan.key].length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {groupedItems[plan.key].length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                        No hay fichas en este plan todavía.
                      </div>
                    ) : (
                      groupedItems[plan.key].map((item) => (
                        <div
                          key={`${item.entityType}-${item.id}`}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {item.nombre}
                              </div>
                              <div className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                                {entityLabels[item.entityType]}
                              </div>
                            </div>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSubscriptionStatusBadge(
                                item.estado_suscripcion
                              )}`}
                            >
                              {getSubscriptionStatusLabel(item.estado_suscripcion)}
                            </span>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Plan
                              </label>
                              <select
                                value={item.plan_suscripcion || "presencia"}
                                onChange={(e) =>
                                  void updateItemSubscription(item, {
                                    plan_suscripcion: e.target.value as SubscriptionPlanKey,
                                  })
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                              >
                                {subscriptionPlanOptions.map((option) => (
                                  <option key={option.key} value={option.key}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Estado
                              </label>
                              <select
                                value={item.estado_suscripcion || "pendiente"}
                                onChange={(e) =>
                                  void updateItemSubscription(item, {
                                    estado_suscripcion:
                                      e.target.value as SubscriptionStatusKey,
                                  })
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                              >
                                {subscriptionStatusOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-900">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
      />
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  helper?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-900">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-32 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
      />
      {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
    </div>
  )
}

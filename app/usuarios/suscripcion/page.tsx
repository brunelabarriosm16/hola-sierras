'use client'

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ExternalLink, ShieldOff } from "lucide-react"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import {
  buildSubscriptionPlansForUser,
  type SubscriptionSiteContent,
} from "../../lib/subscriptionContent"
import {
  getSubscriptionStatusBadge,
  getSubscriptionStatusLabel,
} from "../../lib/subscriptionStatus"
import {
  findUserOwnedEntity,
  userEntityLabels,
  type UserOwnedEntity,
} from "../../lib/userProfiles"
import { type SubscriptionPlanKey } from "../../lib/subscriptionPlans"
import { supabase } from "../../supabase"

type FlowStep = 1 | 2

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

export default function UsuariosSuscripcionPage() {
  const router = useRouter()
  const [isFirstSetup, setIsFirstSetup] = useState(false)
  const [ownedEntity, setOwnedEntity] = useState<UserOwnedEntity | null>(null)
  const [plans, setPlans] = useState(() => buildSubscriptionPlansForUser())
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey>("presencia")
  const [currentStep, setCurrentStep] = useState<FlowStep>(1)
  const [mode, setMode] = useState<"summary" | "change">("summary")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [pendingCheckoutRedirect, setPendingCheckoutRedirect] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    setIsFirstSetup(params.get("setup") === "1")
  }, [])

  useEffect(() => {
    const loadSubscription = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.email) {
        router.replace("/usuarios/login")
        return
      }

      try {
        const [entity, siteResponse] = await Promise.all([
          findUserOwnedEntity(session.user.email),
          supabase.from("sitio").select(siteFieldSelection).eq("id", 1).maybeSingle(),
        ])

        if (!entity || entity.type === "institucion") {
          router.replace("/usuarios")
          return
        }

        if (!siteResponse.error) {
          setPlans(
            buildSubscriptionPlansForUser(
              siteResponse.data as SubscriptionSiteContent | null
            )
          )
        }

        setOwnedEntity(entity)
        setSelectedPlan(
          (entity.record.plan_suscripcion as SubscriptionPlanKey) || "presencia"
        )
        if (isFirstSetup) {
          setMode("change")
          setCurrentStep(1)
          setSuccess("Tus datos quedaron guardados. Ahora elige tu plan para continuar.")
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No pudimos cargar tu suscripción."
        )
      } finally {
        setLoading(false)
      }
    }

    void loadSubscription()
  }, [isFirstSetup, router])

  const currentPlanKey =
    (ownedEntity?.record.plan_suscripcion as SubscriptionPlanKey) || "presencia"
  const currentPlan = plans[currentPlanKey]
  const nextPlan = plans[selectedPlan]
  const statusLabel = getSubscriptionStatusLabel(
    ownedEntity?.record.estado_suscripcion
  )
  const statusBadge = getSubscriptionStatusBadge(
    ownedEntity?.record.estado_suscripcion
  )
  const subscriptionUpdatedAt = ownedEntity?.record.suscripcion_actualizada_at
    ? new Date(ownedEntity.record.suscripcion_actualizada_at).toLocaleDateString(
        "es-UY",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      )
    : "Sin fecha registrada"

  useEffect(() => {
    if (!pendingCheckoutRedirect || currentStep !== 2 || mode !== "change") return

    const timeoutId = window.setTimeout(() => {
      window.location.href = nextPlan.checkoutUrl
    }, 1800)

    return () => window.clearTimeout(timeoutId)
  }, [currentStep, mode, nextPlan.checkoutUrl, pendingCheckoutRedirect])

  const startPlanChange = () => {
    setSelectedPlan(currentPlanKey)
    setCurrentStep(1)
    setPendingCheckoutRedirect(false)
    setError("")
    setSuccess("")
    setMode("change")
  }

  const backToSummary = () => {
    setPendingCheckoutRedirect(false)
    setCurrentStep(1)
    setMode("summary")
  }

  const handleSaveAndContinue = async () => {
    if (!ownedEntity) return

    setSaving(true)
    setError("")
    setSuccess("")

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      setError("Tu sesión venció. Vuelve a entrar para gestionar la suscripción.")
      setSaving(false)
      return
    }

    const response = await fetch("/api/usuarios/suscripcion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: "save_plan",
        planKey: selectedPlan,
      }),
    })

    const result = (await response.json()) as {
      error?: string
      record?: UserOwnedEntity["record"]
    }

    if (!response.ok || !result.record) {
      setError(result.error || "No pudimos actualizar tu plan.")
      setSaving(false)
      return
    }

    setOwnedEntity((current) =>
      current
        ? {
            ...current,
            record: result.record!,
          }
        : current
    )
    setSuccess(`Ya quedó seleccionado y guardado ${plans[selectedPlan].name}.`)
    setPendingCheckoutRedirect(true)
    setCurrentStep(2)
    setSaving(false)
  }

  const handleCancelSubscription = async () => {
    if (!ownedEntity) return

    const confirmed = window.confirm(
      "Si cancelas la suscripción, tu ficha y sus eventos visibles pasarán a oculto. ¿Quieres continuar?"
    )

    if (!confirmed) return

    setCancelling(true)
    setError("")
    setSuccess("")

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      setError("Tu sesión venció. Vuelve a entrar para gestionar la suscripción.")
      setCancelling(false)
      return
    }

    const response = await fetch("/api/usuarios/suscripcion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: "cancel_subscription",
      }),
    })

    const result = (await response.json()) as {
      error?: string
      syncedWithMercadoPago?: boolean
      record?: UserOwnedEntity["record"]
    }

    if (!response.ok || !result.record) {
      setError(result.error || "No pudimos cancelar tu suscripción.")
      setCancelling(false)
      return
    }

    setOwnedEntity((current) =>
      current
        ? {
            ...current,
            record: result.record!,
          }
        : current
    )
    setSuccess(
      result.syncedWithMercadoPago
        ? "Tu suscripción quedó cancelada y también se sincronizó con Mercado Pago."
        : "Tu suscripción quedó cancelada y la ficha pasó a oculto."
    )
    backToSummary()
    setCancelling(false)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-[1320px]">
        <section className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.2)] sm:p-8 lg:p-10">
          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              Cargando suscripción...
            </div>
          ) : ownedEntity ? (
            <div className="space-y-6">
              {error ? <AuthFormStatus tone="error" message={error} /> : null}
              {success ? <AuthFormStatus tone="success" message={success} /> : null}

              {mode === "summary" ? (
                <div className="space-y-6">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Suscripción actual
                    </div>
                    <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                      {currentPlan.name}
                    </h1>
                    <p className="mt-3 text-base leading-7 text-slate-600">
                      Aquí puedes ver tu plan actual, revisar la fecha registrada y cambiarlo cuando quieras.
                    </p>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-3">
                    <SummaryCard
                      label="Ficha vinculada"
                      title={ownedEntity.record.nombre}
                      description={userEntityLabels[ownedEntity.type]}
                    />
                    <SummaryCard
                      label="Estado"
                      title={statusLabel}
                      description={`Plan actual: ${currentPlan.name}`}
                      badge={
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusBadge}`}
                        >
                          {statusLabel}
                        </span>
                      }
                    />
                    <SummaryCard
                      label="Fecha de débito"
                      title={subscriptionUpdatedAt}
                      description="Mostramos la última fecha registrada de esta suscripción."
                    />
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={startPlanChange}
                        className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
                      >
                        Cambiar plan
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCancelSubscription()}
                        disabled={cancelling}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        <ShieldOff className="h-4 w-4" />
                        {cancelling ? "Cancelando..." : "Dar de baja mi suscripción"}
                      </button>
                      <Link
                        href="/usuarios"
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                      >
                        Volver al panel
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}

              {mode === "change" ? (
                <div className="space-y-6">
                  {currentStep === 1 ? (
                    <div className="space-y-6">
                      <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Paso 1 de 2
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-slate-950">
                          Elige tu plan
                        </div>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          Selecciona la opción que mejor acompaña tu ficha.
                        </p>
                      </div>

                      <div className="grid gap-6 xl:grid-cols-3">
                        {(Object.entries(plans) as Array<
                          [SubscriptionPlanKey, (typeof plans)[SubscriptionPlanKey]]
                        >).map(([planKey, plan]) => (
                          <button
                            key={planKey}
                            type="button"
                            onClick={() => setSelectedPlan(planKey)}
                            className={`flex h-full flex-col rounded-[30px] border p-6 text-left transition ${
                              selectedPlan === planKey
                                ? "border-blue-500 bg-blue-50 shadow-[0_18px_40px_-24px_rgba(37,99,235,0.45)]"
                                : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                  {plan.shortLabel}
                                </div>
                                <div className="mt-2 text-[2rem] font-semibold leading-[1.05] text-slate-950">
                                  {plan.name}
                                </div>
                              </div>
                              <div className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                                {plan.price}
                              </div>
                            </div>

                            <p className="mt-5 text-base leading-7 text-slate-600">
                              {plan.tagline}
                            </p>
                            <p className="mt-4 text-sm leading-7 text-slate-500">
                              {plan.description}
                            </p>

                            <div className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
                              {plan.features.map((feature) => (
                                <div key={feature} className="flex gap-3">
                                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
                                  <span>{feature}</span>
                                </div>
                              ))}
                            </div>

                            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                              {selectedPlan === planKey ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                  Seleccionado
                                </>
                              ) : (
                                "Elegir este plan"
                              )}
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <div className="text-sm text-slate-500">
                          Elige un plan para avanzar.
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={backToSummary}
                            disabled={isFirstSetup}
                            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Volver
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSaveAndContinue()}
                            disabled={saving}
                            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
                          >
                            {saving ? "Guardando..." : "Siguiente"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {currentStep === 2 ? (
                    <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Paso 2 de 2
                      </div>
                      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        Continúa el pago en Mercado Pago
                      </h2>
                      <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                        Ya quedó seleccionado y guardado {nextPlan.name}. Ahora puedes completar Mercado Pago para completar la suscripción.
                      </p>
                      <p className="mt-4 text-sm leading-7 text-slate-500">
                        Podes cancelar desde tu perfil cuando quieras tu suscripción.
                      </p>
                      <div className="mt-5 rounded-[24px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                        En unos segundos te vamos a redirigir automáticamente a Mercado Pago.
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <a
                          href={nextPlan.checkoutUrl}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Continúa el pago en Mercado Pago
                        </a>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <div className="text-sm text-slate-500">
                          Si todavía quieres revisar algo, puedes volver al paso anterior.
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingCheckoutRedirect(false)
                            setCurrentStep(1)
                          }}
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                        >
                          Volver
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}

function SummaryCard({
  label,
  title,
  description,
  badge,
}: {
  label: string
  title: string
  description: string
  badge?: ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="text-2xl font-semibold text-slate-950">{title}</div>
        {badge}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}

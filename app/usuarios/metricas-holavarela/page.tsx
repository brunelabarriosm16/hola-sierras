'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, BarChart3, Eye, FileText, MessageCircle } from "lucide-react"
import { supabase } from "../../supabase"

type VisitRow = {
  section: string | null
  item_id: string | null
  item_title: string | null
  browser_key: string | null
  created_at: string | null
}

type BrowserVisitRow = {
  browser_key: string | null
  created_at: string | null
}

type InteractionRow = {
  created_at: string | null
}

type SectionTotal = {
  label: string
  value: number
}

type RecentActivity = {
  interactions15Days: number
  whatsapp15Days: number
}

type RecentMessage = {
  label: string
  value: number
}

const SECTION_LABELS: Record<string, string> = {
  home: "Inicio",
  "comercios-page": "Listado de comercios",
  "servicios-page": "Listado de servicios",
  "eventos-page": "Listado de eventos",
  "cursos-page": "Listado de cursos y clases",
  "instituciones-page": "Listado de instituciones",
}

const BASELINE_SITE_VISITORS_30D = 0
const BASELINE_SITE_PAGE_VIEWS_30D = 0

const getIsoDaysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

const countUniqueBrowsers = (rows: Array<{ browser_key: string | null }>) =>
  new Set(rows.map((row) => row.browser_key).filter((key): key is string => Boolean(key))).size

const buildSectionTotals = (rows: VisitRow[]): SectionTotal[] => {
  const totals = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.item_id || row.item_title
    if (!key) return acc
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return Object.entries(totals)
    .map(([section, value]) => ({
      label: SECTION_LABELS[section] || section,
      value,
    }))
    .sort((a, b) => b.value - a.value)
}

const withFallback = async <T,>(
  promiseLike: PromiseLike<{ data: T[] | null; error: unknown }>,
  label: string
) => {
  const { data, error } = await promiseLike
  if (error) {
    console.warn(`No se pudo cargar ${label}.`, error)
    return [] as T[]
  }
  return (data || []) as T[]
}

export default function UsuariosMetricasHolaVarelaPage() {
  const [loading, setLoading] = useState(true)
  const [visitors30Days, setVisitors30Days] = useState(BASELINE_SITE_VISITORS_30D)
  const [pageViews30Days, setPageViews30Days] = useState(BASELINE_SITE_PAGE_VIEWS_30D)
  const [sectionTotals, setSectionTotals] = useState<SectionTotal[]>([])
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity>({
    interactions15Days: 0,
    whatsapp15Days: 0,
  })

  useEffect(() => {
    const loadMetrics = async () => {
      const since30 = getIsoDaysAgo(30)
      const since15 = getIsoDaysAgo(15)
      const since2 = getIsoDaysAgo(2)

      const [
        visitRows30,
        shareRows15,
        whatsappRows15,
        viewMoreRows15,
        externalRows15,
        visitRows48,
        contactRows48,
        eventRows48,
        commerceRows48,
        serviceRows48,
        courseRows48,
        institutionRows48,
      ] = await Promise.all([
        withFallback<VisitRow>(
          supabase.from("content_visits").select("section, item_id, item_title, browser_key, created_at").gte("created_at", since30),
          "las visitas de 30 dias"
        ),
        withFallback<InteractionRow>(
          supabase.from("share_events").select("created_at").gte("created_at", since15),
          "los compartidos de 15 dias"
        ),
        withFallback<InteractionRow>(
          supabase.from("whatsapp_clicks").select("created_at").gte("created_at", since15),
          "los clics de WhatsApp de 15 dias"
        ),
        withFallback<InteractionRow>(
          supabase.from("view_more_clicks").select("created_at").gte("created_at", since15),
          "los clics en ver mas de 15 dias"
        ),
        withFallback<InteractionRow>(
          supabase.from("external_link_clicks").select("created_at").gte("created_at", since15),
          "los clics externos de 15 dias"
        ),
        withFallback<BrowserVisitRow>(
          supabase.from("content_visits").select("browser_key, created_at").eq("section", "site_pages").gte("created_at", since2),
          "las visitas de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("contacto_solicitudes").select("created_at").gte("created_at", since2),
          "los mensajes de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("eventos").select("created_at").gte("created_at", since2),
          "los eventos nuevos de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("comercios").select("created_at").gte("created_at", since2),
          "los comercios nuevos de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("servicios").select("created_at").gte("created_at", since2),
          "los servicios nuevos de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("cursos").select("created_at").gte("created_at", since2),
          "los cursos nuevos de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("instituciones").select("created_at").gte("created_at", since2),
          "las instituciones nuevas de 48 horas"
        ),
      ])

      const siteVisitRows30 = visitRows30.filter((row) => row.section === "site_pages")

      setVisitors30Days(BASELINE_SITE_VISITORS_30D + countUniqueBrowsers(siteVisitRows30))
      setPageViews30Days(BASELINE_SITE_PAGE_VIEWS_30D + siteVisitRows30.length)
      setSectionTotals(buildSectionTotals(siteVisitRows30))
      setRecentActivity({
        interactions15Days:
          shareRows15.length +
          whatsappRows15.length +
          viewMoreRows15.length +
          externalRows15.length,
        whatsapp15Days: whatsappRows15.length,
      })

      const visitors48 = countUniqueBrowsers(visitRows48)
      const listings48 =
        commerceRows48.length +
        serviceRows48.length +
        courseRows48.length +
        institutionRows48.length

      setRecentMessages(
        [
          {
            label: `${visitors48} ${visitors48 === 1 ? "nueva visita al sitio" : "nuevas visitas al sitio"}`,
            value: visitors48,
          },
          {
            label: `${contactRows48.length} ${contactRows48.length === 1 ? "mensaje nuevo" : "mensajes nuevos"}`,
            value: contactRows48.length,
          },
          {
            label: `${eventRows48.length} ${eventRows48.length === 1 ? "nuevo evento subido" : "nuevos eventos subidos"}`,
            value: eventRows48.length,
          },
          {
            label: `${listings48} ${listings48 === 1 ? "nueva ficha se sumo" : "nuevas fichas se sumaron"}`,
            value: listings48,
          },
        ].filter((item) => item.value > 0)
      )

      setLoading(false)
    }

    void loadMetrics()
  }, [])

  const sectionSummary = useMemo(() => {
    if (sectionTotals.length === 0) {
      return "Todavía no hay suficiente actividad para mostrar secciones destacadas."
    }
    return `${sectionTotals[0]?.label || "Seccion principal"} lidera el interes reciente dentro de Hola Varela.`
  }, [sectionTotals])

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_48%,#ffffff_100%)] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 shadow-sm">
              Metricas de Hola Varela
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950">
              Movimiento general de la plataforma
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
              Aqui ves la actividad registrada por Hola Varela dentro de la web, sin mezclarla con metricas externas.
            </p>
          </div>
          <Link
            href="/usuarios"
            className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al panel
          </Link>
        </div>

        {loading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-slate-500 shadow-sm">
            Cargando metricas de Hola Varela...
          </div>
        ) : (
          <div className="space-y-8">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Visitantes del sitio"
                value={visitors30Days}
                description="Visitantes unicos ultimos 30 dias"
                icon={<Eye className="h-5 w-5 text-sky-700" />}
                tone="bg-sky-100"
              />
              <MetricCard
                label="Vistas del sitio"
                value={pageViews30Days}
                description="Registros de visita ultimos 30 dias"
                icon={<FileText className="h-5 w-5 text-violet-700" />}
                tone="bg-violet-100"
              />
              <MetricCard
                label="Actividad reciente"
                value={recentActivity.interactions15Days}
                description="Interacciones ultimos 15 dias"
                icon={<BarChart3 className="h-5 w-5 text-emerald-700" />}
                tone="bg-emerald-100"
              />
              <MetricCard
                label="Contactos rapidos"
                value={recentActivity.whatsapp15Days}
                description="WhatsApp ultimos 15 dias"
                icon={<MessageCircle className="h-5 w-5 text-green-700" />}
                tone="bg-green-100"
              />
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Paginas visitadas
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">Todas las paginas con actividad</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">{sectionSummary}</p>
                </div>
                <div className="space-y-4">
                  {sectionTotals.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                      Aun no hay visitas registradas para mostrar.
                    </div>
                  ) : (
                    sectionTotals.map((section) => (
                      <div key={section.label} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-base font-semibold text-slate-900">{section.label}</div>
                          <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                            {section.value}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Actividad reciente
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">Ultimas 48 horas</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Un resumen rapido de lo ultimo que paso dentro de Hola Varela.
                  </p>
                </div>
                <div className="space-y-4">
                  {recentMessages.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                      Aun no hay novedades registradas en las ultimas 48 horas.
                    </div>
                  ) : (
                    recentMessages.map((item) => (
                      <ActivityMessage key={item.label} label={item.label} />
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function MetricCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string
  value: number
  description: string
  icon: React.ReactNode
  tone: string
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
          <div className="mt-3 text-4xl font-semibold text-slate-950">{value}</div>
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>{icon}</div>
      </div>
      <div className="text-sm text-slate-500">{description}</div>
    </div>
  )
}

function ActivityMessage({ label }: { label: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-700">
      {label}
    </div>
  )
}

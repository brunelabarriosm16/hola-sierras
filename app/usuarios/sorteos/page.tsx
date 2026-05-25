'use client'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDays, Download, Ticket, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import {
  fetchSorteoParticipants,
  fetchUserOwnedEvents,
  type SorteoParticipant,
  type UserOwnedEvent,
} from "../../lib/userProfiles"
import { formatEventDateRange } from "../../lib/eventDates"
import { supabase } from "../../supabase"

type SorteoWithParticipants = {
  event: UserOwnedEvent
  participants: SorteoParticipant[]
}

const normalizeEventCategory = (categoria?: string | null) => {
  const value = categoria?.trim()
  if (!value || value.toUpperCase() === "NOT NULL") return "Evento"
  if (value.toLowerCase() === "beneficios") return "Beneficio"
  return value
}

const formatParticipantDate = (value?: string | null) => {
  if (!value) return "Sin fecha"

  return new Intl.DateTimeFormat("es-UY", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

const downloadCsv = (rows: SorteoParticipant[], fileName: string) => {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const header = ["Sorteo", "Nombre", "Telefono", "Fecha"]
  const body = rows.map((row) =>
    [
      row.evento_titulo || "",
      row.nombre || "",
      row.telefono || "",
      row.created_at ? formatParticipantDate(row.created_at) : "",
    ]
      .map((item) => escape(item))
      .join(",")
  )

  const csv = [header.join(","), ...body].join("\n")
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function UsuariosSorteosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sorteos, setSorteos] = useState<SorteoWithParticipants[]>([])

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.email) {
        router.replace("/usuarios/login")
        return
      }

      try {
        const events = await fetchUserOwnedEvents(session.user.email)
        const sorteoEvents = events.filter(
          (event) => normalizeEventCategory(event.categoria) === "Sorteo"
        )
        const participants = await fetchSorteoParticipants(
          sorteoEvents.map((event) => event.id)
        )

        const grouped = sorteoEvents.map((event) => ({
          event,
          participants: participants.filter((item) => item.evento_id === event.id),
        }))

        setSorteos(grouped)
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No pudimos cargar los participantes de tus sorteos."
        )
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [router])

  const totalParticipants = useMemo(
    () => sorteos.reduce((acc, item) => acc + item.participants.length, 0),
    [sorteos]
  )

  const allParticipants = useMemo(
    () =>
      sorteos.flatMap((item) =>
        item.participants.map((participant) => ({
          ...participant,
          evento_titulo: participant.evento_titulo || item.event.titulo,
        }))
      ),
    [sorteos]
  )

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Participantes
                </div>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Tus sorteos
                </h1>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                  Revisa quién se anotó en cada sorteo y descarga la lista cuando la necesites.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/usuarios"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Volver al panel
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(allParticipants, "participantes-sorteos.csv")
                  }
                  disabled={allParticipants.length === 0}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Descargar CSV
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <MetricCard
                icon={<Ticket className="h-5 w-5 text-sky-600" />}
                label="Sorteos"
                value={String(sorteos.length)}
                description="Cantidad de sorteos propios cargados."
              />
              <MetricCard
                icon={<Users className="h-5 w-5 text-emerald-600" />}
                label="Participantes"
                value={String(totalParticipants)}
                description="Total de personas anotadas en tus sorteos."
              />
              <MetricCard
                icon={<Download className="h-5 w-5 text-amber-600" />}
                label="Exportacion"
                value={allParticipants.length > 0 ? "Lista lista" : "Sin datos"}
                description="Descarga la lista completa en formato CSV."
              />
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8 sm:py-10">
            {loading ? (
              <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-8 text-slate-500">
                Cargando participantes...
              </div>
            ) : (
              <>
                {error ? <AuthFormStatus tone="error" message={error} /> : null}

                {sorteos.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 p-8">
                    <h2 className="text-xl font-semibold text-slate-900">
                      Todavía no tienes sorteos
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                      Cuando cargues un evento con categoría Sorteo vas a poder ver aquí a las personas anotadas.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {sorteos.map(({ event, participants }) => (
                      <section
                        key={event.id}
                        className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                              Sorteo
                            </div>
                            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                              {event.titulo}
                            </h2>
                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                              <span className="inline-flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                {formatEventDateRange(
                                  event.fecha,
                                  event.fecha_fin,
                                  event.fecha_solo_mes ?? false
                                )}
                              </span>
                              <span>{participants.length} participantes</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              downloadCsv(
                                participants.map((item) => ({
                                  ...item,
                                  evento_titulo: item.evento_titulo || event.titulo,
                                })),
                                `participantes-sorteo-${event.id}.csv`
                              )
                            }
                            disabled={participants.length === 0}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 disabled:opacity-60"
                          >
                            <Download className="h-4 w-4" />
                            Descargar este sorteo
                          </button>
                        </div>

                        {participants.length === 0 ? (
                          <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
                            Aun no hay personas anotadas en este sorteo.
                          </div>
                        ) : (
                          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
                            <div className="grid grid-cols-[1.2fr_1fr_0.9fr] bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              <span>Nombre</span>
                              <span>Telefono</span>
                              <span>Fecha</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {participants.map((participant) => (
                                <div
                                  key={participant.id}
                                  className="grid grid-cols-[1.2fr_1fr_0.9fr] px-5 py-4 text-sm text-slate-700"
                                >
                                  <span className="font-medium text-slate-900">
                                    {participant.nombre}
                                  </span>
                                  <span>{participant.telefono}</span>
                                  <span>{formatParticipantDate(participant.created_at)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </section>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode
  label: string
  value: string
  description: string
}) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.2)] backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white p-3 shadow-sm">{icon}</div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          {label}
        </div>
      </div>
      <div className="mt-4 text-3xl font-semibold text-slate-950">{value}</div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}

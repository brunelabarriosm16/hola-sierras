'use client'

import { useEffect, useMemo, useState } from "react"
import { Activity, Clock3, Filter, Search, X } from "lucide-react"
import { supabase } from "../../supabase"

type AdminActividad = {
  id: number
  admin_username: string
  admin_nombre: string
  admin_rol: string
  accion: string
  seccion: string
  objetivo: string | null
  detalle: string | null
  created_at: string
}

export default function AdminActividadPage() {
  const [actividad, setActividad] = useState<AdminActividad[]>([])
  const [error, setError] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const cargarActividad = async () => {
      const { data, error } = await supabase
        .from("admin_actividad")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) {
        setError(`No se pudo cargar la actividad: ${error.message}`)
        return
      }

      setActividad(data || [])
    }

    cargarActividad()
  }, [])

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha)
    if (Number.isNaN(date.getTime())) return fecha

    return date.toLocaleString("es-UY", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const actividadFiltrada = useMemo(() => {
    return actividad.filter((item) => {
      const itemDate = item.created_at.slice(0, 10)
      const matchesFrom = !dateFrom || itemDate >= dateFrom
      const matchesTo = !dateTo || itemDate <= dateTo

      const text = `${item.admin_nombre} ${item.admin_username} ${item.seccion} ${item.accion} ${item.objetivo || ""} ${item.detalle || ""}`.toLowerCase()
      const matchesSearch =
        !search || text.includes(search.trim().toLowerCase())

      return matchesFrom && matchesTo && matchesSearch
    })
  }, [actividad, dateFrom, dateTo, search])

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">
          Actividad del Panel
        </h1>
        <p className="text-slate-500">
          Historial de cambios realizados por los administradores.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-slate-900">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filtrar actividad</span>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.2fr_0.6fr_0.6fr_auto]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Buscar
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre, usuario, seccion o accion"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearch("")
                setDateFrom("")
                setDateTo("")
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {actividadFiltrada.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
          <Activity className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">
            No hay actividad para mostrar
          </h3>
          <p className="text-slate-500">
            Probá ajustando los filtros o espera a que haya nuevos cambios.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.1fr_0.9fr_0.8fr_0.9fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
            <div>Administrador</div>
            <div>Accion</div>
            <div>Seccion</div>
            <div>Objetivo</div>
            <div>Fecha</div>
          </div>

          {actividadFiltrada.map((item) => (
            <div
              key={item.id}
              className="border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
              <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr_0.8fr_0.9fr_1fr] md:items-center">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {item.admin_nombre}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    @{item.admin_username} · {item.admin_rol === "superadmin" ? "Superadministrador" : "Administrador"}
                  </div>
                </div>

                <div>
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {item.accion}
                  </span>
                </div>

                <div className="text-sm text-slate-700">{item.seccion}</div>

                <div className="min-w-0">
                  <div className="truncate text-sm text-slate-700">
                    {item.objetivo || "-"}
                  </div>
                  {item.detalle && (
                    <div className="truncate text-xs text-slate-500">
                      {item.detalle}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock3 className="h-4 w-4" />
                  <span>{formatearFecha(item.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

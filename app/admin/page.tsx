'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Building2,
  Calendar,
  CreditCard,
  GraduationCap,
  Mail,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react"
import {
  AdminMetricCard,
  AdminNotice,
  AdminPageHeader,
  AdminPageShell,
  AdminSectionCard,
  AdminSkeletonGrid,
} from "../components/admin/AdminPageShell"
import { supabase } from "../supabase"

type DashboardCounts = {
  comercios: number
  eventos: number
  servicios: number
  instituciones: number
  cursos: number
  usuarios: number
  newComercios: number
  newEventos: number
  newContactos: number
  pendingSubscriptions: number
}

const initialCounts: DashboardCounts = {
  comercios: 0,
  eventos: 0,
  servicios: 0,
  instituciones: 0,
  cursos: 0,
  usuarios: 0,
  newComercios: 0,
  newEventos: 0,
  newContactos: 0,
  pendingSubscriptions: 0,
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [counts, setCounts] = useState<DashboardCounts>(initialCounts)

  useEffect(() => {
    const cargarDashboard = async () => {
      setLoading(true)
      setError("")

      const [
        { count: comercios, error: comerciosError },
        { count: eventos, error: eventosError },
        { count: servicios, error: serviciosError },
        { count: instituciones, error: institucionesError },
        { count: cursos, error: cursosError },
        { count: usuarios, error: usuariosError },
        { count: newComercios, error: newComerciosError },
        { count: newEventos, error: newEventosError },
        { count: newContactos, error: newContactosError },
        { count: pendingComercios, error: pendingComerciosError },
        { count: pendingServicios, error: pendingServiciosError },
        { count: pendingCursos, error: pendingCursosError },
      ] = await Promise.all([
        supabase.from("comercios").select("*", { count: "exact", head: true }),
        supabase.from("eventos").select("*", { count: "exact", head: true }),
        supabase.from("servicios").select("*", { count: "exact", head: true }),
        supabase.from("instituciones").select("*", { count: "exact", head: true }),
        supabase.from("cursos").select("*", { count: "exact", head: true }),
        supabase.from("usuarios_registrados").select("*", { count: "exact", head: true }),
        supabase
          .from("comercios")
          .select("*", { count: "exact", head: true })
          .eq("estado", "borrador"),
        supabase
          .from("eventos")
          .select("*", { count: "exact", head: true })
          .eq("estado", "borrador"),
        supabase
          .from("contacto_solicitudes")
          .select("*", { count: "exact", head: true })
          .or("visto.is.null,visto.eq.false"),
        supabase
          .from("comercios")
          .select("*", { count: "exact", head: true })
          .eq("estado_suscripcion", "pendiente"),
        supabase
          .from("servicios")
          .select("*", { count: "exact", head: true })
          .eq("estado_suscripcion", "pendiente"),
        supabase
          .from("cursos")
          .select("*", { count: "exact", head: true })
          .eq("estado_suscripcion", "pendiente"),
      ])

      const firstError = [
        comerciosError,
        eventosError,
        serviciosError,
        institucionesError,
        cursosError,
        usuariosError,
        newComerciosError,
        newEventosError,
        newContactosError,
        pendingComerciosError,
        pendingServiciosError,
        pendingCursosError,
      ].find(Boolean)

      if (firstError) {
        setError(`No pudimos cargar el panel: ${firstError.message}`)
      }

      setCounts({
        comercios: comercios || 0,
        eventos: eventos || 0,
        servicios: servicios || 0,
        instituciones: instituciones || 0,
        cursos: cursos || 0,
        usuarios: usuarios || 0,
        newComercios: newComercios || 0,
        newEventos: newEventos || 0,
        newContactos: newContactos || 0,
        pendingSubscriptions:
          (pendingComercios || 0) + (pendingServicios || 0) + (pendingCursos || 0),
      })
      setLoading(false)
    }

    void cargarDashboard()
  }, [])

  const priorities = [
    {
      id: "contactos",
      title: "Contactos pendientes",
      value: counts.newContactos,
      description: "Mensajes nuevos para responder.",
      icon: Mail,
      tone: "rose" as const,
      href: "/admin/contactos",
    },
    {
      id: "eventos",
      title: "Eventos borrador",
      value: counts.newEventos,
      description: "Publicaciones listas para revisar.",
      icon: Calendar,
      tone: "green" as const,
      href: "/admin/eventos",
    },
    {
      id: "comercios",
      title: "Comercios borrador",
      value: counts.newComercios,
      description: "Altas nuevas pendientes.",
      icon: Store,
      tone: "blue" as const,
      href: "/admin/comercios",
    },
    {
      id: "suscripciones",
      title: "Suscripciones pendientes",
      value: counts.pendingSubscriptions,
      description: "Planes esperando confirmación.",
      icon: CreditCard,
      tone: "slate" as const,
      href: "/admin/suscripciones",
    },
  ]

  const sections = [
    {
      id: "comercios",
      title: "Comercios",
      value: counts.comercios,
      icon: Store,
      tone: "blue" as const,
      href: "/admin/comercios",
    },
    {
      id: "eventos",
      title: "Eventos",
      value: counts.eventos,
      icon: Calendar,
      tone: "green" as const,
      href: "/admin/eventos",
    },
    {
      id: "servicios",
      title: "Servicios",
      value: counts.servicios,
      icon: ShieldAlert,
      tone: "amber" as const,
      href: "/admin/servicios",
    },
    {
      id: "instituciones",
      title: "Instituciones",
      value: counts.instituciones,
      icon: Building2,
      tone: "blue" as const,
      href: "/admin/instituciones",
    },
    {
      id: "cursos",
      title: "Cursos",
      value: counts.cursos,
      icon: GraduationCap,
      tone: "slate" as const,
      href: "/admin/cursos",
    },
    {
      id: "usuarios",
      title: "Usuarios",
      value: counts.usuarios,
      icon: Users,
      tone: "blue" as const,
      href: "/admin/usuarios",
    },
  ]

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Panel"
        title="Inicio"
        description="Prioriza lo que requiere acción y entra directo a cada módulo sin recorrer menús innecesarios."
        actions={
          <button
            type="button"
            onClick={() => router.push("/admin/metricas")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <BarChart3 className="h-4 w-4" />
            Métricas
          </button>
        }
      />

      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}

      {loading ? (
        <AdminSkeletonGrid count={8} />
      ) : (
        <div className="space-y-6">
          <section>
            <div className="mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                Para resolver
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {priorities.map((card) => (
                <AdminMetricCard
                  key={card.id}
                  title={card.title}
                  value={card.value}
                  description={card.description}
                  icon={card.icon}
                  tone={card.tone}
                  onClick={() => router.push(card.href)}
                />
              ))}
            </div>
          </section>

          <AdminSectionCard>
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-slate-950">Módulos</h2>
              <p className="text-sm text-slate-500">
                Accesos rápidos a las áreas que se administran todos los días.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sections.map((section) => (
                <AdminMetricCard
                  key={section.id}
                  title={section.title}
                  value={section.value}
                  icon={section.icon}
                  tone={section.tone}
                  onClick={() => router.push(section.href)}
                />
              ))}
            </div>
          </AdminSectionCard>
        </div>
      )}
    </AdminPageShell>
  )
}

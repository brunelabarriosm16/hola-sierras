'use client'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import { BarChart3, CalendarDays, CreditCard, Download, ExternalLink, EyeOff, FilePenLine, ImageIcon, KeyRound, LogOut, Menu, PlusCircle, Send, Trash2, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthFormStatus } from "../components/AuthFormStatus"
import { formatEventDateRange } from "../lib/eventDates"
import { buildUserProfileFields, fetchUserOwnedEvents, findUserOwnedEntity, getUserProfileImageSrc, normalizeUserEntityStatus, supportsPremiumProfile, userEntityLabels, type UserEntityType, type UserOwnedEntity, type UserOwnedEvent } from "../lib/userProfiles"
import { supabase } from "../supabase"

type ExternalLinksForm = { webUrl: string; instagramUrl: string; facebookUrl: string }
type ComercioForm = ExternalLinksForm & { nombre: string; direccion: string; telefono: string; descripcion: string; usaWhatsapp: boolean }
type ServicioForm = ExternalLinksForm & { nombre: string; categoria: string; descripcion: string; responsable: string; contacto: string; direccion: string; usaWhatsapp: boolean }
type CursoForm = ExternalLinksForm & { nombre: string; descripcion: string; responsable: string; contacto: string; usaWhatsapp: boolean }
type InstitucionForm = ExternalLinksForm & { nombre: string; descripcion: string; direccion: string; telefono: string; usaWhatsapp: boolean }

const serviceCategories = ["Profesionales", "Alojamientos", "Oficios", "Servicios"]
const initialComercio: ComercioForm = { nombre: "", direccion: "", telefono: "", descripcion: "", webUrl: "", instagramUrl: "", facebookUrl: "", usaWhatsapp: true }
const initialServicio: ServicioForm = { nombre: "", categoria: "Profesionales", descripcion: "", responsable: "", contacto: "", direccion: "", webUrl: "", instagramUrl: "", facebookUrl: "", usaWhatsapp: true }
const initialCurso: CursoForm = { nombre: "", descripcion: "", responsable: "", contacto: "", webUrl: "", instagramUrl: "", facebookUrl: "", usaWhatsapp: true }
const initialInstitucion: InstitucionForm = { nombre: "", descripcion: "", direccion: "", telefono: "", webUrl: "", instagramUrl: "", facebookUrl: "", usaWhatsapp: true }
function formatEventState(status?: string | null) {
  const normalized = normalizeEventStatus(status)
  if (normalized === "borrador") return "Borrador"
  if (normalized === "oculto") return "Oculto"
  if (normalized === "cancelado") return "Cancelado"
  return "Activo"
}

function normalizeEventStatus(status?: string | null) {
  if (status === "cancelado") return "cancelado"
  const normalized = normalizeUserEntityStatus(status)
  if (normalized === "borrador") return "borrador"
  if (normalized === "oculto") return "oculto"
  return "activo"
}

function getStatusStyles(status: "activo" | "borrador" | "oculto") {
  if (status === "borrador") return { badge: "bg-amber-100 text-amber-800", panel: "border-amber-200 bg-amber-50/70", accent: "text-amber-700" }
  if (status === "oculto") return { badge: "bg-slate-200 text-slate-700", panel: "border-slate-200 bg-slate-100", accent: "text-slate-700" }
  return { badge: "bg-emerald-100 text-emerald-800", panel: "border-emerald-200 bg-emerald-50/70", accent: "text-emerald-700" }
}

function buildOnboardingPayload(params: { type: UserEntityType; email: string; comercio: ComercioForm; servicio: ServicioForm; curso: CursoForm; institucion: InstitucionForm }) {
  if (params.type === "comercio") {
    return { table: "comercios" as const, payload: { nombre: params.comercio.nombre.trim(), direccion: params.comercio.direccion.trim() || null, telefono: params.comercio.telefono.trim() || null, descripcion: params.comercio.descripcion.trim() || null, web_url: params.comercio.webUrl.trim() || null, instagram_url: params.comercio.instagramUrl.trim() || null, facebook_url: params.comercio.facebookUrl.trim() || null, imagen_url: null, estado: "borrador", owner_email: params.email, usa_whatsapp: params.comercio.usaWhatsapp } }
  }
  if (params.type === "servicio") {
    return { table: "servicios" as const, payload: { nombre: params.servicio.nombre.trim(), categoria: params.servicio.categoria, descripcion: params.servicio.descripcion.trim() || null, responsable: params.servicio.responsable.trim() || null, contacto: params.servicio.contacto.trim() || null, direccion: params.servicio.direccion.trim() || null, web_url: params.servicio.webUrl.trim() || null, instagram_url: params.servicio.instagramUrl.trim() || null, facebook_url: params.servicio.facebookUrl.trim() || null, imagen: null, estado: "borrador", owner_email: params.email, usa_whatsapp: params.servicio.usaWhatsapp } }
  }
  if (params.type === "curso") {
    return { table: "cursos" as const, payload: { nombre: params.curso.nombre.trim(), descripcion: params.curso.descripcion.trim(), responsable: params.curso.responsable.trim(), contacto: params.curso.contacto.trim(), web_url: params.curso.webUrl.trim() || null, instagram_url: params.curso.instagramUrl.trim() || null, facebook_url: params.curso.facebookUrl.trim() || null, imagen: null, estado: "borrador", owner_email: params.email, usa_whatsapp: params.curso.usaWhatsapp } }
  }
  return { table: "instituciones" as const, payload: { nombre: params.institucion.nombre.trim(), descripcion: params.institucion.descripcion.trim() || null, direccion: params.institucion.direccion.trim() || null, telefono: params.institucion.telefono.trim() || null, web_url: params.institucion.webUrl.trim() || null, instagram_url: params.institucion.instagramUrl.trim() || null, facebook_url: params.institucion.facebookUrl.trim() || null, foto: null, estado: "borrador", owner_email: params.email, usa_whatsapp: params.institucion.usaWhatsapp } }
}

export default function UsuariosHomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [ownedEntity, setOwnedEntity] = useState<UserOwnedEntity | null>(null)
  const [events, setEvents] = useState<UserOwnedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [entityType, setEntityType] = useState<UserEntityType>("comercio")
  const [comercio, setComercio] = useState<ComercioForm>(initialComercio)
  const [servicio, setServicio] = useState<ServicioForm>(initialServicio)
  const [curso, setCurso] = useState<CursoForm>(initialCurso)
  const [institucion, setInstitucion] = useState<InstitucionForm>(initialInstitucion)
  const [savingOnboarding, setSavingOnboarding] = useState(false)
  const [updatingEventId, setUpdatingEventId] = useState<number | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.email) {
        router.replace("/usuarios/login")
        return
      }
      try {
        const entity = await findUserOwnedEntity(session.user.email)
        const ownEvents = entity ? await fetchUserOwnedEvents(session.user.email) : []
        setUser(session.user)
        setOwnedEntity(entity)
        setEvents(ownEvents)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar tu panel en este momento.")
      } finally {
        setLoading(false)
      }
    }
    void loadSession()
  }, [router])

  const handleLogout = async () => {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError("No pudimos cerrar la sesion.")
      return
    }
    router.push("/usuarios/login")
    router.refresh()
  }

  const handleCreateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    if (!user?.email) {
      setError("Necesitas iniciar sesion para continuar.")
      return
    }
    if (entityType === "comercio" && !comercio.nombre.trim()) {
      setError("Completa el nombre del comercio.")
      return
    }
    if (entityType === "servicio" && !servicio.nombre.trim()) {
      setError("Completa el nombre del servicio.")
      return
    }
    if (entityType === "curso" && (!curso.nombre.trim() || !curso.descripcion.trim() || !curso.responsable.trim() || !curso.contacto.trim())) {
      setError("Completa nombre, descripcion, responsable y contacto del curso.")
      return
    }
    if (entityType === "institucion" && !institucion.nombre.trim()) {
      setError("Completa el nombre de la institucion.")
      return
    }
    setSavingOnboarding(true)
    const { table, payload } = buildOnboardingPayload({ type: entityType, email: user.email, comercio, servicio, curso, institucion })
    const { error: insertError } = await supabase.from(table).insert([payload])
    if (insertError) {
      setError(`No pudimos guardar tus datos: ${insertError.message}`)
      setSavingOnboarding(false)
      return
    }
    setSavingOnboarding(false)
    if (entityType === "institucion") {
      router.replace("/usuarios")
      router.refresh()
      return
    }

    router.replace("/usuarios/suscripcion?setup=1")
    router.refresh()
  }

  const handleEventStatusChange = async (
    eventId: number,
    nextStatus: "activo" | "oculto" | "cancelado"
  ) => {
    if (!user?.email) {
      setError("Necesitas iniciar sesion para gestionar eventos.")
      return
    }

    setError("")
    setUpdatingEventId(eventId)

    const { error: updateError } = await supabase
      .from("eventos")
      .update({ estado: nextStatus })
      .eq("id", eventId)
      .eq("owner_email", user.email)

    if (updateError) {
      setError(`No pudimos actualizar el evento: ${updateError.message}`)
      setUpdatingEventId(null)
      return
    }

    setEvents((current) =>
      current.map((item) =>
        item.id === eventId
          ? {
              ...item,
              estado: nextStatus,
            }
          : item
      )
    )
    setUpdatingEventId(null)
  }

  const handleDeleteEvent = async (eventId: number) => {
    if (!user?.email) {
      setError("Necesitas iniciar sesion para gestionar eventos.")
      return
    }

    const confirmed = window.confirm(
      "¿Seguro que quieres eliminar este evento? Esta acción no se puede deshacer."
    )

    if (!confirmed) return

    setError("")
    setUpdatingEventId(eventId)

    const { error: deleteError } = await supabase
      .from("eventos")
      .delete()
      .eq("id", eventId)
      .eq("owner_email", user.email)

    if (deleteError) {
      setError(`No pudimos eliminar el evento: ${deleteError.message}`)
      setUpdatingEventId(null)
      return
    }

    setEvents((current) => current.filter((item) => item.id !== eventId))
    setUpdatingEventId(null)
  }

  const statusKey = normalizeUserEntityStatus(ownedEntity?.record.estado)
  const statusStyles = getStatusStyles(statusKey)
  const isInstitution = ownedEntity?.type === "institucion"
  const imageSrc = getUserProfileImageSrc(ownedEntity)
  const profileFields = useMemo(() => buildUserProfileFields(ownedEntity), [ownedEntity])
  const activeEvents = useMemo(() => events.filter((item) => normalizeEventStatus(item.estado) === "activo"), [events])
  const draftEvents = useMemo(() => events.filter((item) => normalizeEventStatus(item.estado) === "borrador"), [events])
  const hiddenEvents = useMemo(() => events.filter((item) => normalizeEventStatus(item.estado) === "oculto"), [events])
  const cancelledEvents = useMemo(() => events.filter((item) => normalizeEventStatus(item.estado) === "cancelado"), [events])
  const hasPremium = Boolean(ownedEntity?.record.premium_activo && ownedEntity && supportsPremiumProfile(ownedEntity.type))

  if (loading) {
    return <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6"><div className="mx-auto max-w-5xl rounded-[32px] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)]">Cargando cuenta...</div></main>
  }

  if (!ownedEntity) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f2f7f5_48%,#ffffff_100%)] px-4 py-12 text-slate-900 sm:px-6">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_25px_80px_-38px_rgba(15,23,42,0.35)] lg:grid-cols-[0.95fr_1.05fr]">
          <section className="bg-[radial-gradient(circle_at_top_left,#d8f3df_0%,#edf8f1_42%,#eef5ff_100%)] p-8 sm:p-10">
            <div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Primer ingreso</div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">Completa tu espacio</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Esta es la primera vez que entras con tu cuenta. Completa primero los datos de tu perfil y después te llevamos a suscripción para continuar.</p>
              <div className="mt-8 space-y-4">
              <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cuenta conectada</div>
                <div className="mt-3 text-lg font-semibold text-slate-950">{user?.email}</div>
              </div>
              <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                <div className="text-sm font-medium text-slate-900">Que vas a poder hacer despues</div>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <p>Completar la suscripcion y continuar con el alta de tu espacio.</p>
                  <p>Ver tu negocio cargado y editar sus datos.</p>
                  <p>Subir eventos y revisar cuales estan activos o en borrador.</p>
                </div>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600">Volver al inicio</Link>
              <button type="button" onClick={() => void handleLogout()} className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600">Cerrar sesion</button>
            </div>
          </section>
          <section className="p-6 sm:p-8 lg:p-10">
            <form onSubmit={handleCreateProfile} className="space-y-6">
              {error ? <AuthFormStatus tone="error" message={error} /> : null}
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-700">Tipo de perfil</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(Object.keys(userEntityLabels) as UserEntityType[]).map((type) => (
                    <label key={type} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${entityType === type ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700 hover:border-blue-300"}`}>
                      <input type="radio" name="entityType" value={type} checked={entityType === type} onChange={() => setEntityType(type)} className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span>{userEntityLabels[type]}</span>
                    </label>
                  ))}
                </div>
              </div>
              {entityType === "comercio" ? <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5"><Field label="Nombre del comercio" value={comercio.nombre} onChange={(value) => setComercio((current) => ({ ...current, nombre: value }))} required /><div className="grid gap-4 md:grid-cols-2"><Field label="Direccion" value={comercio.direccion} onChange={(value) => setComercio((current) => ({ ...current, direccion: value }))} /><Field label="Telefono" value={comercio.telefono} onChange={(value) => setComercio((current) => ({ ...current, telefono: value }))} /></div><TextAreaField label="Descripcion" value={comercio.descripcion} onChange={(value) => setComercio((current) => ({ ...current, descripcion: value }))} /><ExternalLinksFields webUrl={comercio.webUrl} instagramUrl={comercio.instagramUrl} facebookUrl={comercio.facebookUrl} onWebChange={(value) => setComercio((current) => ({ ...current, webUrl: value }))} onInstagramChange={(value) => setComercio((current) => ({ ...current, instagramUrl: value }))} onFacebookChange={(value) => setComercio((current) => ({ ...current, facebookUrl: value }))} /><CheckboxField label="Este telefono tiene WhatsApp" checked={comercio.usaWhatsapp} onChange={(checked) => setComercio((current) => ({ ...current, usaWhatsapp: checked }))} /></div> : null}

              {entityType === "servicio" ? <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5"><Field label="Nombre del servicio" value={servicio.nombre} onChange={(value) => setServicio((current) => ({ ...current, nombre: value }))} required /><div className="space-y-2"><label className="text-sm font-medium text-slate-700">Categoria</label><select value={servicio.categoria} onChange={(event) => setServicio((current) => ({ ...current, categoria: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400">{serviceCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div><div className="grid gap-4 md:grid-cols-2"><Field label="Responsable" value={servicio.responsable} onChange={(value) => setServicio((current) => ({ ...current, responsable: value }))} /><Field label="Contacto" value={servicio.contacto} onChange={(value) => setServicio((current) => ({ ...current, contacto: value }))} /></div><Field label="Direccion" value={servicio.direccion} onChange={(value) => setServicio((current) => ({ ...current, direccion: value }))} /><TextAreaField label="Descripcion" value={servicio.descripcion} onChange={(value) => setServicio((current) => ({ ...current, descripcion: value }))} /><ExternalLinksFields webUrl={servicio.webUrl} instagramUrl={servicio.instagramUrl} facebookUrl={servicio.facebookUrl} onWebChange={(value) => setServicio((current) => ({ ...current, webUrl: value }))} onInstagramChange={(value) => setServicio((current) => ({ ...current, instagramUrl: value }))} onFacebookChange={(value) => setServicio((current) => ({ ...current, facebookUrl: value }))} /><CheckboxField label="Este contacto tiene WhatsApp" checked={servicio.usaWhatsapp} onChange={(checked) => setServicio((current) => ({ ...current, usaWhatsapp: checked }))} /></div> : null}

              {entityType === "curso" ? <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5"><Field label="Nombre del curso o clase" value={curso.nombre} onChange={(value) => setCurso((current) => ({ ...current, nombre: value }))} required /><TextAreaField label="Descripcion" value={curso.descripcion} onChange={(value) => setCurso((current) => ({ ...current, descripcion: value }))} required /><div className="grid gap-4 md:grid-cols-2"><Field label="Responsable" value={curso.responsable} onChange={(value) => setCurso((current) => ({ ...current, responsable: value }))} required /><Field label="Contacto" value={curso.contacto} onChange={(value) => setCurso((current) => ({ ...current, contacto: value }))} required /></div><ExternalLinksFields webUrl={curso.webUrl} instagramUrl={curso.instagramUrl} facebookUrl={curso.facebookUrl} onWebChange={(value) => setCurso((current) => ({ ...current, webUrl: value }))} onInstagramChange={(value) => setCurso((current) => ({ ...current, instagramUrl: value }))} onFacebookChange={(value) => setCurso((current) => ({ ...current, facebookUrl: value }))} /><CheckboxField label="Este contacto tiene WhatsApp" checked={curso.usaWhatsapp} onChange={(checked) => setCurso((current) => ({ ...current, usaWhatsapp: checked }))} /></div> : null}

              {entityType === "institucion" ? <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5"><Field label="Nombre de la institucion" value={institucion.nombre} onChange={(value) => setInstitucion((current) => ({ ...current, nombre: value }))} required /><div className="grid gap-4 md:grid-cols-2"><Field label="Direccion" value={institucion.direccion} onChange={(value) => setInstitucion((current) => ({ ...current, direccion: value }))} /><Field label="Telefono" value={institucion.telefono} onChange={(value) => setInstitucion((current) => ({ ...current, telefono: value }))} /></div><TextAreaField label="Descripcion" value={institucion.descripcion} onChange={(value) => setInstitucion((current) => ({ ...current, descripcion: value }))} /><ExternalLinksFields webUrl={institucion.webUrl} instagramUrl={institucion.instagramUrl} facebookUrl={institucion.facebookUrl} onWebChange={(value) => setInstitucion((current) => ({ ...current, webUrl: value }))} onInstagramChange={(value) => setInstitucion((current) => ({ ...current, instagramUrl: value }))} onFacebookChange={(value) => setInstitucion((current) => ({ ...current, facebookUrl: value }))} /><CheckboxField label="Este telefono tiene WhatsApp" checked={institucion.usaWhatsapp} onChange={(checked) => setInstitucion((current) => ({ ...current, usaWhatsapp: checked }))} /></div> : null}

              <button type="submit" disabled={savingOnboarding} className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70">{savingOnboarding ? "Guardando..." : entityType === "institucion" ? "Guardar y entrar al panel" : "Guardar y continuar a suscripcion"}</button>
            </form>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {error ? <AuthFormStatus tone="error" message={error} /> : null}
        <section className="rounded-[36px] border border-slate-200 bg-white p-4 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            <div className="relative flex-1 rounded-[32px] bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Mi panel</div>
                <div className="relative z-20">
                  <button
                    type="button"
                    onClick={() => setActionsOpen((current) => !current)}
                    className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                    aria-expanded={actionsOpen}
                    aria-label="Abrir acciones"
                  >
                    <Menu className="h-5 w-5" />
                    Menú
                  </button>
                    {actionsOpen ? (
                      <div className="absolute right-0 top-full z-20 mt-3 w-[340px] max-h-[70vh] overflow-y-auto rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-[0_20px_50px_-26px_rgba(15,23,42,0.35)] backdrop-blur">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Acciones</div>
                        <div className="space-y-3">
                          <QuickLink href="/usuarios/perfil" icon={<FilePenLine className="h-5 w-5 text-slate-400 transition group-hover:text-blue-600" />} title="Editar mis datos" description="Actualiza descripción, imagen y datos de contacto." />
                          {hasPremium ? <QuickLink href="/usuarios/perfil#premium" icon={<FilePenLine className="h-5 w-5 text-slate-400 transition group-hover:text-fuchsia-600" />} title="Editar versión extendida" description="Administra el contenido ampliado de tu ficha desde el perfil." /> : null}
                          {!isInstitution ? <QuickLink href="/usuarios/suscripcion" icon={<CreditCard className="h-5 w-5 text-slate-400 transition group-hover:text-sky-600" />} title="Suscripción" description="Revisa tu plan, cambia la opción elegida y continúa el pago." /> : null}
                          <QuickLink href="/usuarios/metricas-holavarela" icon={<BarChart3 className="h-5 w-5 text-slate-400 transition group-hover:text-indigo-600" />} title="Métricas de Hola Varela" description="Conoce visitantes, vistas y actividad general de la plataforma." />
                          <QuickLink href="/usuarios/eventos/nuevo" icon={<PlusCircle className="h-5 w-5 text-slate-400 transition group-hover:text-emerald-600" />} title="Subir evento" description="Carga una actividad, promo, sorteo o novedad." />
                          <QuickLink href="/usuarios/contrasena" icon={<KeyRound className="h-5 w-5 text-slate-400 transition group-hover:text-violet-600" />} title="Cambiar contraseña" description="Hazlo de forma segura validando tu clave actual." />
                          <QuickLink href="/" icon={<ExternalLink className="h-5 w-5 text-slate-400 transition group-hover:text-slate-700" />} title="Ver sitio público" description="Revisa cómo aparece Hola Varela para las visitas." />
                        </div>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-4xl">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">{userEntityLabels[ownedEntity.type]}</p>
                  <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl xl:text-6xl">{ownedEntity.record.nombre}</h1>
                  <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">Desde aquí puedes revisar tu perfil, mantenerlo actualizado, ver tus eventos y gestionar tu suscripción sin perderte entre opciones.</p>
                  <div className="mt-5 inline-flex rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm">{user?.email}</div>
                </div>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <DashboardMetric label="Perfil" value={userEntityLabels[ownedEntity.type]} description="Tu ficha principal ya quedo vinculada a esta cuenta." />
                <DashboardMetric label="Eventos" value={String(events.length)} description={`${activeEvents.length} activos · ${draftEvents.length + hiddenEvents.length} pendientes`} />
              </div>
              <div className="mt-4">
                <QuickLink href="/usuarios/sorteos" icon={<Download className="h-5 w-5 text-slate-400 transition group-hover:text-amber-600" />} title="Participantes de sorteos" description="Revisa quienes se anotaron y descarga la lista en CSV." />
              </div>
              <div className="mt-8">
                <UnifiedEventsSection
                  activeEvents={activeEvents}
                  draftEvents={draftEvents}
                  hiddenEvents={hiddenEvents}
                  cancelledEvents={cancelledEvents}
                  updatingEventId={updatingEventId}
                  onChangeStatus={handleEventStatusChange}
                  onDeleteEvent={handleDeleteEvent}
                />
              </div>
            </div>
            <div className="w-full rounded-[32px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-6 py-8 sm:px-8 sm:py-10 lg:w-[420px]">
              {imageSrc ? <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"><img src={imageSrc} alt={ownedEntity.record.nombre} loading="lazy" decoding="async" className="h-72 w-full object-cover" /></div> : <div className="rounded-[28px] border border-dashed border-slate-200 bg-white p-8 shadow-sm"><div className="flex items-start gap-4"><div className="rounded-[20px] bg-slate-100 p-4"><ImageIcon className="h-6 w-6 text-slate-400" /></div><div><h3 className="text-lg font-semibold text-slate-900">Agrega una imagen</h3><p className="mt-2 text-sm leading-7 text-slate-500">Tu perfil se ve mucho mejor cuando tiene una foto o imagen principal.</p></div></div></div>}
              <ProfileSummaryCard
                title={ownedEntity.record.nombre}
                typeLabel={userEntityLabels[ownedEntity.type]}
                badgeClassName={statusStyles.badge}
                fields={profileFields}
                description={ownedEntity.record.descripcion?.trim() ? ownedEntity.record.descripcion : "Aún no agregaste una descripción. Puedes completarla desde editar mis datos."}
              />
              <div className="hidden">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Acciones rápidas</div>
                <div className="mt-4 space-y-3">
                  <QuickLink href="/usuarios/perfil" icon={<FilePenLine className="h-5 w-5 text-slate-400 transition group-hover:text-blue-600" />} title="Editar mis datos" description={hasPremium ? "Actualiza datos, imagen y el contenido ampliado de tu ficha." : "Actualiza descripción, imagen y datos de contacto."} />
                        {!isInstitution ? <QuickLink href="/usuarios/suscripcion" icon={<CreditCard className="h-5 w-5 text-slate-400 transition group-hover:text-sky-600" />} title="Suscripción" description="Revisa tu plan, cambia la opción elegida y continúa el pago." /> : null}
                        <QuickLink href="/usuarios/metricas-holavarela" icon={<BarChart3 className="h-5 w-5 text-slate-400 transition group-hover:text-indigo-600" />} title="Métricas de Hola Varela" description="Conoce visitantes, vistas y actividad general de la plataforma." />
                        <QuickLink href="/usuarios/eventos/nuevo" icon={<PlusCircle className="h-5 w-5 text-slate-400 transition group-hover:text-emerald-600" />} title="Subir evento" description="Carga una actividad, promo, sorteo o novedad." />
                  <QuickLink href="/usuarios/contrasena" icon={<KeyRound className="h-5 w-5 text-slate-400 transition group-hover:text-violet-600" />} title="Cambiar contraseña" description="Hazlo de forma segura validando tu clave actual." />
                  <QuickLink href="/" icon={<ExternalLink className="h-5 w-5 text-slate-400 transition group-hover:text-slate-700" />} title="Ver sitio público" description="Revisa cómo aparece Hola Varela para las visitas." />
                </div>
              </div>
              <button type="button" onClick={() => void handleLogout()} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"><LogOut className="h-4 w-4" />Cerrar sesion</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function DashboardMetric({ label, value, description }: { label: string; value: string; description: string }) {
  return <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.25)] backdrop-blur"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div><div className="mt-4 text-3xl font-semibold text-slate-950">{value}</div><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p></div>
}

function ProfileSummaryCard({
  title,
  typeLabel,
  badgeClassName,
  fields,
  description,
}: {
  title: string
  typeLabel: string
  badgeClassName: string
  fields: ReturnType<typeof buildUserProfileFields>
  description: string
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.25)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Tu ficha</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{title}</p>
        </div>
        <div className={`rounded-full px-4 py-2 text-sm font-semibold ${badgeClassName}`}>{typeLabel}</div>
      </div>
      <div className="mt-6 grid gap-4">
        {fields.map((field) => {
          const Icon = field.icon
          return <div key={field.label} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"><div className="flex items-center gap-3"><div className="rounded-2xl bg-white p-3 shadow-sm"><Icon className="h-4 w-4 text-slate-500" /></div><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{field.label}</div><div className="mt-1 text-sm leading-6 text-slate-700">{field.value}</div></div></div></div>
        })}
      </div>
      <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Descripción</div><div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{description}</div></div>
    </div>
  )
}

function QuickLink({ href, title, description, icon }: { href: string; title: string; description: string; icon: React.ReactNode }) {
  return <Link href={href} className="group flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4 transition hover:border-blue-300 hover:bg-blue-50/60"><div><div className="text-base font-semibold text-slate-900">{title}</div><div className="mt-1 text-sm text-slate-500">{description}</div></div>{icon}</Link>
}

function UnifiedEventsSection({
  activeEvents,
  draftEvents,
  hiddenEvents,
  cancelledEvents,
  updatingEventId,
  onChangeStatus,
  onDeleteEvent,
}: {
  activeEvents: UserOwnedEvent[]
  draftEvents: UserOwnedEvent[]
  hiddenEvents: UserOwnedEvent[]
  cancelledEvents: UserOwnedEvent[]
  updatingEventId: number | null
  onChangeStatus: (eventId: number, nextStatus: "activo" | "oculto" | "cancelado") => void
  onDeleteEvent: (eventId: number) => void
}) {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Tus eventos</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Revisa, edita y publica tus eventos desde un solo lugar.
          </p>
        </div>
        <Link href="/usuarios/eventos/nuevo" className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600">
          Nuevo evento
        </Link>
      </div>

      {activeEvents.length === 0 &&
      draftEvents.length === 0 &&
      hiddenEvents.length === 0 &&
      cancelledEvents.length === 0 ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#f4faf6_100%)] p-8">
          <h3 className="text-lg font-semibold text-slate-900">Todavía no tienes eventos</h3>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
            Cuando cargues uno nuevo lo vas a ver aquí, junto con su estado y el acceso para seguir editándolo.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <EventGroup
            label={`Activos (${activeEvents.length})`}
            tone="active"
            emptyTitle="No tienes eventos activos"
            emptyDescription="Cuando un evento se publica, lo verás aquí."
            events={activeEvents}
            updatingEventId={updatingEventId}
            onChangeStatus={onChangeStatus}
            onDeleteEvent={onDeleteEvent}
          />
          <EventGroup
            label={`Borradores (${draftEvents.length})`}
            tone="draft"
            emptyTitle="No tienes eventos en borrador"
            emptyDescription="Los borradores quedan listos para revisar o completar antes de publicarse."
            events={draftEvents}
            updatingEventId={updatingEventId}
            onChangeStatus={onChangeStatus}
            onDeleteEvent={onDeleteEvent}
            allowDraftResume
          />
          <EventGroup
            label={`Ocultos (${hiddenEvents.length})`}
            tone="hidden"
            emptyTitle="No tienes eventos ocultos"
            emptyDescription="Si desactivas la visibilidad de un evento, aparecerá aquí."
            events={hiddenEvents}
            updatingEventId={updatingEventId}
            onChangeStatus={onChangeStatus}
            onDeleteEvent={onDeleteEvent}
            allowDraftResume
          />
          <EventGroup
            label={`Cancelados (${cancelledEvents.length})`}
            tone="cancelled"
            emptyTitle="No tienes eventos cancelados"
            emptyDescription="Los eventos cancelados quedan guardados para que puedas revisarlos o reactivarlos mas adelante."
            events={cancelledEvents}
            updatingEventId={updatingEventId}
            onChangeStatus={onChangeStatus}
            onDeleteEvent={onDeleteEvent}
            allowDraftResume
          />
        </div>
      )}
    </div>
  )
}

function EventGroup({
  label,
  tone,
  emptyTitle,
  emptyDescription,
  events,
  updatingEventId,
  onChangeStatus,
  onDeleteEvent,
  allowDraftResume = false,
}: {
  label: string
  tone: "active" | "draft" | "hidden" | "cancelled"
  emptyTitle: string
  emptyDescription: string
  events: UserOwnedEvent[]
  updatingEventId: number | null
  onChangeStatus: (eventId: number, nextStatus: "activo" | "oculto" | "cancelado") => void
  onDeleteEvent: (eventId: number) => void
  allowDraftResume?: boolean
}) {
  const toneClass =
    tone === "active"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "draft"
        ? "bg-amber-100 text-amber-700"
        : tone === "hidden"
          ? "bg-slate-200 text-slate-700"
          : "bg-rose-100 text-rose-700"

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${toneClass}`}>
          {label}
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {events.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-6">
          <h3 className="text-lg font-semibold text-slate-900">{emptyTitle}</h3>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">{emptyDescription}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <article key={event.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
                            {event.imagen ? (
                              <img src={event.imagen} alt={event.titulo} loading="lazy" decoding="async" className="h-44 w-full object-cover" />
              ) : (
                <div className="flex h-44 items-center justify-center bg-slate-100">
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{event.titulo}</h3>
                    <div className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{event.categoria || "Evento"}</div>
                  </div>
                  <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">{formatEventState(event.estado)}</div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span>{formatEventDateRange(event.fecha, event.fecha_fin, event.fecha_solo_mes ?? false)}</span>
                  </div>
                </div>
                <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-500">{event.descripcion}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {allowDraftResume ? (
                    <Link href={`/usuarios/eventos/nuevo?edit=${event.id}`} className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100">
                      {tone === "draft" ? "Continuar borrador" : "Editar evento"}
                    </Link>
                  ) : null}

                  {allowDraftResume ? (
                    <button
                      type="button"
                      disabled={updatingEventId === event.id}
                      onClick={() => onDeleteEvent(event.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar evento
                    </button>
                  ) : null}

                  {tone !== "active" ? (
                    <button
                      type="button"
                      disabled={updatingEventId === event.id}
                      onClick={() => onChangeStatus(event.id, "activo")}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {tone === "draft" ? "Publicar" : "Volver a publicar"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={updatingEventId === event.id}
                      onClick={() => onChangeStatus(event.id, "oculto")}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-60"
                    >
                      <EyeOff className="h-4 w-4" />
                      Desactivar visibilidad
                    </button>
                  )}

                  {tone !== "cancelled" ? (
                    <button
                      type="button"
                      disabled={updatingEventId === event.id}
                      onClick={() => onChangeStatus(event.id, "cancelado")}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return <div className="space-y-2"><label className="text-sm font-medium text-slate-700">{label}</label><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400" /></div>
}

function TextAreaField({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <div className="space-y-2"><label className="text-sm font-medium text-slate-700">{label}</label><textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} rows={4} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400" /></div>
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><span>{label}</span></label>
}

function ExternalLinksFields({ webUrl, instagramUrl, facebookUrl, onWebChange, onInstagramChange, onFacebookChange }: { webUrl: string; instagramUrl: string; facebookUrl: string; onWebChange: (value: string) => void; onInstagramChange: (value: string) => void; onFacebookChange: (value: string) => void }) {
  return <div className="grid gap-4 md:grid-cols-3"><Field label="Sitio web" type="url" value={webUrl} onChange={onWebChange} /><Field label="Instagram" type="url" value={instagramUrl} onChange={onInstagramChange} /><Field label="Facebook" type="url" value={facebookUrl} onChange={onFacebookChange} /></div>
}

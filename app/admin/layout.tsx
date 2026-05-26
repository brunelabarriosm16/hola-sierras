'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Activity,
  BadgeCheck,
  Building2,
  Calendar,
  ChevronDown,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Radio,
  Search,
  ShieldAlert,
  Store,
  Users,
  X,
} from "lucide-react"
import {
  ADMIN_SESSION_CHANGE_EVENT,
  clearAdminSession,
  getAdminSession,
  type AdminSession,
  type AdminRole,
} from "../lib/adminAuth"

const menuItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Inicio", roles: ["superadmin", "admin"] },
  { href: "/admin/comercios", icon: Store, label: "Comercios", roles: ["superadmin", "admin"] },
  { href: "/admin/eventos", icon: Calendar, label: "Eventos", roles: ["superadmin", "admin"] },
  { href: "/admin/servicios", icon: ShieldAlert, label: "Servicios", roles: ["superadmin", "admin"] },
  { href: "/admin/instituciones", icon: Building2, label: "Instituciones", roles: ["superadmin", "admin"] },
  { href: "/admin/cursos", icon: GraduationCap, label: "Cursos", roles: ["superadmin", "admin"] },
  { href: "/admin/contactos", icon: Mail, label: "Contactos", roles: ["superadmin", "admin"] },
  { href: "/admin/usuarios", icon: Users, label: "Usuarios", roles: ["superadmin", "admin"] },
  { href: "/admin/suscripciones", icon: CreditCard, label: "Suscripciones", roles: ["superadmin", "admin"] },
  { href: "/admin/sitio", icon: FileText, label: "Sitio", roles: ["superadmin"] },
  { href: "/admin/radio", icon: Radio, label: "Radio", roles: ["superadmin"] },
  { href: "/admin/administradores", icon: BadgeCheck, label: "Administradores", roles: ["superadmin"] },
  { href: "/admin/actividad", icon: Activity, label: "Actividad", roles: ["superadmin"] },
]

const menuGroups = [
  {
    id: "panel",
    label: "Panel",
    items: ["/admin"],
  },
  {
    id: "contenido",
    label: "Contenido",
    items: [
      "/admin/comercios",
      "/admin/eventos",
      "/admin/servicios",
      "/admin/instituciones",
      "/admin/cursos",
    ],
  },
  {
    id: "gestion",
    label: "Operación",
    items: ["/admin/contactos", "/admin/usuarios", "/admin/suscripciones"],
  },
  {
    id: "configuracion",
    label: "Sistema",
    items: ["/admin/sitio", "/admin/radio", "/admin/administradores", "/admin/actividad"],
  },
]

const superAdminOnlyPrefixes = ["/admin/sitio", "/admin/radio", "/admin/administradores", "/admin/actividad"]

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [menuSearch, setMenuSearch] = useState("")
  const [session, setSession] = useState<AdminSession | null>(null)
  const [hasCheckedSession, setHasCheckedSession] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    panel: true,
    contenido: true,
    gestion: true,
    configuracion: true,
  })
  const adminRole: AdminRole = session?.role || "admin"
  const adminName = session?.name || ""
  const isLoginPage = pathname === "/admin/login" || pathname === "/admin/loginV"
  const isLoggedIn = Boolean(session)
  const isSuperAdminOnlyRoute = superAdminOnlyPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  )
  const shouldRedirectToLogin = !isLoggedIn && !isLoginPage
  const shouldRedirectToDashboard = isLoggedIn && isLoginPage
  const shouldRedirectByRole =
    session?.role !== "superadmin" && isSuperAdminOnlyRoute
  const normalizedMenuSearch = menuSearch.trim().toLowerCase()
  const visibleMenuItems = menuItems.filter(
    (item) =>
      item.roles.includes(adminRole) &&
      (!normalizedMenuSearch ||
        item.label.toLowerCase().includes(normalizedMenuSearch))
  )
  const groupedMenuItems = menuGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((href) => visibleMenuItems.find((item) => item.href === href))
        .filter((item): item is (typeof menuItems)[number] => Boolean(item)),
    }))
    .filter((group) => group.items.length > 0)

  useEffect(() => {
    const syncSession = () => {
      setSession(getAdminSession())
      setHasCheckedSession(true)
    }

    syncSession()
    window.addEventListener(ADMIN_SESSION_CHANGE_EVENT, syncSession)
    window.addEventListener("storage", syncSession)

    return () => {
      window.removeEventListener(ADMIN_SESSION_CHANGE_EVENT, syncSession)
      window.removeEventListener("storage", syncSession)
    }
  }, [])

  useEffect(() => {
    if (!hasCheckedSession) return

    if (shouldRedirectToLogin) {
      router.replace("/admin/login")
      return
    }

    if (shouldRedirectToDashboard) {
      router.replace("/admin")
      return
    }

    if (shouldRedirectByRole) {
      router.replace("/admin")
    }
  }, [
    hasCheckedSession,
    router,
    shouldRedirectByRole,
    shouldRedirectToDashboard,
    shouldRedirectToLogin,
  ])

  if (
    !hasCheckedSession ||
    shouldRedirectToLogin ||
    shouldRedirectToDashboard ||
    shouldRedirectByRole
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-slate-600 shadow-sm">
          Cargando panel...
        </div>
      </div>
    )
  }

  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-3"
            onClick={() => setIsSidebarOpen(false)}
          >
            <img
              src="/HolaSierras.png"
              alt="Hola Varela"
              className="h-14 w-auto"
            />
            <div>
              <div className="font-semibold text-slate-900">Hola Sierras!</div>
              <div className="text-xs text-slate-500">Administración</div>
            </div>
          </Link>

          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div className="flex">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white transition-transform duration-300 lg:sticky lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <Link
              href="/admin"
              className="hidden items-center gap-3 border-b border-slate-200 p-6 lg:flex"
            >
              <img
                src="/HolaSierras.png"
                alt="Hola Varela"
                className="h-14 w-auto"
              />
              <div>
                <div className="font-semibold text-slate-900">Hola Sierras!</div>
                <div className="text-xs text-slate-500">Administración</div>
              </div>
            </Link>

            <nav className="flex-1 space-y-4 overflow-y-auto p-4">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                <Search className="h-4 w-4" />
                <input
                  type="search"
                  value={menuSearch}
                  onChange={(event) => setMenuSearch(event.target.value)}
                  placeholder="Buscar módulo"
                  className="w-full bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
                />
              </label>

              {groupedMenuItems.map((group) => (
                <div key={group.id}>
                  {(() => {
                    const hasActiveItem = group.items.some((item) =>
                      item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href)
                    )
                    const isOpen =
                      Boolean(normalizedMenuSearch) ||
                      hasActiveItem ||
                      Boolean(openGroups[group.id])

                    return (
                      <>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((prev) => ({
                        ...prev,
                        [group.id]: !prev[group.id],
                      }))
                    }
                    className="mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 transition hover:bg-slate-50"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen ? (
                    <div className="space-y-2">
                      {group.items.map((item) => {
                        const isActive =
                          item.href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(item.href)
                        const Icon = item.icon

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsSidebarOpen(false)}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                              isActive
                                ? "bg-slate-900 text-white"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  ) : null}
                      </>
                    )
                  })()}
                </div>
              ))}
            </nav>

            <div className="space-y-2 border-t border-slate-200 p-4">
              {adminName && (
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="font-medium text-slate-900">{adminName}</div>
                  <div>
                    {adminRole === "superadmin" ? "Superadministrador" : "Administrador"}
                  </div>
                </div>
              )}

              <Link
                href="/"
                onClick={() => setIsSidebarOpen(false)}
                className="block rounded-lg px-4 py-3 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Ver sitio web
              </Link>

              <button
                onClick={() => {
                  setIsSidebarOpen(false)
                  clearAdminSession()
                  router.push("/admin/login")
                }}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Salir del panel</span>
              </button>
            </div>
          </div>
        </aside>

        {isSidebarOpen && (
          <button
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Cerrar menu"
          />
        )}

        <main className="min-h-screen flex-1">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

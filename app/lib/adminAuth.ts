export const ADMIN_SESSION_KEY = "guia-varela-admin-session"

export const ADMIN_DEFAULT_CREDENTIALS = {
  username: "admin",
  password: "333Varela2026",
  name: "Superadministrador",
  role: "superadmin" as const,
}

export type AdminRole = "superadmin" | "admin"

export type AdminSession = {
  username: string
  name: string
  role: AdminRole
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null

  const raw = window.localStorage.getItem(ADMIN_SESSION_KEY)
  if (!raw) return null

  if (raw === "true") {
    return {
      username: ADMIN_DEFAULT_CREDENTIALS.username,
      name: ADMIN_DEFAULT_CREDENTIALS.name,
      role: ADMIN_DEFAULT_CREDENTIALS.role,
    }
  }

  try {
    return JSON.parse(raw) as AdminSession
  } catch {
    return null
  }
}

export function saveAdminSession(session: AdminSession) {
  window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
}

export function clearAdminSession() {
  window.localStorage.removeItem(ADMIN_SESSION_KEY)
}

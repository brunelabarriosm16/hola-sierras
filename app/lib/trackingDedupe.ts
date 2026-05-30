'use client'

type ClientEventWindow = {
  storage: "local" | "session"
  ttlMs?: number
}

const getStorage = (storage: ClientEventWindow["storage"]) => {
  if (typeof window === "undefined") return null
  return storage === "local" ? window.localStorage : window.sessionStorage
}

export const shouldRecordClientEvent = (
  key: string,
  { storage, ttlMs }: ClientEventWindow
) => {
  const targetStorage = getStorage(storage)
  if (!targetStorage) return false

  const now = Date.now()
  const storageKey = `hola-varela-metrics:${key}`
  const previousValue = targetStorage.getItem(storageKey)
  const previousTime = previousValue ? Number(previousValue) : 0

  if (ttlMs && previousTime && now - previousTime < ttlMs) {
    return false
  }

  if (!ttlMs && previousValue) {
    return false
  }

  targetStorage.setItem(storageKey, String(now))
  return true
}

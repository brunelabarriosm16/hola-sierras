'use client'

import { useEffect, useState } from "react"
import { Share2 } from "lucide-react"
import { recordShare, type ShareSection } from "../lib/shareTracking"

type ShareButtonProps = {
  title: string
  text?: string
  url: string
  section: ShareSection
  itemId: string
  className?: string
}

export function ShareButton({
  title,
  text,
  url,
  section,
  itemId,
  className = "",
}: ShareButtonProps) {
  const [feedback, setFeedback] = useState<"idle" | "copied">("idle")

  useEffect(() => {
    if (feedback !== "copied") return

    const timeoutId = window.setTimeout(() => setFeedback("idle"), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [feedback])

  const handleShare = async () => {
    try {
      await recordShare(section, itemId, title)
    } catch (error) {
      console.error("No se pudo registrar el compartido:", error)
    }

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
        return
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setFeedback("copied")
        return
      }

      setFeedback("copied")
      window.prompt("Copiá este enlace:", url)
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return
      window.alert("No se pudo compartir este contenido.")
    }
  }

  return (
    <button type="button" onClick={handleShare} className={className}>
      <Share2 className="h-4 w-4" />
      {feedback === "copied" ? "Enlace copiado" : "Compartir"}
    </button>
  )
}

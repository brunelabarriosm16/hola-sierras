'use client'

import type { MouseEvent } from "react"
import { Facebook, Globe, Instagram } from "lucide-react"
import { normalizeExternalUrl } from "../lib/externalLinks"
import {
  recordExternalLinkClick,
  type ExternalLinkSection,
  type ExternalLinkType,
} from "../lib/externalLinkTracking"

type ExternalLinksButtonsProps = {
  webUrl?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  section?: ExternalLinkSection
  itemId?: string
  itemTitle?: string | null
  className?: string
}

export function ExternalLinksButtons({
  webUrl,
  instagramUrl,
  facebookUrl,
  section,
  itemId,
  itemTitle,
  className = "inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600",
}: ExternalLinksButtonsProps) {
  const links: Array<{
    key: ExternalLinkType
    href: string | null
    label: string
    Icon: typeof Globe
  }> = [
    {
      key: "web" as const,
      href: normalizeExternalUrl(webUrl),
      label: "Sitio web",
      Icon: Globe,
    },
    {
      key: "instagram" as const,
      href: normalizeExternalUrl(instagramUrl),
      label: "Instagram",
      Icon: Instagram,
    },
    {
      key: "facebook" as const,
      href: normalizeExternalUrl(facebookUrl),
      label: "Facebook",
      Icon: Facebook,
    },
  ].filter((item) => item.href)

  if (links.length === 0) return null

  const handleClick =
    (linkType: ExternalLinkType) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented || !section || !itemId) return
      void recordExternalLinkClick(section, itemId, itemTitle, linkType)
    }

  return (
    <>
      {links.map(({ key, href, label, Icon }) => (
        <a
          key={key}
          href={href || "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick(key)}
          className={className}
        >
          <Icon className="h-4 w-4" />
          {label}
        </a>
      ))}
    </>
  )
}

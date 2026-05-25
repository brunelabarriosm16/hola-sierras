'use client'

import type { AnchorHTMLAttributes, MouseEvent } from "react"
import { Facebook, Globe, Instagram } from "lucide-react"
import { normalizeExternalUrl } from "../lib/externalLinks"
import {
  recordExternalLinkClick,
  type ExternalLinkSection,
  type ExternalLinkType,
} from "../lib/externalLinkTracking"

type PrimaryExternalLinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  webUrl?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  section?: ExternalLinkSection
  itemId?: string
  itemTitle?: string | null
}

const linkOptions = [
  {
    key: "instagram" as const,
    label: "Instagram",
    Icon: Instagram,
    getHref: (urls: PrimaryExternalLinkButtonProps) =>
      normalizeExternalUrl(urls.instagramUrl),
  },
  {
    key: "facebook" as const,
    label: "Facebook",
    Icon: Facebook,
    getHref: (urls: PrimaryExternalLinkButtonProps) =>
      normalizeExternalUrl(urls.facebookUrl),
  },
  {
    key: "web" as const,
    label: "Sitio web",
    Icon: Globe,
    getHref: (urls: PrimaryExternalLinkButtonProps) =>
      normalizeExternalUrl(urls.webUrl),
  },
] satisfies Array<{
  key: ExternalLinkType
  label: string
  Icon: typeof Globe
  getHref: (urls: PrimaryExternalLinkButtonProps) => string | null
}>

export function PrimaryExternalLinkButton({
  webUrl,
  instagramUrl,
  facebookUrl,
  section,
  itemId,
  itemTitle,
  onClick,
  ...props
}: PrimaryExternalLinkButtonProps) {
  const link = linkOptions
    .map((option) => ({
      ...option,
      href: option.getHref({ webUrl, instagramUrl, facebookUrl }),
    }))
    .find((option) => option.href)

  if (!link) return null

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)

    if (
      !event.defaultPrevented &&
      section &&
      itemId
    ) {
      void recordExternalLinkClick(section, itemId, itemTitle, link.key)
    }
  }

  const { Icon } = link

  return (
    <a
      {...props}
      href={link.href || "#"}
      onClick={handleClick}
    >
      <Icon className="h-4 w-4" />
      {link.label}
    </a>
  )
}

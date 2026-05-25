'use client'

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react"
import {
  recordWhatsappClick,
  type WhatsappSection,
} from "../lib/whatsappTracking"

type ContactActionLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode
  mode: "whatsapp" | "phone"
  section?: WhatsappSection
  itemId?: string
  itemTitle?: string
}

export function ContactActionLink({
  children,
  mode,
  section,
  itemId,
  itemTitle,
  onClick,
  ...props
}: ContactActionLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)

    if (
      !event.defaultPrevented &&
      mode === "whatsapp" &&
      section &&
      itemId
    ) {
      void recordWhatsappClick(section, itemId, itemTitle)
    }
  }

  return (
    <a {...props} onClick={handleClick}>
      {children}
    </a>
  )
}

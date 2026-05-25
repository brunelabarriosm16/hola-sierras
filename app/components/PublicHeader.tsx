'use client'

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"

type NavItem = {
  href: string
  label: string
  active?: boolean
}

type PublicHeaderProps = {
  items: NavItem[]
  borderClassName?: string
  backgroundClassName?: string
}

export function PublicHeader({
  items,
  borderClassName = "border-slate-200",
  backgroundClassName = "bg-white/95",
}: PublicHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="relative">
      {isMobileMenuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/35 md:hidden"
          aria-label="Cerrar menu"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      ) : null}

      <header
        className={`sticky top-0 z-50 border-b ${borderClassName} ${backgroundClassName} backdrop-blur`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link
              href="/"
              className="flex items-center gap-3"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="relative h-14 w-20 overflow-hidden sm:h-16 sm:w-24">
                <Image
                  src="/HolaSierras.png"
                  alt="Hola Sierras"
                  fill
                  priority
                  sizes="96px"
                  className="object-contain object-left scale-[1.7] sm:scale-[1.85]"
                />
              </div>
              <div className="leading-tight">
                <div className="text-[18px] font-semibold tracking-tight text-slate-950 sm:text-[20px]">
                  Hola Sierras!
                </div>
              </div>
            </Link>

            <nav className="hidden items-center gap-8 text-[15px] font-medium text-slate-700 md:flex">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={item.active ? "text-blue-500" : "hover:text-blue-500"}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50 md:hidden"
              aria-expanded={isMobileMenuOpen}
              aria-controls="public-mobile-menu"
              aria-label={isMobileMenuOpen ? "Cerrar menu" : "Abrir menu"}
              onClick={() => setIsMobileMenuOpen((current) => !current)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {isMobileMenuOpen ? (
            <nav
              id="public-mobile-menu"
              className="relative z-50 border-t border-slate-200 py-3 md:hidden"
            >
              <div className="flex flex-col gap-1 rounded-b-2xl bg-white/95 pb-1">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
                      item.active
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
          ) : null}
        </div>
      </header>
    </div>
  )
}

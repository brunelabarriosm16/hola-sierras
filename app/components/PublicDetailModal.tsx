'use client'

import { useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { X } from "lucide-react"
import { OptimizedImage } from "./OptimizedImage"

type DetailMetaItem = {
  icon: LucideIcon
  text: string
}

type PublicDetailModalProps = {
  open: boolean
  onClose: () => void
  title: string
  imageSrc?: string | null
  imageAlt: string
  badge?: string | null
  description?: string | null
  meta?: DetailMetaItem[]
  extraContent?: ReactNode
  actions?: ReactNode
}

export function PublicDetailModal({
  open,
  onClose,
  title,
  imageSrc,
  imageAlt,
  badge,
  description,
  meta = [],
  extraContent,
  actions,
}: PublicDetailModalProps) {
  const [isImageZoomed, setIsImageZoomed] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm md:p-5">
      {isImageZoomed && imageSrc ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/92 p-4">
          <button
            type="button"
            onClick={() => setIsImageZoomed(false)}
            className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
            aria-label="Cerrar imagen ampliada"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setIsImageZoomed(false)}
            className="relative h-[88vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white/5"
          >
            <OptimizedImage
              src={imageSrc}
              alt={imageAlt}
              sizes="100vw"
              priority
              className="object-contain p-4"
            />
          </button>
        </div>
      ) : null}

      <div className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[32px] border border-white/70 bg-white shadow-[0_30px_120px_-34px_rgba(15,23,42,0.55)] xl:overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full border border-slate-200 bg-white/95 p-2 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          aria-label="Cerrar detalle"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 xl:items-start xl:grid-cols-[minmax(0,1.1fr)_390px]">
          <div className="relative bg-[radial-gradient(circle_at_top_left,#e8f6ec_0%,#f4f9ff_38%,#eef4ff_100%)] xl:self-start">
            {imageSrc ? (
              <div className="flex min-h-[260px] w-full items-start justify-center p-4 md:min-h-[340px] md:p-6 xl:p-8">
                <button
                  type="button"
                  onClick={() => setIsImageZoomed(true)}
                  className="group relative aspect-[4/5] w-full max-w-[620px] overflow-hidden rounded-[30px] border border-white/80 bg-white/90 p-3 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.45)] transition hover:scale-[1.01] hover:shadow-[0_32px_90px_-34px_rgba(15,23,42,0.5)] md:max-w-[680px] md:p-4"
                  aria-label="Ver imagen mas grande"
                >
                  <span className="absolute left-4 top-4 z-10 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-white/90 uppercase">
                    Toca para ampliar
                  </span>
                  <OptimizedImage
                    src={imageSrc}
                    alt={imageAlt}
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-contain p-1 sm:p-2"
                  />
                </button>
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center text-slate-400">
                Sin imagen
              </div>
            )}
          </div>

          <div className="flex max-h-[92vh] flex-col overflow-y-auto bg-white">
            <div className="border-b border-slate-100 px-6 pb-5 pt-7 md:px-8">
              <div className="mb-4 flex items-start gap-3 pr-12">
                {badge ? (
                  <div className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-sky-700 uppercase">
                    {badge}
                  </div>
                ) : null}
              </div>

              <h3 className="text-[2rem] font-semibold leading-[1.05] text-slate-950 md:text-[2.35rem]">
                {title}
              </h3>

              {meta.length > 0 && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {meta.map(({ icon: Icon, text }, index) => (
                    <div
                      key={`${text}-${index}`}
                      className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="leading-6">{text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {description ? (
              <div className="px-6 py-6 md:px-8">
                <div className="mb-3 text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
                  Descripcion
                </div>
                <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
                  <p className="whitespace-pre-line text-[1.02rem] leading-8 text-slate-600">
                    {description}
                  </p>
                </div>
              </div>
            ) : null}

            {extraContent ? (
              <div className="px-6 pb-6 md:px-8">
                {extraContent}
              </div>
            ) : null}

            {actions ? (
              <div className="mt-auto border-t border-slate-100 bg-white px-6 py-5 md:px-8">
                <div className="mb-3 text-xs font-semibold tracking-[0.24em] text-slate-400 uppercase">
                  Acciones
                </div>
                <div className="flex flex-wrap gap-3">{actions}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { X } from "lucide-react"
import { OptimizedImage } from "./OptimizedImage"

type DetailMetaItem = {
  icon: LucideIcon
  text: string
  href?: string | null
}

type PublicDetailModalProps = {
  open: boolean
  onClose: () => void
  title: string
  imageSrc?: string | null
  imageAlt: string
  imagePlacement?: "side" | "top"
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
  imagePlacement = "side",
  badge,
  description,
  meta = [],
  extraContent,
  actions,
}: PublicDetailModalProps) {
  const [isImageZoomed, setIsImageZoomed] = useState(false)
  const isImageTop = imagePlacement === "top"

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

      <div className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[28px] border border-white/70 bg-white shadow-[0_30px_120px_-34px_rgba(15,23,42,0.55)] lg:overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full border border-slate-200 bg-white/95 p-2 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          aria-label="Cerrar detalle"
        >
          <X className="h-5 w-5" />
        </button>

        <div className={isImageTop ? "grid grid-cols-1" : "grid grid-cols-1 lg:grid-cols-[minmax(320px,430px)_minmax(0,1fr)]"}>
          <div className="relative bg-[linear-gradient(145deg,#f1f8f3_0%,#f7fbff_50%,#eef4ff_100%)]">
            {imageSrc ? (
              <div className={isImageTop ? "flex min-h-[190px] w-full items-center justify-center p-4 md:min-h-[240px] md:p-5" : "flex min-h-[220px] w-full items-center justify-center p-4 md:min-h-[300px] md:p-6 lg:min-h-full"}>
                <button
                  type="button"
                  onClick={() => setIsImageZoomed(true)}
                  className={`${isImageTop ? "max-w-[390px]" : "max-w-[430px]"} group relative aspect-[4/3] w-full overflow-hidden rounded-[24px] border border-white/80 bg-white/90 p-3 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.45)] transition hover:scale-[1.01] hover:shadow-[0_30px_80px_-34px_rgba(15,23,42,0.5)] md:p-4`}
                  aria-label="Ver imagen mas grande"
                >
                  <span className="absolute left-4 top-4 z-10 rounded-full bg-slate-950/75 px-3 py-1 text-[0.66rem] font-semibold tracking-[0.16em] text-white/90 uppercase">
                    Toca para ampliar
                  </span>
                  <OptimizedImage
                    src={imageSrc}
                    alt={imageAlt}
                    sizes="(max-width: 1024px) 100vw, 440px"
                    className="object-contain p-3 sm:p-5"
                  />
                </button>
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center text-slate-400">
                Sin imagen
              </div>
            )}
          </div>

          <div className={isImageTop ? "flex flex-col bg-white" : "flex flex-col bg-white lg:max-h-[92vh] lg:overflow-y-auto"}>
            <div className="border-b border-slate-100 px-5 pb-5 pt-7 md:px-8">
              {badge ? (
                <div className="mb-4 flex items-start gap-3 pr-12">
                  <div className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-sky-700 uppercase">
                    {badge}
                  </div>
                </div>
              ) : null}

              <h3 className="pr-10 text-3xl font-semibold leading-tight text-slate-950 md:text-[2.15rem] md:leading-[1.12]">
                {title}
              </h3>

              {meta.length > 0 && (
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {meta.map(({ icon: Icon, text, href }, index) => {
                    const content = (
                      <>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="min-w-0 break-words leading-6">{text}</span>
                      </>
                    )

                    const className =
                      "flex min-h-[68px] min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700"

                    return href ? (
                      <a
                        key={`${text}-${index}`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${className} transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800`}
                      >
                        {content}
                      </a>
                    ) : (
                      <div key={`${text}-${index}`} className={className}>
                        {content}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {description ? (
              <div className="px-5 py-6 md:px-8">
                <div className="mb-3 text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">
                  Descripcion
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-5">
                  <p className="whitespace-pre-line text-base leading-7 text-slate-600 md:text-[1.02rem] md:leading-8">
                    {description}
                  </p>
                </div>
              </div>
            ) : null}

            {extraContent ? (
              <div className="px-5 pb-6 md:px-8">
                {extraContent}
              </div>
            ) : null}

            {actions ? (
              <div className="mt-auto border-t border-slate-100 bg-white px-5 py-5 md:px-8">
                <div className="mb-3 text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">
                  Acciones
                </div>
                <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0 [&>a]:justify-center [&>button]:justify-center [&>form]:col-span-full">
                  {actions}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

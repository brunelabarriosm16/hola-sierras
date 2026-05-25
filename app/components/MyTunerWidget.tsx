'use client'

import { ExternalLink, Play, Radio } from "lucide-react"

type MyTunerWidgetProps = {
  streamUrl: string
  title: string
  description: string
}

export function MyTunerWidget({
  streamUrl,
  title,
  description,
}: MyTunerWidgetProps) {
  const normalizedUrl = streamUrl.trim()

  if (!normalizedUrl) {
    return (
      <div className="rounded-[28px] border border-blue-100/40 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_58%,#38bdf8_100%)] p-6 text-white shadow-[0_22px_55px_-28px_rgba(29,78,216,0.72)]">
        Carga una URL de radio para habilitar la reproduccion.
      </div>
    )
  }

  return (
    <a
      href={normalizedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-between gap-6 rounded-[28px] border border-blue-100/35 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_58%,#38bdf8_100%)] px-10 py-8 text-white shadow-[0_22px_55px_-28px_rgba(29,78,216,0.72)] transition hover:-translate-y-0.5 hover:brightness-[1.04] max-md:flex-col max-md:items-start"
    >
      <div className="flex items-center gap-7">
        <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-white/14 shadow-inner shadow-white/10">
          <Radio className="h-12 w-12" strokeWidth={2.2} />
        </div>

        <div className="text-left">
          <h2 className="text-4xl font-semibold tracking-tight max-md:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-2xl font-medium text-white/95 max-md:text-xl">
            {description}
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm font-medium text-blue-100/95">
            <ExternalLink className="h-4 w-4" />
            <span>Te redirigiremos a radios.com.uy</span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        <div className="inline-flex items-center gap-4 rounded-2xl bg-white px-10 py-5 text-[2rem] font-semibold text-blue-600 shadow-[0_16px_35px_-22px_rgba(255,255,255,0.9)] max-md:px-8 max-md:py-4 max-md:text-xl">
          <Play className="h-7 w-7 fill-current" />
          <span>Escuchar ahora</span>
        </div>
      </div>
    </a>
  )
}

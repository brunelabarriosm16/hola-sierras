import Link from "next/link"

type SubscriptionStatusPageProps = {
  eyebrow: string
  title: string
  description: string
  tone: "success" | "pending" | "error"
  primaryHref?: string
  primaryLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
}

const toneStyles = {
  success: {
    badge: "bg-emerald-100 text-emerald-700",
    panel: "border-emerald-200 bg-emerald-50/70",
    button: "bg-emerald-600 hover:bg-emerald-500",
  },
  pending: {
    badge: "bg-amber-100 text-amber-700",
    panel: "border-amber-200 bg-amber-50/70",
    button: "bg-amber-500 hover:bg-amber-400",
  },
  error: {
    badge: "bg-rose-100 text-rose-700",
    panel: "border-rose-200 bg-rose-50/70",
    button: "bg-rose-600 hover:bg-rose-500",
  },
} as const

export function SubscriptionStatusPage({
  eyebrow,
  title,
  description,
  tone,
  primaryHref = "/",
  primaryLabel = "Volver a Hola Varela",
  secondaryHref = "/eventos",
  secondaryLabel = "Seguir explorando",
}: SubscriptionStatusPageProps) {
  const styles = toneStyles[tone]

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f2f7f5_48%,#ffffff_100%)] px-4 py-16 text-slate-900 sm:px-6">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
        <div className={`w-full rounded-[32px] border p-8 text-center shadow-[0_25px_70px_-35px_rgba(15,23,42,0.35)] sm:p-12 ${styles.panel}`}>
          <div className={`mx-auto inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${styles.badge}`}>
            {eyebrow}
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            {description}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={primaryHref}
              className={`inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold text-white transition ${styles.button}`}
            >
              {primaryLabel}
            </Link>

            {secondaryHref ? (
              <Link
                href={secondaryHref}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}

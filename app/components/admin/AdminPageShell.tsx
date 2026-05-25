import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

type AdminPageHeaderProps = {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
}

type AdminMetricCardProps = {
  title: string
  value: number | string
  description?: string
  icon: LucideIcon
  onClick?: () => void
  tone?: "neutral" | "blue" | "green" | "amber" | "rose" | "slate"
}

type AdminNoticeProps = {
  title?: string
  children: ReactNode
  tone?: "info" | "warning" | "error" | "success"
}

const toneClasses = {
  neutral: "bg-white text-slate-700 border-slate-200",
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  slate: "bg-slate-100 text-slate-800 border-slate-200",
}

const noticeClasses = {
  info: "border-blue-100 bg-blue-50 text-blue-800",
  warning: "border-amber-100 bg-amber-50 text-amber-800",
  error: "border-red-100 bg-red-50 text-red-700",
  success: "border-emerald-100 bg-emerald-50 text-emerald-700",
}

export function AdminPageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
}

export function AdminPageHeader({
  title,
  description,
  eyebrow,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function AdminMetricCard({
  title,
  value,
  description,
  icon: Icon,
  onClick,
  tone = "neutral",
}: AdminMetricCardProps) {
  const className = `rounded-lg border bg-white p-4 text-left shadow-sm transition ${
    onClick ? "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md" : ""
  }`
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className={`rounded-lg border p-2 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {description ? (
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    )
  }

  return <div className={className}>{content}</div>
}

export function AdminNotice({ title, children, tone = "info" }: AdminNoticeProps) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${noticeClasses[tone]}`}>
      {title ? <div className="font-semibold">{title}</div> : null}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  )
}

export function AdminSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-8 w-16 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

export function AdminSectionCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {children}
    </section>
  )
}

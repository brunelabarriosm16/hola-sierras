import Link from "next/link"
import type { ReactNode } from "react"

type AccessPageShellProps = {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  secondaryLink?: {
    href: string
    label: string
  }
}

export function AccessPageShell({
  eyebrow,
  title,
  description,
  children,
  secondaryLink,
}: AccessPageShellProps) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f2f7f5_48%,#ffffff_100%)] px-4 py-12 text-slate-900 sm:px-6">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_25px_80px_-38px_rgba(15,23,42,0.35)] lg:grid-cols-[0.95fr_1.05fr]">
          <section className="bg-[radial-gradient(circle_at_top_left,#d8f3df_0%,#edf8f1_42%,#eef5ff_100%)] p-8 sm:p-10">
            <div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              {eyebrow}
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              {title}
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              {description}
            </p>

            <div className="mt-10 space-y-4 text-sm text-slate-600">
              <p>Registrate con tu propio email y contraseña para gestionar tu espacio.</p>
              <p>Si olvidás la clave, podés recuperarla por correo sin pasar por admin.</p>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              >
                Volver al inicio
              </Link>

              {secondaryLink ? (
                <Link
                  href={secondaryLink.href}
                  className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
                >
                  {secondaryLink.label}
                </Link>
              ) : null}
            </div>
          </section>

          <section className="p-6 sm:p-8 lg:p-10">{children}</section>
        </div>
      </div>
    </main>
  )
}

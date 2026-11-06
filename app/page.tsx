import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Hola Sierras | Sitio inactivo",
  description: "Sitio inactivo por el momento.",
}

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fbfdfb] px-6 py-16 text-center text-[#17352b]">
      <div>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#527364]">
          Hola Sierras
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          Sitio inactivo por el momento
        </h1>
      </div>
    </main>
  )
}

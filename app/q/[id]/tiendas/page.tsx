import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Descargar la app", robots: { index: false, follow: false } }

export default async function StoresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const { data, error } = await getSupabaseAdmin().from("qr_links").select("android_destination,iphone_destination").eq("id", id).maybeSingle()
  if (error) throw new Error("No se pudieron cargar las tiendas. Intentá nuevamente.")
  if (!data?.android_destination || !data.iphone_destination) notFound()
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
    <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">Descargá la app</p><h1 className="mt-3 text-3xl font-bold">Elegí tu tienda</h1><p className="my-6 text-slate-600">Abrí la tienda que corresponde a tu celular.</p>
    <a className="mb-4 block rounded-xl bg-slate-900 px-5 py-4 font-semibold text-white" href={data.android_destination} rel="noreferrer">Android · Google Play</a>
    <a className="block rounded-xl bg-slate-900 px-5 py-4 font-semibold text-white" href={data.iphone_destination} rel="noreferrer">iPhone · App Store</a>
  </div></main>
}

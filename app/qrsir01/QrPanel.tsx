"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import QRCode from "qrcode"

type Link = { id: string; name: string; destination: string; android_destination: string | null; iphone_destination: string | null; opens: number; android_opens: number; iphone_opens: number; other_opens: number; created_at: string }
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
const buttonClass = "rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50"

function QrCard({ link }: { link: Link }) {
  const [image, setImage] = useState("")
  const [failed, setFailed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState("")
  useEffect(() => {
    let active = true
    const trackedUrl = `${window.location.origin}/q/${link.id}`
    QRCode.toDataURL(trackedUrl, { width: 1000, margin: 4, errorCorrectionLevel: "M" })
      .then(value => { if (active) { setImage(value); setUrl(trackedUrl) } })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [link.id])
  return <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><h2 className="text-xl font-bold">{link.name}</h2><p className="mt-2 break-all text-sm text-slate-500">{link.destination}</p></div>
      <div className="rounded-xl bg-emerald-50 px-4 py-2 text-center"><p className="text-3xl font-bold text-emerald-800">{Number(link.opens).toLocaleString("es-UY")}</p><p className="text-sm text-emerald-800">aperturas</p></div>
    </div>
    {link.android_destination && <div className="mt-4 space-y-2 text-sm text-slate-600"><p className="font-semibold text-emerald-700">Un QR · dos tiendas</p><p className="break-all">Android: {link.android_destination}</p><p className="break-all">iPhone: {link.iphone_destination}</p></div>}
    <div className="mt-4 flex flex-wrap gap-3 text-sm"><span>Android: <strong>{link.android_opens}</strong></span><span>iPhone / iPad: <strong>{link.iphone_opens}</strong></span><span>Otros / sin detectar: <strong>{link.other_opens}</strong></span></div>
    {image ? <div className="my-4"><a href={image} download={`qr-${link.name.replace(/[^a-z0-9-]/gi, "-")}.png`} aria-label={`Descargar QR de ${link.name}`}>
      {/* The PNG is generated locally; no external image service receives the URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={`QR de ${link.name}`} width={200} height={200} />
    </a><a className="inline-block rounded-lg border border-slate-300 px-4 py-2 font-medium" href={image} download={`qr-${link.id}.png`}>Descargar QR PNG</a></div> : <p className="my-4">{failed ? "No se pudo generar la imagen. Recargá el panel." : "Generando imagen…"}</p>}
    <p className="break-all text-xs text-slate-500">{url}</p>
    <button type="button" className="mt-3 text-sm font-semibold underline" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true) } catch { setCopied(false) } }}>{copied ? "Enlace copiado" : "Copiar enlace de seguimiento"}</button>
    <p className="mt-3 text-xs text-slate-400">Creado el {new Date(link.created_at).toLocaleDateString("es-UY")}</p>
  </article>
}

export default function QrPanel() {
  const [links, setLinks] = useState<Link[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [name, setName] = useState("")
  const [destination, setDestination] = useState("")
  const [mode, setMode] = useState("stores")
  const [android, setAndroid] = useState("")
  const [iphone, setIphone] = useState("")

  const refresh = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/qrsir01", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setLinks(data.links)
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo conectar.") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("")
    try {
      const response = await fetch("/api/qrsir01", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, mode, destination: mode === "stores" ? android : destination, android_destination: android, iphone_destination: iphone }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setLinks(current => [data.link, ...current]); setName(""); setDestination(""); setAndroid(""); setIphone("")
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo crear el QR.") }
    finally { setBusy(false) }
  }
  return <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900"><div className="mx-auto max-w-5xl">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">Panel de QR</p><h1 className="mt-2 text-3xl font-bold">Mis códigos QR</h1><p className="mt-2 text-slate-600">Creá un QR para cada enlace y consultá sus aperturas.</p></div></header>
    {error && <p role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
      <form onSubmit={create} className="mb-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold">Crear un QR</h2>
        <label className="block font-medium">Tipo de QR<select className={`${inputClass} mt-2`} value={mode} onChange={e => setMode(e.target.value)}><option value="stores">Un QR para Android y iPhone</option><option value="link">Un enlace fijo</option></select></label>
        <label className="block font-medium">Nombre<input className={`${inputClass} mt-2`} placeholder="Ej.: Descarga de la app · afiche" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
        {mode === "stores" ? <><div className="grid gap-5 md:grid-cols-2"><label className="block font-medium">Enlace de Google Play<input className={`${inputClass} mt-2`} type="url" placeholder="https://play.google.com/store/apps/…" required maxLength={2048} value={android} onChange={e => setAndroid(e.target.value)} /></label><label className="block font-medium">Enlace de App Store<input className={`${inputClass} mt-2`} type="url" placeholder="https://apps.apple.com/…" required maxLength={2048} value={iphone} onChange={e => setIphone(e.target.value)} /></label></div><p className="text-sm text-slate-500">El mismo QR abre la tienda según el celular. En computadoras o dispositivos sin detectar, muestra las dos opciones.</p></> : <label className="block font-medium">Enlace de destino<input className={`${inputClass} mt-2`} type="url" placeholder="https://…" required maxLength={2048} value={destination} onChange={e => setDestination(e.target.value)} /></label>}
        <button className={buttonClass} disabled={busy}>{busy ? "Guardando…" : "Crear QR"}</button></form>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Tus QR ({links.length})</h2><button className="font-semibold underline disabled:opacity-50" disabled={loading || busy} onClick={refresh}>{loading ? "Actualizando…" : "Actualizar contadores"}</button></div>
      <p className="mb-6 text-sm text-slate-500">Se cuentan aperturas del enlace, no personas únicas ni instalaciones. Si alguien lo abre dos veces, suma dos. Un escaneo sin abrir el enlace no se registra. Abrir el enlace de seguimiento manualmente también suma.</p>
      {!loading && links.length === 0 && !error && <p className="rounded-xl border border-dashed p-8 text-center text-slate-500">Todavía no creaste ningún QR.</p>}
      <div className="grid gap-6 md:grid-cols-2">{links.map(link => <QrCard key={link.id} link={link} />)}</div>
  </div></main>
}

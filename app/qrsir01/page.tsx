import type { Metadata } from "next"
import QrPanel from "./QrPanel"

export const metadata: Metadata = {
  title: "Mis códigos QR",
  robots: { index: false, follow: false, nocache: true },
}
export const dynamic = "force-dynamic"

export default function QrPage() {
  return <QrPanel />
}

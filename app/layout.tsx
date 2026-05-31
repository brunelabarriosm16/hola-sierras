import type { Metadata } from "next"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Cartelera online de las sierras",
  description: "Todo lo que pasa en Aiguá, Mariscala y la región.",
  icons: {
    icon: "/HolaSierras.png",
    shortcut: "/HolaSierras.png",
    apple: "/HolaSierras.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>
        {children}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-LV914VVTZR"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-LV914VVTZR');
          `}
        </Script>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}

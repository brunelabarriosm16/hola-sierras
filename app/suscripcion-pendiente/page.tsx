import { SubscriptionStatusPage } from "../components/SubscriptionStatusPage"

export default function SuscripcionPendientePage() {
  return (
    <SubscriptionStatusPage
      eyebrow="Pago pendiente"
      title="Tu suscripción quedó pendiente"
      description="Estamos esperando la confirmación del pago. Apenas Mercado Pago la envíe, tu solicitud podrá continuar normalmente."
      tone="pending"
    />
  )
}

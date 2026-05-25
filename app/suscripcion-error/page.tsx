import { SubscriptionStatusPage } from "../components/SubscriptionStatusPage"

export default function SuscripcionErrorPage() {
  return (
    <SubscriptionStatusPage
      eyebrow="No se pudo completar"
      title="La suscripción no pudo completarse"
      description="Hubo un problema al volver desde Mercado Pago. Podés intentarlo otra vez o volver a Hola Varela para revisar la solicitud."
      tone="error"
    />
  )
}

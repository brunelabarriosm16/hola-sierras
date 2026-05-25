import { SubscriptionStatusPage } from "../components/SubscriptionStatusPage"

export default function SuscripcionExitosaPage() {
  return (
    <SubscriptionStatusPage
      eyebrow="Solicitud recibida"
      title="Recibimos tu solicitud"
      description="Tu acceso quedo vinculado correctamente. Vamos a revisar la informacion enviada para continuar con la publicacion en Hola Varela."
      tone="success"
    />
  )
}

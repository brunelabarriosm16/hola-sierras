import { SubscriptionStatusPage } from "../../../components/SubscriptionStatusPage"

export default function UsuariosSuscripcionPendientePage() {
  return (
    <SubscriptionStatusPage
      eyebrow="Pago pendiente"
      title="Tu suscripcion quedo pendiente"
      description="Mercado Pago todavia no nos envio la confirmacion final. Puedes volver a tu panel y seguir completando tu perfil mientras se procesa el pago."
      tone="pending"
      primaryHref="/usuarios"
      primaryLabel="Volver a mi panel"
      secondaryHref="/usuarios/perfil"
      secondaryLabel="Seguir editando mi perfil"
    />
  )
}

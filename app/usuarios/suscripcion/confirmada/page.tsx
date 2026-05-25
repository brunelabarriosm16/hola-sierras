import { SubscriptionStatusPage } from "../../../components/SubscriptionStatusPage"

export default function UsuariosSuscripcionConfirmadaPage() {
  return (
    <SubscriptionStatusPage
      eyebrow="Suscripcion confirmada"
      title="Tu plan ya quedo confirmado"
      description="Mercado Pago confirmo la suscripcion y tu ficha puede continuar con el plan elegido. Desde tu panel vas a poder seguir editando tu perfil, revisar eventos y mantener tus datos al dia."
      tone="success"
      primaryHref="/usuarios"
      primaryLabel="Ir a mi panel"
      secondaryHref="/usuarios/perfil"
      secondaryLabel="Ver mi perfil"
    />
  )
}

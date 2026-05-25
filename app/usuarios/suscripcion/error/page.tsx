import { SubscriptionStatusPage } from "../../../components/SubscriptionStatusPage"

export default function UsuariosSuscripcionErrorPage() {
  return (
    <SubscriptionStatusPage
      eyebrow="No se pudo completar"
      title="La suscripcion no pudo completarse"
      description="Hubo un problema al volver desde Mercado Pago o la operacion no se termino de confirmar. Puedes intentar otra vez desde tu perfil o revisar tu panel antes de volver al pago."
      tone="error"
      primaryHref="/usuarios/perfil"
      primaryLabel="Volver a mi perfil"
      secondaryHref="/usuarios"
      secondaryLabel="Ir a mi panel"
    />
  )
}

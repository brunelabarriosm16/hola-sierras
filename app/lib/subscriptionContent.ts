import {
  subscriptionPlans,
  type SubscriptionPlanKey,
} from "./subscriptionPlans"

type SubscriptionSiteFieldGroup = {
  title: string
  tagline: string
  description: string
  price: string
  features: string
}

export type SubscriptionSiteContent = {
  plan_presencia_titulo?: string | null
  plan_presencia_tagline?: string | null
  plan_presencia_descripcion?: string | null
  plan_presencia_precio?: string | null
  plan_presencia_features?: string | null
  plan_destacado_titulo?: string | null
  plan_destacado_tagline?: string | null
  plan_destacado_descripcion?: string | null
  plan_destacado_precio?: string | null
  plan_destacado_features?: string | null
  plan_destacado_plus_titulo?: string | null
  plan_destacado_plus_tagline?: string | null
  plan_destacado_plus_descripcion?: string | null
  plan_destacado_plus_precio?: string | null
  plan_destacado_plus_features?: string | null
}

export type SubscriptionAdminForm = Record<
  SubscriptionPlanKey,
  SubscriptionSiteFieldGroup
>

const fieldPrefixMap: Record<SubscriptionPlanKey, string> = {
  presencia: "plan_presencia",
  destacado: "plan_destacado",
  destacado_plus: "plan_destacado_plus",
}

export function getSubscriptionAdminDefaults(): SubscriptionAdminForm {
  return {
    presencia: {
      title: subscriptionPlans.presencia.name,
      tagline: subscriptionPlans.presencia.tagline,
      description: subscriptionPlans.presencia.description,
      price: subscriptionPlans.presencia.price,
      features: subscriptionPlans.presencia.features.join("\n"),
    },
    destacado: {
      title: subscriptionPlans.destacado.name,
      tagline: subscriptionPlans.destacado.tagline,
      description: subscriptionPlans.destacado.description,
      price: subscriptionPlans.destacado.price,
      features: subscriptionPlans.destacado.features.join("\n"),
    },
    destacado_plus: {
      title: subscriptionPlans.destacado_plus.name,
      tagline: subscriptionPlans.destacado_plus.tagline,
      description: subscriptionPlans.destacado_plus.description,
      price: subscriptionPlans.destacado_plus.price,
      features: subscriptionPlans.destacado_plus.features.join("\n"),
    },
  }
}

export function buildSubscriptionAdminForm(
  siteContent?: SubscriptionSiteContent | null
): SubscriptionAdminForm {
  const defaults = getSubscriptionAdminDefaults()

  return (Object.keys(defaults) as SubscriptionPlanKey[]).reduce(
    (acc, planKey) => {
      const prefix = fieldPrefixMap[planKey]
      acc[planKey] = {
        title:
          siteContent?.[`${prefix}_titulo` as keyof SubscriptionSiteContent] ||
          defaults[planKey].title,
        tagline:
          siteContent?.[`${prefix}_tagline` as keyof SubscriptionSiteContent] ||
          defaults[planKey].tagline,
        description:
          siteContent?.[
            `${prefix}_descripcion` as keyof SubscriptionSiteContent
          ] || defaults[planKey].description,
        price:
          siteContent?.[`${prefix}_precio` as keyof SubscriptionSiteContent] ||
          defaults[planKey].price,
        features:
          siteContent?.[
            `${prefix}_features` as keyof SubscriptionSiteContent
          ] || defaults[planKey].features,
      }

      return acc
    },
    {} as SubscriptionAdminForm
  )
}

export function buildSubscriptionPlansForUser(
  siteContent?: SubscriptionSiteContent | null
) {
  const editable = buildSubscriptionAdminForm(siteContent)

  return (Object.keys(subscriptionPlans) as SubscriptionPlanKey[]).reduce(
    (acc, planKey) => {
      acc[planKey] = {
        ...subscriptionPlans[planKey],
        name: editable[planKey].title,
        tagline: editable[planKey].tagline,
        description: editable[planKey].description,
        price: editable[planKey].price,
        features: editable[planKey].features
          .split(/\r?\n/)
          .map((item) => item.trim())
          .filter(Boolean),
      }

      return acc
    },
    {} as typeof subscriptionPlans
  )
}

export function subscriptionFormToSitePayload(form: SubscriptionAdminForm) {
  return {
    id: 1,
    plan_presencia_titulo: form.presencia.title,
    plan_presencia_tagline: form.presencia.tagline,
    plan_presencia_descripcion: form.presencia.description,
    plan_presencia_precio: form.presencia.price,
    plan_presencia_features: form.presencia.features,
    plan_destacado_titulo: form.destacado.title,
    plan_destacado_tagline: form.destacado.tagline,
    plan_destacado_descripcion: form.destacado.description,
    plan_destacado_precio: form.destacado.price,
    plan_destacado_features: form.destacado.features,
    plan_destacado_plus_titulo: form.destacado_plus.title,
    plan_destacado_plus_tagline: form.destacado_plus.tagline,
    plan_destacado_plus_descripcion: form.destacado_plus.description,
    plan_destacado_plus_precio: form.destacado_plus.price,
    plan_destacado_plus_features: form.destacado_plus.features,
  }
}

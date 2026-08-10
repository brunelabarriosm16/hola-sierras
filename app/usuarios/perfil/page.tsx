'use client'

import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { fileToDataUrl } from "../../lib/fileToDataUrl"
import { LOCALIDADES, normalizeLocalidad } from "../../lib/localidades"
import { findUserOwnedEntity, getUserProfileTable, normalizeUserEntityStatus, supportsPremiumProfile, userEntityLabels, type UserOwnedEntity } from "../../lib/userProfiles"
import { supabase } from "../../supabase"

type ProfileForm = {
  nombre: string
  descripcion: string
  direccion: string
  localidad: string
  telefono: string
  responsable: string
  contacto: string
  categoria: string
  webUrl: string
  instagramUrl: string
  facebookUrl: string
  premiumDetalle: string
  premiumGaleria: string[]
  premiumExtraTitulo: string
  premiumExtraDetalle: string
  premiumExtraGaleria: string[]
  usaWhatsapp: boolean
  image: string
}

const serviceCategories = ["Profesionales", "Alojamientos", "Actividades para hacer", "Paseos", "Naturaleza", "Experiencias", "Restaurantes", "Cafeterías", "Comida para llevar", "Hoteles", "Posadas", "Cabañas", "Campings", "Oficios", "Servicios"]

const initialForm: ProfileForm = {
  nombre: "",
  descripcion: "",
  direccion: "",
  localidad: "",
  telefono: "",
  responsable: "",
  contacto: "",
  categoria: "Profesionales",
  webUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  premiumDetalle: "",
  premiumGaleria: [],
  premiumExtraTitulo: "",
  premiumExtraDetalle: "",
  premiumExtraGaleria: [],
  usaWhatsapp: true,
  image: "",
}

export default function UsuariosPerfilPage() {
  const router = useRouter()
  const [ownedEntity, setOwnedEntity] = useState<UserOwnedEntity | null>(null)
  const [formData, setFormData] = useState<ProfileForm>(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.email) {
        router.replace("/usuarios/login")
        return
      }

      try {
        const entity = await findUserOwnedEntity(session.user.email)

        if (!entity) {
          router.replace("/usuarios")
          return
        }

        setOwnedEntity(entity)
        setFormData({
          nombre: entity.record.nombre || "",
          descripcion: entity.record.descripcion || "",
          direccion: entity.record.direccion || "",
          localidad: normalizeLocalidad(entity.record.localidad),
          telefono: entity.record.telefono || "",
          responsable: entity.record.responsable || "",
          contacto: entity.record.contacto || "",
          categoria: entity.record.categoria || "Profesionales",
          webUrl: entity.record.web_url || "",
          instagramUrl: entity.record.instagram_url || "",
          facebookUrl: entity.record.facebook_url || "",
          premiumDetalle: entity.record.premium_detalle || "",
          premiumGaleria: entity.record.premium_galeria || [],
          premiumExtraTitulo: entity.record.premium_extra_titulo || "",
          premiumExtraDetalle: entity.record.premium_extra_detalle || "",
          premiumExtraGaleria: entity.record.premium_extra_galeria || [],
          usaWhatsapp: entity.record.usa_whatsapp ?? true,
          image: entity.record.imagen_url || entity.record.imagen || entity.record.foto || "",
        })
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar tu perfil.")
      } finally {
        setLoading(false)
      }
    }

    void loadProfile()
  }, [router])

  const imageColumn = useMemo(() => {
    if (!ownedEntity) return "imagen"
    if (ownedEntity.type === "comercio") return "imagen_url"
    if (ownedEntity.type === "institucion") return "foto"
    return "imagen"
  }, [ownedEntity])

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const nextImage = await fileToDataUrl(file)
      setFormData((current) => ({ ...current, image: nextImage }))
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : "No pudimos cargar la imagen.")
    }
  }

  const handleGalleryUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    key: "premiumGaleria" | "premiumExtraGaleria"
  ) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    try {
      const nextImages = await Promise.all(files.map((file) => fileToDataUrl(file)))
      setFormData((current) => ({
        ...current,
        [key]: [...current[key], ...nextImages],
      }))
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : "No pudimos cargar las imágenes.")
    } finally {
      event.target.value = ""
    }
  }

  const removeGalleryImage = (
    key: "premiumGaleria" | "premiumExtraGaleria",
    index: number
  ) => {
    setFormData((current) => ({
      ...current,
      [key]: current[key].filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ownedEntity) return

    setSaving(true)
    setError("")
    setSuccess("")

    const commonPayload = {
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim() || null,
      localidad: formData.localidad || null,
      estado: ownedEntity.record.estado ?? "borrador",
      usa_whatsapp: formData.usaWhatsapp,
      web_url: formData.webUrl.trim() || null,
      instagram_url: formData.instagramUrl.trim() || null,
      facebook_url: formData.facebookUrl.trim() || null,
      premium_detalle: formData.premiumDetalle.trim() || null,
      premium_galeria: formData.premiumGaleria,
      premium_extra_titulo: formData.premiumExtraTitulo.trim() || null,
      premium_extra_detalle: formData.premiumExtraDetalle.trim() || null,
      premium_extra_galeria: formData.premiumExtraGaleria,
      [imageColumn]: formData.image || null,
    }

    let payload: Record<string, string | boolean | string[] | null>

    if (ownedEntity.type === "comercio") {
      payload = {
        ...commonPayload,
        direccion: formData.direccion.trim() || null,
        telefono: formData.telefono.trim() || null,
      }
    } else if (ownedEntity.type === "servicio") {
      payload = {
        ...commonPayload,
        categoria: formData.categoria,
        responsable: formData.responsable.trim() || null,
        contacto: formData.contacto.trim() || null,
        direccion: formData.direccion.trim() || null,
      }
    } else if (ownedEntity.type === "curso") {
      payload = {
        ...commonPayload,
        responsable: formData.responsable.trim() || null,
        contacto: formData.contacto.trim() || null,
      }
    } else {
      payload = {
        ...commonPayload,
        direccion: formData.direccion.trim() || null,
        telefono: formData.telefono.trim() || null,
      }
    }

    const { error: updateError } = await supabase
      .from(getUserProfileTable(ownedEntity.type))
      .update(payload)
      .eq("id", ownedEntity.record.id)

    if (updateError) {
      setError(`No pudimos guardar tu perfil: ${updateError.message}`)
      setSaving(false)
      return
    }

    setSuccess("Tus datos quedaron actualizados.")
    setOwnedEntity((current) =>
      current
        ? {
            ...current,
            record: {
              ...current.record,
              ...payload,
            },
          }
        : current
    )
    setSaving(false)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
              <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Mi perfil
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Edita tus datos
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Mantén actualizada la ficha de tu espacio para que el panel y la publicación siempre muestren información correcta.
              </p>

              <div className="mt-8 rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Estado actual
                </div>
                <div className="mt-3 text-xl font-semibold text-slate-950">
                  {ownedEntity ? userEntityLabels[ownedEntity.type] : "Perfil"}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {ownedEntity
                    ? normalizeUserEntityStatus(ownedEntity.record.estado) === "activo"
                      ? "Visible"
                      : normalizeUserEntityStatus(ownedEntity.record.estado) === "oculto"
                        ? "Oculto"
                        : "En revision"
                    : "Cargando"}
                </p>
              </div>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/usuarios"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Volver al panel
                </Link>
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              {loading ? (
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  Cargando perfil...
                </div>
              ) : ownedEntity ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <Field
                    label="Nombre"
                    value={formData.nombre}
                    onChange={(value) => setFormData((current) => ({ ...current, nombre: value }))}
                    required
                  />

                  {ownedEntity.type === "servicio" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Categoria</label>
                      <select
                        value={formData.categoria}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, categoria: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
                      >
                        {serviceCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {ownedEntity.type === "servicio" || ownedEntity.type === "curso" ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Responsable"
                        value={formData.responsable}
                        onChange={(value) =>
                          setFormData((current) => ({ ...current, responsable: value }))
                        }
                      />
                      <Field
                        label="Contacto"
                        value={formData.contacto}
                        onChange={(value) =>
                          setFormData((current) => ({ ...current, contacto: value }))
                        }
                      />
                      <div className="md:col-start-2">
                        <WhatsappCheckbox
                          label="Este contacto tiene WhatsApp"
                          checked={formData.usaWhatsapp}
                          onChange={(checked) =>
                            setFormData((current) => ({ ...current, usaWhatsapp: checked }))
                          }
                        />
                      </div>
                    </div>
                  ) : null}

                  {ownedEntity.type === "comercio" || ownedEntity.type === "institucion" ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Direccion"
                        value={formData.direccion}
                        onChange={(value) =>
                          setFormData((current) => ({ ...current, direccion: value }))
                        }
                      />
                      <Field
                        label="Telefono"
                        value={formData.telefono}
                        onChange={(value) =>
                          setFormData((current) => ({ ...current, telefono: value }))
                        }
                      />
                      <div className="md:col-start-2">
                        <WhatsappCheckbox
                          label="Este contacto tiene WhatsApp"
                          checked={formData.usaWhatsapp}
                          onChange={(checked) =>
                            setFormData((current) => ({ ...current, usaWhatsapp: checked }))
                          }
                        />
                      </div>
                    </div>
                  ) : null}

                  {ownedEntity.type === "servicio" ? (
                    <Field
                      label="Direccion"
                      value={formData.direccion}
                      onChange={(value) => setFormData((current) => ({ ...current, direccion: value }))}
                    />
                  ) : null}

                  <LocalidadField
                    value={formData.localidad}
                    onChange={(value) => setFormData((current) => ({ ...current, localidad: value }))}
                  />

                  <TextAreaField
                    label="Descripcion"
                    value={formData.descripcion}
                    onChange={(value) => setFormData((current) => ({ ...current, descripcion: value }))}
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    <Field
                      label="Sitio web"
                      type="url"
                      value={formData.webUrl}
                      onChange={(value) =>
                        setFormData((current) => ({ ...current, webUrl: value }))
                      }
                    />
                    <Field
                      label="Instagram"
                      type="url"
                      value={formData.instagramUrl}
                      onChange={(value) =>
                        setFormData((current) => ({ ...current, instagramUrl: value }))
                      }
                    />
                    <Field
                      label="Facebook"
                      type="url"
                      value={formData.facebookUrl}
                      onChange={(value) =>
                        setFormData((current) => ({ ...current, facebookUrl: value }))
                      }
                    />
                  </div>

                  {ownedEntity.type !== "institucion" ? (
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Suscripcion
                      </div>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">
                        Gestiona tu plan desde el panel
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Movimos la suscripcion a una pantalla propia para que editar perfil quede mas simple. Desde ahi puedes revisar tu plan, cambiarlo y abrir Mercado Pago.
                      </p>
                      <div className="mt-4">
                        <Link
                          href="/usuarios/suscripcion"
                          className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                        >
                          Ir a suscripcion
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  {ownedEntity && supportsPremiumProfile(ownedEntity.type) ? (
                    ownedEntity.record.premium_activo ? (
                      <div className="space-y-4 rounded-[28px] border border-violet-200 bg-violet-50/60 p-5">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-500">
                            Perfil premium
                          </div>
                          <h3 className="mt-2 text-xl font-semibold text-slate-950">
                            Contenido ampliado
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Edita la parte extendida de tu ficha con imágenes grandes y un bloque extra de contenido.
                          </p>
                        </div>

                        <TextAreaField
                          label="Descripcion premium"
                          value={formData.premiumDetalle}
                          onChange={(value) =>
                            setFormData((current) => ({ ...current, premiumDetalle: value }))
                          }
                        />

                        <ImageUploadField
                          label="Imagenes del perfil ampliado"
                          helper="Estas imágenes se verán grandes y se podrán recorrer una a una."
                          images={formData.premiumGaleria}
                          onUpload={(event) => void handleGalleryUpload(event, "premiumGaleria")}
                          onRemove={(index) => removeGalleryImage("premiumGaleria", index)}
                        />

                        <div className="rounded-[24px] border border-slate-200 bg-white/80 p-5">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Bloque extra
                          </div>
                          <div className="mt-4 space-y-4">
                            <Field
                              label="Título del bloque extra"
                              value={formData.premiumExtraTitulo}
                              onChange={(value) =>
                                setFormData((current) => ({ ...current, premiumExtraTitulo: value }))
                              }
                            />
                            <TextAreaField
                              label="Descripcion del bloque extra"
                              value={formData.premiumExtraDetalle}
                              onChange={(value) =>
                                setFormData((current) => ({ ...current, premiumExtraDetalle: value }))
                              }
                            />
                            <ImageUploadField
                              label="Imagenes del bloque extra"
                              helper="Puedes usar este espacio para mostrar otra coleccion, promo o contenido destacado."
                              images={formData.premiumExtraGaleria}
                              onUpload={(event) => void handleGalleryUpload(event, "premiumExtraGaleria")}
                              onRemove={(index) => removeGalleryImage("premiumExtraGaleria", index)}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                        El perfil premium aún no está activo para esta ficha. Cuando lo activen desde admin, vas a poder editar aquí el contenido ampliado.
                      </div>
                    )
                  ) : null}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Imagen principal</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-600 hover:file:bg-blue-100"
                    />
                    {formData.image ? (
                      <img
                        src={formData.image}
                        alt="Vista previa del perfil"
                        className="mt-3 h-40 w-full rounded-2xl object-cover"
                      />
                    ) : null}
                  </div>

                  {error ? <AuthFormStatus tone="error" message={error} /> : null}
                  {success ? <AuthFormStatus tone="success" message={success} /> : null}

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
                  >
                    {saving ? "Guardando cambios..." : "Guardar perfil"}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
      />
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
      />
    </div>
  )
}

function LocalidadField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">Localidad</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
      >
        <option value="">Sin definir</option>
        {LOCALIDADES.map((localidad) => (
          <option key={localidad} value={localidad}>
            {localidad}
          </option>
        ))}
      </select>
    </div>
  )
}

function WhatsappCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="mt-1 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <span>{label}</span>
    </label>
  )
}

function ImageUploadField({
  label,
  helper,
  images,
  onUpload,
  onRemove,
}: {
  label: string
  helper?: string
  images: string[]
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={onUpload}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-medium file:text-blue-600 hover:file:bg-blue-100"
      />
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
      {images.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {images.map((image, index) => (
            <div key={`${index}-${image.slice(0, 24)}`} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
              <img
                src={image}
                alt={`Vista previa ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="h-40 w-full object-cover"
              />
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                <span className="text-sm text-slate-500">Imagen {index + 1}</span>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

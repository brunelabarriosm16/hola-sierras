# Panel QR en /qrsir01

El panel se abre directamente en `/qrsir01`, sin usuario ni contraseña.
No tiene enlace desde la home y solicita no aparecer en buscadores (`noindex`).
Cualquier persona que conozca la dirección puede crear QR y consultar contadores.
La dirección anterior `/privado/qr` redirige al nuevo panel.

## Activación

1. Ejecutar `supabase/qr-links.sql` en el SQL Editor de Supabase.
2. Confirmar `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el servidor.
3. Desplegar el proyecto y abrir `https://TU-DOMINIO/qrsir01`.

No hace falta configurar `QR_ADMIN_PASSWORD`.
Los datos se consultan y guardan desde el servidor; la clave de Supabase nunca
se envía al navegador. La API del panel es `/api/qrsir01`.

## Uso y medición

Elegir «Un QR para Android y iPhone» y cargar los enlaces de Google Play y
App Store. Android abre Google Play; iPhone/iPad abre App Store; los dispositivos
no detectados muestran ambas opciones. También permite QR para un enlace fijo.
Generar y descargar las imágenes desde el dominio definitivo.

Cada apertura GET a `/q/UUID` incrementa atómicamente el contador y redirige.
Se muestran aperturas totales y por dispositivo, no personas únicas ni
instalaciones. HEAD, prefetch y algunos bots conocidos no suman. Los enlaces
copiados y abiertos manualmente también suman. No se almacenan IP ni
identificadores personales de visitantes.

## Verificación

`npm run build` verifica la compilación. `node scripts/check-qr.mjs` levanta
Next en el puerto 3117 con una base simulada y comprueba acceso sin login,
creación, validaciones, redirecciones, selector y contadores sin usar producción.
Ejecutarlo sin otro servidor de desarrollo de este proyecto en marcha.
`node scripts/preview-qr.mjs` abre una vista local con datos ficticios en
`http://localhost:3119/qrsir01`.

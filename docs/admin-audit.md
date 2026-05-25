# Auditoria del panel administrador

## Diagnostico

El admin funciona, pero crecio como paginas independientes. Eso genera archivos muy grandes, logica duplicada y mas pasos de los necesarios para tareas frecuentes.

Principales problemas detectados:

- `eventos`, `comercios`, `servicios` y `cursos` repiten el mismo patron: cargar datos, contar compartidos, contar WhatsApp, abrir modal, editar, borrar, ocultar, publicar borrador y destacar.
- Los formularios mezclan informacion basica, canales, imagenes, premium y estado en un solo modal largo.
- El sidebar escondia secciones de gestion y configuracion aunque son tareas frecuentes para administracion.
- El dashboard usaba muchos estados independientes para metricas que pertenecen a una sola entidad de UI.
- No habia componentes compartidos para headers, metricas, skeletons, notices o tarjetas admin.
- Las vistas principales usan tarjetas grandes donde algunas tareas administrativas se resolverian mas rapido con tabla densa, filtros y acciones inline.
- Hay rutas de baja frecuencia (`radio`, `actividad`, `administradores`) que deberian quedar en sistema, no competir con contenido diario.
- Hay inconsistencias visuales: radios de borde muy grandes, distintos colores por modulo, mensajes de carga simples y feedback disperso.

## Nueva estructura recomendada

Sidebar propuesto:

- Inicio
- Contenido
  - Eventos
  - Comercios
  - Servicios
  - Instituciones
  - Cursos
- Operacion
  - Contactos
  - Usuarios
  - Suscripciones
- Sistema
  - Sitio
  - Radio
  - Administradores
  - Actividad

Regla de producto: el sidebar sirve para navegar; el dashboard sirve para priorizar trabajo.

## Refactor tecnico recomendado

Crear una capa compartida para CRUD admin:

- `AdminPageHeader`
- `AdminMetricCard`
- `AdminNotice`
- `AdminSkeletonGrid`
- `AdminSectionCard`
- futuro `AdminCrudPage`
- futuro `AdminFormDrawer`
- futuro `AdminDataTable`
- futuro `useAdminCollection`

Despues migrar modulos en este orden:

1. Cursos: formulario mas chico y menos relaciones.
2. Servicios: muy parecido a comercios, ideal para extraer campos compartidos.
3. Comercios: formulario premium mas largo, conviene dividir en secciones.
4. Eventos: requiere manejo particular de fechas, sorteos y estados.

## UX objetivo

- Listados con busqueda, filtros guardados y acciones inline.
- Crear rapido: datos basicos primero, extras avanzados colapsados.
- Borrador automatico para formularios largos.
- Estados consistentes: visible, oculto, borrador, pendiente.
- Feedback claro: guardando, guardado, error recuperable.
- Menos modales largos; preferir drawer o pagina de edicion si el contenido supera una pantalla.

## Cambios aplicados en esta primera pasada

- Dashboard simplificado con metricas agrupadas en un solo estado.
- Componentes admin compartidos para headers, metricas, notices, skeletons y secciones.
- Sidebar reorganizado con grupos mas claros: Panel, Contenido, Operacion y Sistema.
- Buscador de modulos en el sidebar.
- Estilo visual mas sobrio y consistente para el area administrativa.

## Cambios aplicados en segunda pasada

- Se creo `adminContentActions` para centralizar reglas repetidas de contenido.
- `cursos`, `servicios` y `comercios` ahora comparten:
  - carga de metricas de compartidos y WhatsApp,
  - merge de metricas con items,
  - reglas de visibilidad,
  - labels y estilos de estado,
  - logging seguro de actividad.
- Se elimino el uso de `alert` en comercios para errores de destacado y se usa el canal visual del panel.
- Se redujo duplicacion antes de redisenar formularios y listados.

## Cambios aplicados en tercera pasada

- Se creo `AdminContentFilters` para reutilizar busqueda, filtro de estado y contador de resultados.
- `cursos`, `servicios` y `comercios` ahora tienen busqueda por texto.
- Los tres modulos filtran por estado: todos, visibles, borradores y ocultos.
- Los empty states distinguen entre modulo vacio y busqueda sin resultados.
- En comercios, el paginado incremental respeta la busqueda y el filtro activo.

## Cambios aplicados en cuarta pasada

- `cursos` dejo de usar tarjetas como listado principal y paso a una tabla administrativa.
- La tabla permite escanear mas rapido:
  - curso y descripcion,
  - responsable y contacto,
  - estado,
  - plan y estado de suscripcion,
  - metricas,
  - acciones inline.
- Se conservaron las acciones existentes: mostrar/ocultar, destacar, editar y eliminar.
- La vista ahora se parece mas a un panel operativo que a una grilla publica.

## Cambios aplicados en quinta pasada

- `servicios` tambien dejo la grilla de tarjetas y paso a una tabla administrativa.
- La tabla agrupa servicio, contacto, estado, plan, metricas y acciones en una sola linea escaneable.
- Se mantuvieron busqueda, filtro por estado, destacado, visibilidad, edicion y borrado.
- El listado reduce altura visual y evita repetir controles dentro de tarjetas grandes.

## Cambios aplicados en sexta pasada

- `comercios` paso de tarjetas paginadas de a 6 a una tabla administrativa completa.
- Se elimino el click extra de "Ver mas" para facilitar busqueda, escaneo y acciones rápidas.
- El listado ahora muestra comercio, contacto, estado, plan, metricas y acciones inline.
- Se corrigieron textos visibles con caracteres dañados en la pantalla de comercios.

## Cambios aplicados en septima pasada

- `eventos` paso de grilla de tarjetas a tabla operativa.
- Se mantuvieron las pestañas de vigentes, pasados y borradores porque reflejan una logica propia de fechas.
- Se agrego busqueda por titulo, categoria, ubicacion, telefono y datos del envio comunitario.
- La tabla concentra fecha, estado, contacto, compartidos y acciones: duplicar, mostrar/ocultar, editar y eliminar.
- Los empty states ahora distinguen busqueda sin resultados, vigentes vacios, pasados vacios y borradores vacios.

## Cambios aplicados en octava pasada

- `instituciones` paso de tarjetas visuales a tabla administrativa.
- Se agrego busqueda por nombre, direccion, telefono y descripcion.
- El listado prioriza el nombre de la institucion y los datos operativos; la foto queda para edicion, no para ocupar espacio en el home/listado admin.
- Se corrigieron textos visibles con tildes y caracteres dañados en la pantalla.

## Pendiente

- Unificar los CRUDs de contenido.
- Reemplazar las tarjetas pesadas restantes por tablas administrables.
- Crear filtros por estado, plan, fecha y texto donde correspondan.
- Mover acciones repetidas a helpers compartidos.
- Revisar rutas poco usadas antes de eliminarlas.
- Resolver la conectividad con Supabase antes de probar flujos reales de guardado.
